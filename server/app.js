//server/app.js
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

// Importation des routeurs
const authRouter = require('./routes/auth');
const lotsRouter = require('./routes/lots');
const geoRoutes = require('./routes/geo');
const producteursRouter = require('./routes/producteurs');
const admissionsRouter = require('./routes/admissions');
const retraitsRouter = require('./routes/retraits');
const employersRouter = require('./routes/employers');
const magasinsRoutes = require('./routes/magasins');

const app = express();

// 1. MIDDLEWARES DE BASE (Doivent être en premier)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// 2. FICHIERS STATIQUES
app.use(express.static(path.join(__dirname, '..', 'public')));

// 3. ENREGISTREMENT DES ROUTES API
app.use('/api/auth', authRouter); // Nettoyage du préfixe
app.use('/api/lots', lotsRouter);
app.use('/api/producteurs', producteursRouter);
app.use('/api/admissions', admissionsRouter);
app.use('/api/retraits', retraitsRouter);
app.use('/api/employers', employersRouter);
app.use('/api/magasins', magasinsRoutes);
app.use('/api/geo', geoRoutes);

// 4. PAGES SPÉCIFIQUES ET HEALTH CHECK
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// 5. GESTION DES ERREURS (Doit être à la fin)
app.use((req, res) => {
  res.status(404).json({ message: 'Route API non trouvée', path: req.url });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error', err);
  res.status(500).json({ message: 'Erreur interne serveur' });
});

module.exports = app;
