// api/index.js
const app = require('../server/app'); // On importe ton app Express existante

// Vercel a besoin que l'on exporte l'instance d'Express
module.exports = app;
