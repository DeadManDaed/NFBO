// src/pages/Transferts.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAlert } from '../hooks/useAlert';
import api from '../services/api';
import Alert from '../components/Alert';
import PageLayout, { StateEmpty, StateLoading } from '../components/PageLayout';

const STATUT_CONFIG = {
  'proposé':    { label: '📋 Proposé',     className: 'badge-warning' },
  'approuvé':   { label: '👍 Approuvé',    className: 'badge-info' },
  'en_transit': { label: '🚚 En transit',  className: 'badge-primary' },
  'reçu':       { label: '📬 Reçu',        className: 'badge-success' },
  'livré':      { label: '✅ Livré',        className: 'badge-success' },
  'rejeté':     { label: '❌ Rejeté',       className: 'badge-danger' },
};

export default function Transferts() {
  const { user, magasinId, isSuperAdmin } = useAuth();
  const { alert, showAlert, hideAlert }   = useAlert();
  const isAdmin = user?.role === 'admin';
  const isStock = user?.role === 'stock';

  const [showForm,          setShowForm]          = useState(false);
  const [magasins,          setMagasins]          = useState([]);
  const [stocks,            setStocks]            = useState([]);
  const [chauffeurs,        setChauffeurs]        = useState([]);
  const [transferts,        setTransferts]        = useState([]);
  const [unitesDisponibles, setUnitesDisponibles] = useState([]);
  const [loading,           setLoading]           = useState(true);
  const [expanded,          setExpanded]          = useState(null);

  const [formData, setFormData] = useState({
    magasin_depart:      magasinId || '',
    magasin_destination: '',
    lot_id:              '',
    quantite:            '',
    quantite_min:        '',
    quantite_max:        '',
    unite:               '',
    chauffeur_id:        '',
    motif:               '',
  });

  useEffect(() => {
    loadMagasins();
    loadTransferts();
    if (magasinId) {
      loadStocksForMagasin(magasinId);
      loadChauffeurs(magasinId);
    }
  }, [magasinId]);

  const loadMagasins   = async () => { try { setMagasins(await api.getMagasins()); } catch {} };

  const loadTransferts = async () => {
    setLoading(true);
    try { setTransferts(await api.getTransferts()); }
    catch (err) { showAlert(`❌ ${err.message}`, 'error'); }
    finally { setLoading(false); }
  };

  const loadStocksForMagasin = async (magId) => {
    try { setStocks(await api.getStockDisponible(magId)); } catch {}
  };

  const loadChauffeurs = async (magSourceId, magDestId = null) => {
    try {
      const all = await api.getChauffeurs();
      // Filtrer : chauffeur doit appartenir à source OU destination
      const filtres = all.filter(c =>
        c.magasin_id === parseInt(magSourceId) ||
        (magDestId && c.magasin_id === parseInt(magDestId))
      ).map(c => ({
        ...c,
        label: c.magasin_id === parseInt(magSourceId) ? '🟢 Source' : '🔵 Destination',
      }));
      setChauffeurs(filtres);
    } catch {}
  };

  const handleMagasinSourceChange = (magId) => {
    setFormData(f => ({ ...f, magasin_depart: magId, lot_id: '', quantite: '' }));
    loadStocksForMagasin(magId);
    loadChauffeurs(magId, formData.magasin_destination);
  };

  const handleMagasinDestChange = (magId) => {
    setFormData(f => ({ ...f, magasin_destination: magId }));
    loadChauffeurs(formData.magasin_depart, magId);
  };

  const handleLotChange = (lotId) => {
    const stock = stocks.find(s => s.lot_id === parseInt(lotId));
    if (stock) {
      setUnitesDisponibles(stock.unites_admises || []);
      setFormData(f => ({
        ...f,
        lot_id: lotId,
        unite: stock.unite || stock.unites_admises?.[0] || '',
      }));
    }
  };

  const set = (field) => (e) => setFormData(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.magasin_depart === formData.magasin_destination) {
      showAlert('❌ Source et destination identiques', 'error');
      return;
    }
    const stock = stocks.find(s => s.lot_id === parseInt(formData.lot_id));
    try {
      await api.createTransfert({
        lot_id:              parseInt(formData.lot_id),
        quantite:            parseFloat(formData.quantite),
        quantite_min:        formData.quantite_min ? parseFloat(formData.quantite_min) : null,
        quantite_max:        formData.quantite_max ? parseFloat(formData.quantite_max) : null,
        unite:               formData.unite,
        magasin_depart:      parseInt(formData.magasin_depart),
        magasin_destination: parseInt(formData.magasin_destination),
        prix_ref:            stock?.prix_ref || 0,
        motif:               formData.motif || null,
        ordonne:             isSuperAdmin,
      });
      showAlert('✅ Demande de transfert soumise', 'success');
      setFormData({
        magasin_depart: magasinId || '', magasin_destination: '',
        lot_id: '', quantite: '', quantite_min: '', quantite_max: '',
        unite: '', chauffeur_id: '', motif: '',
      });
      setUnitesDisponibles([]);
      setShowForm(false);
      loadTransferts();
    } catch (err) {
      showAlert(`❌ ${err.message}`, 'error');
    }
  };

  // ── Actions de transition ────────────────────────────────────────────────
  const doAction = async (id, action, extra = {}) => {
    try {
      await api.request(`/transferts?id=${id}`, {
        method: 'PUT',
        body: JSON.stringify({ action, ...extra }),
      });
      showAlert(`✅ Opération effectuée`, 'success');
      loadTransferts();
      setExpanded(null);
    } catch (err) {
      showAlert(`❌ ${err.message}`, 'error');
    }
  };

  const handleApprouver  = (t) => { if (confirm('Approuver ce transfert ?')) doAction(t.id, 'approuver'); };
  const handleExpedier   = (t) => {
    const chauf = prompt('ID du chauffeur (laisser vide si aucun) :');
    if (chauf === null) return;
    doAction(t.id, 'expedier', { chauffeur_id: chauf || null });
  };
  const handleRecevoir   = (t) => { if (confirm('Confirmer la réception ?')) doAction(t.id, 'recevoir'); };
  const handleValider    = (t) => { if (confirm('Valider définitivement ce transfert ?')) doAction(t.id, 'valider'); };
  const handleRejeter    = (t) => {
    const motif = prompt('Motif du rejet :');
    if (motif === null) return;
    doAction(t.id, 'rejeter', { observations: motif });
  };

  // ── Boutons selon rôle + statut ──────────────────────────────────────────
  const getBoutons = (t) => {
    const boutons = [];
    const estSource = t.magasin_depart === magasinId;
    const estDest   = t.magasin_destination === magasinId;

    if (t.statut === 'proposé' && (isAdmin || isSuperAdmin) && (isSuperAdmin || estSource)) {
      boutons.push({ label: '👍 Approuver', action: () => handleApprouver(t), cls: 'btn-primary' });
    }
    if (t.statut === 'approuvé' && (isAdmin || isSuperAdmin) && (isSuperAdmin || estSource)) {
      boutons.push({ label: '🚚 Expédier', action: () => handleExpedier(t), cls: 'btn-primary' });
    }
    if (t.statut === 'en_transit' && (isAdmin || isSuperAdmin) && (isSuperAdmin || estDest)) {
      boutons.push({ label: '📬 Confirmer réception', action: () => handleRecevoir(t), cls: 'btn-primary' });
    }
    if (t.statut === 'reçu' && isSuperAdmin) {
      boutons.push({ label: '✅ Valider définitivement', action: () => handleValider(t), cls: 'btn-primary' });
    }
    // Rejeter : disponible à plusieurs étapes
    const peutRejeter = isSuperAdmin ||
      ((isAdmin || isStock) && (estSource || estDest) &&
       ['proposé','approuvé','en_transit','reçu'].includes(t.statut));
    if (peutRejeter) {
      boutons.push({ label: '❌ Rejeter', action: () => handleRejeter(t), cls: 'btn-danger' });
    }
    return boutons;
  };

  return (
    <PageLayout
      title="Transferts inter-magasins"
      icon="🔄"
      subtitle="Mouvements de stock entre magasins"
      actions={
        <button onClick={() => setShowForm(v => !v)} className={showForm ? 'btn btn-ghost' : 'btn btn-primary'}>
          {showForm ? '✖ Annuler' : '➕ Nouveau transfert'}
        </button>
      }
    >
      <Alert message={alert?.message} type={alert?.type} onClose={hideAlert} />

      {/* ── Formulaire ── */}
      {showForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <h3 className="card-title">Nouvelle demande de transfert</h3>
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-grid">

              <div className="form-group">
                <label className="form-label">Magasin source *</label>
                <select
                  className="form-control" required
                  value={formData.magasin_depart}
                  onChange={e => handleMagasinSourceChange(e.target.value)}
                  disabled={!isSuperAdmin}
                >
                  <option value="">Sélectionner</option>
                  {magasins.map(m => <option key={m.id} value={m.id}>{m.nom} ({m.code})</option>)}
                </select>
                {!isSuperAdmin && <p className="text-muted text-xs" style={{ marginTop: 4 }}>🔒 Votre magasin</p>}
              </div>

              <div className="form-group">
                <label className="form-label">Magasin destination *</label>
                <select
                  className="form-control" required
                  value={formData.magasin_destination}
                  onChange={e => handleMagasinDestChange(e.target.value)}
                >
                  <option value="">Sélectionner</option>
                  {magasins
                    .filter(m => m.id !== parseInt(formData.magasin_depart))
                    .map(m => <option key={m.id} value={m.id}>{m.nom} ({m.code})</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Lot *</label>
                <select
                  className="form-control" required
                  value={formData.lot_id}
                  onChange={e => handleLotChange(e.target.value)}
                  disabled={!formData.magasin_depart}
                >
                  <option value="">Sélectionner un lot</option>
                  {stocks.map(s => (
                    <option key={s.lot_id} value={s.lot_id}>
                      {s.description} — Stock: {s.stock_actuel} {s.unite}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Quantité proposée *</label>
                <input className="form-control" type="number" required min="0" step="0.01"
                  value={formData.quantite} onChange={set('quantite')} />
              </div>

              <div className="form-group">
                <label className="form-label">Quantité min souhaitée</label>
                <input className="form-control" type="number" min="0" step="0.01"
                  value={formData.quantite_min} onChange={set('quantite_min')}
                  placeholder="Optionnel" />
              </div>

              <div className="form-group">
                <label className="form-label">Quantité max souhaitée</label>
                <input className="form-control" type="number" min="0" step="0.01"
                  value={formData.quantite_max} onChange={set('quantite_max')}
                  placeholder="Optionnel" />
              </div>

              <div className="form-group">
                <label className="form-label">Unité *</label>
                <select className="form-control" required value={formData.unite}
                  onChange={set('unite')} disabled={!unitesDisponibles.length}>
                  <option value="">Sélectionner</option>
                  {unitesDisponibles.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

            </div>

            <div className="form-group">
              <label className="form-label">Motif / Observations</label>
              <textarea className="form-control" rows={2}
                value={formData.motif} onChange={set('motif')}
                placeholder="Raison du transfert, urgence, contexte..." />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary btn-lg">
                📦 Soumettre la demande
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Liste des transferts ── */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Transferts</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="badge badge-neutral">{transferts.length}</span>
            <button onClick={loadTransferts} className="btn btn-ghost btn-sm">🔄</button>
          </div>
        </div>

        {loading ? <StateLoading /> : transferts.length === 0 ? (
          <StateEmpty message="Aucun transfert enregistré." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 4px' }}>
            {transferts.map(t => {
              const cfg      = STATUT_CONFIG[t.statut] || { label: t.statut, className: 'badge-neutral' };
              const isOpen   = expanded === t.id;
              const boutons  = getBoutons(t);
              const srcNom   = t.magasin_depart_nom   || magasins.find(m => m.id === t.magasin_depart)?.nom       || `#${t.magasin_depart}`;
              const destNom  = t.magasin_destination_nom || magasins.find(m => m.id === t.magasin_destination)?.nom || `#${t.magasin_destination}`;

              return (
                <div key={t.id} style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                }}>
                  {/* En-tête cliquable */}
                  <div
                    onClick={() => setExpanded(isOpen ? null : t.id)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 14px', cursor: 'pointer', gap: 10 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)',
                        transform: isOpen ? 'rotate(90deg)' : 'none',
                        display: 'inline-block', transition: 'transform .2s' }}>▶</span>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: 700, fontSize: 13, margin: '0 0 2px',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.lot_description || `Lot #${t.lot_id}`}
                          <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: 12 }}>
                            {' '}— {parseFloat(t.quantite).toLocaleString('fr-FR')} {t.unite}
                          </span>
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>
                          {srcNom} → {destNom} · {new Date(t.date_creation).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {boutons.length > 0 && (
                        <span style={{ width: 8, height: 8, borderRadius: '50%',
                          background: '#f59e0b', display: 'inline-block' }} />
                      )}
                      <span className={`badge ${cfg.className}`}>{cfg.label}</span>
                    </div>
                  </div>

                  {/* Détails dépliés */}
                  {isOpen && (
                    <div style={{ borderTop: '1px solid var(--color-border)', padding: 14 }}>

                      {/* Infos */}
                      <div className="form-grid" style={{ gap: 8, marginBottom: 12 }}>
                        {[
                          ['Source',       srcNom],
                          ['Destination',  destNom],
                          ['Quantité',     `${parseFloat(t.quantite).toLocaleString('fr-FR')} ${t.unite}`],
                          ['Intervalle',   t.quantite_min ? `${t.quantite_min} – ${t.quantite_max || '∞'}` : '—'],
                          ['Proposé par',  t.utilisateur || '—'],
                          ['Approuvé par', t.approuve_par || '—'],
                          ['Reçu par',     t.recu_par || '—'],
                          ['Validé par',   t.valide_par || '—'],
                          ['Ordonné par',  t.ordonne_par || '—'],
                          ['Motif',        t.motif || '—'],
                        ].map(([label, value]) => (
                          <div key={label} style={{ background: 'var(--color-surface-alt)',
                            borderRadius: 6, padding: '7px 10px' }}>
                            <p style={{ fontSize: 10, textTransform: 'uppercase',
                              color: 'var(--color-text-muted)', margin: '0 0 2px' }}>{label}</p>
                            <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>{value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Boutons d'action */}
                      {boutons.length > 0 && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                          {boutons.map((b, i) => (
                            <button key={i} onClick={b.action} className={`btn ${b.cls} btn-sm`}>
                              {b.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
