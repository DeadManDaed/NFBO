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

