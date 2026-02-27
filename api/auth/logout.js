// api/auth/logout.js  →  POST /api/auth/logout
const { withCors } = require('../_lib/cors');

module.exports = withCors(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  // TODO: invalider le JWT si implémenté
  res.json({ message: 'Déconnexion réussie' });
});
