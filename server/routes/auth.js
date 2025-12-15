//server/routes/auth.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

router.post('/login', async (req, res) => {
  console.log('=== POST /api/login ===');
  console.log('Body:', req.body);
  
  const { username, password } = req.body;
  
  // Validation
  if (!username || !password) {
    console.log('❌ Username ou password manquant');
    return res.status(400).json({ success: false, message: 'Données manquantes' });
  }
  
  try {
    console.log(`🔍 Recherche utilisateur: ${username}`);
    
    // ✅ CORRECTION : Utilisez des guillemets doubles pour les noms de colonnes
    const result = await pool.query(
      `SELECT id, username, role,
       FROM users
       WHERE username = $1
         AND password_hash = crypt($2, password_hash)`,
      [username, password]
    );
    
    console.log(`✅ Résultat requête: ${result.rows.length} utilisateur(s) trouvé(s)`);
    
    if (result.rows.length === 0) {
      console.log('❌ Identifiants incorrects');
      return res.status(401).json({ success: false, message: 'Identifiants incorrects' });
    }
    
    const user = result.rows[0];
    console.log('✅ Connexion réussie:', user.username);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
       // magasin_id: user.magasin_id || null // Gérer le cas superadmin sans magasin
      }
    });
  } catch (err) {
    console.error('❌ ERREUR LOGIN:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
  }
});

module.exports = router;

