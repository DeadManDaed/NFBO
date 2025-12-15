// server/app.js
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const lotsRouter = require('./routes/lots');
const app = express();
const authRouter = require('./auth');

// Middleware de logging (doit être en premier)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Servir les fichiers statiques depuis le dossier 'public'
app.use(express.static(path.join(__dirname, '..', 'public')));

// Middlewares pour parser le corps des requêtes
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Routes API
app.use('/api/lots', lotsRouter);
app.use('/api', authRouter);   // <-- ajoute cette ligne

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Route pour la page d'accueil (doit être AVANT le 404)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Middleware de debug pour routes non trouvées (OPTIONNEL - vous pouvez le retirer)
app.use((req, res, next) => {
  console.log('=== Route non trouvée ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Base URL:', req.baseUrl);
  console.log('Path:', req.path);
  next();
});

// 404 pour toutes les autres routes non gérées
app.use((req, res) => res.status(404).json({ message: 'Not found', path: req.url }));

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error('Unhandled error', err);
  res.status(500).json({ message: 'Erreur interne' });
});

module.exports = app;

