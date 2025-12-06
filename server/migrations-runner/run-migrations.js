// server/migrations-runner/run-migrations.js
// Exécute tous les fichiers SQL du dossier ../migrations dans l'ordre alphabétique
const fs = require('fs');
const path = require('path');
const pool = require('../db');

async function run() {
  const migrationsDir = path.join(__dirname, '..', '..', 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('Aucune migration trouvée dans', migrationsDir);
    process.exit(0);
  }

  const client = await pool.connect();
  try {
    for (const file of files) {
      const fullPath = path.join(migrationsDir, file);
      console.log('Exécution migration:', file);
      const sql = fs.readFileSync(fullPath, 'utf8');
      // exécuter le fichier entier ; si tu veux transaction par fichier, décommente BEGIN/COMMIT
      await client.query(sql);
      console.log('OK:', file);
    }
    console.log('Toutes les migrations exécutées.');
  } catch (err) {
    console.error('Erreur lors des migrations:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('Erreur runner', err);
  process.exit(1);
});
