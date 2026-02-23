//scr/pages/Audit.jsx

import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAlert } from '../hooks/useAlert';
import api from '../services/api';
import Alert from '../components/Alert';

export default function Audit() {
  const { user } = useAuth();
  const { alert, showAlert, hideAlert } = useAlert();
  
  const [transfertsPending, setTransfertsPending] = useState([]);
  const [transfertsValidated, setTransfertsValidated] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTransfert, setSelectedTransfert] = useState(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  
  const [validationData, setValidationData] = useState({
    quantite_recue: '',
    etat_produit: 'conforme',
    observations: '',
  });

  useEffect(() => {
    loadTransferts();
  }, []);

  const loadTransferts = async () => {
    setLoading(true);
    try {
      const pending = await api.getAuditPending();
      setTransfertsPending(pending);
      
      // Charger aussi les transferts validés récents
      const allTransferts = await api.getRetraits();
      const validated = allTransferts.filter(
        t => t.type_retrait === 'magasin' && t.statut_audit === 'valide'
      );
      setTransfertsValidated(validated.slice(0, 10));
    } catch (err) {
      showAlert(`❌ Erreur: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenValidation = (transfert) => {
    setSelectedTransfert(transfert);
    setValidationData({
      quantite_recue: transfert.quantite,
      etat_produit: 'conforme',
      observations: '',
    });
    setShowValidationModal(true);
  };

  const handleValidate = async (e) => {
    e.preventDefault();

    try {
      await api.validateTransfert(selectedTransfert.id, {
        ...validationData,
        quantite_recue: parseFloat(validationData.quantite_recue),
        validateur: user?.username || 'unknown',
        date_validation: new Date().toISOString(),
      });

      showAlert('✅ Transfert validé avec succès', 'success');
      setShowValidationModal(false);
      setSelectedTransfert(null);
      loadTransferts();
    } catch (err) {
      showAlert(`❌ Erreur: ${err.message}`, 'error');
    }
  };

  const handleReject = async () => {
    if (!confirm('Êtes-vous sûr de vouloir rejeter ce transfert ?')) return;

    try {
      await api.validateTransfert(selectedTransfert.id, {
        statut_audit: 'rejete',
        observations: validationData.observations || 'Rejeté par l\'auditeur',
        validateur: user?.username || 'unknown',
        date_validation: new Date().toISOString(),
      });

      showAlert('✅ Transfert rejeté', 'success');
      setShowValidationModal(false);
      setSelectedTransfert(null);
      loadTransferts();
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
            <h2 className="text-2xl font-bold text-gray-800">🔍 Audit des transferts</h2>
            <p className="text-gray-600 mt-1">Validation et suivi des mouvements inter-magasins</p>
          </div>
          <button
            onClick={loadTransferts}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-all"
          >
            🔄 Actualiser
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm">En attente</p>
              <p className="text-3xl font-bold mt-2">{transfertsPending.length}</p>
            </div>
            <div className="text-5xl opacity-30">⏳</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Validés</p>
              <p className="text-3xl font-bold mt-2">{transfertsValidated.length}</p>
            </div>
            <div className="text-5xl opacity-30">✓</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Taux validation</p>
              <p className="text-3xl font-bold mt-2">
                {transfertsPending.length + transfertsValidated.length > 0
                  ? Math.round((transfertsValidated.length / (transfertsPending.length + transfertsValidated.length)) * 100)
                  : 0}%
              </p>
            </div>
            <div className="text-5xl opacity-30">📊</div>
          </div>
        </div>
      </div>

      {/* Transferts en attente */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          ⏳ Transferts en attente de validation ({transfertsPending.length})
        </h3>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-bounce">⏳</div>
            <p className="text-gray-600">Chargement...</p>
          </div>
        ) : transfertsPending.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">✅</div>
            <p className="text-gray-600">Aucun transfert en attente</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Lot</th>
                  <th className="p-3 text-left">Quantité</th>
                  <th className="p-3 text-left">Source → Destination</th>
                  <th className="p-3 text-left">Initiateur</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {transfertsPending.map(t => (
                  <tr key={t.id} className="border-b hover:bg-yellow-50">
                    <td className="p-3">
                      {new Date(t.date_retrait || Date.now()).toLocaleDateString()}
                    </td>
                    <td className="p-3 font-medium">{t.lot_description || 'N/A'}</td>
                    <td className="p-3">{t.quantite} {t.unite}</td>
                    <td className="p-3">
                      <span className="text-sm">
                        <span className="font-mono bg-blue-100 px-2 py-1 rounded">
                          {t.magasin_source_code || '?'}
                        </span>
                        <span className="mx-2">→</span>
                        <span className="font-mono bg-green-100 px-2 py-1 rounded">
                          {t.magasin_dest_code || '?'}
                        </span>
                      </span>
                    </td>
                    <td className="p-3">{t.utilisateur}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleOpenValidation(t)}
                        className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium"
                      >
                        ✓ Valider
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transferts validés récents */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          ✅ Transferts validés récents
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-3 text-left">Date transfert</th>
                <th className="p-3 text-left">Date validation</th>
                <th className="p-3 text-left">Lot</th>
                <th className="p-3 text-left">Qté envoyée</th>
                <th className="p-3 text-left">Qté reçue</th>
                <th className="p-3 text-left">État</th>
                <th className="p-3 text-left">Validateur</th>
              </tr>
            </thead>
            <tbody>
              {transfertsValidated.map(t => (
                <tr key={t.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    {new Date(t.date_retrait || Date.now()).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    {t.date_validation ? new Date(t.date_validation).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="p-3">{t.lot_description || 'N/A'}</td>
                  <td className="p-3">{t.quantite} {t.unite}</td>
                  <td className="p-3">
                    <span className={t.quantite_recue < t.quantite ? 'text-orange-600 font-semibold' : ''}>
                      {t.quantite_recue || t.quantite} {t.unite}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      t.etat_produit === 'conforme' ? 'bg-green-100 text-green-800' :
                      t.etat_produit === 'partiellement_conforme' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {t.etat_produit || 'conforme'}
                    </span>
                  </td>
                  <td className="p-3">{t.validateur || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de validation */}
      {showValidationModal && selectedTransfert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">
              🔍 Validation du transfert
            </h3>

            {/* Informations du transfert */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Lot</p>
                  <p className="font-semibold">{selectedTransfert.lot_description}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Quantité envoyée</p>
                  <p className="font-semibold">{selectedTransfert.quantite} {selectedTransfert.unite}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Source</p>
                  <p className="font-semibold">{selectedTransfert.magasin_source_code || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Destination</p>
                  <p className="font-semibold">{selectedTransfert.magasin_dest_code || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Formulaire de validation */}
            <form onSubmit={handleValidate} className="space-y-4">
              <div>
                <label className="block font-medium text-gray-700 mb-2">
                  Quantité réellement reçue *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={validationData.quantite_recue}
                  onChange={(e) => setValidationData({ ...validationData, quantite_recue: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-2">
                  État du produit *
                </label>
                <select
                  required
                  value={validationData.etat_produit}
                  onChange={(e) => setValidationData({ ...validationData, etat_produit: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="conforme">✓ Conforme</option>
                  <option value="partiellement_conforme">⚠️ Partiellement conforme</option>
                  <option value="non_conforme">✗ Non conforme</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-2">
                  Observations
                </label>
                <textarea
                  value={validationData.observations}
                  onChange={(e) => setValidationData({ ...validationData, observations: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  rows="3"
                  placeholder="Notes sur l'état, la qualité, les anomalies..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
                >
                  ✅ Valider le transfert
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all font-medium"
                >
                  ✗ Rejeter
                </button>
                <button
                  type="button"
                  onClick={() => setShowValidationModal(false)}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}