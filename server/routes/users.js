//server/routes/users.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // Import de ta connexion pool

// ✅ GET : Lister tous les utilisateurs (ou filtrer par magasin)
router.get('/', async (req, res) => {
    const { magasin_id } = req.query;
    try {
        let query = 'SELECT id, username, role, prenom, nom, email, telephone, magasin_id, statut FROM users';
        let params = [];

        if (magasin_id) {
            query += ' WHERE magasin_id = $1';
            params.push(magasin_id);
        }
        
        query += ' ORDER BY id DESC';
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('❌ Erreur GET /api/users:', err.message);
        res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
    }
});

// ✅ POST : Créer un utilisateur (Déplacé depuis app.js)
router.post('/', async (req, res) => {
    const { username, password, role, prenom, nom, email, telephone, magasin_id, statut } = req.body;
    
    console.log('🔵 Création utilisateur:', username, role);
    
    try {
        // 1. Vérifier si l'username existe déjà
        const checkUser = await db.query('SELECT id FROM users WHERE username = $1', [username]);
        if (checkUser.rows.length > 0) {
            return res.status(400).json({ error: 'Ce nom d\'utilisateur existe déjà' });
        }
        
        // 2. Insérer avec cryptage pgcrypto (BF = Blowfish)
        const result = await db.query(`
            INSERT INTO users (
                username, password_hash, role, prenom, nom, email, telephone, magasin_id, statut
            ) VALUES (
                $1, crypt($2, gen_salt('bf')), $3, $4, $5, $6, $7, $8, $9
            )
            RETURNING id, username, role, prenom, nom, email, telephone, magasin_id, statut
        `, [username, password, role, prenom, nom, email, telephone, magasin_id, statut || 'actif']);
        
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('❌ Erreur SQL création user:', err.message);
        if (err.code === '23505') return res.status(400).json({ error: 'Username ou Email déjà utilisé' });
        res.status(500).json({ error: 'Erreur serveur', details: err.message });
    }
});

// ✅ PUT : Mettre à jour un utilisateur
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { prenom, nom, email, role, telephone, statut, magasin_id } = req.body;
    try {
        const result = await db.query(`
            UPDATE users 
            SET prenom=$1, nom=$2, email=$3, role=$4, telephone=$5, statut=$6, magasin_id=$7
            WHERE id=$8 RETURNING id, username, role, statut
        `, [prenom, nom, email, role, telephone, statut, magasin_id, id]);

        if (result.rows.length === 0) return res.status(404).json({ error: 'Utilisateur introuvable' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }
});

// ✅ DELETE : Supprimer un utilisateur
router.delete('/:id', async (req, res) => {
    try {
        const result = await db.query('DELETE FROM users WHERE id=$1 RETURNING username', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Utilisateur introuvable' });
        res.json({ success: true, message: `Utilisateur ${result.rows[0].username} supprimé` });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur lors de la suppression' });
    }
});

module.exports = router;
