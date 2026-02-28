// src/pages/Audit.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAlert } from '../hooks/useAlert';
import api from '../services/api';
import Alert from '../components/Alert';
import PageLayout, { StateLoading, StateEmpty } from '../components/PageLayout';

export default function Audit() {
  const { user } = useAuth();
  const { alert, showAlert, hideAlert } = useAlert();

  const [transfertsPending,   setTransfertsPending]   = useState([]);
  const [transfertsValidated, setTransfertsValidated] = useState([]);
  const [loading,             setLoading]             = useState(false);
  const [selectedTransfert,   setSelectedTransfert]   = useState(null);
  const [showValidationModal, setShowValidationModal] = useState(false);

  const [validationData, setValidationData] = useState({
    quantite_recue: '',
    etat_produit:   'conforme',
    observations:   '',
  });

  useEffect(() => { loadTransferts(); }, []);

  const loadTransferts = async () => {
    setLoading(true);
    try {
      const pending       = await api.getAuditPending();
      const allTransferts = await api.getRetraits();
      const validated     = allTransferts
        .filter(t => t.type_retrait === 'magasin' && t.statut_audit === 'valide')
        .slice(0, 10);
      setTransfertsPending(pending);
      setTransfertsValidated(validated);
    } catch (err) {
      showAlert(`❌ Erreur: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenValidation = (transfert) => {
    setSelectedTransfert(transfert);
    setValidationData({ quantite_recue: transfert.quantite, etat_produit: 'conforme', observations: '' });
    setShowValidationModal(true);
  };

  const handleValidate = async (e) => {
    e.preventDefault();
    try {
      await api.validateTransfert(selectedTransfert.id, {
        ...validationData,
        quantite_recue:  parseFloat(validationData.quantite_recue),
        validateur:      user?.username || 'unknown',
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
        statut_audit:    'rejete',
        observations:    validationData.observations || "Rejeté par l'auditeur",
        validateur:      user?.username || 'unknown',
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

  const setVal = (field) => (e) =>
    setValidationData(v => ({ ...v, [field]: e.target.value }));

  // ── Calcul taux de validation ──
  const total      = transfertsPending.length + transfertsValidated.length;
  const tauxValid  = total > 0 ? Math.round((transfertsValidated.length / total) * 100) : 0;

  // ── Couleur badge état produit ──
  const etatClass = (etat) =>
    etat === 'conforme'               ? 'badge badge-success' :
    etat === 'partiellement_conforme' ? 'badge badge-warning' :
                                        'badge badge-danger';

  return (
    <PageLayout
      title="Audit des transferts"
      icon="🔍"
      subtitle="Validation et suivi des mouvements inter-magasins"
      actions={
        <button onClick={loadTransferts} className="btn btn-ghost btn-sm">
          🔄 Actualiser
        </button>
      }
    >
      <Alert message={alert?.message} type={alert?.type} onClose={hideAlert} />

      {/* ── Statistiques ── */}
      <div className="grid-3">
        {/* En attente */}
        <div className="stat-card stat-card-gradient" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p className="stat-card-label">En attente</p>
              <p className="stat-card-value">{transfertsPending.length}</p>
            </div>
            <span style={{ fontSize: 48, opacity: .25 }}>⏳</span>
          </div>
        </div>

        {/* Validés */}
        <div className="stat-card stat-card-gradient" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p className="stat-card-label">Validés</p>
              <p className="stat-card-value">{transfertsValidated.length}</p>
            </div>
            <span style={{ fontSize: 48, opacity: .25 }}>✓</span>
          </div>
        </div>

        {/* Taux */}
        <div className="stat-card stat-card-gradient" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p className="stat-card-label">Taux validation</p>
              <p className="stat-card-value">{tauxValid}%</p>
            </div>
            <span style={{ fontSize: 48, opacity: .25 }}>📊</span>
          </div>
        </div>
      </div>

      {/* ── Transferts en attente ── */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            ⏳ En attente de validation
            <span className="badge badge-warning" style={{ marginLeft: 8 }}>{transfertsPending.length}</span>
          </h3>
        </div>

        {loading ? (
          <StateLoading />
        ) : transfertsPending.length === 0 ? (
          <StateEmpty icon="✅" message="Aucun transfert en attente — tout est à jour !" />
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Lot</th>
                  <th>Quantité</th>
                  <th>Source → Destination</th>
                  <th>Initiateur</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transfertsPending.map(t => (
                  <tr key={t.id}>
                    <td>{new Date(t.date_retrait || Date.now()).toLocaleDateString('fr-FR')}</td>
                    <td style={{ fontWeight: 600 }}>{t.lot_description || 'N/A'}</td>
                    <td>{t.quantite} {t.unite}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                        <code style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)', padding: '2px 8px', borderRadius: 4 }}>
                          {t.magasin_source_code || '?'}
                        </code>
                        →
                        <code style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)', padding: '2px 8px', borderRadius: 4 }}>
                          {t.magasin_dest_code || '?'}
                        </code>
                      </span>
                    </td>
                    <td>{t.utilisateur}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => handleOpenValidation(t)}
                        className="btn btn-primary btn-sm"
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

      {/* ── Transferts validés récents ── */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">✅ Transferts validés récents</h3>
        </div>

        {transfertsValidated.length === 0 ? (
          <StateEmpty message="Aucun transfert validé pour le moment." />
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date transfert</th>
                  <th>Date validation</th>
                  <th>Lot</th>
                  <th>Qté envoyée</th>
                  <th>Qté reçue</th>
                  <th>État</th>
                  <th>Validateur</th>
                </tr>
              </thead>
              <tbody>
                {transfertsValidated.map(t => (
                  <tr key={t.id}>
                    <td>{new Date(t.date_retrait || Date.now()).toLocaleDateString('fr-FR')}</td>
                    <td>{t.date_validation ? new Date(t.date_validation).toLocaleDateString('fr-FR') : '—'}</td>
                    <td style={{ fontWeight: 600 }}>{t.lot_description || '—'}</td>
                    <td>{t.quantite} {t.unite}</td>
                    <td style={{ color: t.quantite_recue < t.quantite ? 'var(--color-warning)' : 'inherit', fontWeight: t.quantite_recue < t.quantite ? 700 : 400 }}>
                      {t.quantite_recue || t.quantite} {t.unite}
                    </td>
                    <td>
                      <span className={etatClass(t.etat_produit)}>
                        {t.etat_produit || 'conforme'}
                      </span>
                    </td>
                    <td className="text-muted">{t.validateur || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal de validation ── */}
      {showValidationModal && selectedTransfert && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowValidationModal(false); }}>
          <div className="modal">
            <h3 style={{ marginTop: 0, marginBottom: 20 }}>🔍 Validation du transfert</h3>

            {/* Récapitulatif */}
            <div style={{ background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 20 }}>
              <div className="grid-2" style={{ gap: 12 }}>
                <div>
                  <p className="text-muted text-xs" style={{ marginBottom: 2 }}>Lot</p>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{selectedTransfert.lot_description}</p>
                </div>
                <div>
                  <p className="text-muted text-xs" style={{ marginBottom: 2 }}>Quantité envoyée</p>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{selectedTransfert.quantite} {selectedTransfert.unite}</p>
                </div>
                <div>
                  <p className="text-muted text-xs" style={{ marginBottom: 2 }}>Source</p>
                  <code style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)', padding: '2px 8px', borderRadius: 4, fontSize: 13 }}>
                    {selectedTransfert.magasin_source_code || 'N/A'}
                  </code>
                </div>
                <div>
                  <p className="text-muted text-xs" style={{ marginBottom: 2 }}>Destination</p>
                  <code style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)', padding: '2px 8px', borderRadius: 4, fontSize: 13 }}>
                    {selectedTransfert.magasin_dest_code || 'N/A'}
                  </code>
                </div>
              </div>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleValidate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Quantité réellement reçue *</label>
                <input
                  className="form-control"
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={validationData.quantite_recue}
                  onChange={setVal('quantite_recue')}
                />
              </div>

              <div className="form-group">
                <label className="form-label">État du produit *</label>
                <select
                  className="form-control"
                  required
                  value={validationData.etat_produit}
                  onChange={setVal('etat_produit')}
                >
                  <option value="conforme">✓ Conforme</option>
                  <option value="partiellement_conforme">⚠️ Partiellement conforme</option>
                  <option value="non_conforme">✗ Non conforme</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Observations</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={validationData.observations}
                  onChange={setVal('observations')}
                  placeholder="Notes sur l'état, la qualité, les anomalies..."
                />
              </div>

              <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  ✅ Valider le transfert
                </button>
                <button type="button" onClick={handleReject} className="btn btn-danger">
                  ✗ Rejeter
                </button>
                <button type="button" onClick={() => setShowValidationModal(false)} className="btn btn-ghost">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
