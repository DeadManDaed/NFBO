//server/routes/auth.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

router.post('/login', async (req, res) => {
  console.log('=== POST /api/login ===');
  console.log('Body:', req.body);
  
  const { username, password } = req.body;
  
// Récupère l'utilisateur courant depuis sessionStorage
function getCurrentUser() {
  const userInfo = sessionStorage.getItem("userInfo");
  if (!userInfo) return null;
  
  try {
    const data = JSON.parse(userInfo);
    return data.user || data; // Support pour différents formats
  } catch (e) {
    console.error('Erreur parsing userInfo:', e);
    return null;
  }
}

// Vérifie qu'un utilisateur est connecté, sinon redirige
function requireLogin() {
  const user = getCurrentUser();
  if (!user || !user.username || !user.role) {
    sessionStorage.clear();
    window.location.href = "/index.html";
    return null;
  }
  return user;
}

// Déconnexion
function logout() {
  sessionStorage.clear();
  window.location.href = "/index.html";
}

// Affiche un message d'erreur
function showError(message) {
  const errorBox = document.getElementById("errorBox");
  if (errorBox) {
    errorBox.textContent = message;
    errorBox.style.display = "block";
  } else {
    alert(message);
  }
}

// Redirige vers la page appropriée selon le rôle
function redirectToRolePage(role) {
  const rolePages = {
    'superadmin': '/administration.html',
    'admin': '/administration.html',
    'auditeur': '/dashboard.html', // Page d'audit/consultation
    'caisse': '/caisse.html',
    'stock': '/stock.html'
  };
  
  const page = rolePages[role] || '/dashboard.html';
  window.location.href = page;
}

// Vérifie si l'utilisateur a accès à la page actuelle
function checkPageAccess(allowedRoles) {
  const user = requireLogin();
  if (!user) return false;
  
  if (!allowedRoles.includes(user.role)) {
    showError(`Accès refusé. Cette page nécessite le rôle: ${allowedRoles.join(' ou ')}`);
    setTimeout(() => redirectToRolePage(user.role), 2000);
    return false;
  }
  
  return true;
}
module.exports = router;
