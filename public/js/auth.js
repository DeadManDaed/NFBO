// public/js/auth.js
// Fichier client - code exécuté dans le navigateur

// Récupère l'utilisateur courant depuis sessionStorage
function getCurrentUser() {
  const userInfo = sessionStorage.getItem("userInfo");
  if (!userInfo) return null;
  
  try {
    const data = JSON.parse(userInfo);
    return data.user || data;
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
    'auditeur': '/dashboard.html',
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
    // ✅ CORRECTION: utiliser des parenthèses, pas des backticks
    showError(`Accès refusé. Cette page nécessite le rôle: ${allowedRoles.join(' ou ')}`);
    setTimeout(() => redirectToRolePage(user.role), 2000);
    return false;
  }
  
  return true;
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

console.log('✅ auth.js chargé');
