/**
 * server/app.js - Cœur du backend (Version 2025-12-25)
 * Configuration complète pour déploiement et tests full-scale
 */

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

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
    const { id } = req.params;
    
    try {
        const result = await pool.query(`
            SELECT 
                a.id,
                a.date_creation as date_operation,
                a.quantite_brute as quantite,
                l.description as produit,
                u.username as operateur
            FROM admissions a
            LEFT JOIN lots l ON a.lot_id = l.id
            LEFT JOIN users u ON a.user_id = u.id
            WHERE a.magasin_id = $1
            ORDER BY a.date_creation DESC
            LIMIT 100
        `, [id]);
        
        res.json(result.rows);
    } catch (err) {
        console.error('❌ Erreur /api/magasins/:id/admissions:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/magasins/:id/retraits
app.get('/api/magasins/:id/retraits', async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await pool.query(`
            SELECT 
                r.id,
                r.date_operation,
                r.quantite,
                l.description as produit,
                u.username as operateur
            FROM retraits r
            LEFT JOIN lots l ON r.lot_id = l.id
            LEFT JOIN users u ON r.user_id = u.id
            WHERE r.magasin_id = $1
            ORDER BY r.date_operation DESC
            LIMIT 100
        `, [id]);
        
        res.json(result.rows);
    } catch (err) {
        console.error('❌ Erreur /api/magasins/:id/retraits:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/magasins/:id/transferts
app.get('/api/magasins/:id/transferts', async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await pool.query(`
            SELECT 
                t.id,
                t.date_creation as date_operation,
                t.quantite,
                l.description as produit,
                u.username as operateur,
                CASE 
                    WHEN t.magasin_depart = $1 THEN 'Envoyé vers ' || m2.nom
                    ELSE 'Reçu de ' || m1.nom
                END as details
            FROM transferts t
            LEFT JOIN lots l ON t.lot_id = l.id
            LEFT JOIN users u ON t.user_id = u.id
            LEFT JOIN magasins m1 ON t.magasin_depart = m1.id
            LEFT JOIN magasins m2 ON t.magasin_destination = m2.id
            WHERE t.magasin_depart = $1 OR t.magasin_destination = $1
            ORDER BY t.date_creation DESC
            LIMIT 100
        `, [id]);
        
        res.json(result.rows);
    } catch (err) {
        console.error('❌ Erreur /api/magasins/:id/transferts:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/magasins/:id/stocks
app.get('/api/magasins/:id/stocks', async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await pool.query(`
            SELECT 
                s.id,
                l.description as nom,
                s.stock_actuel,
                l.prix_ref,
                l.categorie,
                s.date_expiration,
                s.seuil_alerte
            FROM stocks s
            LEFT JOIN lots l ON s.lot_id = l.id
            WHERE s.magasin_id = $1
            ORDER BY s.stock_actuel DESC
        `, [id]);
        
        res.json(result.rows);
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


