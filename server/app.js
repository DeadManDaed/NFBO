// server/app.js
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const lotsRouter = require('./routes/lots');

const app = express();
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Servir les fichiers statiques depuis le dossier 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Middlewares pour parser le corps des requêtes
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Routes API
app.use('/api/lots', lotsRouter);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// 404 pour toutes les autres routes non gérées
app.use((req, res) => res.status(404).json({ message: 'Not found' }));

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error('Unhandled error', err);
  res.status(500).json({ message: 'Erreur interne' });
});

module.exports = app;

