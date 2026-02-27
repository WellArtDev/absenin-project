const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')
    ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.query('SELECT NOW()')
  .then(() => console.log('[DB] ✅ Connected'))
  .catch(e => console.error('[DB] ❌ Failed:', e.message));

pool.on('error', e => console.error('[DB] Pool error:', e.message));

const query = async (text, params) => {
  try {
    return await pool.query(text, params);
  } catch (e) {
    console.error(`[DB] Query error: ${e.message}`);
    console.error(`[DB] SQL: ${text.substring(0, 150)}`);
    throw e;
  }
};

const transaction = async (cb) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await cb(client);
    await client.query('COMMIT');
    return r;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally { client.release(); }
};

module.exports = { pool, query, transaction };
