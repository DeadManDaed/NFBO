//src/services/api.js

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

  // ========== LOTS ==========
  async getLots() {
    return this.request('/lots');
  }

  async createLot(data) {
    return this.request('/lots', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateLot(id, data) {
    return this.request(`/lots/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteLot(id) {
    return this.request(`/lots/${id}`, { method: 'DELETE' });
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
    return this.request(`/admissions/${id}`, { method: 'DELETE' });
  }

  // ========== RETRAITS ==========
  async getRetraits() {
    return this.request('/retraits');
  }

  async createRetrait(data) {
    return this.request('/retraits', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteRetrait(id) {
    return this.request(`/retraits/${id}`, { method: 'DELETE' });
  }

  // ========== STOCKS ==========
  async getStockDisponible(magasinId) {
    return this.request(`/stocks/disponible/${magasinId}`);
  }

  async getStocks() {
    return this.request('/stocks');
  }

  // ========== PRODUCTEURS ==========
  async getProducteurs() {
    return this.request('/producteurs');
  }

  async createProducteur(data) {
    return this.request('/producteurs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProducteur(id, data) {
    return this.request(`/producteurs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProducteur(id) {
    return this.request(`/producteurs/${id}`, { method: 'DELETE' });
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
    return this.request(`/magasins/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteMagasin(id) {
    return this.request(`/magasins/${id}`, { method: 'DELETE' });
  }

  // ========== EMPLOYERS (EMPLOYÉS) ==========
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
    return this.request(`/employers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteEmployer(id) {
    return this.request(`/employers/${id}`, { method: 'DELETE' });
  }

  // ========== TRANSFERTS ==========
  async getTransferts() {
    return this.request('/transferts');
  }

  async createTransfert(data) {
    // Un transfert est un retrait de type 'magasin'
    return this.createRetrait({
      ...data,
      type_retrait: 'magasin',
    });
  }

  // ========== GEO (Regions, Départements, Arrondissements) ==========
  async getRegions() {
    return this.request('/geo/regions');
  }

  async getDepartements(regionId = null) {
    const query = regionId ? `?region_id=${regionId}` : '';
    return this.request(`/geo/departements${query}`);
  }

  async getArrondissements(departementId = null) {
    const query = departementId ? `?departement_id=${departementId}` : '';
    return this.request(`/geo/arrondissements${query}`);
  }

  // ========== AUDIT ==========
  async getAuditPending() {
    return this.request('/audit/pending');
  }

  async validateTransfert(id, data) {
    return this.request(`/audit/validate/${id}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
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
/*+++++++++++TEMPORARILY DISABLED+++++++++((((
  async getCurrentUser() {
    return this.request('/auth/me');
  }
*/
}

export default new ApiService();
