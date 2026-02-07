const { defineConfig } = require("cypress");
const createBundler = require("@bahmutov/cypress-esbuild-preprocessor");
const {
  addCucumberPreprocessorPlugin,
} = require("@badeball/cypress-cucumber-preprocessor");
const {
  createEsbuildPlugin,
} = require("@badeball/cypress-cucumber-preprocessor/esbuild");
const allureWriter = require("@shelex/cypress-allure-plugin/writer");
const { spawn } = require("node:child_process");
const waitOn = require("wait-on");
const path = require("node:path");
const fs = require("node:fs");
const { resetDatabaseIfEnabled } = require("./cypress/db/resetDb");

// Load environment variables from the repo's .env.
// Note: dotenv does NOT override existing process.env values unless override:true.
// For local dev, we want .env to win so switching DB_URL works predictably.
require("dotenv").config({
  path: path.join(__dirname, ".env"),
  override: true,
});
const targetUrl = process.env.API_BASE_URL || "http://localhost:8080";
let host = "localhost";
let port = "8080";
if (URL.canParse(targetUrl)) {
  const u = new URL(targetUrl);
  host = u.hostname || host;
  port = u.port || port;
} else if (process.env.DEBUG) {
  console.log(
    `ℹ️  API_BASE_URL is not a valid absolute URL (${targetUrl}); using defaults`,
  );
}

let javaProcess;
let spawnedByCypress = false;
let stoppingJava = false;

const resolveJavaCmd = () => {
  const javaHome = process.env.JAVA_HOME;
  if (javaHome) {
    const candidate = path.join(
      javaHome,
      "bin",
      process.platform === "win32" ? "java.exe" : "java",
    );
    if (fs.existsSync(candidate)) return candidate;
  }
  return "java"; // assumes on PATH
};

module.exports = defineConfig({
  video: false,
  defaultCommandTimeout: 5000,
  pageLoadTimeout: 10000,
  reporter: "mocha-allure-reporter",
  reporterOptions: {
    resultsDir: "allure-results",
    clean: true,
  },
  e2e: {
    specPattern: "cypress/e2e/**/*.feature",
    baseUrl: targetUrl,
    env: {
      stepDefinitions: [
        "cypress/e2e/**/[filepath].steps.{js,mjs,ts,tsx}",
        "cypress/e2e/**/[filepath]/**/*.{js,mjs,ts,tsx}",
        "cypress/support/step_definitions/**/*.{js,mjs,ts,tsx}",
      ],
    },

    async setupNodeEvents(on, config) {
      await addCucumberPreprocessorPlugin(on, config);
      allureWriter(on, config);
      on(
        "file:preprocessor",
        createBundler({ plugins: [createEsbuildPlugin(config)] }),
      );

      on("task", {
        "db:reset": async () => {
          await resetDatabaseIfEnabled("task");
          return null;
        },
      });

      // Ensure server is running BEFORE Cypress verifies baseUrl
      const ensureServer = async () => {
        const alreadyUp = await waitOn({
          resources: [`tcp:${host}:${port}`],
          timeout: 1000,
          log: false,
        })
          .then(() => true)
          .catch(() => false);

        if (alreadyUp) {
          console.log(
            `ℹ️  Server already running at tcp:${host}:${port} — Cypress will NOT respawn the JAR. ` +
              "If you changed .env (DB_URL/DB_USERNAME/DB_PASSWORD), stop the server and re-run Cypress.",
          );
          return; // already up
        }

        if (process.env.DEBUG) {
          console.log(`ℹ️  Server not reachable yet; spawning JAR`);
        }

        console.log("Booting up JAR with custom properties...");

        const jarPath = path.join(__dirname, "bin", "qa-training-app.jar");
        const configPath = path.join(__dirname, "config");

        javaProcess = spawn(
          resolveJavaCmd(),
          [
            "-jar",
            jarPath,
            `--spring.config.location=file:${configPath}/application.properties`,
            `--server.port=${port}`,
            `--spring.datasource.password=${process.env.DB_PASSWORD}`,
            // Use resolved targetUrl so we never pass "undefined" (non-absolute URI) to Spring.
            `--api.base-url=${targetUrl}`,
            `--spring.datasource.username=${process.env.DB_USERNAME}`,
            `--spring.datasource.url=${process.env.DB_URL}`,
          ],
          { stdio: "inherit" },
        );
        javaProcess.on("error", (err) => {
          console.error("Java spawn error:", err.message);
        });
        javaProcess.on("exit", (code, signal) => {
          const expectedShutdown =
            stoppingJava === true || signal === "SIGTERM" || code === 143;

          if (expectedShutdown) {
            console.log(
              `ℹ️  Java process stopped code=${code} signal=${signal}`,
            );
            return;
          }

          console.error(
            `Java process exited early code=${code} signal=${signal}`,
          );
        });
        spawnedByCypress = true;

        console.log(`Waiting for tcp:${host}:${port} to respond...`);
        try {
          await waitOn({ resources: [`tcp:${host}:${port}`], timeout: 60000 });
          console.log("✅ Server Ready!");
        } catch (err) {
          console.error(
            `❌ Server at tcp:${host}:${port} failed to start. ${err}`,
          );
          if (javaProcess) {
            stoppingJava = true;
            javaProcess.kill();
          }
          process.exit(1);
        }
      };

      // Start server as part of plugin setup so it's up before verification
      await ensureServer();

      on("before:run", async () => {
        try {
          await resetDatabaseIfEnabled("before:run");
        } catch (err) {
          console.error("❌ Database reset (before:run) failed:", err?.message);
          throw err;
        }
      });

      on("before:spec", async () => {
        try {
          await resetDatabaseIfEnabled("before:spec");
        } catch (err) {
          console.error(
            "❌ Database reset (before:spec) failed:",
            err?.message,
          );
          throw err;
        }
      });

      on("after:spec", () => {
        return resetDatabaseIfEnabled("after:spec").catch((err) => {
          console.error("❌ Database reset (after:spec) failed:", err?.message);
        });
      });

      on("after:run", () => {
        // best-effort cleanup
        return resetDatabaseIfEnabled("after:run")
          .catch((err) => {
            console.error(
              "❌ Database reset (after:run) failed:",
              err?.message,
            );
          })
          .finally(() => {
            console.log("🛑 Stopping Local JAR...");
            if (spawnedByCypress && javaProcess) {
              stoppingJava = true;
              javaProcess.kill();
            }
          });
      });

      // Make .env values available to test code via Cypress.env(...)
      // Supports both plain names (ADMIN_USER) and Cypress-prefixed (CYPRESS_ADMIN_USER).
      config.env = {
        ...config.env,
        ADMIN_USER: process.env.ADMIN_USER ?? process.env.CYPRESS_ADMIN_USER,
        ADMIN_PASS: process.env.ADMIN_PASS ?? process.env.CYPRESS_ADMIN_PASS,
        USER_USER: process.env.USER_USER ?? process.env.CYPRESS_USER_USER,
        USER_PASS: process.env.USER_PASS ?? process.env.CYPRESS_USER_PASS,
      };

      return config;
    },
  },
});
