// server/routes/auth.js
// Gère l'authentification des utilisateurs (Login)

const express = require('express');
const router = express.Router();
const pool = require('../db'); // Connexion à la base de données Render

// Cette route répond à : POST /api/auth/login
router.post('/login', async (req, res) => {
  console.log('=== Tentative de connexion ===');
  console.log('Username reçu:', req.body.username);
  
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Identifiant et mot de passe requis' });
  }
  
  try {
    // Vérification sécurisée via pgcrypto (password_hash est comparé via crypt)
    const result = await pool.query(
      `SELECT id, username, role, magasin_id
       FROM users
       WHERE username = $1
         AND password_hash = crypt($2, password_hash)
         AND statut = 'actif'`, // On vérifie aussi que le compte est actif
      [username, password]
    );
    
    if (result.rows.length === 0) {
      console.log(`❌ Échec de connexion pour: ${username}`);
      return res.status(401).json({ success: false, message: 'Identifiants incorrects ou compte inactif' });
    }
    
    const user = result.rows[0];
    console.log(`✅ Connexion réussie : ${user.username} (${user.role})`);
    
    // On renvoie un objet "user" propre que public/js/auth.js pourra stocker
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        magasin_id: user.magasin_id || null
      }
    });

  } catch (err) {
    console.error('❌ ERREUR CRITIQUE LOGIN:', err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur lors de la connexion',
      error: err.message 
    });
  }
});

module.exports = router;
