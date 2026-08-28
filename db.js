const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL nao definido. Configure a variavel de ambiente antes de usar o banco.');
}

const useSsl = !!process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('railway.internal');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS respostas (
      id SERIAL PRIMARY KEY,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
      nome TEXT NOT NULL,
      dados JSONB NOT NULL
    )
  `);
}

module.exports = { pool, init };
