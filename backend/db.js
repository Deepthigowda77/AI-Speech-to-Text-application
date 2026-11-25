const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/speech_to_text"
});

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS transcriptions (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL DEFAULT 'Untitled transcription',
      transcript TEXT NOT NULL,
      language VARCHAR(50) DEFAULT 'auto',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

module.exports = { pool, initializeDatabase };


