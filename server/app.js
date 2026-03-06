// server/app.js
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const pool = require('./db');

// 1. IMPORT DES ROUTEURS
const authRouter = require('./routes/auth');
const lotsRouter = require('./routes/lots');
const usersRouter = require('./routes/users');
const geoRoutes = require('./routes/geo');
const producteursRouter = require('./routes/producteurs');
const admissionsRouter = require('./routes/admissions');
const retraitsRouter = require('./routes/retraits');
const employersRouter = require('./routes/employers');
const magasinsRoutes = require('./routes/magasins');
const messageRoutes = require('./routes/messages');
const transfertsRoutes = require('./transferts/pending-audit');
const transfertsRouter = require('./routes/transferts');
const stocksRoutes = require('./routes/stocks');
const auditRoutes = require('./routes/audit');

const app = express();

// 2. MIDDLEWARES
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Logging
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url}`);
    next();
});

// 3. BRANCHEMENT DES ROUTES API
app.use('/api/auth', authRouter); 
app.use('/api/login', authRouter); 
app.use('/api/lots', lotsRouter);
app.use('/api/users', usersRouter);
app.use('/api/producteurs', producteursRouter);
app.use('/api/admissions', admissionsRouter);
app.use('/api/retraits', retraitsRouter);
app.use('/api/employers', employersRouter);
app.use('/api/magasins', magasinsRoutes);
app.use('/api/geo', geoRoutes);
app.use('/api/transferts', transfertsRoutes);
app.use('/api/stocks', stocksRoutes);
app.use('/api/transferts', transfertsRouter);
app.use('/api/audit', auditRoutes);
app.use('/api/messages', messageRoutes);

// 4. ENDPOINTS DIRECTS (DRILL-DOWN)
app.get('/api/magasins/:id/admissions', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT a.id, a.date_reception as date_operation, a.quantite, l.description as produit, a.utilisateur as operateur
            FROM admissions a LEFT JOIN lots l ON a.lot_id = l.id
            WHERE a.magasin_id = $1::integer ORDER BY a.date_reception DESC LIMIT 100
        `, [id]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/magasins/:id/retraits', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT r.id, r.date_sortie, r.quantite, l.description as produit, r.utilisateur as operateur
            FROM retraits r LEFT JOIN lots l ON r.lot_id = l.id
            WHERE r.magasin_id = $1::integer ORDER BY r.date_sortie DESC LIMIT 100
        `, [id]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/magasins/:id/stocks', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT lot_id, magasin_id, description as nom, prix_ref, unites_admises, categorie, unite, stock_actuel, derniere_reception as date_derniere_entree
            FROM stocks WHERE magasin_id = $1 ORDER BY stock_actuel DESC
        `, [id]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 5. EXPORT POUR VERCEL
module.exports = app;

// 6. LANCEMENT LOCAL (uniquement hors production)
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 Serveur local sur http://localhost:${PORT}`));
}



