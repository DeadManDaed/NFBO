// server/db.js
// Connexion PostgreSQL via pg.Pool
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // options utiles en dev
  max: Number(process.env.PG_POOL_MAX) || 10,
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT) || 30000,
  connectionTimeoutMillis: Number(process.env.PG_CONN_TIMEOUT) || 2000
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;
