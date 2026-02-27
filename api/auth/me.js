// api/auth/me.js  →  GET /api/auth/me
// Pour l'instant retourne un mock ; à remplacer par JWT plus tard
const { withCors } = require('../_lib/cors');

module.exports = withCors(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).end();

  // TODO: décoder un JWT depuis Authorization header
  // const token = req.headers.authorization?.split(' ')[1];
  // const user = verifyJWT(token);

  res.json({
    id: 1,
    username: 'admin',
    role: 'superadmin',
    magasin_id: 1,
    nom: 'Administrateur'
  });
});