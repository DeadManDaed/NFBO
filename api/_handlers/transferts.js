// api/_handlers/transferts.js
const pool = require('../_lib/db');
const { withCors } = require('../_lib/cors');
const { requireAuth } = require('../_lib/auth');

module.exports = withCors(requireAuth(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  if (!['superadmin', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Transferts réservés aux administrateurs' });
  }

  const {
    lot_id, quantite, unite, magasin_id, destination_magasin_id,
    chauffeur_id, prix_ref, utilisateur, motif
  } = req.body;

  if (!lot_id || !quantite || !magasin_id || !destination_magasin_id) {
    return res.status(400).json({ error: 'Données incomplètes (lot, quantité, source ou destination manquants)' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Vérifier stock disponible — via admissions/retraits directement (stocks est une vue)
    const checkStock = await client.query(
      `SELECT
         COALESCE(SUM(a.quantite), 0) - COALESCE((
           SELECT SUM(r.quantite) FROM retraits r
           WHERE r.lot_id = $1 AND r.magasin_id = $2
         ), 0) AS stock_actuel
       FROM admissions a
       WHERE a.lot_id = $1 AND a.magasin_id = $2`,
      [lot_id, magasin_id]
    );

    const stockDispo = parseFloat(checkStock.rows[0]?.stock_actuel || 0);
    if (stockDispo <= 0) {
      throw new Error("Ce lot n'existe pas dans le magasin source.");
    }
    if (stockDispo < parseFloat(quantite)) {
      throw new Error(`Stock insuffisant. Disponible: ${stockDispo}, Demandé: ${quantite}`);
    }

    // Créer le retrait source (débite le stock via la table retraits)
    await client.query(
      `INSERT INTO retraits
         (lot_id, magasin_id, quantite, unite, type_retrait, prix_ref, utilisateur, observations)
       VALUES ($1, $2, $3, $4, 'magasin', $5, $6, $7)`,
      [lot_id, magasin_id, quantite, unite, prix_ref, utilisateur || req.user.username, motif || null]
    );

    // Créer le transfert en transit
    const result = await client.query(
      `INSERT INTO transferts
         (lot_id, magasin_depart, magasin_destination, chauffeur_id, quantite, unite, prix_ref, utilisateur, motif, statut)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'en_transit')
       RETURNING id`,
      [lot_id, magasin_id, destination_magasin_id, chauffeur_id || null, quantite, unite, prix_ref, utilisateur || req.user.username, motif]
    );

    await client.query('COMMIT');
    return res.status(201).json({ message: 'Transfert initié avec succès', transfert_id: result.rows[0].id });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erreur transfert:', err.message);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}));