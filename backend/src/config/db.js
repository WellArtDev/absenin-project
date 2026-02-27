const { Pool } = require('pg');
require('dotenv').config();

// Parse connection
let poolConfig;

if (process.env.DATABASE_URL) {
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1')
      ? false
      : { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
} else {
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'absenin',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
}

console.log('[DB] Connecting to:', process.env.DATABASE_URL
  ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':***@').substring(0, 60) + '...'
  : `${poolConfig.host}:${poolConfig.port}/${poolConfig.database}`
);

const pool = new Pool(poolConfig);

// Test connection on startup
pool.query('SELECT NOW() as time, current_database() as db')
  .then(r => {
    console.log(`[DB] ✅ Connected to "${r.rows[0].db}" at ${r.rows[0].time}`);
  })
  .catch(err => {
    console.error('[DB] ❌ Connection FAILED:', err.message);
    console.error('[DB] Config:', JSON.stringify({ ...poolConfig, password: '***' }));
  });

pool.on('error', (err) => {
  console.error('[DB] Pool error:', err.message);
});

async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.log(`[DB] Slow query (${duration}ms): ${text.substring(0, 80)}`);
    }
    return result;
  } catch (error) {
    console.error(`[DB] Query ERROR: ${error.message}`);
    console.error(`[DB] SQL: ${text.substring(0, 200)}`);
    console.error(`[DB] Params: ${JSON.stringify(params || []).substring(0, 200)}`);
    throw error;
  }
}

module.exports = { pool, query };
