// server/routes/lots.js
const express = require('express');
const router = express.Router();
const { validateLotDefinition } = require('../validators/validate'); // ✅ Harmonisé
const pool = require('../db');

router.post('/', validateLotDefinition, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const insertText = `
      INSERT INTO lots (
        description, categorie, criteres_admission, unites_admises, prix_ref, stock_disponible
      ) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`;
    
    const vals = [
      req.body.description,
      req.body.categorie,
      JSON.stringify(req.body.criteres_admission || []), // ✅ Convertit en chaîne JSON valide
  JSON.stringify(req.body.unites_admises || []),    // ✅ Convertit en chaîne JSON valide
      req.body.prix_ref || 0,
      req.body.stock_disponible || 0
    ];
    
    const result = await client.query(insertText, vals);
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /api/lots error', err);
    res.status(500).json({ message: 'Erreur serveur' });
  } finally {
    client.release();
  }
});
router.get('/', async (req, res) => {
    try {
        console.log("Accès GET /api/lots"); // Pour voir dans les logs Render
        const result = await pool.query('SELECT * FROM lots ORDER BY date_creation DESC');
        res.json(result.rows); // Renvoie le tableau que .map() attend
    } catch (err) {
        console.error('Erreur GET /api/lots:', err);
        res.status(500).json({ message: 'Erreur lors de la récupération des lots' });
    }
});

// Modifier un lot : PUT /api/lots/:id
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { description, categorie, prix_ref, unites_admises, criteres_admission } = req.body;

        const result = await pool.query(
            `UPDATE lots 
             SET description = $1, 
                 categorie = $2, 
                 prix_ref = $3, 
                 unites_admises = $4, 
                 criteres_admission = $5
             WHERE id = $6 RETURNING *`,
            [
                description,
                categorie,
                prix_ref || 0,
                JSON.stringify(unites_admises || []),
                JSON.stringify(criteres_admission || []),
                id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Lot non trouvé" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Erreur UPDATE /api/lots:', err);
        res.status(500).json({ message: 'Erreur lors de la modification' });
    }
});

// Supprimer un lot : DELETE /api/lots/:id
router.get('/:id', async (req, res) => { // Correction : utilisez router.delete en production
    // Note : Pour tester rapidement via un navigateur, on utilise parfois GET, 
    // mais la norme est router.delete
});

router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM lots WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Lot non trouvé" });
        }

        res.json({ message: "Lot supprimé avec succès", lot: result.rows[0] });
    } catch (err) {
        console.error('Erreur DELETE /api/lots:', err);
        // Si le lot est utilisé ailleurs, err.code sera '23503'
        res.status(500).json({ message: 'Impossible de supprimer ce lot (il est peut-être utilisé dans des admissions)' });
    }
});

// ... gardez vos routes GET, PUT et DELETE ...
module.exports = router;



