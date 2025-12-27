// server/routes/audit.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

// Middleware de vérification de rôle
const requireAuditRole = (req, res, next) => {
    const userRole = req.headers['x-user-role'] || req.query.role;
    if (userRole !== 'superadmin' && userRole !== 'admin' && userRole !== 'auditeur') {
        return res.status(403).json({ error: 'Accès refusé : Droits insuffisants' });
    }
    next();
};

// ✅ GET : Performance par magasin
router.get('/performance-by-store', requireAuditRole, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM vue_performance_magasins');
        res.json(result.rows);
    } catch (err) {
        console.error('❌ Erreur performance-by-store:', err);
        res.status(500).json({ error: 'Erreur serveur', details: err.message });
    }
});

// ✅ GET : Logs d'audit récents
router.get('/recent-logs', requireAuditRole, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                a.id,
                a.date,
                a.utilisateur,
                a.action,
                'Système' AS type,
                0 AS montant,
                '' AS magasin
            FROM audit a
            WHERE a.date >= CURRENT_DATE - INTERVAL '7 days'
            ORDER BY a.date DESC
            LIMIT 50
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('❌ Erreur recent-logs:', err);
        res.status(500).json({ error: 'Erreur serveur', details: err.message });
    }
});

// ✅ GET : Statistiques globales
router.get('/global-stats', requireAuditRole, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                COALESCE(SUM(benefice_estime), 0) AS profit_total,
                COALESCE(SUM(quantite), 0) AS quantite_totale,
                COUNT(CASE WHEN coef_qualite < 0.8 THEN 1 END) AS alertes_qualite
            FROM admissions
            WHERE date_reception >= CURRENT_DATE - INTERVAL '30 days'
        `);
        res.json(result.rows[0]);
    } catch (err) {
        console.error('❌ Erreur global-stats:', err);
        res.status(500).json({ error: 'Erreur serveur', details: err.message });
    }
});

module.exports = router;
