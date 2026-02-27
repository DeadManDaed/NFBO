// api/messages.js  →  /api/messages et /api/messages?id=X&action=destinataires
const pool = require('./_lib/db');
const { withCors } = require('./_lib/cors');

module.exports = withCors(async (req, res) => {
  const { id, action, role, magasin_id } = req.query;
  const userId = req.headers['x-user-id'] || 1;

  // GET /api/messages?action=destinataires
  if (req.method === 'GET' && action === 'destinataires') {
    try {
      let empRes, prodRes;
      if (role === 'superadmin') {
        empRes = await pool.query("SELECT id, nom, role FROM employers WHERE statut='actif'");
        prodRes = await pool.query('SELECT id, nom_producteur as nom FROM producteurs');
      } else {
        empRes = await pool.query(
          `SELECT id, nom, role FROM employers
           WHERE (magasin_id=$1 OR role IN ('superadmin','auditeur')) AND statut='actif'`,
          [magasin_id]
        );
        prodRes = await pool.query(
          'SELECT id, nom_producteur as nom FROM producteurs WHERE magasin_id=$1',
          [magasin_id]
        );
      }
      return res.json({ employers: empRes.rows, producteurs: prodRes.rows });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // GET /api/messages?id=X  (détail + marquer lu)
  if (req.method === 'GET' && id) {
    try {
      const result = await pool.query('SELECT * FROM messages WHERE id=$1', [id]);
      await pool.query('UPDATE messages SET lu=TRUE WHERE id=$1', [id]);
      return res.json(result.rows[0]);
    } catch (err) {
      return res.status(500).json({ error: 'Erreur lecture' });
    }
  }

  // GET /api/messages  (boîte de réception)
  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        'SELECT id, expediteur, objet, date, lu FROM messages WHERE destinataire_id=$1 ORDER BY date DESC',
        [userId]
      );
      return res.json(result.rows);
    } catch (err) {
      return res.status(500).json({ error: 'Erreur chargement messages' });
    }
  }

  // POST /api/messages
  if (req.method === 'POST') {
    const { destinataire_id, objet, contenu } = req.body;
    const expediteur_id = req.headers['x-user-id'] || 1;
    try {
      const userRes = await pool.query('SELECT nom FROM employers WHERE id=$1', [expediteur_id]);
      const nomExp = userRes.rows[0] ? userRes.rows[0].nom : 'Système';
      await pool.query(
        'INSERT INTO messages (expediteur_id, destinataire_id, expediteur, objet, contenu) VALUES ($1,$2,$3,$4,$5)',
        [expediteur_id, destinataire_id, nomExp, objet, contenu]
      );
      return res.status(201).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: "Échec de l'envoi" });
    }
  }

  res.status(405).end();
});
