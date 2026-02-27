// api/auth/login.js  →  POST /api/auth/login
const pool = require('../_lib/db');
const { withCors } = require('../_lib/cors');

module.exports = withCors(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Identifiant et mot de passe requis' });
  }

  try {
    const result = await pool.query(
      `SELECT id, username, role, magasin_id
       FROM users
       WHERE username = $1
         AND password_hash = crypt($2, password_hash)
         AND statut = 'actif'`,
      [username, password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Identifiants incorrects ou compte inactif' });
    }

    const user = result.rows[0];

    res.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        magasin_id: user.magasin_id || null
      }
    });

  } catch (err) {
    console.error('Erreur login:', err.message);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});
