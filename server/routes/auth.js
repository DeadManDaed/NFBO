// server/routes/auth.js
// Gère l'authentification des utilisateurs (Login)

const express = require('express');
const router = express.Router();
const pool = require('../db'); // Connexion à la base de données Render

/**
 * Cette route répond désormais à : 
 * POST /api/login (car branchée sur /api/login dans app.js)
 * OU POST /api/auth/login
 */
router.post(['/', '/login'], async (req, res) => {
  console.log('=== Tentative de connexion ===');
  
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ message: 'Identifiant et mot de passe requis' });
  }
  
  try {
    // Vérification sécurisée via pgcrypto
    const result = await pool.query(
      `SELECT id, username, role, magasin_id
       FROM users
       WHERE username = $1
         AND password_hash = crypt($2, password_hash)
         AND statut = 'actif'`,
      [username, password]
    );
    
    if (result.rows.length === 0) {
      console.log(`❌ Échec de connexion pour: ${username}`);
      return res.status(401).json({ message: 'Identifiants incorrects ou compte inactif' });
    }
    
    const user = result.rows[0];
    console.log(`✅ Connexion réussie : ${user.username} (${user.role})`);
    
    // IMPORTANT : On renvoie directement l'objet attendu par loginForm.onsubmit
    // data.user doit exister pour que sessionStorage.setItem('user', ...) fonctionne
    res.json({
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
      message: 'Erreur serveur lors de la connexion',
      error: err.message 
    });
  }
});

module.exports = router;
