const { spawn } = require("node:child_process");
const path = require("node:path");

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log("Usage: npm start");
  console.log("");
  console.log("Reads DB settings from .env (or shell env):");
  console.log("  DB_URL");
  console.log("  DB_USERNAME");
  console.log("  DB_PASSWORD");
  process.exit(0);
}

// Load .env from this repo (so `npm start` always uses the same file)
const envPath = path.join(__dirname, ".env");
require("dotenv").config({
  path: envPath,
  // Avoid surprises if DB_URL is set in the shell/CI environment.
  // If you need shell env to win, change this to `false`.
  override: true,
});

const dbUrl = process.env.DB_URL;
const dbUsername = process.env.DB_USERNAME;
const dbPassword = process.env.DB_PASSWORD;

const isBlank = (value) => value == null || String(value).trim() === "";

const missing = [];
if (isBlank(dbUrl)) missing.push("DB_URL");
if (isBlank(dbUsername)) missing.push("DB_USERNAME");
if (isBlank(dbPassword)) missing.push("DB_PASSWORD");

if (missing.length > 0) {
  console.error(
    `Missing required environment variables: ${missing.join(", ")}. ` +
      `Set them in ${envPath} (or in your shell env).`,
  );
  process.exit(1);
}

console.log(`Connecting to database: ${dbUrl}`);
console.log(`Username: ${dbUsername}`);

// Run the Java application
const javaProcess = spawn(
  "java",
  [
    "-jar",
    "bin/qa-training-app.jar",
    `--spring.datasource.url=${dbUrl}`,
    `--spring.datasource.username=${dbUsername}`,
    `--spring.datasource.password=${dbPassword}`,
  ],
  {
    stdio: "inherit",
    shell: false, // Changed to false to avoid shell interpretation issues
  },
);

javaProcess.on("error", (err) => {
  console.error("Failed to start application:", err);
  process.exit(1);
});

javaProcess.on("exit", (code) => {
  process.exit(code);
});
