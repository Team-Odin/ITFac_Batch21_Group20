const fs = require("node:fs");
const path = require("node:path");
const mysql = require("mysql2/promise");

const parseBool = (value) => {
  if (value == null) return undefined;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "off"].includes(normalized)) return false;
  return undefined;
};

const stripJdbcPrefix = (url) => {
  const s = String(url || "").trim();
  return s.toLowerCase().startsWith("jdbc:") ? s.slice(5) : s;
};

const normalizeDbUrl = (dbUrl) => {
  const raw = stripJdbcPrefix(dbUrl);
  if (!raw) return undefined;

  // Common formats:
  // - mysql://host:3306/db
  // - mysql://user:pass@host:3306/db
  // - mysql://host/db?param=...
  // - mysql://user:pass@host/db?param=...
  // - mysql://host:3306/db?useSSL=false
  // - mysql://host:3306/db?useSSL=false&allowPublicKeyRetrieval=true
  // - mysql://host:3306/db?user=...&password=...
  // - mysql://host:3306/db?user=...
  // - mysql://host:3306/db?password=...
  // - mysql://host:3306/db?useSSL=false
  // - mysql://host:3306/db (jdbc prefix already stripped)

  // Some people pass jdbc:mysql://... which becomes mysql://... after stripping.
  // Ensure URL() parser can read it.
  if (raw.startsWith("mysql://") || raw.startsWith("mysqls://")) return raw;

  // Handle bare "mysql:" schemes missing slashes.
  if (raw.startsWith("mysql:")) {
    const fixed = raw.replace(/^mysql:/i, "mysql://");
    return fixed;
  }

  // If it looks like host:port/db, prepend scheme.
  if (/^[^/]+\/.+/.test(raw)) return `mysql://${raw}`;

  return raw;
};

const isLocalHost = (host) => {
  const h = String(host || "")
    .trim()
    .toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
};

const stripOuterQuotes = (value) => {
  const s = String(value ?? "").trim();
  // Explicitly strip only a single pair of surrounding quotes.
  return s.replace(/^['"]/, "").replace(/['"]$/, "");
};

const getDbConnectionOptions = () => {
  const dbUrlRaw = process.env.DB_URL;
  const dbUrl = normalizeDbUrl(dbUrlRaw);
  if (!dbUrl) {
    throw new Error(
      "DB_URL is not set. Configure DB_URL / DB_USERNAME / DB_PASSWORD in your .env.",
    );
  }

  let url;
  try {
    url = new URL(dbUrl);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid DB_URL: ${dbUrlRaw} (${detail})`);
  }

  const pathname = String(url.pathname || "");
  const database = (
    pathname.startsWith("/") ? pathname.slice(1) : pathname
  ).trim();
  if (!database) {
    throw new Error(
      `DB_URL is missing database name in path: ${dbUrlRaw} (expected .../qa_training)`,
    );
  }

  // Prefer explicit env username/password; fall back to URL components and query params.
  const userFromQuery =
    url.searchParams.get("user") || url.searchParams.get("username");
  const passFromQuery = url.searchParams.get("password");

  const user =
    process.env.DB_USERNAME ||
    decodeURIComponent(url.username || "") ||
    (userFromQuery ? String(userFromQuery) : undefined);
  const password =
    process.env.DB_PASSWORD ||
    decodeURIComponent(url.password || "") ||
    (passFromQuery ? String(passFromQuery) : undefined);

  const port = url.port ? Number(url.port) : 3306;

  return {
    host: url.hostname,
    port,
    user,
    password,
    database,
    multipleStatements: true,
  };
};

const resolveSqlFilePath = () => {
  const raw = process.env.DB_RESET_SQL_FILE || "sql/sample_plant_data_full.sql";
  // Support values like "sql/file.sql" and also accidental nested quoting from CI.
  const unquoted = stripOuterQuotes(raw);
  return path.resolve(__dirname, "..", "..", unquoted);
};

const runSqlFile = async () => {
  const sqlFile = resolveSqlFilePath();
  if (!fs.existsSync(sqlFile)) {
    throw new Error(`DB reset SQL file not found: ${sqlFile}`);
  }

  const sql = fs.readFileSync(sqlFile, "utf8");
  const trimmed = sql.startsWith("\uFEFF") ? sql.slice(1) : sql; // strip BOM

  const options = getDbConnectionOptions();
  const connection = await mysql.createConnection(options);
  try {
    await connection.query(trimmed);
  } finally {
    await connection.end();
  }
};

const shouldResetForTrigger = (trigger) => {
  const allowNonLocal =
    parseBool(process.env.DB_RESET_ALLOW_NON_LOCAL) === true;

  // Determine host locality from DB_URL
  let host;
  let invalidDbUrl = false;
  try {
    const dbUrl = normalizeDbUrl(process.env.DB_URL);
    const parsed = dbUrl ? new URL(dbUrl) : undefined;
    host = parsed?.hostname;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.warn(`⚠️  DB reset disabled: invalid DB_URL (${detail})`);
    host = undefined;
    invalidDbUrl = true;
  }

  if (invalidDbUrl) {
    return { enabled: false, reason: "Invalid DB_URL" };
  }

  const local = isLocalHost(host);
  if (!local && !allowNonLocal) {
    return {
      enabled: false,
      reason: `Non-local DB host '${host}' not allowed`,
    };
  }

  const autoEnabled = local;
  const onRun = parseBool(process.env.DB_RESET_ON_RUN);
  const afterRun = parseBool(process.env.DB_RESET_AFTER_RUN);
  const beforeSpec = parseBool(process.env.DB_RESET_BEFORE_SPEC);
  const afterSpec = parseBool(process.env.DB_RESET_AFTER_SPEC);

  if (trigger === "before:run") {
    return { enabled: onRun ?? autoEnabled };
  }

  if (trigger === "after:run") {
    return { enabled: afterRun ?? autoEnabled };
  }

  // Spec-level resets are intentionally opt-in because they can be slow.
  if (trigger === "before:spec") {
    return { enabled: beforeSpec ?? false };
  }

  if (trigger === "after:spec") {
    return { enabled: afterSpec ?? false };
  }

  // Manual task: if it's local, allow by default; if non-local, it will be blocked above.
  if (trigger === "task") {
    return { enabled: true };
  }

  return { enabled: false };
};

const resetDatabaseIfEnabled = async (trigger = "task") => {
  const { enabled, reason } = shouldResetForTrigger(trigger);
  if (!enabled) {
    if (reason) {
      console.log(`ℹ️  DB reset skipped (${trigger}): ${reason}`);
    } else {
      console.log(`ℹ️  DB reset skipped (${trigger})`);
    }
    return;
  }

  console.log(`🧹 Resetting database (${trigger}) using SQL file...`);
  await runSqlFile();
  console.log("✅ Database reset complete");
};

module.exports = {
  resetDatabaseIfEnabled,
};
