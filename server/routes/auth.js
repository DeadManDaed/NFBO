//server/routes/auth.js
const express = require('express');
const router = express.Router();
const pool = require('./db'); // assure-toi que db.js est bien dans server/

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('🔍 Tentative de login pour:', username);

  try {
    // Requête SQL sur une seule ligne pour éviter les erreurs de syntaxe
    const result = await pool.query(
      'SELECT id, username, role, magasin_id FROM users WHERE username = $1 AND password_hash = crypt($2, password_hash)',
      [username, password]
    );

    if (result.rows.length === 0) {
      console.log('❌ Identifiants incorrects pour:', username);
      return res.status(401).json({ success: false, message: 'Identifiants incorrects' });
    }

    const user = result.rows[0];
    console.log('✅ Authentification réussie pour:', user.username);

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        magasin_id: user.magasin_id
      }
    });
  } catch (err) {
    console.error('❌ ERREUR LOGIN:', err.message);
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;

