//src/pages/Administration.jsx

import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAlert } from '../hooks/useAlert';
import api from '../services/api';
import Alert from '../components/Alert';

export default function Administration() {
  const { isSuperAdmin } = useAuth();
  const { alert, showAlert, hideAlert } = useAlert();
  
  const [activeSection, setActiveSection] = useState('producteurs');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({});
  const [regions, setRegions] = useState([]);
  const [departements, setDepartements] = useState([]);
  const [magasins, setMagasins] = useState([]);

  useEffect(() => {
    loadGeoData();
    loadMagasins();
  }, []);

  useEffect(() => {
    loadData();
  }, [activeSection]);

  const loadGeoData = async () => {
    try {
      const regionsData = await api.getRegions();
      setRegions(regionsData);
    } catch (err) {
      console.error('Erreur chargement régions:', err);
    }
  };

  const loadMagasins = async () => {
    try {
      const data = await api.getMagasins();
      setMagasins(data);
    } catch (err) {
      console.error('Erreur chargement magasins:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      let result;
      switch (activeSection) {
        case 'producteurs':
          result = await api.getProducteurs();
          break;
        case 'magasins':
          result = await api.getMagasins();
          break;
        case 'employes':
          result = await api.getEmployers();
          break;
        case 'lots':
          result = await api.getLots();
          break;
        default:
          result = [];
      }
      setData(result);
    } catch (err) {
      showAlert(`❌ Erreur: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegionChange = async (regionId) => {
    setFormData({ ...formData, region_id: regionId });
    try {
      const depts = await api.getDepartements(regionId);
      setDepartements(depts);
    } catch (err) {
      console.error('Erreur chargement départements:', err);
    }
  };

  const handleCreate = () => {
    setEditingId(null);
    setFormData(getEmptyForm());
    setShowForm(true);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData(item);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) return;

    try {
      switch (activeSection) {
        case 'producteurs':
          await api.deleteProducteur(id);
          break;
        case 'magasins':
          await api.deleteMagasin(id);
          break;
        case 'employes':
          await api.deleteEmployer(id);
          break;
        case 'lots':
          await api.deleteLot(id);
          break;
      }
      showAlert('✅ Suppression réussie', 'success');
      loadData();
    } catch (err) {
      showAlert(`❌ Erreur: ${err.message}`, 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingId) {
        // Mise à jour
        switch (activeSection) {
          case 'producteurs':
            await api.updateProducteur(editingId, formData);
            break;
          case 'magasins':
            await api.updateMagasin(editingId, formData);
            break;
          case 'employes':
            await api.updateEmployer(editingId, formData);
            break;
          case 'lots':
            await api.updateLot(editingId, formData);
            break;
        }
        showAlert('✅ Mise à jour réussie', 'success');
      } else {
        // Création
        switch (activeSection) {
          case 'producteurs':
            await api.createProducteur(formData);
            break;
          case 'magasins':
            await api.createMagasin(formData);
            break;
          case 'employes':
            await api.createEmployer(formData);
            break;
          case 'lots':
            await api.createLot(formData);
            break;
        }
        showAlert('✅ Création réussie', 'success');
      }

      setShowForm(false);
      setFormData(getEmptyForm());
      loadData();
    } catch (err) {
      showAlert(`❌ Erreur: ${err.message}`, 'error');
    }
  };

  const getEmptyForm = () => {
    switch (activeSection) {
      case 'producteurs':
        return { nom_producteur: '', tel_producteur: '', region_id: '', statut: 'actif' };
      case 'magasins':
        return { nom: '', code: '', region_id: '' };
      case 'employes':
        return { nom: '', role: '', magasin_id: '', contact: '', statut: 'actif' };
      case 'lots':
        return { description: '', categorie: '', prix_ref: '', unites_admises: [], criteres_admission: [] };
      default:
        return {};
    }
  };

  const renderForm = () => {
    switch (activeSection) {
      case 'producteurs':
        return (
          <>
            <input
              type="text"
              placeholder="Nom du producteur *"
              required
              value={formData.nom_producteur || ''}
              onChange={(e) => setFormData({ ...formData, nom_producteur: e.target.value })}
              className="w-full p-3 border rounded-lg"
            />
            <input
              type="tel"
              placeholder="Téléphone *"
              required
              value={formData.tel_producteur || ''}
              onChange={(e) => setFormData({ ...formData, tel_producteur: e.target.value })}
              className="w-full p-3 border rounded-lg"
            />
            <select
              value={formData.region_id || ''}
              onChange={(e) => handleRegionChange(e.target.value)}
              className="w-full p-3 border rounded-lg"
            >
              <option value="">Région</option>
              {regions.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
            </select>
            <select
              value={formData.statut || 'actif'}
              onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
              className="w-full p-3 border rounded-lg"
            >
              <option value="actif">Actif</option>
              <option value="en_attente">En attente</option>
              <option value="suspendu">Suspendu</option>
            </select>
          </>
        );

      case 'magasins':
        return (
          <>
            <input
              type="text"
              placeholder="Nom du magasin *"
              required
              value={formData.nom || ''}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              className="w-full p-3 border rounded-lg"
            />
            <input
              type="text"
              placeholder="Code (ex: CE01) *"
              required
              value={formData.code || ''}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className="w-full p-3 border rounded-lg"
            />
            <select
              value={formData.region_id || ''}
              onChange={(e) => setFormData({ ...formData, region_id: e.target.value })}
              className="w-full p-3 border rounded-lg"
            >
              <option value="">Région</option>
              {regions.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
            </select>
          </>
        );

      case 'employes':
        return (
          <>
            <input
              type="text"
              placeholder="Nom de l'employé *"
              required
              value={formData.nom || ''}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              className="w-full p-3 border rounded-lg"
            />
            <select
              required
              value={formData.role || ''}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full p-3 border rounded-lg"
            >
              <option value="">Sélectionner un rôle *</option>
              <option value="chauffeur">Chauffeur</option>
              <option value="magasinier">Magasinier</option>
              <option value="caissier">Caissier</option>
              <option value="admin">Administrateur</option>
            </select>
            <select
              required
              value={formData.magasin_id || ''}
              onChange={(e) => setFormData({ ...formData, magasin_id: e.target.value })}
              className="w-full p-3 border rounded-lg"
            >
              <option value="">Magasin *</option>
              {magasins.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
            </select>
            <input
              type="tel"
              placeholder="Contact"
              value={formData.contact || ''}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              className="w-full p-3 border rounded-lg"
            />
          </>
        );

      case 'lots':
        return (
          <>
            <input
              type="text"
              placeholder="Description du lot *"
              required
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-3 border rounded-lg"
            />
            <select
              required
              value={formData.categorie || ''}
              onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
              className="w-full p-3 border rounded-lg"
            >
              <option value="">Catégorie *</option>
              <option value="frais">Produits frais</option>
              <option value="secs">Produits secs</option>
              <option value="manualim">Manufacturés alimentaires</option>
            </select>
            <input
              type="number"
              placeholder="Prix de référence *"
              required
              min="0"
              step="0.01"
              value={formData.prix_ref || ''}
              onChange={(e) => setFormData({ ...formData, prix_ref: e.target.value })}
              className="w-full p-3 border rounded-lg"
            />
          </>
        );

      default:
        return null;
    }
  };

  const renderTable = () => {
    if (loading) {
      return (
        <div className="text-center py-12">
          <div className="text-5xl mb-4 animate-bounce">⏳</div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">📭</div>
          <p className="text-gray-600">Aucune donnée disponible</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100">
              {activeSection === 'producteurs' && (
                <>
                  <th className="p-3 text-left">Nom</th>
                  <th className="p-3 text-left">Téléphone</th>
                  <th className="p-3 text-left">Statut</th>
                  <th className="p-3 text-center">Actions</th>
                </>
              )}
              {activeSection === 'magasins' && (
                <>
                  <th className="p-3 text-left">Nom</th>
                  <th className="p-3 text-left">Code</th>
                  <th className="p-3 text-left">Région</th>
                  <th className="p-3 text-center">Actions</th>
                </>
              )}
              {activeSection === 'employes' && (
                <>
                  <th className="p-3 text-left">Nom</th>
                  <th className="p-3 text-left">Rôle</th>
                  <th className="p-3 text-left">Magasin</th>
                  <th className="p-3 text-left">Contact</th>
                  <th className="p-3 text-center">Actions</th>
                </>
              )}
              {activeSection === 'lots' && (
                <>
                  <th className="p-3 text-left">Description</th>
                  <th className="p-3 text-left">Catégorie</th>
                  <th className="p-3 text-right">Prix réf.</th>
                  <th className="p-3 text-center">Actions</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map(item => (
              <tr key={item.id} className="border-b hover:bg-gray-50">
                {activeSection === 'producteurs' && (
                  <>
                    <td className="p-3">{item.nom_producteur}</td>
                    <td className="p-3">{item.tel_producteur}</td>
                    <td className="p-3">
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        item.statut === 'actif' ? 'bg-green-100 text-green-800' :
                        item.statut === 'suspendu' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.statut}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-800 mr-3">✏️</button>
                      <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800">🗑️</button>
                    </td>
                  </>
                )}
                {activeSection === 'magasins' && (
                  <>
                    <td className="p-3">{item.nom}</td>
                    <td className="p-3"><span className="font-mono bg-gray-100 px-2 py-1 rounded">{item.code}</span></td>
                    <td className="p-3">{regions.find(r => r.id === item.region_id)?.nom || 'N/A'}</td>
                    <td className="p-3 text-center">
                      <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-800 mr-3">✏️</button>
                      <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800">🗑️</button>
                    </td>
                  </>
                )}
                {activeSection === 'employes' && (
                  <>
                    <td className="p-3">{item.nom}</td>
                    <td className="p-3"><span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">{item.role}</span></td>
                    <td className="p-3">{magasins.find(m => m.id === item.magasin_id)?.nom || 'N/A'}</td>
                    <td className="p-3">{item.contact || 'N/A'}</td>
                    <td className="p-3 text-center">
                      <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-800 mr-3">✏️</button>
                      <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800">🗑️</button>
                    </td>
                  </>
                )}
                {activeSection === 'lots' && (
                  <>
                    <td className="p-3">{item.description}</td>
                    <td className="p-3"><span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm">{item.categorie}</span></td>
                    <td className="p-3 text-right">{item.prix_ref} FCFA</td>
                    <td className="p-3 text-center">
                      <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-800 mr-3">✏️</button>
                      <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800">🗑️</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Accès refusé</h2>
          <p className="text-gray-600">Réservé aux super administrateurs</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Alert message={alert?.message} type={alert?.type} onClose={hideAlert} />

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800">⚙️ Administration</h2>
        <p className="text-gray-600 mt-1">Gestion des entités du système</p>
      </div>

      {/* Onglets */}
      <div className="flex gap-3 flex-wrap">
        {[
          { id: 'producteurs', label: '👨‍🌾 Producteurs', icon: '👨‍🌾' },
          { id: 'magasins', label: '🏪 Magasins', icon: '🏪' },
          { id: 'employes', label: '👥 Employés', icon: '👥' },
          { id: 'lots', label: '📦 Lots', icon: '📦' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeSection === tab.id
                ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bouton créer */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <button
          onClick={handleCreate}
          className="px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:shadow-lg transition-all font-medium"
        >
          ➕ Ajouter
        </button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            {editingId ? 'Modifier' : 'Créer'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {renderForm()}
            <div className="flex gap-3">
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:shadow-lg transition-all"
              >
                ✅ Enregistrer
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tableau */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        {renderTable()}
      </div>
    </div>
  );
}