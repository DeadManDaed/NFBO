//server/app.js
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const lotsRouter = require('./routes/lots');
const authRouter = require('./routes/auth'); // ✅ Corrigé le chemin
const app = express();
const geoRoutes = require('./routes/geo'); // chemin adapté
app.use('/api', geoRoutes);
const producteursRouter = require('./routes/producteurs');
app.use('/api/producteurs', producteursRouter);
const admissionsRouter = require('./routes/admissions');
app.use('/api/admissions', admissionsRouter);
const retraitsRouter = require('./routes/retraits');
app.use('/api/retraits', retraitsRouter);
const employersRouter = require('./routes/employers');
app.use('/api/employers', employersRouter);
const magasinsRoutes = require('./routes/magasins');
app.use('/api/magasins', magasinsRoutes);

// Middleware de logging (doit être en premier)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`); // ✅ Corrigé la syntaxe
  next();
});

// Servir les fichiers statiques depuis le dossier 'public'
app.use(express.static(path.join(__dirname, '..', 'public')));

// Middlewares pour parser le corps des requêtes
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Routes API
app.use('/api/lots', lotsRouter);
app.use('/api', authRouter);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Route pour la page d'accueil (doit être AVANT le 404)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// 404 pour toutes les autres routes non gérées
app.use((req, res) => res.status(404).json({ message: 'Not found', path: req.url }));

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error('Unhandled error', err);
  res.status(500).json({ message: 'Erreur interne' });
});

module.exports = app;
