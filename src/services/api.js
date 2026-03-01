// src/services/api.js
// Toutes les requêtes API passent par request().
// Le token JWT est lu depuis localStorage et injecté automatiquement.
// Si le serveur répond 401 → déconnexion silencieuse via événement 'auth:expired'.
// Si le serveur répond 403 → erreur claire "rôle insuffisant".

const API_BASE = '/api';
const TOKEN_KEY = 'nbfo_token';

class ApiService {

  // ─── Requête de base ────────────────────────────────────────────────────────
  async request(endpoint, options = {}) {
    const token = localStorage.getItem(TOKEN_KEY);

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.headers || {}),
        },
      });

      // Token expiré ou invalide → déconnexion automatique
      if (response.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        window.dispatchEvent(new Event('auth:expired'));
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }

      // Accès refusé → rôle insuffisant
      if (response.status === 403) {
        throw new Error('Accès refusé : vous n\'avez pas les droits nécessaires.');
      }

      if (!response.ok) {
        const errObj = await response.json().catch(() => null);
        throw new Error(errObj?.message || errObj?.error || `Erreur HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`❌ API [${options.method || 'GET'}] ${endpoint}:`, error.message);
      throw error;
    }
  }

  // ─── Vérification de rôle côté client (pré-filtre UX) ───────────────────────
  // Utilisation : api.checkRole(['superadmin', 'admin']) → lance une erreur si KO
  // Cela ne remplace PAS la vérification serveur — c'est uniquement pour l'UX.
  checkRole(allowedRoles) {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error('Non authentifié');

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!allowedRoles.includes(payload.role)) {
        throw new Error(`Action réservée aux rôles : ${allowedRoles.join(', ')}`);
      }
      return payload; // Retourne le payload si le rôle est OK
    } catch (err) {
      throw new Error('Token invalide ou rôle non vérifié');
    }
  }

  // ─── Décoder le token sans vérification serveur (usage UI uniquement) ────────
  decodeToken() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  }

  // ========== AUTH ==========

  async login(credentials) {
    // Pas de token sur le login — requête publique
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Identifiants incorrects');
    }

    const data = await response.json();
    // Stocker le token dès la réponse
    if (data.token) localStorage.setItem(TOKEN_KEY, data.token);
    return data;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  // ========== LOTS ==========

  async getLots() {
    return this.request('/lots');
  }

  async getLot(id) {
    return this.request(`/lots?id=${id}`);
  }

  async createLot(data) {
    this.checkRole(['superadmin', 'admin']);
    return this.request('/lots', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateLot(id, data) {
    this.checkRole(['superadmin', 'admin']);
    return this.request(`/lots?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteLot(id) {
    this.checkRole(['superadmin']);
    return this.request(`/lots?id=${id}`, { method: 'DELETE' });
  }

  // ========== ADMISSIONS ==========

  async getAdmissions() {
    return this.request('/admissions');
  }

  async createAdmission(data) {
    this.checkRole(['superadmin', 'admin', 'stock']);
    return this.request('/admissions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteAdmission(id) {
    this.checkRole(['superadmin']);
    return this.request(`/admissions?id=${id}`, { method: 'DELETE' });
  }

  // ========== RETRAITS ==========

  async getRetraits() {
    return this.request('/retraits');
  }

  async getRetrait(id) {
    return this.request(`/retraits?id=${id}`);
  }

  async createRetrait(data) {
    this.checkRole(['superadmin', 'admin', 'stock']);
    return this.request('/retraits', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteRetrait(id) {
    this.checkRole(['superadmin']);
    return this.request(`/retraits?id=${id}`, { method: 'DELETE' });
  }

  // ========== STOCKS ==========

  async getStocks() {
    return this.request('/stocks');
  }

  async getStockDisponible(magasinId) {
    return this.request(`/lots/stock?magasinId=${magasinId}`);
  }

  // ========== TRANSFERTS ==========

  async getTransferts() {
    return this.request('/transferts');
  }

  async createTransfert(data) {
    this.checkRole(['superadmin', 'admin']);
    return this.request('/transferts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ========== PRODUCTEURS ==========

  async getProducteurs() {
    return this.request('/producteurs');
  }

  async getProducteur(id) {
    return this.request(`/producteurs?id=${id}`);
  }

  async createProducteur(data) {
    this.checkRole(['superadmin', 'admin', 'stock']);
    return this.request('/producteurs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProducteur(id, data) {
    this.checkRole(['superadmin', 'admin']);
    return this.request(`/producteurs?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProducteur(id) {
    this.checkRole(['superadmin']);
    return this.request(`/producteurs?id=${id}`, { method: 'DELETE' });
  }

  // ========== MAGASINS ==========

  async getMagasins() {
    return this.request('/magasins');
  }

  async createMagasin(data) {
    this.checkRole(['superadmin']);
    return this.request('/magasins', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMagasin(id, data) {
    this.checkRole(['superadmin']);
    return this.request(`/magasins?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteMagasin(id) {
    this.checkRole(['superadmin']);
    return this.request(`/magasins?id=${id}`, { method: 'DELETE' });
  }

  // ========== EMPLOYERS ==========

  async getEmployers(magasinId = null) {
    const query = magasinId ? `?magasin_id=${magasinId}` : '';
    return this.request(`/employers${query}`);
  }

  async getChauffeurs(magasinId = null) {
    const employers = await this.getEmployers(magasinId);
    return employers.filter(e => e.role === 'chauffeur');
  }

  async createEmployer(data) {
    this.checkRole(['superadmin', 'admin']);
    return this.request('/employers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEmployer(id, data) {
    this.checkRole(['superadmin', 'admin']);
    return this.request(`/employers?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteEmployer(id) {
    this.checkRole(['superadmin', 'admin']);
    return this.request(`/employers?id=${id}`, { method: 'DELETE' });
  }

  // ========== USERS ==========

  async getUsers(magasinId = null) {
    this.checkRole(['superadmin', 'admin']);
    const query = magasinId ? `?magasin_id=${magasinId}` : '';
    return this.request(`/users${query}`);
  }

  async createUser(data) {
    this.checkRole(['superadmin']);
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateUser(id, data) {
    this.checkRole(['superadmin', 'admin']);
    return this.request(`/users?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteUser(id) {
    this.checkRole(['superadmin']);
    return this.request(`/users?id=${id}`, { method: 'DELETE' });
  }

  // ========== GEO ==========
  // Routes publiques — pas de vérification de rôle

  async getRegions() {
    return this.request('/geo?type=regions');
  }

  async getDepartements(regionId = null) {
    const query = regionId ? `&region_id=${regionId}` : '';
    return this.request(`/geo?type=departements${query}`);
  }

  async getArrondissements(departementId = null) {
    const query = departementId ? `&departement_id=${departementId}` : '';
    return this.request(`/geo?type=arrondissements${query}`);
  }

  // ========== AUDIT ==========

  async getAuditPerformance() {
    this.checkRole(['superadmin', 'auditeur']);
    return this.request('/audit?action=performance-by-store');
  }

  async getAuditRecentLogs() {
    this.checkRole(['superadmin', 'auditeur']);
    return this.request('/audit?action=recent-logs');
  }

  async getAuditGlobalStats() {
    this.checkRole(['superadmin', 'auditeur']);
    return this.request('/audit?action=global-stats');
  }

  // ========== MESSAGES ==========

  async getMessages() {
    return this.request('/messages');
  }

  async getMessage(id) {
    return this.request(`/messages?id=${id}`);
  }

  async sendMessage(data) {
    return this.request('/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getDestinataires(role, magasinId = null) {
    const query = magasinId ? `&magasin_id=${magasinId}` : '';
    return this.request(`/messages?action=destinataires&role=${role}${query}`);
  }

  // ========== CAISSE ==========

  async getOperationsCaisse(params = {}) {
    this.checkRole(['superadmin', 'admin', 'caisse']);
    const query = new URLSearchParams(params).toString();
    return this.request(`/operations_caisse${query ? '?' + query : ''}`);
  }

  async createOperationCaisse(data) {
    this.checkRole(['superadmin', 'admin', 'caisse']);
    return this.request('/operations_caisse', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export default new ApiService();