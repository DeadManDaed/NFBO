// src/services/api.js

const API_BASE = '/api';

class ApiService {
  async request(endpoint, options = {}) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errObj = await response.json().catch(() => null);
        throw new Error(errObj?.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ API Error:', error);
      throw error;
    }
  }

  // ========== AUTH ==========
  async login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async logout() {
    return this.request('/auth/logout', { method: 'POST' });
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
    return this.request('/lots', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateLot(id, data) {
    return this.request(`/lots?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteLot(id) {
    return this.request(`/lots?id=${id}`, { method: 'DELETE' });
  }

  // ========== ADMISSIONS ==========
  async getAdmissions() {
    return this.request('/admissions');
  }

  async createAdmission(data) {
    return this.request('/admissions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
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

  async createRetrait(data) {
    return this.request('/retraits', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteRetrait(id) {
    return this.request(`/retraits?id=${id}`, { method: 'DELETE' });
  }

  // ========== STOCKS ==========
  async getStocks() {
    return this.request('/stocks');
  }

  async getStockDisponible(magasinId) {
    return this.request(`/stocks?magasinId=${magasinId}`);
  }

  // ========== TRANSFERTS ==========
  async getTransferts() {
    return this.request('/transferts');
  }

  async createTransfert(data) {
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
    return this.request('/producteurs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProducteur(id, data) {
    return this.request(`/producteurs?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProducteur(id) {
    return this.request(`/producteurs?id=${id}`, { method: 'DELETE' });
  }

  // ========== MAGASINS ==========
  async getMagasins() {
    return this.request('/magasins');
  }

  async createMagasin(data) {
    return this.request('/magasins', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMagasin(id, data) {
    return this.request(`/magasins?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
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
    return this.request('/employers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEmployer(id, data) {
    return this.request(`/employers?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
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
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateUser(id, data) {
    return this.request(`/users?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteUser(id) {
    return this.request(`/users?id=${id}`, { method: 'DELETE' });
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
}

export default new ApiService();
