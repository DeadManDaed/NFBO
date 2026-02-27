// server/routes/auth.js
// Gère l'authentification des utilisateurs (Login)

const express = require('express');
const router = express.Router();
const pool = require('../db'); // Connexion à la base de données (maintenant Supabase)

/**
 * POST /api/auth/login
 * Login utilisateur
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

    // Retourner l'utilisateur
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

/**
 * ✅ NOUVELLE ROUTE
 * GET /api/auth/me
 * Récupérer l'utilisateur connecté
 */
router.get('/me', async (req, res) => {
  try {
    // TODO: Plus tard, vérifier un JWT token ou une session
    // Pour l'instant, retourner un utilisateur fictif pour que React fonctionne
    
    res.json({
      id: 1,
      username: 'admin',
      role: 'superadmin',
      magasin_id: 1,
      nom: 'Administrateur',
    });
  } catch (err) {
    console.error('❌ Erreur /auth/me:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/auth/logout
 * Déconnexion
 */
router.post('/logout', async (req, res) => {
  // TODO: Supprimer la session ou invalider le token
  res.json({ message: 'Déconnexion réussie' });
});

module.exports = router;