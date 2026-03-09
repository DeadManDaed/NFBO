// api/audit.js  →  /api/audit?action=performance-by-store|recent-logs|global-stats
const pool = require('../_lib/db');
const { withCors } = require('../_lib/cors');
const { requireAuth } = require('../_lib/auth');

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
if (action === 'validated-transfers') {
  const result = await pool.query(`
    SELECT t.*,
      l.description AS lot_description,
      md.nom AS magasin_depart_nom,
      ma.nom AS magasin_destination_nom
    FROM transferts t
    LEFT JOIN lots l ON l.id = t.lot_id
    LEFT JOIN magasins md ON md.id = t.magasin_depart
    LEFT JOIN magasins ma ON ma.id = t.magasin_destination
    WHERE t.statut = 'livré'
    ORDER BY t.date_reception DESC
    LIMIT 20
  `);
  return res.json(result.rows);
}
    if (action === 'pending-transfers') {
      const result = await pool.query(`
        SELECT t.*, 
          ls.description AS lot_description,
          md.nom AS magasin_depart_nom,
          ma.nom AS magasin_destination_nom,
          e.nom AS chauffeur_nom
        FROM transferts t
        LEFT JOIN lots ls ON ls.id = t.lot_id
        LEFT JOIN magasins md ON md.id = t.magasin_depart
        LEFT JOIN magasins ma ON ma.id = t.magasin_destination
        LEFT JOIN employers e ON e.id = t.chauffeur_id
WHERE t.statut = 'en_transit'
ORDER BY t.date_creation DESC
        LIMIT 50
      `);
      return res.json(result.rows);
    }
if (action === 'logs-by-store') {
  const { magasin_id } = req.query;
  if (!magasin_id) return res.status(400).json({ error: 'magasin_id requis' });
  const result = await pool.query(`
    SELECT 
      a.id, a.date_reception AS date, a.utilisateur,
      l.description AS produit, a.quantite, a.unite,
      a.prix_ref, a.quantite * a.prix_ref AS montant,
      'admission' AS action
    FROM admissions a
    LEFT JOIN lots l ON l.id = a.lot_id
    WHERE a.magasin_id = $1
      AND a.date_reception >= CURRENT_DATE - INTERVAL '30 days'
    UNION ALL
    SELECT
     r.id, r.date_sortie AS date, r.utilisateur,
      l.description AS produit, r.quantite, r.unite,
      r.prix_ref, r.quantite * r.prix_ref AS montant,
      r.type_retrait AS action
    FROM retraits r
    LEFT JOIN lots l ON l.id = r.lot_id
    WHERE r.magasin_id = $1
      AND r.date_sortie >= CURRENT_DATE - INTERVAL '30 days'
    ORDER BY date DESC
    LIMIT 50
  `, [magasin_id]);
  return res.json(result.rows);
}
    return res.status(400).json({ error: 'action requise : performance-by-store | recent-logs | global-stats | pending-transfers' });
  } catch (err) {
    console.error('Erreur audit:', err.message);
    return res.status(500).json({ error: 'Erreur serveur', details: err.message });
  }
}));
