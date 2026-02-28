// api/personnel/index.js  →  Gère /api/users/* et /api/employers/*
//
// Routes exposées :
//   GET    /api/users                     → liste des utilisateurs système
//   GET    /api/users?id=X                → un utilisateur par id
//   GET    /api/users?magasin_id=X        → utilisateurs d'un magasin
//   POST   /api/users                     → créer un utilisateur
//   PUT    /api/users?id=X                → modifier un utilisateur
//   DELETE /api/users?id=X                → supprimer un utilisateur
//
//   GET    /api/employers                 → liste des employés
//   GET    /api/employers?magasin_id=X    → employés d'un magasin
//   POST   /api/employers                 → créer un employé
//   PUT    /api/employers?id=X            → modifier un employé
//   DELETE /api/employers?id=X            → supprimer un employé

const pool = require('../_lib/db');
const { withCors } = require('../_lib/cors');

module.exports = withCors(async (req, res) => {
  const { id, magasin_id } = req.query;

  // Déterminer la ressource cible depuis l'URL : /api/users/... ou /api/employers/...
  const url = req.url?.split('?')[0].replace(/\/$/, '');
  const isEmployers = url.includes('/employers');
  const isUsers     = url.includes('/users');

  if (!isUsers && !isEmployers) {
    return res.status(404).json({ error: 'Route introuvable. Utilisez /api/users ou /api/employers.' });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // BLOC USERS
  // ════════════════════════════════════════════════════════════════════════════
  if (isUsers) {

    // ─── GET /api/users ─────────────────────────────────────────────────────
    if (req.method === 'GET') {
      try {
        let query = 'SELECT id, username, role, prenom, nom, email, telephone, magasin_id, statut FROM users';
        const params = [];
        if (magasin_id) {
          query += ' WHERE magasin_id=$1';
          params.push(magasin_id);
        }
        if (id) {
          query += magasin_id ? ' AND id=$2' : ' WHERE id=$1';
          params.push(id);
        }
        query += ' ORDER BY id DESC';
        const result = await pool.query(query, params);

        if (id) {
          if (result.rows.length === 0) return res.status(404).json({ error: 'Utilisateur introuvable' });
          return res.json(result.rows[0]);
        }
        return res.json(result.rows);
      } catch (err) {
        console.error('[users GET] Erreur:', err.message);
        return res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
      }
    }

    // ─── POST /api/users ─────────────────────────────────────────────────────
    if (req.method === 'POST') {
      const { username, password, role, prenom, nom, email, telephone, magasin_id: mg, statut } = req.body;
      if (!username || !password || !role) {
        return res.status(400).json({ error: 'Champs obligatoires manquants (username, password, role)' });
      }
      try {
        const check = await pool.query('SELECT id FROM users WHERE username=$1', [username]);
        if (check.rows.length > 0) {
          return res.status(400).json({ error: "Ce nom d'utilisateur existe déjà" });
        }
        const result = await pool.query(
          `INSERT INTO users (username, password_hash, role, prenom, nom, email, telephone, magasin_id, statut)
           VALUES ($1, crypt($2, gen_salt('bf')), $3, $4, $5, $6, $7, $8, $9)
           RETURNING id, username, role, prenom, nom, email, telephone, magasin_id, statut`,
          [username, password, role, prenom || null, nom || null, email || null, telephone || null, mg || null, statut || 'actif']
        );
        return res.status(201).json(result.rows[0]);
      } catch (err) {
        if (err.code === '23505') return res.status(400).json({ error: 'Username ou Email déjà utilisé' });
        console.error('[users POST] Erreur:', err.message);
        return res.status(500).json({ error: 'Erreur serveur', details: err.message });
      }
    }

    // ─── PUT /api/users?id=X ─────────────────────────────────────────────────
    if (req.method === 'PUT' && id) {
      const { prenom, nom, email, role, telephone, statut, magasin_id: mg } = req.body;
      try {
        const result = await pool.query(
          `UPDATE users SET prenom=$1, nom=$2, email=$3, role=$4, telephone=$5, statut=$6, magasin_id=$7
           WHERE id=$8 RETURNING id, username, role, statut`,
          [prenom, nom, email, role, telephone, statut, mg || null, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Utilisateur introuvable' });
        return res.json(result.rows[0]);
      } catch (err) {
        console.error('[users PUT] Erreur:', err.message);
        return res.status(500).json({ error: 'Erreur lors de la mise à jour' });
      }
    }

    // ─── DELETE /api/users?id=X ──────────────────────────────────────────────
    if (req.method === 'DELETE' && id) {
      try {
        const result = await pool.query('DELETE FROM users WHERE id=$1 RETURNING username', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Utilisateur introuvable' });
        return res.json({ success: true, message: `Utilisateur "${result.rows[0].username}" supprimé` });
      } catch (err) {
        console.error('[users DELETE] Erreur:', err.message);
        return res.status(500).json({ error: 'Erreur serveur lors de la suppression' });
      }
    }

    return res.status(405).json({ error: `Méthode non supportée : ${req.method}` });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // BLOC EMPLOYERS
  // ════════════════════════════════════════════════════════════════════════════
  if (isEmployers) {

    // ─── GET /api/employers ──────────────────────────────────────────────────
    if (req.method === 'GET') {
      try {
        let query = 'SELECT id, nom, role, contact, date_embauche, statut, magasin_id FROM employers';
        const params = [];
        if (magasin_id) {
          query += ' WHERE magasin_id=$1';
          params.push(magasin_id);
        }
        if (id) {
          query += magasin_id ? ' AND id=$2' : ' WHERE id=$1';
          params.push(id);
        }
        query += ' ORDER BY nom';
        const result = await pool.query(query, params);

        if (id) {
          if (result.rows.length === 0) return res.status(404).json({ error: 'Employé introuvable' });
          return res.json(result.rows[0]);
        }
        return res.json(result.rows);
      } catch (err) {
        console.error('[employers GET] Erreur:', err.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }
    }

    // ─── POST /api/employers ─────────────────────────────────────────────────
    if (req.method === 'POST') {
      const { magasin_id: mg, nom, role, contact, date_embauche } = req.body;
      if (!nom || !role || !mg) {
        return res.status(400).json({ error: 'Champs obligatoires manquants (nom, role, magasin_id)' });
      }
      try {
        const result = await pool.query(
          `INSERT INTO employers (magasin_id, nom, role, contact, date_embauche)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [mg, nom, role, contact || null, date_embauche || null]
        );
        return res.status(201).json(result.rows[0]);
      } catch (err) {
        console.error('[employers POST] Erreur:', err.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }
    }

    // ─── PUT /api/employers?id=X ─────────────────────────────────────────────
    if (req.method === 'PUT' && id) {
      const { nom, role, contact, statut } = req.body;
      try {
        const result = await pool.query(
          `UPDATE employers SET nom=$1, role=$2, contact=$3, statut=$4 WHERE id=$5 RETURNING *`,
          [nom, role, contact || null, statut, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Employé introuvable' });
        return res.json(result.rows[0]);
      } catch (err) {
        console.error('[employers PUT] Erreur:', err.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }
    }

    // ─── DELETE /api/employers?id=X ──────────────────────────────────────────
    if (req.method === 'DELETE' && id) {
      try {
        const result = await pool.query('DELETE FROM employers WHERE id=$1 RETURNING nom', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Employé introuvable' });
        return res.json({ success: true, message: `Employé "${result.rows[0].nom}" supprimé` });
      } catch (err) {
        console.error('[employers DELETE] Erreur:', err.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }
    }

    return res.status(405).json({ error: `Méthode non supportée : ${req.method}` });
  }
});
