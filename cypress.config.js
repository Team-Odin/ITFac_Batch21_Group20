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

require("dotenv").config();
const targetUrl = process.env.API_BASE_URL || "http://localhost:8080";
let host = "localhost";
let port = "8080";
try {
  const u = new URL(targetUrl);
  host = u.hostname || host;
  port = u.port || port;
} catch (e) {}

let javaProcess;
let spawnedByCypress = false;

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
  projectId: "aq8cdm",
  video: false,
  defaultCommandTimeout: 5000,
  pageLoadTimeout: 50000,
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
        try {
          await waitOn({
            resources: [`tcp:${host}:${port}`],
            timeout: 1000,
            log: false,
          });
          return; // already up
        } catch (e) {}

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
            `--api.base-url=${process.env.API_BASE_URL}`,
            `--spring.datasource.username=${process.env.DB_USERNAME}`,
            `--spring.datasource.url=${process.env.DB_URL}`,
          ],
          { stdio: "inherit" },
        );
        javaProcess.on("error", (err) => {
          console.error("Java spawn error:", err.message);
        });
        javaProcess.on("exit", (code, signal) => {
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
          if (javaProcess) javaProcess.kill();
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
            if (spawnedByCypress && javaProcess) javaProcess.kill();
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
