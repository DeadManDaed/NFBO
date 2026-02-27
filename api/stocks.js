// api/stocks.js  →  GET /api/stocks/disponible?magasinId=X
const pool = require('./_lib/db');
const { withCors } = require('./_lib/cors');

module.exports = withCors(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).end();

  const { magasinId } = req.query;

  if (!magasinId) {
    return res.status(400).json({ error: 'magasinId requis' });
  }

  try {
    const result = await pool.query(
      `WITH adm AS (
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
      ORDER BY l.description`,
      [magasinId]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Erreur SQL Stock:', err);
    return res.status(500).json({ error: 'Erreur serveur lors de la récupération du stock' });
  }
});
