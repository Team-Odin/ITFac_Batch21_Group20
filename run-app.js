const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// Load .env file
const envPath = path.join(__dirname, ".env");
let dbPassword = "Password123!"; // default

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  const match = envContent.match(/DB_PASSWORD=(.+)/);
  if (match) {
    dbPassword = match[1].trim();
  }
}

// Run the Java application
const javaProcess = spawn(
  "java",
  [
    "-jar",
    "bin/qa-training-app.jar",
    `--spring.datasource.password=${dbPassword}`,
  ],
  {
    stdio: "inherit",
    shell: true,
  }
);

javaProcess.on("error", (err) => {
  console.error("Failed to start application:", err);
  process.exit(1);
});

javaProcess.on("exit", (code) => {
  process.exit(code);
});
