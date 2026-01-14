// server/routes/stocks.js
// Endpoint : GET /api/stocks/disponible/:magasinId
// Retourne les lots disponibles dans le magasin (stock > 0), avec unite, prix_ref et unites_admises.

const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/disponible/:magasinId', async (req, res) => {
  try {
    const { magasinId } = req.params;

    const query = `
      WITH adm AS (
        SELECT lot_id, magasin_id, SUM(quantite) AS total_adm, MAX(unite) AS unite
        FROM admissions
        WHERE magasin_id = $1
        GROUP BY lot_id, magasin_id
      ),
      ret AS (
        SELECT lot_id, magasin_id, SUM(quantite) AS total_ret
        FROM retraits
        WHERE magasin_id = $1
        GROUP BY lot_id, magasin_id
      )
      SELECT
        a.lot_id,
        l.description,
        COALESCE(a.unite, '') AS unite,
        l.prix_ref,
        l.unites_admises,
        (COALESCE(a.total_adm,0) - COALESCE(r.total_ret,0))::numeric AS stock_actuel
      FROM adm a
      LEFT JOIN ret r ON r.lot_id = a.lot_id AND r.magasin_id = a.magasin_id
      LEFT JOIN lots l ON l.id = a.lot_id
      WHERE (COALESCE(a.total_adm,0) - COALESCE(r.total_ret,0)) > 0
      ORDER BY l.description;
    `;

    const result = await pool.query(query, [magasinId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur SQL Stock:', err);
    res.status(500).json({ error: "Erreur serveur lors de la récupération du stock" });
  }
});

module.exports = router;
