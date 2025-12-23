//server/app.js
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

// 1. Déclarer les routeurs
const authRouter = require('./routes/auth');
const lotsRouter = require('./routes/lots');
const geoRoutes = require('./routes/geo');
const producteursRouter = require('./routes/producteurs');
const admissionsRouter = require('./routes/admissions');
const retraitsRouter = require('./routes/retraits');
const employersRouter = require('./routes/employers');
const magasinsRoutes = require('./routes/magasins');
const transfertsRoutes = require('./server/transferts/pending-audit');
//const errorsRoute = require('./logs/errors');

const app = express();

// 2. MIDDLEWARES DE CONFIGURATION (Indispensables avant les routes)
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware de logging pour voir ce qui arrive sur Render
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url}`);
  next();
});

// 3. FICHIERS STATIQUES (Sert le HTML/JS du dossier public)
app.use(express.static(path.join(__dirname, '..', 'public')));

// 4. ENREGISTREMENT DES ROUTES API
// Attention : authRouter gérait /api/login, on le branche sur /api
app.use('/api', authRouter); 
app.use('/api/lots', lotsRouter);
app.use('/api/producteurs', producteursRouter);
app.use('/api/admissions', admissionsRouter);
app.use('/api/retraits', retraitsRouter);
app.use('/api/employers', employersRouter);
app.use('/api/magasins', magasinsRoutes);
app.use('/api/geo', geoRoutes);
//app.use('/api/errors', errorsRoute);
app.use('/api/transferts', transfertsRoutes);

// 5. ROUTES DE BASE
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// 6. GESTION DES 404 (TOUJOURS EN DERNIER)
app.use((req, res) => {
  console.log(`⚠️ 404 déclenché pour : ${req.url}`);
  res.status(404).json({ message: 'Route API non trouvée', path: req.url });
});

// Gestion des erreurs fatales
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur:', err);
  res.status(500).json({ message: 'Erreur interne serveur' });
});

module.exports = app;



