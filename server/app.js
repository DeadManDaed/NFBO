// server/app.js
const express = require('express');
const bodyParser = require('body-parser');
const lotsRouter = require('./routes/lots');


const app = express();
app.use(express.static(path.join(__dirname, 'public')));

// Middlewares
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/lots', lotsRouter);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// 404
app.use((req, res) => res.status(404).json({ message: 'Not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error', err);
  res.status(500).json({ message: 'Erreur interne' });
});

module.exports = app;

