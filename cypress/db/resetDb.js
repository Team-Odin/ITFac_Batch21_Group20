const fs = require("node:fs");
const path = require("node:path");

const parseJdbcMySqlUrl = (jdbcUrl) => {
  const raw = String(jdbcUrl || "").trim();
  // Example: jdbc:mysql://localhost:3306/qa_training?useSSL=false
  const re =
    /^jdbc:mysql:\/\/(?<host>[^:/?]+)(?::(?<port>\d+))?\/(?<database>[^?]+)(?:\?(?<query>.*))?$/i;
  const match = re.exec(raw);

  if (!match?.groups?.host || !match?.groups?.database) {
    throw new Error(
      `Unable to parse DB_URL as JDBC MySQL URL. Got: ${JSON.stringify(raw)}`,
    );
  }

  return {
    host: match.groups.host,
    port: match.groups.port ? Number(match.groups.port) : 3306,
    database: match.groups.database,
  };
};

const isLocalHost = (host) => {
  const h = String(host || "").toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
};

const truthyEnv = (value) => {
  const v = String(value || "")
    .trim()
    .toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "y";
};

const resetDatabase = async ({
  dbUrl,
  username,
  password,
  sqlFilePath,
  allowNonLocal = false,
}) => {
  if (!dbUrl) throw new Error("DB_URL is required to reset database");
  if (!username) throw new Error("DB_USERNAME is required to reset database");

  const { host, port, database } = parseJdbcMySqlUrl(dbUrl);

  if (!allowNonLocal && !isLocalHost(host)) {
    throw new Error(
      `Refusing to reset non-local database host '${host}'. Set DB_RESET_ALLOW_NON_LOCAL=true to override.`,
    );
  }

  const resolvedSqlPath = path.isAbsolute(sqlFilePath)
    ? sqlFilePath
    : path.resolve(process.cwd(), sqlFilePath);

  if (!fs.existsSync(resolvedSqlPath)) {
    throw new Error(`SQL reset file not found: ${resolvedSqlPath}`);
  }

  // Lazy require so normal Cypress runs don't fail if dependency isn't installed yet.
  // (But CI/local should have it installed via package.json.)
  // eslint-disable-next-line global-require
  const mysql = require("mysql2/promise");

  const sql = fs.readFileSync(resolvedSqlPath, "utf8");
  const connection = await mysql.createConnection({
    host,
    port,
    user: username,
    password,
    database,
    multipleStatements: true,
  });

  try {
    await connection.query(sql);
  } finally {
    await connection.end();
  }
};

const resetDatabaseIfEnabled = async (reason) => {
  const dbUrl = process.env.DB_URL;
  const username = process.env.DB_USERNAME;
  const password = process.env.DB_PASSWORD;

  // Safety defaults:
  // - If DB_RESET_ON_RUN is explicitly set, obey it.
  // - Otherwise, auto-enable only for localhost DB_URL.
  const parsed = dbUrl ? parseJdbcMySqlUrl(dbUrl) : null;
  const localhostDefault = parsed ? isLocalHost(parsed.host) : false;

  const resetOnRun =
    typeof process.env.DB_RESET_ON_RUN !== "undefined"
      ? truthyEnv(process.env.DB_RESET_ON_RUN)
      : localhostDefault;

  const resetAfterRun =
    typeof process.env.DB_RESET_AFTER_RUN !== "undefined"
      ? truthyEnv(process.env.DB_RESET_AFTER_RUN)
      : localhostDefault;

  const shouldRun =
    reason === "task" ||
    (reason === "before:run" && resetOnRun) ||
    (reason === "after:run" && resetAfterRun);

  if (!shouldRun) return { skipped: true };

  const allowNonLocal = truthyEnv(process.env.DB_RESET_ALLOW_NON_LOCAL);
  const sqlFilePath =
    process.env.DB_RESET_SQL_FILE || "sql/sample_plant_data_full.sql";

  await resetDatabase({
    dbUrl,
    username,
    password,
    sqlFilePath,
    allowNonLocal,
  });

  return { skipped: false };
};

module.exports = {
  parseJdbcMySqlUrl,
  resetDatabase,
  resetDatabaseIfEnabled,
};
