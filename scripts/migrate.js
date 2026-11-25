
const fs = require("fs");
const path = require("path");
const pool = require("../src/config/database");

async function migrate() {
  const client = await pool.connect();

  try {
    // Prevent simultaneous migration executions.
    await client.query("SELECT pg_advisory_lock(123456789)");

    // Create migration history table if it doesn't exist.
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const migrationsDir = path.join(
      __dirname,
      "../src/database/migrations"
    );

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const result = await client.query(
        "SELECT 1 FROM schema_migrations WHERE filename = $1",
        [file]
      );

      if (result.rowCount > 0) {
        console.log(`Already applied: ${file}`);
        continue;
      }

      const sql = fs.readFileSync(
        path.join(migrationsDir, file),
        "utf8"
      );

      await client.query("BEGIN");

      try {
        await client.query(sql);

        await client.query(
          "INSERT INTO schema_migrations (filename) VALUES ($1)",
          [file]
        );

        await client.query("COMMIT");

        console.log(`Applied: ${file}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    try {
      await client.query(
        "SELECT pg_advisory_unlock(123456789)"
      );
    } finally {
      client.release();
      await pool.end();
    }
  }
}

migrate().catch((error) => {
  console.error("Migration failed:", error);
  process.exitCode = 1;
});
