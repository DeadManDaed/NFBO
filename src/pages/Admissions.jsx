import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAlert } from '../hooks/useAlert';
import { useLots } from '../hooks/useLots';
import api from '../services/api';
import Alert from '../components/Alert';

export default function Admissions() {
  const { user, magasinId } = useAuth();
  const { alert, showAlert, hideAlert } = useAlert();
  const { lots } = useLots();
  
  const [admissions, setAdmissions] = useState([]);
  const [producteurs, setProducteurs] = useState([]);
  const [magasins, setMagasins] = useState([]);
  
  const [formData, setFormData] = useState({
    lot_id: '',
    producteur_id: '',
    quantite: '',
    unite: '',
    prix_ref: '',
    coef_qualite: '',
    date_expiration: '',
    magasin_id: magasinId || '',
    mode_paiement: '',
    montant_verse: '',
  });

  const [unitesDisponibles, setUnitesDisponibles] = useState([]);

  // Charger les données
  useEffect(() => {
    loadAdmissions();
    loadProducteurs();
    loadMagasins();
  }, []);

  const loadAdmissions = async () => {
    try {
      const data = await api.getAdmissions();
      setAdmissions(data);
    } catch (err) {
      console.error('Erreur chargement admissions:', err);
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

  // Charger unités et prix quand lot change
  const handleLotChange = (lotId) => {
    const lot = lots.find(l => l.id === parseInt(lotId));
    if (lot) {
      setUnitesDisponibles(lot.unites_admises || []);
      setFormData({
        ...formData,
        lot_id: lotId,
        prix_ref: lot.prix_ref,
        unite: lot.unite || (lot.unites_admises && lot.unites_admises[0]) || '',
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const admission = {
      lot_id: parseInt(formData.lot_id),
      producteur_id: parseInt(formData.producteur_id),
      quantite: parseFloat(formData.quantite),
      unite: formData.unite,
      prix_ref: parseFloat(formData.prix_ref),
      coef_qualite: formData.coef_qualite || null,
      date_reception: new Date().toISOString().split('T')[0],
      date_expiration: formData.date_expiration || null,
      magasin_id: parseInt(formData.magasin_id),
      utilisateur: user?.username || 'unknown',
      mode_paiement: formData.mode_paiement || null,
      montant_verse: formData.montant_verse ? parseFloat(formData.montant_verse) : null,
    };

    try {
      await api.createAdmission(admission);
      showAlert('✅ Admission enregistrée avec succès', 'success');
      
      // Reset form
      setFormData({
        lot_id: '',
        producteur_id: '',
        quantite: '',
        unite: '',
        prix_ref: '',
        coef_qualite: '',
        date_expiration: '',
        magasin_id: magasinId || '',
        mode_paiement: '',
        montant_verse: '',
      });
      setUnitesDisponibles([]);
      
      loadAdmissions();
    } catch (err) {
      showAlert(`❌ Erreur: ${err.message}`, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <Alert message={alert?.message} type={alert?.type} onClose={hideAlert} />

      {/* Formulaire */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="border-b-2 border-primary pb-3 mb-6">
          <h2 className="text-2xl font-bold text-gray-800">📥 Admission des lots</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Lot */}
            <div>
              <label className="block font-medium text-gray-700 mb-2">
                Produit / Lot *
              </label>
              <select
                required
                value={formData.lot_id}
                onChange={(e) => handleLotChange(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Sélectionner un lot</option>
                {lots.map(lot => (
                  <option key={lot.id} value={lot.id}>
                    {lot.description} ({lot.categorie})
                  </option>
                ))}
              </select>
            </div>

            {/* Producteur */}
            <div>
              <label className="block font-medium text-gray-700 mb-2">
                Producteur / Déposant *
              </label>
              <select
                required
                value={formData.producteur_id}
                onChange={(e) => setFormData({ ...formData, producteur_id: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Sélectionner</option>
                {producteurs.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nom_producteur} - {p.tel_producteur}
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

            {/* Grade qualité */}
            <div>
              <label className="block font-medium text-gray-700 mb-2">
                Grade qualité
              </label>
              <select
                value={formData.coef_qualite}
                onChange={(e) => setFormData({ ...formData, coef_qualite: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Non spécifié</option>
                <option value="A">A - Excellente</option>
                <option value="B">B - Bonne</option>
                <option value="C">C - Moyenne</option>
                <option value="D">D - Faible</option>
              </select>
            </div>

            {/* Date expiration */}
            <div>
              <label className="block font-medium text-gray-700 mb-2">
                Date d'expiration
              </label>
              <input
                type="date"
                value={formData.date_expiration}
                onChange={(e) => setFormData({ ...formData, date_expiration: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Magasin (si superadmin) */}
            {user?.role === 'superadmin' && (
              <div>
                <label className="block font-medium text-gray-700 mb-2">
                  Magasin *
                </label>
                <select
                  required
                  value={formData.magasin_id}
                  onChange={(e) => setFormData({ ...formData, magasin_id: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Sélectionner</option>
                  {magasins.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.nom} ({m.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Mode paiement */}
            <div>
              <label className="block font-medium text-gray-700 mb-2">
                Mode de paiement
              </label>
              <select
                value={formData.mode_paiement}
                onChange={(e) => setFormData({ ...formData, mode_paiement: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Non spécifié</option>
                <option value="especes">Espèces</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="cheque">Chèque</option>
                <option value="virement">Virement</option>
              </select>
            </div>

            {/* Montant versé */}
            <div>
              <label className="block font-medium text-gray-700 mb-2">
                Montant versé (FCFA)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.montant_verse}
                onChange={(e) => setFormData({ ...formData, montant_verse: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-8 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:shadow-lg transition-all font-medium"
          >
            ✅ Enregistrer l'admission
          </button>
        </form>
      </div>

      {/* Historique des admissions */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Admissions récentes</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Lot</th>
                <th className="p-3 text-left">Producteur</th>
                <th className="p-3 text-left">Quantité</th>
                <th className="p-3 text-left">Prix</th>
                <th className="p-3 text-left">Qualité</th>
              </tr>
            </thead>
            <tbody>
              {admissions.slice(0, 10).map(a => (
                <tr key={a.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{new Date(a.date_reception).toLocaleDateString()}</td>
                  <td className="p-3">{a.lot_description || 'N/A'}</td>
                  <td className="p-3">{a.nom_producteur || 'N/A'}</td>
                  <td className="p-3">{a.quantite} {a.unite}</td>
                  <td className="p-3">{a.prix_ref} FCFA</td>
                  <td className="p-3">
                    {a.coef_qualite && (
                      <span className="px-2 py-1 bg-primary text-white rounded text-sm">
                        {a.coef_qualite}
                      </span>
                    )}
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