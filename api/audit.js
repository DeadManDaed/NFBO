// api/audit.js  →  /api/audit?action=performance-by-store|recent-logs|global-stats
const pool = require('./_lib/db');
const { withCors } = require('./_lib/cors');
const { requireAuth } = require('./_lib/auth');

module.exports = withCors(requireAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).end();
  if (!['superadmin', 'auditeur'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Accès réservé aux auditeurs et superadmins' });
  }

  const { action } = req.query;

  try {
    if (action === 'performance-by-store') {
      const result = await pool.query('SELECT * FROM vue_performance_magasins');
      return res.json(result.rows);
    }

    if (action === 'recent-logs') {
      const result = await pool.query(`
        SELECT
          a.id,
          a.date_reception AS date,
          a.utilisateur,
          CONCAT('Admission #', a.id) AS action,
          'Admission' AS type,
          COALESCE(a.benefice_estime, 0) AS montant,
          m.nom AS magasin
        FROM admissions a
        LEFT JOIN magasins m ON a.magasin_id = m.id
        WHERE a.date_reception >= CURRENT_DATE - INTERVAL '7 days'
        ORDER BY a.date_reception DESC
        LIMIT 20
      `);
      return res.json(result.rows);
    }

    if (action === 'global-stats') {
      const result = await pool.query(`
        SELECT
          COALESCE(SUM(benefice_estime), 0) AS profit_total,
          COALESCE(SUM(quantite), 0) AS quantite_totale,
          COUNT(CASE WHEN coef_qualite < 0.8 THEN 1 END) AS alertes_qualite
        FROM admissions
        WHERE date_reception >= CURRENT_DATE - INTERVAL '30 days'
      `);
      return res.json(result.rows[0]);
    }

    return res.status(400).json({ error: 'action requise : performance-by-store | recent-logs | global-stats' });

  } catch (err) {
    console.error('Erreur audit:', err.message);
    return res.status(500).json({ error: 'Erreur serveur', details: err.message });
  }
}));
