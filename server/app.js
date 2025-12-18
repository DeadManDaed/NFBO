//server/app.js
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const lotsRouter = require('./routes/lots');
const authRouter = require('./routes/auth'); // ✅ Corrigé le chemin
const app = express();
const geoRoutes = require('./routes/geo'); // chemin adapté
app.use('/api', geoRoutes);
const producteursRouter = require('./routes/producteurs');
app.use('/api/producteurs', producteursRouter);
const admissionsRouter = require('./routes/admissions');
app.use('/api/admissions', admissionsRouter);
const retraitsRouter = require('./routes/retraits');
app.use('/api/retraits', retraitsRouter);
const employersRouter = require('./routes/employers');
app.use('/api/employers', employersRouter);

// Middleware de logging (doit être en premier)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`); // ✅ Corrigé la syntaxe
  next();
});

// Servir les fichiers statiques depuis le dossier 'public'
app.use(express.static(path.join(__dirname, '..', 'public')));

// Middlewares pour parser le corps des requêtes
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Routes API
app.use('/api/lots', lotsRouter);
app.use('/api', authRouter);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Route pour la page d'accueil (doit être AVANT le 404)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// 404 pour toutes les autres routes non gérées
app.use((req, res) => res.status(404).json({ message: 'Not found', path: req.url }));

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error('Unhandled error', err);
  res.status(500).json({ message: 'Erreur interne' });
});

// Récupère l'utilisateur courant depuis sessionStorage
function getCurrentUser() {
  const userInfo = sessionStorage.getItem("userInfo");
  return userInfo ? JSON.parse(userInfo) : null;
}

// Vérifie qu'un utilisateur est connecté, sinon redirige
function requireLogin() {
  const user = getCurrentUser();
  if (!user || !user.username || !user.role) {
    showError("Session invalide. Veuillez vous reconnecter.");
    setTimeout(() => window.location.href = "/index.html", 2000);
    return null;
  }
  return user;
}

// Affiche un message d'erreur (simple exemple)
function showError(message) {
  const errorBox = document.getElementById("errorBox");
  if (errorBox) {
    errorBox.textContent = message;
    errorBox.style.display = "block";
  } else {
    alert(message);
  }
}

// Charge le contenu en fonction du rôle
function loadRoleContent(role) {
  let html = "";

  switch (role) {
    case "superadmin":
      html = "<p>Accès illimité : gestion globale, configuration système, supervision des admins.</p>";
      break;
    case "admin":
      html = "<p>Accès complet : gestion des utilisateurs, audit, caisse et stock.</p>";
      break;
    case "auditeur":
      html = "<p>Accès audit : consultation des journaux, vérification des opérations, rapports.</p>";
      break;
    case "caisse":
      html = "<p>Accès caisse : opérations financières et chèques.</p>";
      break;
    case "stock":
      html = "<p>Accès stock : gestion des lots, inventaire et alertes.</p>";
      break;
    default:
      html = "<p>Rôle non reconnu. Contactez un administrateur.</p>";
  }

  const roleContent = document.getElementById("roleContent");
  if (roleContent) {
    roleContent.innerHTML = `<h2>Section ${role}</h2>${html}`;
  }
}

module.exports = app;



