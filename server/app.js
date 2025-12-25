//server/app.js
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

// 1. Déclarer les routeurs
const authRouter = require('./routes/auth');
const lotsRouter = require('./routes/lots');
const usersRouter = require('./routes/users');
const geoRoutes = require('./routes/geo');
const producteursRouter = require('./routes/producteurs');
const admissionsRouter = require('./routes/admissions');
const retraitsRouter = require('./routes/retraits');
const employersRouter = require('./routes/employers');
const magasinsRoutes = require('./routes/magasins');
const transfertsRoutes = require('./transferts/pending-audit');
const stocksRoutes = require('./routes/stocks');
//const errorsRoute = require('./logs/errors');

const app = express();

// 2. MIDDLEWARES DE CONFIGURATION (Indispensables avant les routes)
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware de logging pour voir ce qui arrive sur Render
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url}`);
  next();
});

// 3. FICHIERS STATIQUES (Sert le HTML/JS du dossier public)
app.use(express.static(path.join(__dirname, '..', 'public')));

// 4. ENREGISTREMENT DES ROUTES API
// Attention : authRouter gérait /api/login, on le branche sur /api
app.use('/api', authRouter); 
app.use('/api/lots', lotsRouter);
app.use('/api/users', usersRouter);
app.use('/api/producteurs', producteursRouter);
app.use('/api/admissions', admissionsRouter);
app.use('/api/retraits', retraitsRouter);
app.use('/api/employers', employersRouter);
app.use('/api/magasins', magasinsRoutes);
app.use('/api/geo', geoRoutes);
//app.use('/api/errors', errorsRoute);
app.use('/api/transferts', transfertsRoutes);
app.use('/api/stocks', stocksRoutes);
// 5. ROUTES DE BASE
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.post('/api/users', async (req, res) => {
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

// 6. GESTION DES 404 (TOUJOURS EN DERNIER)
app.use((req, res) => {
  console.log(`⚠️ 404 déclenché pour : ${req.url}`);
  res.status(404).json({ message: 'Route API non trouvée', path: req.url });
});

// Gestion des erreurs fatales
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur:', err);
  res.status(500).json({ message: 'Erreur interne serveur' });
});
//************************** Lots *************************//
// GET /api/lots/:id - Récupérer un lot spécifique
app.get('/api/lots/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await pool.query(`
            SELECT 
                id,
                description,
                categorie,
                date_creation,
                criteres_admission,
                unites_admises,
                prix_ref,
                stock_disponible,
                valeur_estimee_stock
            FROM lots
            WHERE id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Lot non trouvé' });
        }
        
        const lot = result.rows[0];
        
        // Parser les champs JSONB
        if (typeof lot.unites_admises === 'string') {
            try {
                lot.unites_admises = JSON.parse(lot.unites_admises);
            } catch (e) {
                lot.unites_admises = [];
            }
        }
        
        if (typeof lot.criteres_admission === 'string') {
            try {
                lot.criteres_admission = JSON.parse(lot.criteres_admission);
            } catch (e) {
                lot.criteres_admission = [];
            }
        }
        
        res.json(lot);
        
    } catch (err) {
        console.error('❌ Erreur /api/lots/:id:', err.message);
        res.status(500).json({ error: err.message });
    }
});
module.exports = app;








