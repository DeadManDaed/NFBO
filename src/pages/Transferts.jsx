// src/pages/Transferts.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAlert } from '../hooks/useAlert';
import api from '../services/api';
import Alert from '../components/Alert';
import PageLayout, { StateEmpty, StateLoading } from '../components/PageLayout';

const STATUT_CONFIG = {
  'proposé':    { label: '📋 Proposé',    cls: 'badge-warning' },
  'approuvé':   { label: '👍 Approuvé',   cls: 'badge-info'    },
  'en_transit': { label: '🚚 En transit', cls: 'badge-primary' },
  'reçu':       { label: '📬 Reçu',       cls: 'badge-success' },
  'livré':      { label: '✅ Livré',       cls: 'badge-success' },
  'rejeté':     { label: '❌ Rejeté',      cls: 'badge-danger'  },
};

const STATUT_LOT_CONFIG = {
  rupture:   { label: '🔴 Rupture',   cls: 'badge-danger'  },
  peremption:{ label: '🟠 Péremption',cls: 'badge-warning' },
  dormant:   { label: '💤 Dormant',   cls: 'badge-neutral' },
  star:      { label: '⭐ Star',       cls: 'badge-success' },
  normal:    { label: '🟢 Normal',    cls: 'badge-info'    },
};

export default function Transferts() {
  const { user, magasinId, isSuperAdmin } = useAuth();
  const { alert, showAlert, hideAlert }   = useAlert();
  const isAdmin = user?.role === 'admin';
  const isStock = user?.role === 'stock';

  const [showForm,          setShowForm]          = useState(false);
  const [magasins,          setMagasins]          = useState([]);
  const [lots,              setLots]              = useState([]);
  const [stocks,            setStocks]            = useState([]);
  const [sources,           setSources]           = useState([]);  // magasins sources triés
  const [chauffeurs,        setChauffeurs]        = useState([]);
  const [transferts,        setTransferts]        = useState([]);
  const [unitesDisponibles, setUnitesDisponibles] = useState([]);
  const [loading,           setLoading]           = useState(true);
  const [expanded,          setExpanded]          = useState(null);

  // Formulaire demande (stock) — destination = magasin du stock lui-même
  const [demande, setDemande] = useState({
    lot_id:       '',
    quantite_min: '',
    quantite_max: '',
    unite:        '',
    motif:        '',
  });

  // Formulaire proposition/ordre (admin/superadmin)
  const [proposition, setProposition] = useState({
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
const [approbation, setApprobation] = useState(null); // { transfert, sourcesChargées }



  useEffect(() => {
    loadMagasins();
    loadTransferts();
    if (isStock) {
      loadLots();
    } else if (magasinId || isSuperAdmin) {
      if (magasinId) loadStocksForMagasin(magasinId);
    }
  }, [magasinId]);

  const loadMagasins = async () => {
    try { setMagasins(await api.getMagasins()); } catch {}
  };

  const loadLots = async () => {
    try { setLots(await api.getLots()); } catch {}
  };

  const loadTransferts = async () => {
    setLoading(true);
    try { setTransferts(await api.getTransferts()); }
    catch (err) { showAlert(`❌ ${err.message}`, 'error'); }
    finally { setLoading(false); }
  };

  const loadStocksForMagasin = async (magId) => {
    try { setStocks(await api.getStockDisponible(magId)); } catch {}
  };

  const loadSourcesForLot = async (lotId) => {
    try {
      const data = await api.request(`/transferts/sources?lot_id=${lotId}`);
      setSources(data);
    } catch { setSources([]); }
  };

  const loadChauffeurs = async (magSourceId, magDestId = null) => {
    try {
      const all = await api.getChauffeurs();
      const filtres = all
        .filter(c =>
          c.magasin_id === parseInt(magSourceId) ||
          (magDestId && c.magasin_id === parseInt(magDestId))
        )
        .map(c => ({
          ...c,
          label: c.magasin_id === parseInt(magSourceId) ? '🟢 Source' : '🔵 Destination',
        }));
      setChauffeurs(filtres);
    } catch {}
  };

  // ── Handlers formulaire demande (stock) ─────────────────────────────────
  const setD = (field) => (e) => setDemande(f => ({ ...f, [field]: e.target.value }));

  const handleLotDemande = (lotId) => {
    const lot = lots.find(l => l.id === parseInt(lotId));
    setDemande(f => ({
      ...f,
      lot_id: lotId,
      unite: lot?.unite || lot?.unites_admises?.[0] || '',
    }));
    setUnitesDisponibles(lot?.unites_admises || (lot?.unite ? [lot.unite] : []));
  };

  const handleSubmitDemande = async (e) => {
    e.preventDefault();
    if (parseFloat(demande.quantite_min) > parseFloat(demande.quantite_max)) {
      showAlert('❌ La quantité min ne peut pas dépasser la max', 'error');
      return;
    }
    try {
      await api.createTransfert({
        lot_id:              parseInt(demande.lot_id),
        magasin_destination: magasinId,   // destination = son propre magasin
        quantite_min:        parseFloat(demande.quantite_min),
        quantite_max:        parseFloat(demande.quantite_max),
        unite:               demande.unite,
        motif:               demande.motif,
      });
      showAlert('✅ Demande soumise — superadmin et auditeur notifiés', 'success');
      setDemande({ lot_id: '', quantite_min: '', quantite_max: '', unite: '', motif: '' });
      setUnitesDisponibles([]);
      setShowForm(false);
      loadTransferts();
    } catch (err) {
      showAlert(`❌ ${err.message}`, 'error');
    }
  };

  // ── Handlers formulaire proposition (admin/superadmin) ──────────────────
  const setP = (field) => (e) => setProposition(f => ({ ...f, [field]: e.target.value }));

  const handleMagasinSourceChange = (magId) => {
    setProposition(f => ({ ...f, magasin_depart: magId, lot_id: '', quantite: '' }));
    loadStocksForMagasin(magId);
    loadChauffeurs(magId, proposition.magasin_destination);
    setSources([]);
  };

  const handleMagasinDestChange = (magId) => {
    setProposition(f => ({ ...f, magasin_destination: magId }));
    loadChauffeurs(proposition.magasin_depart, magId);
  };

  const handleLotProposition = (lotId) => {
    const stock = stocks.find(s => s.lot_id === parseInt(lotId));
    if (stock) {
      setUnitesDisponibles(stock.unites_admises || []);
      setProposition(f => ({
        ...f,
        lot_id: lotId,
        unite: stock.unite || stock.unites_admises?.[0] || '',
      }));
    }
    // superadmin : charger les sources disponibles triées
    if (isSuperAdmin && lotId) loadSourcesForLot(lotId);
  };

  const handleLotSuperAdmin = (lotId) => {
    const lot = lots.find(l => l.id === parseInt(lotId));
    setProposition(f => ({
      ...f,
      lot_id: lotId,
      unite: lot?.unite || lot?.unites_admises?.[0] || '',
      magasin_depart: '',
    }));
    setUnitesDisponibles(lot?.unites_admises || (lot?.unite ? [lot.unite] : []));
    if (lotId) loadSourcesForLot(lotId);
  };

  const handleSubmitProposition = async (e) => {
    e.preventDefault();
    if (proposition.magasin_depart === proposition.magasin_destination) {
      showAlert('❌ Source et destination identiques', 'error');
      return;
    }
    const stock = stocks.find(s => s.lot_id === parseInt(proposition.lot_id));
    const quantite = parseFloat(proposition.quantite);
    if (!isStock && stock && quantite > parseFloat(stock?.stock_actuel || 0)) {
      showAlert(`❌ Quantité (${quantite}) dépasse le stock disponible (${stock?.stock_actuel})`, 'error');
      return;
    }
    try {
      await api.createTransfert({
        lot_id:              parseInt(proposition.lot_id),
        quantite,
        quantite_min:        proposition.quantite_min ? parseFloat(proposition.quantite_min) : null,
        quantite_max:        proposition.quantite_max ? parseFloat(proposition.quantite_max) : null,
        unite:               proposition.unite,
        magasin_depart:      parseInt(proposition.magasin_depart),
        magasin_destination: parseInt(proposition.magasin_destination),
        chauffeur_id:        proposition.chauffeur_id || null,
        prix_ref:            stock?.prix_ref || 0,
        motif:               proposition.motif || null,
        ordonne:             isSuperAdmin,
      });
      showAlert(isSuperAdmin ? '⚡ Transfert ordonné' : '✅ Proposition soumise', 'success');
      setProposition({
        magasin_depart: magasinId || '', magasin_destination: '',
        lot_id: '', quantite: '', quantite_min: '', quantite_max: '',
        unite: '', chauffeur_id: '', motif: '',
      });
      setUnitesDisponibles([]);
      setSources([]);
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
      showAlert('✅ Opération effectuée', 'success');
      loadTransferts();
      setExpanded(null);
    } catch (err) {
      showAlert(`❌ ${err.message}`, 'error');
    }
  };

    const handleApprouver = async (t) => {
  if (!t.magasin_depart) {
    // Charger tous les magasins ayant ce lot en stock
    try {
      const token = await api.getToken();
      const res = await fetch(
        `/api/transferts?sources=1&lot_id=${t.lot_id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const srcs = await res.json();
      setApprobation({ transfert: t, sources: srcs });
    } catch {

      setApprobation({ transfert: t, sources: [] });
    }
  } else {
    if (confirm('Approuver ce transfert ?')) doAction(t.id, 'approuver');
  }
};
  const handleExpedier = (t) => {
    if (!confirm('Expédier ce transfert ? Le stock sera déduit.')) return;
    if (!t.chauffeur_id) {
      const chaufId = prompt('ID du chauffeur (optionnel, laisser vide pour ignorer) :');
      if (chaufId === null) return;
      doAction(t.id, 'expedier', { chauffeur_id: chaufId || null });
    } else {
      doAction(t.id, 'expedier');
    }
  };

  const handleRecevoir = (t) => {
    if (confirm('Confirmer la réception de ce transfert ?')) doAction(t.id, 'recevoir');
  };

  const handleValider = (t) => {
    if (confirm('Valider définitivement ce transfert ? Le stock destination sera crédité.'))
      doAction(t.id, 'valider');
  };

  const handleRejeter = (t) => {
    const motif = prompt('Motif du rejet :');
    if (motif === null) return;
    doAction(t.id, 'rejeter', { observations: motif });
  };

  // ── Boutons selon rôle + statut ──────────────────────────────────────────
  const getBoutons = (t) => {
    const boutons   = [];
    const estSource = t.magasin_depart === magasinId;
    const estDest   = t.magasin_destination === magasinId;

    if (t.statut === 'proposé' && isSuperAdmin) {
      boutons.push({ label: '👍 Approuver / Désigner source', action: () => handleApprouver(t), cls: 'btn-primary' });
    }
    if (t.statut === 'approuvé' && (isSuperAdmin || (isAdmin && estSource))) {
      boutons.push({ label: '🚚 Expédier', action: () => handleExpedier(t), cls: 'btn-primary' });
    }
    if (t.statut === 'en_transit' && (isSuperAdmin || (isAdmin && estDest))) {
      boutons.push({ label: '📬 Confirmer réception', action: () => handleRecevoir(t), cls: 'btn-primary' });
    }
    if (t.statut === 'reçu' && isSuperAdmin) {
      boutons.push({ label: '✅ Valider définitivement', action: () => handleValider(t), cls: 'btn-primary' });
    }
    const peutRejeter =
      isSuperAdmin ||
      (isAdmin && (estSource || estDest) &&
        ['proposé', 'approuvé', 'en_transit', 'reçu'].includes(t.statut));
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
          {showForm ? '✖ Annuler' : isStock ? '📋 Nouvelle demande' : '➕ Nouveau transfert'}
        </button>
      }
    >
      <Alert message={alert?.message} type={alert?.type} onClose={hideAlert} />
{/* ── Modal approbation superadmin ── */}
{approbation && (
  <div style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
    zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
  }}>
    <div style={{
      background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
      padding: 24, maxWidth: 480, width: '100%',
      boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    }}>
      <h3 style={{ margin: '0 0 8px' }}>👍 Approuver le transfert #{approbation.transfert.id}</h3>
      <p className="text-muted text-xs" style={{ marginBottom: 16 }}>
        Lot : {approbation.transfert.lot_description || `#${approbation.transfert.lot_id}`}
        {' · '}Intervalle : {approbation.transfert.quantite_min}–{approbation.transfert.quantite_max} {approbation.transfert.unite}
      </p>

      <div className="form-group" style={{ marginBottom: 16 }}>
        <label className="form-label">Désigner le magasin source *</label>
        <select className="form-control" id="select-source-approbation"
          defaultValue="">
          <option value="">Sélectionner</option>
          {approbation.sources.map(s => (
            <option key={s.magasin_id} value={s.magasin_id}>
              {s.dormant ? '💤' : '📦'} {s.magasin_nom} ({s.magasin_code})
              — Stock : {parseFloat(s.stock_actuel).toLocaleString('fr-FR')}
              {s.dormant ? ' · dormant' : ''}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={() => setApprobation(null)}>
          Annuler
        </button>
        <button className="btn btn-primary" onClick={() => {
          const srcId = document.getElementById('select-source-approbation').value;
          if (!srcId) { showAlert('❌ Sélectionner un magasin source', 'error'); return; }
          doAction(approbation.transfert.id, 'approuver', { magasin_depart: parseInt(srcId) });
document.body.style.overflow = '';
          setApprobation(null);
        }}>
          ✅ Confirmer l'approbation
        </button>
      </div>
    </div>
  </div>
)}

      {/* ── Formulaire demande (stock) ── */}
      {showForm && isStock && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <h3 className="card-title">📋 Demande de réapprovisionnement</h3>
            <p className="text-muted text-xs" style={{ margin: '4px 0 0' }}>
              Le superadmin désignera le magasin source après réception de votre demande.
            </p>
          </div>
          <form onSubmit={handleSubmitDemande} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-grid">

              <div className="form-group">
                <label className="form-label">Lot demandé *</label>
                <select className="form-control" required value={demande.lot_id}
                  onChange={e => handleLotDemande(e.target.value)}>
                  <option value="">Sélectionner un lot</option>
                  {lots.map(l => {
                    const sc = STATUT_LOT_CONFIG[l.statut_dynamique] || STATUT_LOT_CONFIG.normal;
                    return (
                      <option key={l.id} value={l.id}>
                        {l.description} — {sc.label}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Unité *</label>
                <select className="form-control" required value={demande.unite}
                  onChange={setD('unite')} disabled={!unitesDisponibles.length}>
                  <option value="">Sélectionner</option>
                  {unitesDisponibles.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Quantité minimale attendue *</label>
                <input className="form-control" type="number" required min="0.01" step="0.01"
                  value={demande.quantite_min} onChange={setD('quantite_min')}
                  placeholder="Ex: 50" />
              </div>

              <div className="form-group">
                <label className="form-label">Quantité maximale attendue *</label>
                <input className="form-control" type="number" required min="0.01" step="0.01"
                  value={demande.quantite_max} onChange={setD('quantite_max')}
                  placeholder="Ex: 200" />
              </div>

            </div>

            <div className="form-group">
              <label className="form-label">Motif *</label>
              <textarea className="form-control" rows={3} required
                value={demande.motif} onChange={setD('motif')}
                placeholder="Expliquez pourquoi ce réapprovisionnement est nécessaire..." />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary btn-lg">
                📤 Soumettre la demande
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Formulaire proposition/ordre (admin/superadmin) ── */}
      {showForm && !isStock && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <h3 className="card-title">
              {isSuperAdmin ? '⚡ Ordonner un transfert' : '📦 Proposer un transfert'}
            </h3>
          </div>
          <form onSubmit={handleSubmitProposition} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-grid">

              {/* superadmin : choisit lot en premier → sources se chargent */}
              {isSuperAdmin ? (
                <>
                  <div className="form-group">
                    <label className="form-label">Lot *</label>
                    <select className="form-control" required value={proposition.lot_id}
                      onChange={e => handleLotSuperAdmin(e.target.value)}>
                      <option value="">Sélectionner un lot</option>
                      {lots.map(l => {
                        const sc = STATUT_LOT_CONFIG[l.statut_dynamique] || STATUT_LOT_CONFIG.normal;
                        return (
                          <option key={l.id} value={l.id}>
                            {l.description} — {sc.label}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Magasin source *</label>
                    <select className="form-control" required value={proposition.magasin_depart}
                      onChange={e => setProposition(f => ({ ...f, magasin_depart: e.target.value }))}
                      disabled={!sources.length}>
                      <option value="">
                        {proposition.lot_id ? (sources.length ? 'Sélectionner' : 'Aucun stock disponible') : 'Choisir un lot d\'abord'}
                      </option>
                      {sources.map(s => (
                        <option key={s.magasin_id} value={s.magasin_id}>
                          {s.dormant ? '💤' : '📦'} {s.magasin_nom} ({s.magasin_code})
                          — Stock : {parseFloat(s.stock_actuel).toLocaleString('fr-FR')}
                          {s.dormant ? ' · dormant' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label className="form-label">Magasin source *</label>
                    <select className="form-control" required value={proposition.magasin_depart}
                      onChange={e => handleMagasinSourceChange(e.target.value)}
                      disabled={!isSuperAdmin}>
                      <option value="">Sélectionner</option>
                      {magasins.map(m => <option key={m.id} value={m.id}>{m.nom} ({m.code})</option>)}
                    </select>
                    <p className="text-muted text-xs" style={{ marginTop: 4 }}>🔒 Votre magasin</p>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Lot *</label>
                    <select className="form-control" required value={proposition.lot_id}
                      onChange={e => handleLotProposition(e.target.value)}
                      disabled={!proposition.magasin_depart}>
                      <option value="">Sélectionner un lot</option>
                      {stocks.map(s => {
                        const sc = STATUT_LOT_CONFIG[s.statut_dynamique] || STATUT_LOT_CONFIG.normal;
                        return (
                          <option key={s.lot_id} value={s.lot_id}>
                            {s.description} — {parseFloat(s.stock_actuel).toLocaleString('fr-FR')} {s.unite} · {sc.label}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </>
              )}

              <div className="form-group">
                <label className="form-label">Magasin destination *</label>
                <select className="form-control" required value={proposition.magasin_destination}
                  onChange={e => handleMagasinDestChange(e.target.value)}>
                  <option value="">Sélectionner</option>
                  {magasins
                    .filter(m => m.id !== parseInt(proposition.magasin_depart))
                    .map(m => <option key={m.id} value={m.id}>{m.nom} ({m.code})</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Unité *</label>
                <select className="form-control" required value={proposition.unite}
                  onChange={setP('unite')} disabled={!unitesDisponibles.length}>
                  <option value="">Sélectionner</option>
                  {unitesDisponibles.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Quantité *</label>
                <input className="form-control" type="number" required min="0.01" step="0.01"
                  value={proposition.quantite} onChange={setP('quantite')} />
                {proposition.lot_id && stocks.find(s => s.lot_id === parseInt(proposition.lot_id)) && (
                  <p className="text-muted text-xs" style={{ marginTop: 4 }}>
                    📦 Disponible : {stocks.find(s => s.lot_id === parseInt(proposition.lot_id))?.stock_actuel} {proposition.unite}
                  </p>
                )}
                {isSuperAdmin && proposition.magasin_depart && sources.length > 0 && (
                  <p className="text-muted text-xs" style={{ marginTop: 4 }}>
                    📦 Disponible dans la source sélectionnée : {
                      sources.find(s => s.magasin_id === parseInt(proposition.magasin_depart))?.stock_actuel || '—'
                    }
                  </p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Quantité min</label>
                <input className="form-control" type="number" min="0" step="0.01"
                  value={proposition.quantite_min} onChange={setP('quantite_min')} placeholder="Optionnel" />
              </div>

              <div className="form-group">
                <label className="form-label">Quantité max</label>
                <input className="form-control" type="number" min="0" step="0.01"
                  value={proposition.quantite_max} onChange={setP('quantite_max')} placeholder="Optionnel" />
              </div>

              <div className="form-group">
                <label className="form-label">Chauffeur</label>
                <select className="form-control" value={proposition.chauffeur_id} onChange={setP('chauffeur_id')}>
                  <option value="">— À assigner lors de l'expédition —</option>
                  {chauffeurs.map(c => (
                    <option key={c.id} value={c.id}>{c.label} {c.nom}</option>
                  ))}
                </select>
              </div>

            </div>

            <div className="form-group">
              <label className="form-label">Motif / Observations</label>
              <textarea className="form-control" rows={2}
                value={proposition.motif} onChange={setP('motif')}
                placeholder="Raison du transfert, contexte, urgence..." />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary btn-lg">
                {isSuperAdmin ? '⚡ Ordonner' : '📦 Proposer'}
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
              const cfg     = STATUT_CONFIG[t.statut] || { label: t.statut, cls: 'badge-neutral' };
              const isOpen  = expanded === t.id;
              const boutons = getBoutons(t);
              const srcNom  = t.magasin_depart_nom      || (t.magasin_depart ? `#${t.magasin_depart}` : '⏳ À désigner');
              const destNom = t.magasin_destination_nom || `#${t.magasin_destination}`;
              const demNom  = t.magasin_demandeur_nom   || null;

              return (
                <div key={t.id} style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                }}>
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
                          {t.quantite && (
                            <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: 12 }}>
                              {' '}— {parseFloat(t.quantite).toLocaleString('fr-FR')} {t.unite}
                            </span>
                          )}
                          {!t.quantite && t.quantite_min && (
                            <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: 12 }}>
                              {' '}— {t.quantite_min}–{t.quantite_max} {t.unite}
                            </span>
                          )}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>
                          {srcNom} → {destNom}
                          {demNom && <span> · Demandeur : {demNom}</span>}
                          {' · '}{new Date(t.date_creation).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {boutons.length > 0 && (
                        <span style={{ width: 8, height: 8, borderRadius: '50%',
                          background: '#f59e0b', display: 'inline-block' }} title="Action requise" />
                      )}
                      <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
                    </div>
                  </div>

                  {isOpen && (
                    <div style={{ color: 'blue', borderTop: '1px solid var(--color-border)', padding: 14 }}>
                      <div className="form-grid" style={{ gap: 8, marginBottom: 12 }}>
                        {[
                          ['Source',       srcNom],
                          ['Destination',  destNom],
                          ['Demandeur',    demNom || '—'],
                          ['Lot',          t.lot_description || `#${t.lot_id}`],
                          ['Quantité',     t.quantite ? `${parseFloat(t.quantite).toLocaleString('fr-FR')} ${t.unite}` : '—'],
                          ['Intervalle',   t.quantite_min ? `${t.quantite_min} – ${t.quantite_max || '∞'} ${t.unite}` : '—'],
                          ['Proposé par',  t.utilisateur  || '—'],
                          ['Ordonné par',  t.ordonne_par  || '—'],
                          ['Approuvé par', t.approuve_par || '—'],
                          ['Reçu par',     t.recu_par     || '—'],
                          ['Validé par',   t.valide_par   || '—'],
                          ['Motif',        t.motif        || '—'],
                        ].map(([label, value]) => (
                          <div key={label} style={{ background: 'var(--color-surface-alt)',
                            borderRadius: 6, padding: '7px 10px' }}>
                            <p style={{ fontSize: 10, textTransform: 'uppercase',
                              color: 'var(--color-text-muted)', margin: '0 0 2px' }}>{label}</p>
                            <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>{value}</p>
                          </div>
                        ))}
                      </div>

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
