const { defineConfig } = require("cypress");
const createBundler = require("@bahmutov/cypress-esbuild-preprocessor");
const {
  addCucumberPreprocessorPlugin,
} = require("@badeball/cypress-cucumber-preprocessor");
const {
  createEsbuildPlugin,
} = require("@badeball/cypress-cucumber-preprocessor/esbuild");
const allureWriter = require("@shelex/cypress-allure-plugin/writer");
const { spawn } = require("child_process");
const waitOn = require("wait-on");
const path = require("path");
const fs = require("fs");

require("dotenv").config();
const targetUrl = process.env.API_BASE_URL || "http://localhost:8080";
let host = "localhost";
let port = "8080";
try {
  const u = new URL(targetUrl);
  host = u.hostname || host;
  port = u.port || port;
} catch (e) {
  // keep defaults
}

let javaProcess;
let spawnedByCypress = false;

const resolveJavaCmd = () => {
  const javaHome = process.env.JAVA_HOME;
  if (javaHome) {
    const candidate = path.join(
      javaHome,
      "bin",
      process.platform === "win32" ? "java.exe" : "java"
    );
    if (fs.existsSync(candidate)) return candidate;
  }
  return "java"; // assumes on PATH
};

module.exports = defineConfig({
  e2e: {
    specPattern: "**/*.feature",
    baseUrl: targetUrl,

    async setupNodeEvents(on, config) {
      await addCucumberPreprocessorPlugin(on, config);
      allureWriter(on, config);
      on(
        "file:preprocessor",
        createBundler({ plugins: [createEsbuildPlugin(config)] })
      );

      // Ensure server is running BEFORE Cypress verifies baseUrl
      const ensureServer = async () => {
        try {
          await waitOn({ resources: [`tcp:${host}:${port}`], timeout: 1200 });
          return; // already up
        } catch (_) {
          // fallthrough to spawn
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
            `--api.base-url=${process.env.API_BASE_URL}`,
            `--spring.datasource.username=${process.env.DB_USERNAME}`,
            `--spring.datasource.url=${process.env.DB_URL}`
          ],
          { stdio: "inherit" }
        );
        javaProcess.on("error", (err) => {
          console.error(
            "Java spawn error:",
            err && err.message ? err.message : err
          );
        });
        javaProcess.on("exit", (code, signal) => {
          console.error(
            `Java process exited early code=${code} signal=${signal}`
          );
        });
        spawnedByCypress = true;

        console.log(`Waiting for tcp:${host}:${port} to respond...`);
        try {
          await waitOn({ resources: [`tcp:${host}:${port}`], timeout: 60000 });
          console.log("✅ Server Ready!");
        } catch (err) {
          console.error(`❌ Server at tcp:${host}:${port} failed to start.`);
          if (javaProcess) javaProcess.kill();
          process.exit(1);
        }
      };

      // Start server as part of plugin setup so it's up before verification
      await ensureServer();

      on("after:run", () => {
        console.log("🛑 Stopping Local JAR...");
        if (spawnedByCypress && javaProcess) javaProcess.kill();
      });

      return config;
    },
  },
});
