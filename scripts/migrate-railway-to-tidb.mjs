import mysql from "mysql2/promise";

const required = [
  "SOURCE_DATABASE_URL",
  "TARGET_DATABASE_HOST",
  "TARGET_DATABASE_USER",
  "TARGET_DATABASE_PASSWORD",
];

for (const name of required) {
  if (!process.env[name]) throw new Error(`${name} is required`);
}

const targetDatabase = process.env.TARGET_DATABASE_NAME || "ugsouq";
if (!/^[a-zA-Z0-9_]+$/.test(targetDatabase)) {
  throw new Error("TARGET_DATABASE_NAME must contain only letters, numbers, and underscores");
}

const quoteIdentifier = (value) => `\`${String(value).replaceAll("\`", "\`\`")}\``;

const normalizeCreateTable = (ddl) =>
  ddl
    .replace(/AUTO_INCREMENT=\d+\s*/gi, "")
    .replace(/ROW_FORMAT=\w+\s*/gi, "")
    .replace(/STATS_PERSISTENT=\w+\s*/gi, "")
    .replace(/COLLATE[ =]utf8mb4_0900_ai_ci/gi, "COLLATE=utf8mb4_bin");

const source = await mysql.createConnection({
  uri: process.env.SOURCE_DATABASE_URL,
  supportBigNumbers: true,
  bigNumberStrings: true,
  dateStrings: true,
  jsonStrings: true,
});

const target = await mysql.createConnection({
  host: process.env.TARGET_DATABASE_HOST,
  port: Number(process.env.TARGET_DATABASE_PORT || 4000),
  user: process.env.TARGET_DATABASE_USER,
  password: process.env.TARGET_DATABASE_PASSWORD,
  ssl: { rejectUnauthorized: true },
  supportBigNumbers: true,
  bigNumberStrings: true,
  dateStrings: true,
});

let createdTargetDatabase = false;

try {
  const [[sourceDatabaseRow]] = await source.query("SELECT DATABASE() AS name");
  if (!sourceDatabaseRow?.name) throw new Error("The Railway source URL does not select a database");

  const [sourceTables] = await source.query(
    "SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME"
  );
  if (sourceTables.length === 0) throw new Error("The Railway source database contains no base tables");

  const [[existingDatabase]] = await target.query(
    "SELECT COUNT(*) AS count FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?",
    [targetDatabase]
  );
  createdTargetDatabase = Number(existingDatabase.count) === 0;
  await target.query(`CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(targetDatabase)} CHARACTER SET utf8mb4 COLLATE utf8mb4_bin`);
  await target.query(`USE ${quoteIdentifier(targetDatabase)}`);

  const [[existingTables]] = await target.query(
    "SELECT COUNT(*) AS count FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'",
    [targetDatabase]
  );
  if (Number(existingTables.count) !== 0) {
    throw new Error(`Refusing to overwrite non-empty TiDB database ${targetDatabase}`);
  }

  await target.query("SET SESSION FOREIGN_KEY_CHECKS = 0");

  const report = [];
  for (const { name } of sourceTables) {
    const table = quoteIdentifier(name);
    const [[createRow]] = await source.query(`SHOW CREATE TABLE ${table}`);
    const rawCreate = createRow["Create Table"];
    if (!rawCreate) throw new Error(`Could not read the schema for ${name}`);
    await target.query(normalizeCreateTable(rawCreate));

    const [rows, fields] = await source.query(`SELECT * FROM ${table}`);
    const columns = fields.map((field) => field.name);

    if (rows.length > 0) {
      const columnSql = columns.map(quoteIdentifier).join(", ");
      const placeholders = columns.map(() => "?").join(", ");
      const insertSql = `INSERT INTO ${table} (${columnSql}) VALUES (${placeholders})`;

      await target.beginTransaction();
      try {
        for (const row of rows) {
          // Use the text protocol for TiDB compatibility. Its prepared-statement
          // protocol can reject MySQL JSON values with field type 245.
          const values = fields.map((field) => {
            const value = row[field.name];
            return field.type === 245 && value !== null && typeof value !== "string"
              ? JSON.stringify(value)
              : value;
          });
          await target.query(insertSql, values);
        }
        await target.commit();
      } catch (error) {
        await target.rollback();
        throw error;
      }
    }

    const [[sourceCount]] = await source.query(`SELECT COUNT(*) AS count FROM ${table}`);
    const [[targetCount]] = await target.query(`SELECT COUNT(*) AS count FROM ${table}`);
    const sourceRows = Number(sourceCount.count);
    const targetRows = Number(targetCount.count);
    if (sourceRows !== targetRows) {
      throw new Error(`Row-count mismatch for ${name}: source=${sourceRows}, target=${targetRows}`);
    }
    report.push({ table: name, rows: targetRows });
  }

  await target.query("SET SESSION FOREIGN_KEY_CHECKS = 1");
  console.log(JSON.stringify({ status: "MIGRATION_OK", database: targetDatabase, tables: report }, null, 2));
} catch (error) {
  if (createdTargetDatabase) {
    try {
      await target.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(targetDatabase)}`);
    } catch {
      // Preserve the original migration error; cleanup can be completed manually.
    }
  }
  throw error;
} finally {
  await Promise.allSettled([source.end(), target.end()]);
}
