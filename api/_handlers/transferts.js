// api/_handlers/transferts.js
const pool = require('../_lib/db');
const { withCors } = require('../_lib/cors');
const { requireAuth } = require('../_lib/auth');

module.exports = withCors(requireAuth(async (req, res) => {
  if (!['superadmin', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Transferts réservés aux administrateurs' });
  }

  // ── POST /api/transferts — créer un transfert ─────────────────────────────
  if (req.method === 'POST') {
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

      // Vérifier stock disponible via admissions/retraits (stocks est une vue)
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

      // Créer le retrait source
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
        [lot_id, magasin_id, destination_magasin_id, chauffeur_id || null, quantite, unite, prix_ref, utilisateur || req.user.username, motif || null]
      );

      await client.query('COMMIT');
      return res.status(201).json({ message: 'Transfert initié avec succès', transfert_id: result.rows[0].id });

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Erreur transfert POST:', err.message);
      return res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  }

  // ── PUT /api/transferts?id=X — validation/confirmation ───────────────────
  if (req.method === 'PUT') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id requis' });

    const {
      statut, validation_auditeur, quantite_recue,
      etat_produit, observations, validateur
    } = req.body;

    try {
      const result = await pool.query(
        `UPDATE transferts SET
           statut              = COALESCE($1, statut),
           validation_auditeur = COALESCE($2, validation_auditeur),
           date_reception      = CASE WHEN $1 = 'livré' THEN NOW() ELSE date_reception END
         WHERE id = $3
         RETURNING *`,
        [statut || null, validation_auditeur ?? null, id]
      );

      if (result.rows.length === 0)
        return res.status(404).json({ error: 'Transfert introuvable' });

      // Log audit
      await pool.query(
        `INSERT INTO audit (date, utilisateur, action, type_action, entite, entite_id, details)
         VALUES (NOW(), $1, $2, 'validation', 'transferts', $3, $4)`,
        [
          validateur || req.user.username,
          `Transfert #${id} validé : ${etat_produit || 'conforme'}`,
          id,
          JSON.stringify({ quantite_recue, etat_produit, observations })
        ]
      );

      return res.json({ success: true, transfert: result.rows[0] });
    } catch (err) {
      console.error('[transferts PUT]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: `Méthode non supportée : ${req.method}` });
}));