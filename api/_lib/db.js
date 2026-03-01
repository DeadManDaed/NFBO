// api/_lib/db.js
// Connexion PostgreSQL via Supabase (compatible node-postgres)
// On utilise pg directement pour garder la même syntaxe que tes routes Express

const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    const connString = (process.env.DATABASE_URL || process.env.POSTGRES_URL || '').trim();
pool = new Pool({
  connectionString: connString.includes('?') 
    ? connString 
    : `${connString}?pgbouncer=true`,
  ssl: { rejectUnauthorized: false }
});
  }
  return pool;
}

module.exports = getPool();