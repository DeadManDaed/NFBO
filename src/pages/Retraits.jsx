//src/pages/Retraits.jsx

import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAlert } from '../hooks/useAlert';
import { useStocks } from '../hooks/useStocks';
import api from '../services/api';
import Alert from '../components/Alert';

export default function Retraits() {
  const { user, magasinId } = useAuth();
  const { alert, showAlert, hideAlert } = useAlert();
  const { stocks, refresh: refreshStocks } = useStocks(magasinId);
  
  const [retraits, setRetraits] = useState([]);
  const [producteurs, setProducteurs] = useState([]);
  const [magasins, setMagasins] = useState([]);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    lot_id: '',
    type_retrait: 'vente',
    quantite: '',
    unite: '',
    prix_ref: '',
    destination_producteur_id: '',
    destination_magasin_id: '',
    motif: '',
    magasin_id: magasinId || '',
  });

  const [unitesDisponibles, setUnitesDisponibles] = useState([]);

  useEffect(() => {
    loadRetraits();
    loadProducteurs();
    loadMagasins();
  }, []);

  const loadRetraits = async () => {
    try {
      const data = await api.getRetraits();
      setRetraits(data);
    } catch (err) {
      console.error('Erreur chargement retraits:', err);
    }
  };

  const loadProducteurs = async () => {
    try {
      const data = await api.getProducteurs();
      setProducteurs(data);
    } catch (err) {
      console.error('Erreur chargement producteurs:', err);
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

  const handleLotChange = (lotId) => {
    const stock = stocks.find(s => s.lot_id === parseInt(lotId));
    if (stock) {
      setUnitesDisponibles(stock.unites_admises || []);
      setFormData({
        ...formData,
        lot_id: lotId,
        prix_ref: stock.prix_ref,
        unite: stock.unite || (stock.unites_admises && stock.unites_admises[0]) || '',
      });
    }
  };

  const handleTypeRetraitChange = (type) => {
    setFormData({
      ...formData,
      type_retrait: type,
      destination_producteur_id: '',
      destination_magasin_id: '',
      motif: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const retrait = {
      lot_id: parseInt(formData.lot_id),
      type_retrait: formData.type_retrait,
      quantite: parseFloat(formData.quantite),
      unite: formData.unite,
      prix_ref: parseFloat(formData.prix_ref),
      magasin_id: parseInt(formData.magasin_id),
      utilisateur: user?.username || 'unknown',
    };

    if (formData.type_retrait === 'producteur' && formData.destination_producteur_id) {
      retrait.destination_producteur_id = parseInt(formData.destination_producteur_id);
    }

    if (formData.type_retrait === 'magasin' && formData.destination_magasin_id) {
      retrait.destination_magasin_id = parseInt(formData.destination_magasin_id);
    }

    if (formData.type_retrait === 'destruction' && formData.motif) {
      retrait.motif = formData.motif;
    }

    try {
      await api.createRetrait(retrait);
      showAlert('✅ Retrait enregistré avec succès', 'success');
      
      setFormData({
        lot_id: '',
        type_retrait: 'vente',
        quantite: '',
        unite: '',
        prix_ref: '',
        destination_producteur_id: '',
        destination_magasin_id: '',
        motif: '',
        magasin_id: magasinId || '',
      });
      setUnitesDisponibles([]);
      setShowForm(false);
      
      loadRetraits();
      refreshStocks();
    } catch (err) {
      showAlert(`❌ Erreur: ${err.message}`, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <Alert message={alert?.message} type={alert?.type} onClose={hideAlert} />

      {/* Header et bouton */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">📤 Retraits de stock</h2>
            <p className="text-gray-600 mt-1">Ventes, retours et destructions</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:shadow-lg transition-all font-medium"
          >
            {showForm ? '✖ Annuler' : '➕ Nouveau retrait'}
          </button>
        </div>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Lot */}
              <div>
                <label className="block font-medium text-gray-700 mb-2">
                  Lot à retirer *
                </label>
                <select
                  required
                  value={formData.lot_id}
                  onChange={(e) => handleLotChange(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Sélectionner un lot</option>
                  {stocks.map(stock => (
                    <option key={stock.lot_id} value={stock.lot_id}>
                      {stock.description} - Stock: {stock.stock_actuel} {stock.unite}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type de retrait */}
              <div>
                <label className="block font-medium text-gray-700 mb-2">
                  Type de retrait *
                </label>
                <select
                  required
                  value={formData.type_retrait}
                  onChange={(e) => handleTypeRetraitChange(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="vente">🛒 Vente client</option>
                  <option value="producteur">👨‍🌾 Retour producteur</option>
                  <option value="magasin">🏪 Transfert magasin</option>
                  <option value="destruction">🗑️ Destruction</option>
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

              {/* Prix unitaire */}
              <div>
                <label className="block font-medium text-gray-700 mb-2">
                  Prix unitaire (FCFA) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.prix_ref}
                  onChange={(e) => setFormData({ ...formData, prix_ref: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              {/* Champs conditionnels selon le type */}
              {formData.type_retrait === 'producteur' && (
                <div>
                  <label className="block font-medium text-gray-700 mb-2">
                    Producteur destinataire *
                  </label>
                  <select
                    required
                    value={formData.destination_producteur_id}
                    onChange={(e) => setFormData({ ...formData, destination_producteur_id: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Sélectionner</option>
                    {producteurs.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nom_producteur}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.type_retrait === 'magasin' && (
                <div>
                  <label className="block font-medium text-gray-700 mb-2">
                    Magasin destinataire *
                  </label>
                  <select
                    required
                    value={formData.destination_magasin_id}
                    onChange={(e) => setFormData({ ...formData, destination_magasin_id: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Sélectionner</option>
                    {magasins.filter(m => m.id !== magasinId).map(m => (
                      <option key={m.id} value={m.id}>
                        {m.nom} ({m.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.type_retrait === 'destruction' && (
                <div className="md:col-span-2">
                  <label className="block font-medium text-gray-700 mb-2">
                    Motif de destruction *
                  </label>
                  <textarea
                    required
                    value={formData.motif}
                    onChange={(e) => setFormData({ ...formData, motif: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    rows="3"
                    placeholder="Expliquez la raison de la destruction..."
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              className="px-8 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:shadow-lg transition-all font-medium"
            >
              ✅ Enregistrer le retrait
            </button>
          </form>
        </div>
      )}

      {/* Historique */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Retraits récents</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Lot</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Quantité</th>
                <th className="p-3 text-left">Destination</th>
                <th className="p-3 text-left">Utilisateur</th>
              </tr>
            </thead>
            <tbody>
              {retraits.slice(0, 15).map(r => (
                <tr key={r.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{new Date(r.date_retrait || Date.now()).toLocaleDateString()}</td>
                  <td className="p-3">{r.lot_description || 'N/A'}</td>
                  <td className="p-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      r.type_retrait === 'vente' ? 'bg-green-100 text-green-800' :
                      r.type_retrait === 'producteur' ? 'bg-blue-100 text-blue-800' :
                      r.type_retrait === 'magasin' ? 'bg-purple-100 text-purple-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {r.type_retrait}
                    </span>
                  </td>
                  <td className="p-3">{r.quantite} {r.unite}</td>
                  <td className="p-3">
                    {r.destination_producteur_id ? r.nom_producteur :
                     r.destination_magasin_id ? 'Magasin' :
                     r.type_retrait === 'destruction' ? r.motif :
                     'Client'}
                  </td>
                  <td className="p-3">{r.utilisateur}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}