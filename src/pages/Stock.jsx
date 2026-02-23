//src/pages/Stock.jsx

import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAlert } from '../hooks/useAlert';
import api from '../services/api';
import Alert from '../components/Alert';

export default function Transferts() {
  const { user, magasinId, isSuperAdmin } = useAuth();
  const { alert, showAlert, hideAlert } = useAlert();
  
  const [showForm, setShowForm] = useState(false);
  const [magasins, setMagasins] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [chauffeurs, setChauffeurs] = useState([]);
  const [transferts, setTransferts] = useState([]);
  
  const [formData, setFormData] = useState({
    magasin_source_id: magasinId || '',
    magasin_dest_id: '',
    lot_id: '',
    quantite: '',
    unite: '',
    chauffeur_id: '',
    observations: '',
  });

  const [unitesDisponibles, setUnitesDisponibles] = useState([]);

  useEffect(() => {
    loadMagasins();
    loadTransferts();
    
    if (magasinId) {
      loadStocksForMagasin(magasinId);
      loadChauffeurs(magasinId);
    }
  }, [magasinId]);

  const loadMagasins = async () => {
    try {
      const data = await api.getMagasins();
      setMagasins(data);
    } catch (err) {
      console.error('Erreur chargement magasins:', err);
    }
  };

  const loadStocksForMagasin = async (magId) => {
    try {
      const data = await api.getStockDisponible(magId);
      setStocks(data);
    } catch (err) {
      console.error('Erreur chargement stocks:', err);
    }
  };

  const loadChauffeurs = async (magSourceId, magDestId = null) => {
    try {
      const allChauffeurs = await api.getChauffeurs();
      
      // Prioriser les chauffeurs
      const prioritized = allChauffeurs.map(c => {
        let priority = 3; // Autres
        let label = '⚪';
        
        if (c.magasin_id === parseInt(magSourceId)) {
          priority = 1;
          label = '🟢 Source';
        } else if (magDestId && c.magasin_id === parseInt(magDestId)) {
          priority = 2;
          label = '🔵 Destination';
        }
        
        return { ...c, priority, label };
      });

      // Trier par priorité
      prioritized.sort((a, b) => a.priority - b.priority);
      
      setChauffeurs(prioritized);
    } catch (err) {
      console.error('Erreur chargement chauffeurs:', err);
    }
  };

  const loadTransferts = async () => {
    try {
      const data = await api.getRetraits();
      const transfertsOnly = data.filter(r => r.type_retrait === 'magasin');
      setTransferts(transfertsOnly);
    } catch (err) {
      console.error('Erreur chargement transferts:', err);
    }
  };

  const handleMagasinSourceChange = (magId) => {
    setFormData({ ...formData, magasin_source_id: magId, lot_id: '', quantite: '' });
    loadStocksForMagasin(magId);
    loadChauffeurs(magId, formData.magasin_dest_id);
  };

  const handleMagasinDestChange = (magId) => {
    setFormData({ ...formData, magasin_dest_id: magId });
    loadChauffeurs(formData.magasin_source_id, magId);
  };

  const handleLotChange = (lotId) => {
    const stock = stocks.find(s => s.lot_id === parseInt(lotId));
    if (stock) {
      setUnitesDisponibles(stock.unites_admises || []);
      setFormData({
        ...formData,
        lot_id: lotId,
        unite: stock.unite || (stock.unites_admises && stock.unites_admises[0]) || '',
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Vérifier que source ≠ destination
    if (formData.magasin_source_id === formData.magasin_dest_id) {
      showAlert('❌ Le magasin source et destination ne peuvent pas être identiques', 'error');
      return;
    }

    const stock = stocks.find(s => s.lot_id === parseInt(formData.lot_id));

    const transfert = {
      lot_id: parseInt(formData.lot_id),
      type_retrait: 'magasin',
      quantite: parseFloat(formData.quantite),
      unite: formData.unite,
      prix_ref: stock?.prix_ref || 0,
      magasin_id: parseInt(formData.magasin_source_id),
      destination_magasin_id: parseInt(formData.magasin_dest_id),
      utilisateur: user?.username || 'unknown',
      chauffeur_id: formData.chauffeur_id ? parseInt(formData.chauffeur_id) : null,
      observations: formData.observations || null,
    };

    try {
      await api.createTransfert(transfert);
      showAlert('✅ Transfert enregistré avec succès', 'success');
      
      setFormData({
        magasin_source_id: magasinId || '',
        magasin_dest_id: '',
        lot_id: '',
        quantite: '',
        unite: '',
        chauffeur_id: '',
        observations: '',
      });
      setUnitesDisponibles([]);
      setShowForm(false);
      
      loadTransferts();
      if (magasinId) {
        loadStocksForMagasin(magasinId);
      }
    } catch (err) {
      showAlert(`❌ Erreur: ${err.message}`, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <Alert message={alert?.message} type={alert?.type} onClose={hideAlert} />

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">🔄 Transferts inter-magasins</h2>
            <p className="text-gray-600 mt-1">Gérer les mouvements de stock entre magasins</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:shadow-lg transition-all font-medium"
          >
            {showForm ? '✖ Annuler' : '➕ Nouveau transfert'}
          </button>
        </div>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Magasin source */}
              <div>
                <label className="block font-medium text-gray-700 mb-2">
                  Magasin source *
                </label>
                <select
                  required
                  value={formData.magasin_source_id}
                  onChange={(e) => handleMagasinSourceChange(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={!isSuperAdmin}
                  style={!isSuperAdmin ? { background: '#f0f0f0' } : {}}
                >
                  <option value="">Sélectionner</option>
                  {magasins.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.nom} ({m.code})
                    </option>
                  ))}
                </select>
                {!isSuperAdmin && (
                  <p className="text-sm text-gray-500 mt-1">🔒 Verrouillé à votre magasin</p>
                )}
              </div>

              {/* Magasin destination */}
              <div>
                <label className="block font-medium text-gray-700 mb-2">
                  Magasin destination *
                </label>
                <select
                  required
                  value={formData.magasin_dest_id}
                  onChange={(e) => handleMagasinDestChange(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Sélectionner</option>
                  {magasins.filter(m => m.id !== parseInt(formData.magasin_source_id)).map(m => (
                    <option key={m.id} value={m.id}>
                      {m.nom} ({m.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Lot */}
              <div>
                <label className="block font-medium text-gray-700 mb-2">
                  Lot à transférer *
                </label>
                <select
                  required
                  value={formData.lot_id}
                  onChange={(e) => handleLotChange(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={!formData.magasin_source_id}
                >
                  <option value="">Sélectionner un lot</option>
                  {stocks.map(stock => (
                    <option key={stock.lot_id} value={stock.lot_id}>
                      {stock.description} - Stock: {stock.stock_actuel} {stock.unite}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantité */}
              <div>
                <label className="block font-medium text-gray-700 mb-2">
                  Quantité *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.quantite}
                  onChange={(e) => setFormData({ ...formData, quantite: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              {/* Unité */}
              <div>
                <label className="block font-medium text-gray-700 mb-2">
                  Unité *
                </label>
                <select
                  required
                  value={formData.unite}
                  onChange={(e) => setFormData({ ...formData, unite: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={!unitesDisponibles.length}
                >
                  <option value="">Sélectionner</option>
                  {unitesDisponibles.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              {/* Chauffeur */}
              <div>
                <label className="block font-medium text-gray-700 mb-2">
                  Chauffeur (optionnel)
                </label>
                <select
                  value={formData.chauffeur_id}
                  onChange={(e) => setFormData({ ...formData, chauffeur_id: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Sélectionner</option>
                  {chauffeurs.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.label} {c.nom} - {magasins.find(m => m.id === c.magasin_id)?.code || ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  🟢 = Magasin source • 🔵 = Magasin destination • ⚪ = Autres
                </p>
              </div>

              {/* Observations */}
              <div className="md:col-span-2">
                <label className="block font-medium text-gray-700 mb-2">
                  Observations
                </label>
                <textarea
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  rows="2"
                  placeholder="Notes ou remarques sur ce transfert..."
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-8 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:shadow-lg transition-all font-medium"
            >
              ✅ Enregistrer le transfert
            </button>
          </form>
        </div>
      )}

      {/* Liste des transferts */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Historique des transferts</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Lot</th>
                <th className="p-3 text-left">Quantité</th>
                <th className="p-3 text-left">Source → Destination</th>
                <th className="p-3 text-left">Utilisateur</th>
                <th className="p-3 text-left">Statut</th>
              </tr>
            </thead>
            <tbody>
              {transferts.slice(0, 15).map(t => (
                <tr key={t.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{new Date(t.date_retrait || Date.now()).toLocaleDateString()}</td>
                  <td className="p-3">{t.lot_description || 'N/A'}</td>
                  <td className="p-3">{t.quantite} {t.unite}</td>
                  <td className="p-3">
                    <span className="text-sm">
                      {magasins.find(m => m.id === t.magasin_id)?.code || '?'}
                      <span className="mx-2">→</span>
                      {magasins.find(m => m.id === t.destination_magasin_id)?.code || '?'}
                    </span>
                  </td>
                  <td className="p-3">{t.utilisateur}</td>
                  <td className="p-3">
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      ✓ Transféré
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}