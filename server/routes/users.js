// routes/users.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// À placer AVANT la route /magasin/:magasinId
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM ' + (req.baseUrl.includes('users') ? 'users' : 'employers') + ' ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// GET tous les utilisateurs d’un magasin
router.get('/magasin/:magasinId', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, nom, email, role FROM users WHERE magasin_id=$1',
      [req.params.magasinId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST nouvel utilisateur
router.post('/api/users', async (req, res) => {
    const { username, password, role, prenom, nom, email, telephone, magasin_id, statut } = req.body;
    
    console.log('🔵 Création utilisateur:', username, role);
    
    try {
        // 1. Vérifier que l'username n'existe pas déjà
        const checkUser = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
        if (checkUser.rows.length > 0) {
            return res.status(400).json({ error: 'Ce nom d\'utilisateur existe déjà' });
        }
        
        // 2. Vérifier que l'email n'existe pas (si fourni)
        if (email) {
            const checkEmail = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
            if (checkEmail.rows.length > 0) {
                return res.status(400).json({ error: 'Cet email est déjà utilisé' });
            }
        }
        
        // 3. Insérer l'utilisateur avec PGCRYPTO pour hasher le mot de passe
        const result = await pool.query(`
            INSERT INTO users (
                username, 
                password_hash, 
                role, 
                prenom, 
                nom, 
                email, 
                telephone, 
                magasin_id, 
                statut
            ) VALUES (
                $1, 
                crypt($2, gen_salt('bf')), 
                $3, 
                $4, 
                $5, 
                $6, 
                $7, 
                $8, 
                $9
            )
            RETURNING id, username, role, prenom, nom, email, telephone, magasin_id, statut
        `, [username, password, role, prenom, nom, email, telephone, magasin_id, statut || 'actif']);
        
        console.log('✅ Utilisateur créé:', result.rows[0]);
        res.status(201).json(result.rows[0]);
        
    } catch (err) {
        console.error('❌ Erreur création utilisateur:', err.message);
        console.error('   Code:', err.code);
        console.error('   Detail:', err.detail);
        
        if (err.code === '23505') { // Violation de contrainte unique
            return res.status(400).json({ error: 'Données dupliquées (username ou email)' });
        }
        
        if (err.code === '23514') { // Violation de CHECK constraint (rôle invalide)
            return res.status(400).json({ error: 'Rôle invalide. Utilisez: superadmin, admin, auditeur, caisse, ou stock' });
        }
        
        res.status(500).json({ 
            error: 'Erreur lors de la création de l\'utilisateur',
            details: err.message 
        });
    }
});

// PUT mise à jour
router.put('/:id', async (req, res) => {
  const { nom, email, role } = req.body;
  try {
    const result = await db.query(
      `UPDATE users SET nom=$1, email=$2, role=$3 WHERE id=$4 RETURNING *`,
      [nom, email, role, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
