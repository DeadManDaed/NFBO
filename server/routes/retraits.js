// server/routes/retraits.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

// server/routes/retraits.js  (snippet)
let prix_ref_final = prix_ref;
if (!prix_ref_final || Number(prix_ref_final) === 0) {
  try {
    const lotRes = await pool.query('SELECT prix_ref FROM lots WHERE id=$1', [lot_id]);
    if (lotRes.rows[0]) prix_ref_final = lotRes.rows[0].prix_ref;
  } catch (err) {
    console.warn('Impossible récupérer prix_ref lot', err);
  }
}
// ensuite utiliser prix_ref_final dans l'INSERT (à la place de prix_ref)

// ✅ GET : liste des retraits
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

// ✅ GET : un retrait par ID
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

// ✅ POST : créer un retrait
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
    localite
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO retraits (
        lot_id, utilisateur, type_retrait, quantite, unite, prix_ref_final, valeur_totale,
        destination_producteur_id, montant_du, mode_paiement, points_utilises, statut_paiement,
        destination_client, destination_magasin_id, motif, magasin_id, coef_qualite, taux_tax,
        region_id, departement_id, arrondissement_id, localite
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,
        $8,$9,$10,$11,$12,
        $13,$14,$15,$16,$17,$18,
        $19,$20,$21,$22
      )
      RETURNING *`,
      [
        lot_id,
        utilisateur,
        type_retrait,
        quantite,
        unite,
        prix_ref,
        valeur_totale || null, // peut être calculé côté DB
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
        localite || null
      ]
    );

    // ⚠️ Les triggers PostgreSQL gèrent :
    // - Mise à jour du stock (update_stock_on_retrait)
    // - Vérification du rôle pour destruction (check_destruction_role)
    // - Transfert inter-magasin (handle_magasin_transfer)

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erreur POST retraits', err);
    res.status(400).json({ error: 'Erreur lors de la création du retrait' });
  }
});

// ✅ DELETE : supprimer un retrait
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM retraits WHERE id=$1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Retrait introuvable' });
    res.json({ message: 'Retrait supprimé', retrait: result.rows[0] });
  } catch (err) {
    console.error('Erreur DELETE retraits', err);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

module.exports = router;
