// routes/lots.js
const express = require('express');
const router = express.Router();
const { validateLot } = require('../validators/validate');
const { admitLotStored } = require('../services/lotsService');
const pool = require('../db');

// --- Routes métier ---
// Option A : admettre un lot existant
router.post('/admit-by-id', validateLot, async (req, res) => {   try {
    const { lot_id, caisse_id, actor } = req.body;
    if (!lot_id) return res.status(400).json({ message: 'lot_id requis pour cette route' });

    const result = await admitLotStored(lot_id, caisse_id || 1, actor || 'system');
    if (result.success) return res.json({ message: result.message, caisse_ligne_id: result.caisse_ligne_id });
    return res.status(400).json({ message: result.message });
  } catch (err) {
    console.error('POST /api/lots/admit-by-id error', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  } });

// Option B : créer un lot puis l’admettre
router.post('/', validateLot, async (req, res) => {  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insérer le lot (paramétrisé)
    const insertText = `
      INSERT INTO lots (
        nom_producteur, tel_producteur, type_producteur, categorie, description,
        quantite, unite, prix_ref, qualite, date_reception, date_expiration,
        region_id, departement_id, arrondissement_id, localite, statut
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'en_attente'
      ) RETURNING id
    `;
    const vals = [
      req.body.nom_producteur || null,
      req.body.tel_producteur || null,
      req.body.type_producteur || null,
      req.body.categorie,
      req.body.description || null,
      req.body.quantite,
      req.body.unite || null,
      req.body.prix_ref,
      req.body.qualite || null,
      req.body.date_reception || null,
      req.body.date_expiration || null,
      req.body.region_id || null,
      req.body.departement_id || null,
      req.body.arrondissement_id || null,
      req.body.localite || null
    ];
    const insertRes = await client.query(insertText, vals);
    const lotId = insertRes.rows[0].id;

    // Commit insertion avant appel fonction stockée (la fonction fera ses propres verrous)
    await client.query('COMMIT');

    // Appel de la fonction stockée
    const result = await admitLotStored(lotId, req.body.caisse_id || 1, req.body.actor || 'system');
    if (result.success) return res.json({ message: result.message, lot_id: lotId, caisse_ligne_id: result.caisse_ligne_id });

    // Si la fonction a échoué, on peut décider d'annuler le lot (optionnel)
    return res.status(400).json({ message: result.message, lot_id: lotId });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* ignore */ }
    console.error('POST /api/lots error', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  } finally {
    client.release();
  } });

// --- Routes CRUD ---
// GET tous les lots
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM lots ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET un lot par ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM lots WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Lot introuvable' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT mise à jour
router.put('/:id', async (req, res) => {
  const { description, categorie, criteres_admission, unites_admises, prix_ref, stock_disponible } = req.body;
  try {
    const result = await pool.query(
      `UPDATE lots SET description=$1, categorie=$2, criteres_admission=$3, unites_admises=$4, prix_ref=$5, stock_disponible=$6 WHERE id=$7 RETURNING *`,
      [description, categorie, criteres_admission, unites_admises, prix_ref, stock_disponible, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Lot introuvable' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: 'Erreur mise à jour lot' });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM lots WHERE id=$1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Lot introuvable' });
    res.json({ message: 'Lot supprimé', lot: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Erreur suppression lot' });
  }
});

module.exports = router;
