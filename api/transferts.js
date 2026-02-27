// api/transferts.js  →  POST /api/transferts
const pool = require('./_lib/db');
const { withCors } = require('./_lib/cors');

module.exports = withCors(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

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

    // Vérifier stock disponible avec verrou
    const checkStock = await client.query(
      `SELECT stock_actuel FROM stocks
       WHERE lot_id=$1 AND magasin_id=$2 FOR UPDATE`,
      [lot_id, magasin_id]
    );

    if (checkStock.rows.length === 0) {
      throw new Error("Ce lot n'existe pas dans le magasin source.");
    }

    const stockDispo = parseFloat(checkStock.rows[0].stock_actuel);
    if (stockDispo < parseFloat(quantite)) {
      throw new Error(`Stock insuffisant. Disponible: ${stockDispo}, Demandé: ${quantite}`);
    }

    // Débiter le magasin source
    await client.query(
      `UPDATE stocks SET stock_actuel = stock_actuel - $1 WHERE lot_id=$2 AND magasin_id=$3`,
      [quantite, lot_id, magasin_id]
    );

    // Créer le transfert en transit
    const result = await client.query(
      `INSERT INTO transferts
       (lot_id, magasin_depart, magasin_destination, chauffeur_id, quantite, unite, prix_ref, utilisateur, motif, statut)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'en_transit')
       RETURNING id`,
      [lot_id, magasin_id, destination_magasin_id, chauffeur_id || null, quantite, unite, prix_ref, utilisateur, motif]
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
});
