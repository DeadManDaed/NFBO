// src/services/api.js
// Toutes les requêtes API passent par request().
// Le token Supabase est lu depuis la session active et injecté automatiquement.

const API_BASE = '/api';

class ApiService {

  // ─── Token Supabase ──────────────────────────────────────────────────────────
  // ─── Token Supabase ──────────────────────────────────────────────────────────
async getToken() {
  try {
    const { supabase } = await import('../lib/supabase');
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    console.log('[api] token présent:', !!token, token?.substring(0, 20));
    return token || null;
  } catch (e) {
    console.error('[api] getToken error:', e.message);
    return null;
  }
}
  // ─── Requête de base ─────────────────────────────────────────────────────────
  async request(endpoint, options = {}) {
    const token = await this.getToken();

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.headers || {}),
        },
      });

      if (response.status === 401) {
        const { supabase } = await import('../lib/supabase');
        await supabase.auth.signOut();
        window.dispatchEvent(new Event('auth:expired'));
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }

      if (response.status === 403) {
        throw new Error("Accès refusé : vous n'avez pas les droits nécessaires.");
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

  // ========== AUTH ==========

  async logout() {
    const { supabase } = await import('../lib/supabase');
    await supabase.auth.signOut();
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
    return this.request('/lots', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateLot(id, data) {
    return this.request(`/lots?id=${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteLot(id) {
    return this.request(`/lots?id=${id}`, { method: 'DELETE' });
  }

  // ========== ADMISSIONS ==========

  async getAdmissions(magasinId = null) {
    const query = magasinId ? `?magasin_id=${magasinId}` : '';
    return this.request(`/admissions${query}`);
  }

  async createAdmission(data) {
    return this.request('/admissions', { method: 'POST', body: JSON.stringify(data) });
  }

  async deleteAdmission(id) {
    return this.request(`/admissions?id=${id}`, { method: 'DELETE' });
  }

  // ========== RETRAITS ==========

  async getRetraits() {
    return this.request('/retraits');
  }

  async getRetrait(id) {
    return this.request(`/retraits?id=${id}`);
  }
async getRetraits(magasinId = null) {
  const query = magasinId ? `?magasin_id=${magasinId}` : '';
  return this.request(`/retraits${query}`);
}

  async createRetrait(data) {
    return this.request('/retraits', { method: 'POST', body: JSON.stringify(data) });
  }

  async deleteRetrait(id) {
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
    return this.request('/transferts', { method: 'POST', body: JSON.stringify(data) });
  }

  // ========== PRODUCTEURS ==========

  async getProducteurs() {
    return this.request('/producteurs');
  }

  async getProducteur(id) {
    return this.request(`/producteurs?id=${id}`);
  }

  async createProducteur(data) {
    return this.request('/producteurs', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateProducteur(id, data) {
    return this.request(`/producteurs?id=${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteProducteur(id) {
    return this.request(`/producteurs?id=${id}`, { method: 'DELETE' });
  }

  // ========== MAGASINS ==========

  async getMagasins() {
    return this.request('/magasins');
  }

  async createMagasin(data) {
    return this.request('/magasins', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateMagasin(id, data) {
    return this.request(`/magasins?id=${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteMagasin(id) {
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
    return this.request('/employers', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateEmployer(id, data) {
    return this.request(`/employers?id=${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteEmployer(id) {
    return this.request(`/employers?id=${id}`, { method: 'DELETE' });
  }

  // ========== USERS ==========

  async getUsers(magasinId = null) {
    const query = magasinId ? `?magasin_id=${magasinId}` : '';
    return this.request(`/users${query}`);
  }

  async createUser(data) {
    return this.request('/users', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateUser(id, data) {
    return this.request(`/users?id=${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteUser(id) {
    return this.request(`/users?id=${id}`, { method: 'DELETE' });
  }
async getUsersByRole(role) {
  return this.request(`/users?role=${role}`);
}

async signalerAnomalie({ label, details, user }) {
  // Trouver le(s) superadmin(s)
  const users = await this.getUsersByRole('superadmin');
  const superadmins = Array.isArray(users) ? users : [users];
  if (!superadmins.length) throw new Error('Aucun superadmin trouvé');

  return this.request('/messages', {
    method: 'POST',
    body: JSON.stringify({
      destinataires:    superadmins.map(u => u.id),
      objet:            `⚠️ Anomalie signalée : ${label}`,
      contenu:          details || `L'auditeur ${user?.username || '?'} a signalé une anomalie sur : ${label}`,
      topic:            'anomalie',
      type_notification:'alerte',
    }),
  });
}

  // ========== GEO ==========

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
    return this.request('/audit?action=performance-by-store');
  }

  async getAuditRecentLogs() {
    return this.request('/audit?action=recent-logs');
  }

  async getAuditGlobalStats() {
    return this.request('/audit?action=global-stats');
  }

  async getAuditPending() {
    return this.request('/audit?action=pending-transfers');
  }
async getAuditLogsByStore(magasinId) {
  return this.request(`/audit?action=logs-by-store&magasin_id=${magasinId}`);
}
  async validateTransfert(id, data) {
    return this.request(`/transferts?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ========== MESSAGES ==========

  async getMessages() {
    return this.request('/messages');
  }

  async getMessage(id) {
    return this.request(`/messages?id=${id}`);
  }

  async sendMessage(data) {
    return this.request('/messages', { method: 'POST', body: JSON.stringify(data) });
  }

  async getDestinataires(role, magasinId = null) {
    const query = magasinId ? `&magasin_id=${magasinId}` : '';
    return this.request(`/messages?action=destinataires&role=${role}${query}`);
  }

  async getUnreadCount() {
    return this.request('/messages?action=unread-count');
  }

  // ========== CAISSE ==========

  async getOperationsCaisse(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/operations_caisse${query ? '?' + query : ''}`);
  }

  async createOperationCaisse(data) {
    return this.request('/operations_caisse', { method: 'POST', body: JSON.stringify(data) });
  }
}

export default new ApiService();