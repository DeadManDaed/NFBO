// public/js/auth.js - Gestion de la session client

function getCurrentUser() {
    const userInfo = sessionStorage.getItem("userInfo");
    if (!userInfo) return null;
    try {
        const data = JSON.parse(userInfo);
        // Gère les deux formats possibles (objet direct ou {user: ...})
        return data.user || data;
    } catch (e) {
        console.error('Erreur parsing userInfo:', e);
        return null;
    }
}

function requireLogin() {
    const user = getCurrentUser();
    if (!user || !user.username || !user.role) {
        console.warn("Accès non autorisé : redirection vers login.");
        sessionStorage.clear();
        window.location.href = "/index.html";
        return null;
    }
    return user;
}

function logout() {
    sessionStorage.clear();
    window.location.href = "/index.html";
}

function showError(message) {
    const errorBox = document.getElementById("errorBox");
    if (errorBox) {
        errorBox.textContent = message;
        errorBox.style.display = "block";
        // Masquer après 5 secondes
        setTimeout(() => { errorBox.style.display = "none"; }, 5000);
    } else {
        alert(message);
    }
}

/**
 * Redirige l'utilisateur vers son tableau de bord spécifique.
 * Note : J'ai harmonisé les chemins vers la racine ou /pages/
 */
function redirectToRolePage(role) {
    const rolePages = {
        'superadmin': '/administration.html',
        'admin': '/administration.html',
        'auditeur': '/dashboard.html',
        'caisse': '/caisse.html',
        'stock': '/stock.html'
    };
    
    // Si tu utilises un dossier /pages/, ajoute le préfixe ici
    const page = rolePages[role] || '/dashboard.html';
    window.location.href = page;
}

function checkPageAccess(allowedRoles) {
    const user = requireLogin();
    if (!user) return false;
    
    if (!allowedRoles.includes(user.role)) {
        showError(`Accès refusé. Rôle requis : ${allowedRoles.join(' ou ')}`);
        // Redirection automatique après 2.5 secondes
        setTimeout(() => redirectToRolePage(user.role), 2500);
        return false;
    }
    return true;
}

function loadRoleContent(role) {
    const roleContent = document.getElementById("roleContent");
    if (!roleContent) return;

    const descriptions = {
        "superadmin": "Accès illimité : gestion globale et supervision système.",
        "admin": "Accès complet : gestion des utilisateurs, audit et stocks.",
        "auditeur": "Accès audit : rapports, journaux et vérifications.",
        "caisse": "Accès caisse : encaissements et flux financiers.",
        "stock": "Accès stock : inventaires, lots et alertes."
    };

    const html = descriptions[role] || "Rôle non reconnu. Contactez le support.";
    roleContent.innerHTML = `
        <div class="role-badge ${role}">Section ${role.toUpperCase()}</div>
        <p>${html}</p>
    `;
}

console.log('✅ auth.js opérationnel');
