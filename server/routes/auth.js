const express = require('express');
const router = express.Router();
const pool = require('../db');

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    // Vérification côté PostgreSQL avec pgcrypto
    const result = await pool.query(
      `SELECT id, username, role, magasin_id
       FROM users
       WHERE username = $1
         AND password_hash = crypt($2, password_hash)`,
      [username, password]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Identifiants incorrects' });
    }
    
    const user = result.rows[0];
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
    console.error('Erreur login:', err.message, err.stack);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;
