const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// Load .env file
const envPath = path.join(__dirname, ".env");
let dbPassword = "T|ez)@-fqVHEPaKf"; // default
let dbUsername = "teamodin"; // default
let dbUrl =
  "jdbc:mysql://136.119.111.245:3306/qa_training?useSSL=false&allowPublicKeyRetrieval=true"; // default

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");

  // Function to remove surrounding quotes
  const removeQuotes = (str) => str.replace(/^["']|["']$/g, "");

  const passwordMatch = envContent.match(/DB_PASSWORD=(.+)/m);
  if (passwordMatch) {
    dbPassword = removeQuotes(passwordMatch[1].trim());
  }

  const usernameMatch = envContent.match(/DB_USERNAME=(.+)/m);
  if (usernameMatch) {
    dbUsername = removeQuotes(usernameMatch[1].trim());
  }

  const urlMatch = envContent.match(/DB_URL=(.+)/m);
  if (urlMatch) {
    dbUrl = removeQuotes(urlMatch[1].trim());
  }
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
  }
);

javaProcess.on("error", (err) => {
  console.error("Failed to start application:", err);
  process.exit(1);
});

javaProcess.on("exit", (code) => {
  process.exit(code);
});
