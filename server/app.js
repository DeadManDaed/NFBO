/**
 * server/app.js - Cœur du backend (Version 2025-12-25)
 * Configuration complète pour déploiement et tests full-scale
 */

/*

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


// 2. MIDDLEWARES DE CONFIGURATION
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware de logging (Essentiel pour Render selon tes notes du 21-12)
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url}`);
    next();
});

// 3. FICHIERS STATIQUES
app.use(express.static(path.join(__dirname, '..', 'public')));

// 4. BRANCHEMENT DES ROUTES API
// CORRECTION : Nous ajoutons /api/login directement ou nous ajustons le préfixe
app.use('/api/auth', authRouter); 

// Ajout d'un alias pour correspondre à l'appel du frontend fetch('/api/login')
// Cela redirige l'appel vers le routeur d'authentification
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
app.use('/api/destinataires', (req, res, next) => {
    req.url = '/destinataires'; // Redirige vers la route interne du router
    messageRoutes(req, res, next);
});
// 5. ROUTES DE MAINTENANCE ET TEST
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date(),
        version: '1.0.4-stable'
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});


// ============================================
// ENDPOINTS POUR LE DRILL-DOWN MAGASIN
// ============================================

// GET /api/magasins/:id/admissions
app.get('/api/magasins/:id/admissions', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT 
                a.id,
                a.date_reception as date_operation,
                a.quantite as quantite,
                l.description as produit,
                a.utilisateur as operateur -- VARCHAR : OK
            FROM admissions a
            LEFT JOIN lots l ON a.lot_id = l.id
            WHERE a.magasin_id = $1::integer -- Conversion nécessaire pour l'ID magasin
            ORDER BY a.date_reception DESC
            LIMIT 100
        `, [id]);
        res.json(result.rows);
    } catch (err) {
        console.error('❌ Erreur admissions:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/magasins/:id/retraits
app.get('/api/magasins/:id/retraits', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT 
                r.id,
                r.date_sortie,
                r.quantite,
                l.description as produit,
                r.utilisateur as operateur -- VARCHAR : OK
            FROM retraits r
            LEFT JOIN lots l ON r.lot_id = l.id
            WHERE r.magasin_id = $1::integer
            ORDER BY r.date_sortie DESC
            LIMIT 100
        `, [id]);
        res.json(result.rows);
    } catch (err) {
        console.error('❌ Erreur retraits:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/magasins/:id/transferts
app.get('/api/magasins/:id/transferts', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT 
                t.id,
                t.date_creation as date_operation,
                t.quantite,
                l.description as produit,
                t.utilisateur as operateur, -- VARCHAR : OK
                CASE 
                    WHEN t.magasin_depart = $1::integer THEN 'Envoyé vers ' || COALESCE(m2.nom, 'Inconnu')
                    ELSE 'Reçu de ' || COALESCE(m1.nom, 'Inconnu')
                END as details
            FROM transferts t
            LEFT JOIN lots l ON t.lot_id = l.id
            LEFT JOIN magasins m1 ON t.magasin_depart = m1.id
            LEFT JOIN magasins m2 ON t.magasin_destination = m2.id
            WHERE t.magasin_depart = $1::integer OR t.magasin_destination = $1::integer
            ORDER BY t.date_creation DESC
            LIMIT 100
        `, [id]);
        res.json(result.rows);
    } catch (err) {
        console.error('❌ Erreur transferts:', err.message);
        res.status(500).json({ error: err.message });
    }
});


// GET /api/magasins/:id/stocks

 app.get('/api/magasins/:id/stocks', async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await pool.query(`
            SELECT 
                lot_id,
                magasin_id,
                description as nom,
                prix_ref,
                unites_admises,
                categorie,
                unite,
                stock_actuel,
                derniere_reception as date_derniere_entree
            FROM stocks
            WHERE magasin_id = $1
            ORDER BY stock_actuel DESC
        `, [id]);
        
        // Parser les JSONB si nécessaire
        const stocks = result.rows.map(s => {
            if (typeof s.unites_admises === 'string') {
                try {
                    s.unites_admises = JSON.parse(s.unites_admises);
                } catch (e) {
                    s.unites_admises = [];
                }
            }
            return s;
        });
        
        res.json(stocks);
    } catch (err) {
        console.error('❌ Erreur /api/magasins/:id/stocks:', err.message);
        res.status(500).json({ error: err.message });
    }
}); 

// 6. GESTION DES ERREURS

app.use((req, res) => {
    console.warn(`⚠️ 404 - Route introuvable : ${req.method} ${req.url}`);
    res.status(404).json({ 
        error: 'Route API non trouvée', 
        path: req.url 
    });
});

app.use((err, req, res, next) => {
    console.error('❌ ERREUR SERVEUR FATALE :', err.stack);
    res.status(500).json({ 
        error: 'Erreur interne serveur',
        message: err.message
    });
});

module.exports = app;

*/

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
*/


