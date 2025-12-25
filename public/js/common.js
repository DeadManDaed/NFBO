// Récupère l'utilisateur courant depuis sessionStorage
function getCurrentUser() {
  const userInfo = AppUser.get();
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
