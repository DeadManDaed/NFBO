/**
 * server/routes/retraits.js
 * POST /api/retraits  - crée un retrait / transfert / destruction / retour producteur
 *
 * - Validation serveur
 * - Fallback prix_ref depuis lots si absent
 * - Vérification du stock en transaction (SELECT ... FOR UPDATE)
 * - Insert dans une transaction puis COMMIT
 * - Capture d'erreurs déclenchées par triggers (ex: update_stock_on_retrait)
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');

// Helper : calcule le stock pour un lot/magasin en utilisant le client transactionnel (verrou FOR UPDATE)
async function getStockForLotInMagasinUsingClient(client, lotId, magasinId) {
  // verrouille les admissions pour ce lot/magasin
  const admRows = await client.query(
    `SELECT quantite FROM admissions
     WHERE lot_id = $1 AND magasin_id = $2
     FOR UPDATE`,
    [lotId, magasinId]
  );
  const totalAdm = admRows.rows.reduce((s, r) => s + parseFloat(r.quantite || 0), 0);

  const retRes = await client.query(
    `SELECT COALESCE(SUM(quantite), 0) AS total_ret
     FROM retraits
     WHERE lot_id = $1 AND magasin_id = $2`,
    [lotId, magasinId]
  );
  const totalRet = parseFloat(retRes.rows[0].total_ret || 0);
  return totalAdm - totalRet;
}

/* GET : liste des retraits */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, l.description AS lot_description, p.nom_producteur
       FROM retraits r
       LEFT JOIN lots l ON r.lot_id = l.id
       LEFT JOIN producteurs p ON r.destination_producteur_id = p.id
       ORDER BY r.id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur GET retraits', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/* GET par id */
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, l.description AS lot_description, p.nom_producteur
       FROM retraits r
       LEFT JOIN lots l ON r.lot_id = l.id
       LEFT JOIN producteurs p ON r.destination_producteur_id = p.id
       WHERE r.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Retrait introuvable' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erreur GET retrait', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/* POST : créer un retrait */
router.post('/', async (req, res) => {
  const {
    lot_id,
    utilisateur,
    type_retrait,
    quantite,
    unite,
    prix_ref,
    valeur_totale,
    destination_producteur_id,
    montant_du,
    mode_paiement,
    points_utilises,
    statut_paiement,
    destination_client,
    destination_magasin_id,
    motif,
    magasin_id,
    coef_qualite,
    taux_tax,
    region_id,
    departement_id,
    arrondissement_id,
    localite,
    admission_id
  } = req.body;

  // validations
  if (!lot_id || !magasin_id || !quantite || !unite || !type_retrait) {
    return res.status(400).json({ error: 'Champs obligatoires manquants (lot_id, magasin_id, quantite, unite, type_retrait)' });
  }

  if (type_retrait === 'producteur' && !destination_producteur_id) {
    return res.status(400).json({ error: 'destination_producteur_id requis pour type_retrait=producteur' });
  }
  if (type_retrait === 'magasin' && !destination_magasin_id) {
    return res.status(400).json({ error: 'destination_magasin_id requis pour type_retrait=magasin' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // prix_ref fallback
    let prixRefFinal = prix_ref;
    if (!prixRefFinal) {
      const lotRes = await client.query('SELECT prix_ref FROM lots WHERE id = $1', [lot_id]);
      if (lotRes.rows.length > 0) {
        prixRefFinal = lotRes.rows[0].prix_ref || 0;
      } else {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Lot introuvable' });
      }
    }

    // Vérification de stock transactionnelle (évite races)
    const typesQuiConsomment = ['vente', 'producteur', 'magasin'];
    if (typesQuiConsomment.includes(type_retrait)) {
      const available = await getStockForLotInMagasinUsingClient(client, lot_id, magasin_id);
      if (available < parseFloat(quantite)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Stock insuffisant', details: { available, requested: parseFloat(quantite) } });
      }
    }

    const insertQuery = `
      INSERT INTO retraits (
        lot_id, utilisateur, type_retrait, quantite, unite, prix_ref, valeur_totale,
        destination_producteur_id, montant_du, mode_paiement, points_utilises, statut_paiement,
        destination_client, destination_magasin_id, motif, magasin_id, coef_qualite, taux_tax,
        region_id, departement_id, arrondissement_id, localite, admission_id
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,
        $8,$9,$10,$11,$12,
        $13,$14,$15,$16,$17,$18,
        $19,$20,$21,$22,$23
      ) RETURNING *`;

    const values = [
      lot_id,
      utilisateur || 'system',
      type_retrait,
      quantite,
      unite,
      prixRefFinal,
      valeur_totale || null,
      destination_producteur_id || null,
      montant_du || null,
      mode_paiement || null,
      points_utilises || null,
      statut_paiement || null,
      destination_client || null,
      destination_magasin_id || null,
      motif || null,
      magasin_id,
      coef_qualite || null,
      taux_tax || null,
      region_id || null,
      departement_id || null,
      arrondissement_id || null,
      localite || null,
      admission_id || null
    ];

    const insertRes = await client.query(insertQuery, values);

    await client.query('COMMIT');

    res.status(201).json(insertRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Erreur POST retraits', err);

    // Si trigger a levé une erreur (ex: P0001 / raise), renvoyer 400 avec message
    if (err && (err.code === 'P0001' || /stock insuffisant/i.test(err.message || ''))) {
      return res.status(400).json({ error: err.message || 'Stock insuffisant' });
    }

    res.status(400).json({ error: 'Erreur lors de la création du retrait', details: err.message });
  } finally {
    client.release();
  }
});

/* DELETE : supprimer un retrait */
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM retraits WHERE id=$1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Retrait introuvable' });
    res.json({ message: 'Retrait supprimé', retrait: result.rows[0] });
  } catch (err) {
    console.error('Erreur DELETE retraits:', err);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

module.exports = router;
