
// src/pages/Audit.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAlert } from '../hooks/useAlert';
import { analyserInventaire } from '../hooks/useStockIntelligence';
import api from '../services/api';
import Alert from '../components/Alert';
import PageLayout, { StateLoading, StateEmpty } from '../components/PageLayout';

// ─── Composant : Grille performance par magasin ───────────────────────────────
function PerformanceGrid({ data, onSelectMagasin }) {
  if (!data.length) return (
    <StateEmpty icon="📊" message="Aucune donnée de performance disponible." />
  );

  const totaux = data.reduce((acc, s) => ({
    admissions:    acc.admissions    + (parseInt(s.nombre_admissions)       || 0),
    quantite:      acc.quantite      + (parseFloat(s.quantite_totale)        || 0),
    valeur:        acc.valeur        + (parseFloat(s.valeur_totale_admise)   || 0),
    profit:        acc.profit        + (parseFloat(s.profit_virtuel_genere)  || 0),
    alertes:       acc.alertes       + (parseInt(s.alertes_qualite)          || 0),
  }), { admissions: 0, quantite: 0, valeur: 0, profit: 0, alertes: 0 });

  return (
    <div>
      {/* Totaux globaux */}
      <div className="grid-3" style={{ marginBottom: 16 }}>
        <div className="stat-card stat-card-gradient" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
          <p className="stat-card-label">Valeur totale admise</p>
          <p className="stat-card-value" style={{ fontSize: 18 }}>
            {Math.round(totaux.valeur).toLocaleString('fr-FR')} <span style={{ fontSize: 12 }}>FCFA</span>
          </p>
        </div>
        <div className="stat-card stat-card-gradient" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
          <p className="stat-card-label">Profit virtuel (15%)</p>
          <p className="stat-card-value" style={{ fontSize: 18 }}>
            {Math.round(totaux.profit).toLocaleString('fr-FR')} <span style={{ fontSize: 12 }}>FCFA</span>
          </p>
        </div>
        <div className="stat-card stat-card-gradient" style={{ background: totaux.alertes > 0 ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #6b7280, #4b5563)' }}>
          <p className="stat-card-label">Alertes qualité</p>
          <p className="stat-card-value">{totaux.alertes}</p>
        </div>
      </div>

      {/* Cartes par magasin */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {data.map(s => {
          const profit = parseFloat(s.profit_virtuel_genere) || 0;
          const color  = profit > 0 ? 'var(--color-success)' : 'var(--color-danger)';
          return (
            <div
              key={s.magasin_id}
              onClick={() => onSelectMagasin(s)}
              style={{
                background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)',
                padding: 16, textAlign: 'center', cursor: 'pointer',
                border: `2px solid var(--color-border)`,
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--color-text)' }}>
                {s.nom_magasin}
              </p>
              <p style={{ fontSize: 20, fontWeight: 800, color, marginBottom: 4 }}>
                {Math.round(profit).toLocaleString('fr-FR')}
              </p>
              <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 8 }}>FCFA</p>
              <span className="badge badge-neutral" style={{ fontSize: 11 }}>
                📦 {s.nombre_admissions} admission{s.nombre_admissions > 1 ? 's' : ''}
              </span>
              {parseInt(s.alertes_qualite) > 0 && (
                <span className="badge badge-danger" style={{ fontSize: 11, marginLeft: 4 }}>
                  ⚠️ {s.alertes_qualite}
                </span>
              )}
              <p style={{ fontSize: 10, color: 'var(--color-primary)', marginTop: 8, textDecoration: 'underline' }}>
                Voir détail →
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Composant : Modal détail magasin ─────────────────────────────────────────
function ModalDetailMagasin({ magasin, logs, onClose }) {
  const [tab, setTab] = useState('transactions');

  const stocks    = []; // non disponible ici, santé basée sur les logs
  const mouvements = logs.map(l => ({
    lot_id:      l.lot_id,
    description: l.produit,
    quantite:    l.quantite,
    type:        l.action === 'admission' ? 'admission' : 'retrait',
  }));

  const tabs = [
    { key: 'transactions', label: '📄 Transactions' },
    { key: 'tendances',    label: '📊 Tendances' },
  ];

  // Agrégation tendances par produit
  const tendances = logs.reduce((acc, l) => {
    const k = l.produit || 'Inconnu';
    if (!acc[k]) acc[k] = { entrees: 0, sorties: 0 };
    if (l.action === 'admission') acc[k].entrees += parseFloat(l.quantite) || 0;
    else acc[k].sorties += parseFloat(l.quantite) || 0;
    return acc;
  }, {});

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 700, width: '95%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        {/* En-tête */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>🏪 {magasin.nom_magasin}</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm">✕</button>
        </div>

        {/* Onglets */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={tab === t.key ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Contenu */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {tab === 'transactions' && (
            logs.length === 0
              ? <StateEmpty message="Aucune transaction sur 30 jours." />
              : (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Produit</th>
                        <th>Action</th>
                        <th>Qté</th>
                        <th style={{ textAlign: 'right' }}>Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((l, i) => (
                        <tr key={i}>
                          <td>{new Date(l.date).toLocaleDateString('fr-FR')}</td>
                          <td style={{ fontWeight: 600 }}>{l.produit || '—'}</td>
                          <td>
                            <span className={l.action === 'admission' ? 'badge badge-success' : 'badge badge-warning'}>
                              {l.action}
                            </span>
                          </td>
                          <td>{l.quantite} {l.unite}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            {Math.round(parseFloat(l.montant) || 0).toLocaleString('fr-FR')} FCFA
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
          )}

          {tab === 'tendances' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 4 }}>
              <p className="text-muted text-sm" style={{ marginBottom: 8 }}>Balance mouvements (30 jours)</p>
              {Object.entries(tendances).map(([produit, vals], i) => {
                const net = vals.entrees - vals.sorties;
                const max = Math.max(vals.entrees, vals.sorties, 1);
                return (
                  <div key={i} style={{ background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{produit}</span>
                      <span style={{ fontSize: 12, color: net >= 0 ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 700 }}>
                        {net >= 0 ? '+' : ''}{Math.round(net)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, fontSize: 11, color: 'var(--color-text-muted)' }}>
                      <span style={{ color: 'var(--color-success)' }}>▲ {Math.round(vals.entrees)}</span>
                      <span style={{ color: 'var(--color-danger)' }}>▼ {Math.round(vals.sorties)}</span>
                    </div>
                    <div style={{ marginTop: 6, height: 6, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(vals.entrees / max) * 100}%`, background: 'var(--color-success)', borderRadius: 3 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Export PDF ───────────────────────────────────────────────────────────────
function exportAuditPDF(performanceData, user) {
  const totaux = performanceData.reduce((acc, s) => ({
    admissions: acc.admissions + (parseInt(s.nombre_admissions)      || 0),
    quantite:   acc.quantite   + (parseFloat(s.quantite_totale)       || 0),
    valeur:     acc.valeur     + (parseFloat(s.valeur_totale_admise)  || 0),
    profit:     acc.profit     + (parseFloat(s.profit_virtuel_genere) || 0),
    alertes:    acc.alertes    + (parseInt(s.alertes_qualite)         || 0),
  }), { admissions: 0, quantite: 0, valeur: 0, profit: 0, alertes: 0 });

  const w = window.open('', '_blank', 'height=800,width=1000');
  w.document.write(`
    <html><head>
      <title>Rapport Audit NFBO — ${new Date().toLocaleDateString('fr-FR')}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
        .header { border-bottom: 2px solid #166534; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; }
        .brand { font-size: 22px; font-weight: bold; color: #166534; }
        .meta { font-size: 11px; color: #666; text-align: right; }
        .grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 32px; }
        .card { background: #f8f9fa; border: 1px solid #ddd; padding: 14px; border-radius: 6px; text-align: center; }
        .card-label { font-size: 10px; text-transform: uppercase; color: #666; letter-spacing: 1px; }
        .card-value { font-size: 18px; font-weight: bold; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background: #166534; color: white; padding: 10px; text-align: left; }
        td { border-bottom: 1px solid #eee; padding: 10px; }
        tr:nth-child(even) { background: #f9f9f9; }
        .total td { border-top: 2px solid #333; font-weight: bold; background: #dcfce7; }
        .footer { margin-top: 40px; font-size: 10px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 10px; }
        @media print { body { padding: 20px; } }
      </style>
    </head><body>
      <div class="header">
        <div class="brand">NFBO — Rapport de Performance</div>
        <div class="meta">
          Généré le ${new Date().toLocaleString('fr-FR')}<br>
          Par : ${user?.username || 'auditeur'}
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <div class="card-label">Valeur totale admise</div>
          <div class="card-value" style="color:#166534">${Math.round(totaux.valeur).toLocaleString('fr-FR')} FCFA</div>
        </div>
        <div class="card">
          <div class="card-label">Profit virtuel (15%)</div>
          <div class="card-value" style="color:#15803d">${Math.round(totaux.profit).toLocaleString('fr-FR')} FCFA</div>
        </div>
        <div class="card">
          <div class="card-label">Alertes qualité</div>
          <div class="card-value" style="color:${totaux.alertes > 0 ? '#dc2626' : '#333'}">${totaux.alertes}</div>
        </div>
      </div>

      <h3>Détail par magasin</h3>
      <table>
        <thead>
          <tr>
            <th>Magasin</th>
            <th>Admissions</th>
            <th style="text-align:right">Quantité</th>
            <th style="text-align:right">Valeur admise (FCFA)</th>
            <th style="text-align:right">Profit (FCFA)</th>
            <th style="text-align:center">Alertes</th>
          </tr>
        </thead>
        <tbody>
          ${performanceData.map(s => `
            <tr>
              <td><strong>${s.nom_magasin}</strong></td>
              <td>${s.nombre_admissions}</td>
              <td style="text-align:right">${Math.round(parseFloat(s.quantite_totale)).toLocaleString('fr-FR')}</td>
              <td style="text-align:right">${Math.round(parseFloat(s.valeur_totale_admise)).toLocaleString('fr-FR')}</td>
              <td style="text-align:right;color:${parseFloat(s.profit_virtuel_genere) >= 0 ? '#166534' : '#dc2626'}">
                ${Math.round(parseFloat(s.profit_virtuel_genere)).toLocaleString('fr-FR')}
              </td>
              <td style="text-align:center">${s.alertes_qualite || '—'}</td>
            </tr>
          `).join('')}
          <tr class="total">
            <td>TOTAL GÉNÉRAL</td>
            <td>${totaux.admissions}</td>
            <td style="text-align:right">${Math.round(totaux.quantite).toLocaleString('fr-FR')}</td>
            <td style="text-align:right">${Math.round(totaux.valeur).toLocaleString('fr-FR')}</td>
            <td style="text-align:right">${Math.round(totaux.profit).toLocaleString('fr-FR')}</td>
            <td style="text-align:center">${totaux.alertes}</td>
          </tr>
        </tbody>
      </table>

      <div class="footer">
        Document confidentiel — Ne pas diffuser sans autorisation.<br>
        © ${new Date().getFullYear()} NFBO System
      </div>
    </body></html>
  `);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 500);
}

// ─── Page principale ───────────────────────────────────────────────────────────
export default function Audit() {
  const { user } = useAuth();
  const { alert, showAlert, hideAlert } = useAlert();

  const [transfertsPending,   setTransfertsPending]   = useState([]);
  const [transfertsValidated, setTransfertsValidated] = useState([]);
  const [performanceData,     setPerformanceData]     = useState([]);
  const [loading,             setLoading]             = useState(false);
  const [selectedTransfert,   setSelectedTransfert]   = useState(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [selectedMagasin,     setSelectedMagasin]     = useState(null);
  const [magasinLogs,         setMagasinLogs]         = useState([]);
  const [loadingLogs,         setLoadingLogs]         = useState(false);

  const [validationData, setValidationData] = useState({
    quantite_recue: '',
    etat_produit:   'conforme',
    observations:   '',
  });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [pending, validated, perf] = await Promise.all([
        api.getAuditPending(),
        api.request('/audit?action=validated-transfers'),
        api.getAuditPerformance(),
      ]);
      setTransfertsPending(pending);
      setTransfertsValidated(validated);
      setPerformanceData(perf);
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
        statut:             'livré',
        validation_auditeur: true,
        ...validationData,
        quantite_recue:     parseFloat(validationData.quantite_recue),
        validateur:         user?.username || 'unknown',
      });
      showAlert('✅ Transfert validé avec succès', 'success');
      setShowValidationModal(false);
      setSelectedTransfert(null);
      loadAll();
    } catch (err) {
      showAlert(`❌ Erreur: ${err.message}`, 'error');
    }
  };

  const handleReject = async () => {
    if (!confirm('Êtes-vous sûr de vouloir rejeter ce transfert ?')) return;
    try {
      await api.validateTransfert(selectedTransfert.id, {
        statut:          'rejeté',
        observations:    validationData.observations || "Rejeté par l'auditeur",
        validateur:      user?.username || 'unknown',
      });
      showAlert('✅ Transfert rejeté', 'success');
      setShowValidationModal(false);
      setSelectedTransfert(null);
      loadAll();
    } catch (err) {
      showAlert(`❌ Erreur: ${err.message}`, 'error');
    }
  };

  const handleSelectMagasin = async (magasin) => {
    setSelectedMagasin(magasin);
    setMagasinLogs([]);
    setLoadingLogs(true);
    try {
      const logs = await api.getAuditLogsByStore(magasin.magasin_id);
      setMagasinLogs(logs);
    } catch (err) {
      showAlert(`❌ Erreur logs: ${err.message}`, 'error');
    } finally {
      setLoadingLogs(false);
    }
  };

  const setVal = (field) => (e) =>
    setValidationData(v => ({ ...v, [field]: e.target.value }));

  const total     = transfertsPending.length + transfertsValidated.length;
  const tauxValid = total > 0 ? Math.round((transfertsValidated.length / total) * 100) : 0;

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
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={loadAll} className="btn btn-ghost btn-sm">🔄 Actualiser</button>
          {performanceData.length > 0 && (
            <button onClick={() => exportAuditPDF(performanceData, user)} className="btn btn-primary btn-sm">
              📄 Exporter PDF
            </button>
          )}
        </div>
      }
    >
      <Alert message={alert?.message} type={alert?.type} onClose={hideAlert} />

      {/* ── Statistiques ── */}
      <div className="grid-3">
        <div className="stat-card stat-card-gradient" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p className="stat-card-label">En attente</p>
              <p className="stat-card-value">{transfertsPending.length}</p>
            </div>
            <span style={{ fontSize: 48, opacity: .25 }}>⏳</span>
          </div>
        </div>
        <div className="stat-card stat-card-gradient" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p className="stat-card-label">Validés</p>
              <p className="stat-card-value">{transfertsValidated.length}</p>
            </div>
            <span style={{ fontSize: 48, opacity: .25 }}>✓</span>
          </div>
        </div>
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

      {/* ── Performance par magasin ── */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📊 Performance par magasin (30 jours)</h3>
        </div>
        {loading ? <StateLoading /> : (
          <PerformanceGrid data={performanceData} onSelectMagasin={handleSelectMagasin} />
        )}
      </div>

      {/* ── Transferts en attente ── */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            ⏳ En attente de validation
            <span className="badge badge-warning" style={{ marginLeft: 8 }}>{transfertsPending.length}</span>
          </h3>
        </div>
        {loading ? <StateLoading /> : transfertsPending.length === 0 ? (
          <StateEmpty icon="✅" message="Aucun transfert en attente — tout est à jour !" />
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th><th>Lot</th><th>Quantité</th>
                  <th>Source → Destination</th><th>Initiateur</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transfertsPending.map(t => (
                  <tr key={t.id}>
                    <td>{new Date(t.date_creation || Date.now()).toLocaleDateString('fr-FR')}</td>
                    <td style={{ fontWeight: 600 }}>{t.lot_description || 'N/A'}</td>
                    <td>{t.quantite} {t.unite}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                        <code style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)', padding: '2px 8px', borderRadius: 4 }}>
                          {t.magasin_depart_nom || '?'}
                        </code>
                        →
                        <code style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)', padding: '2px 8px', borderRadius: 4 }}>
                          {t.magasin_destination_nom || '?'}
                        </code>
                      </span>
                    </td>
                    <td>{t.utilisateur}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button onClick={() => handleOpenValidation(t)} className="btn btn-primary btn-sm">
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
                  <th>Date transfert</th><th>Date validation</th><th>Lot</th>
                  <th>Qté envoyée</th><th>Source → Destination</th><th>Validateur</th>
                </tr>
              </thead>
              <tbody>
                {transfertsValidated.map(t => (
                  <tr key={t.id}>
                    <td>{new Date(t.date_creation || Date.now()).toLocaleDateString('fr-FR')}</td>
                    <td>{t.date_reception ? new Date(t.date_reception).toLocaleDateString('fr-FR') : '—'}</td>
                    <td style={{ fontWeight: 600 }}>{t.lot_description || '—'}</td>
                    <td>{t.quantite} {t.unite}</td>
                    <td>
                      <span style={{ fontSize: 12 }}>
                        {t.magasin_depart_nom || '?'} → {t.magasin_destination_nom || '?'}
                      </span>
                    </td>
                    <td className="text-muted">{t.utilisateur || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal détail magasin ── */}
      {selectedMagasin && (
        <ModalDetailMagasin
          magasin={selectedMagasin}
          logs={loadingLogs ? [] : magasinLogs}
          onClose={() => { setSelectedMagasin(null); setMagasinLogs([]); }}
        />
      )}

      {/* ── Modal validation transfert ── */}
      {showValidationModal && selectedTransfert && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowValidationModal(false); }}>
          <div className="modal">
            <h3 style={{ marginTop: 0, marginBottom: 20 }}>🔍 Validation du transfert</h3>
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
                    {selectedTransfert.magasin_depart_nom || 'N/A'}
                  </code>
                </div>
                <div>
                  <p className="text-muted text-xs" style={{ marginBottom: 2 }}>Destination</p>
                  <code style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)', padding: '2px 8px', borderRadius: 4, fontSize: 13 }}>
                    {selectedTransfert.magasin_destination_nom || 'N/A'}
                  </code>
                </div>
              </div>
            </div>
            <form onSubmit={handleValidate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Quantité réellement reçue *</label>
                <input className="form-control" type="number" required min="0" step="0.01"
                  value={validationData.quantite_recue} onChange={setVal('quantite_recue')} />
              </div>
              <div className="form-group">
                <label className="form-label">État du produit *</label>
                <select className="form-control" required value={validationData.etat_produit} onChange={setVal('etat_produit')}>
                  <option value="conforme">✓ Conforme</option>
                  <option value="partiellement_conforme">⚠️ Partiellement conforme</option>
                  <option value="non_conforme">✗ Non conforme</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Observations</label>
                <textarea className="form-control" rows={3} value={validationData.observations}
                  onChange={setVal('observations')} placeholder="Notes sur l'état, la qualité, les anomalies..." />
              </div>
              <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>✅ Valider</button>
                <button type="button" onClick={handleReject} className="btn btn-danger">✗ Rejeter</button>
                <button type="button" onClick={() => setShowValidationModal(false)} className="btn btn-ghost">Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageLayout>
  );
}