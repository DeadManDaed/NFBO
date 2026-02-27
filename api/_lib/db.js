// api/_lib/db.js
// Connexion PostgreSQL via Supabase (compatible node-postgres)
// On utilise pg directement pour garder la même syntaxe que tes routes Express

const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false } // requis pour Supabase
    });
  }
  return pool;
}

module.exports = getPool();