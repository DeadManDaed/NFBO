const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username=$1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Utilisateur inconnu' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Mot de passe incorrect' });
    }

    // Réponse enrichie
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
    console.error('Erreur login:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;
