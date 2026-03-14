// src/pages/Transferts.jsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../hooks/useAuth';
import { useAlert } from '../hooks/useAlert';
import api from '../services/api';
import Alert from '../components/Alert';
import PageLayout, { StateEmpty, StateLoading } from '../components/PageLayout';

// ─── STYLES DU BOTTOM SHEET ────────────────────────────────────────────────────
const BottomSheetStyles = () => (
  <style>{`
    .sheet-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(2px); z-index: 99998; opacity: 0; visibility: hidden; transition: all 0.3s; }
    .sheet-overlay.active { opacity: 1; visibility: visible; }
    .bottom-sheet { position: fixed; bottom: 0; left: 0; right: 0; max-height: 85vh; background: var(--color-surface, #fff); border-radius: 24px 24px 0 0; z-index: 99999; transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1); display: flex; flex-direction: column; box-shadow: 0 -10px 40px rgba(0,0,0,0.3); }
    .sheet-header { padding: 16px 20px; border-bottom: 1px solid var(--color-border, #eee); flex-shrink: 0; text-align: center; }
    .sheet-handle { width: 40px; height: 5px; background: #ccc; border-radius: 3px; margin: 0 auto 12px; }
    .sheet-content { flex: 1; overflow-y: auto; padding: 20px; padding-bottom: 120px; }
    .sheet-footer { position: absolute; bottom: 0; left: 0; right: 0; padding: 16px 20px; background: var(--color-surface); border-top: 1px solid var(--color-border); }
  `}</style>
);

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

  // UI States
  const [showSheet, setShowSheet] = useState(false);
  const [sheetMode, setSheetMode] = useState(''); // 'demande', 'proposition', 'approbation'
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  // Data States
  const [magasins, setMagasins] = useState([]);
  const [lots, setLots] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [sources, setSources] = useState([]);
  const [chauffeurs, setChauffeurs] = useState([]);
  const [transferts, setTransferts] = useState([]);
  const [unitesDisponibles, setUnitesDisponibles] = useState([]);

  // Formulaires
  const [demande, setDemande] = useState({ lot_id: '', quantite_min: '', quantite_max: '', unite: '', motif: '' });
  const [proposition, setProposition] = useState({
    magasin_depart: magasinId || '', magasin_destination: '', lot_id: '', quantite: '',
    quantite_min: '', quantite_max: '', unite: '', chauffeur_id: '', motif: ''
  });
  
  const [approbationData, setApprobationData] = useState(null);
  const [selectedSourceApprobation, setSelectedSourceApprobation] = useState('');

  useEffect(() => {
    loadMagasins();
    loadTransferts();
    if (isStock) loadLots();
    else if (magasinId || isSuperAdmin) {
      if (magasinId) loadStocksForMagasin(magasinId);
    }
  }, [magasinId]);

  const loadMagasins = async () => { try { setMagasins(await api.getMagasins()); } catch {} };
  const loadLots = async () => { try { setLots(await api.getLots()); } catch {} };
  const loadTransferts = async () => {
    setLoading(true);
    try { setTransferts(await api.getTransferts()); }
    catch (err) { showAlert(`❌ ${err.message}`, 'error'); }
    finally { setLoading(false); }
  };
  const loadStocksForMagasin = async (magId) => { try { setStocks(await api.getStockDisponible(magId)); } catch {} };
  const loadSourcesForLot = async (lotId) => {
    try { setSources(await api.request(`/transferts/sources?lot_id=${lotId}`)); } catch { setSources([]); }
  };
  const loadChauffeurs = async (magSourceId, magDestId = null) => {
    try {
      const all = await api.getChauffeurs();
      setChauffeurs(all.filter(c => c.magasin_id === parseInt(magSourceId) || (magDestId && c.magasin_id === parseInt(magDestId)))
        .map(c => ({ ...c, label: c.magasin_id === parseInt(magSourceId) ? '🟢 Source' : '🔵 Dest' })));
    } catch {}
  };

  const handleOpenSheet = (mode) => {
    setSheetMode(mode);
    setShowSheet(true);
    setUnitesDisponibles([]);
    // Reset forms
    if (mode === 'demande') setDemande({ lot_id: '', quantite_min: '', quantite_max: '', unite: '', motif: '' });
    if (mode === 'proposition') setProposition({ ...proposition, lot_id: '', quantite: '', magasin_destination: '' });
  };

  // ── Handlers (Demande Stock) ──
  const handleLotDemande = (lotId) => {
    const lot = lots.find(l => l.id === parseInt(lotId));
    setDemande(f => ({ ...f, lot_id: lotId, unite: lot?.unite || lot?.unites_admises?.[0] || '' }));
    setUnitesDisponibles(lot?.unites_admises || (lot?.unite ? [lot.unite] : []));
  };

  const handleSubmitDemande = async () => {
    if (parseFloat(demande.quantite_min) > parseFloat(demande.quantite_max)) return showAlert('❌ Min > Max impossible', 'error');
    setSubmitting(true);
    try {
      await api.createTransfert({
        lot_id: parseInt(demande.lot_id), magasin_destination: magasinId,
        quantite_min: parseFloat(demande.quantite_min), quantite_max: parseFloat(demande.quantite_max),
        unite: demande.unite, motif: demande.motif,
      });
      showAlert('✅ Demande soumise', 'success');
      setShowSheet(false);
      loadTransferts();
    } catch (err) { showAlert(`❌ ${err.message}`, 'error'); }
    finally { setSubmitting(false); }
  };

  // ── Handlers (Proposition / Ordre) ──
  const handleMagasinSourceChange = (magId) => {
    setProposition(f => ({ ...f, magasin_depart: magId, lot_id: '', quantite: '' }));
    loadStocksForMagasin(magId); loadChauffeurs(magId, proposition.magasin_destination); setSources([]);
  };

  const handleLotProposition = (lotId) => {
    const stock = stocks.find(s => s.lot_id === parseInt(lotId));
    if (stock) {
      setUnitesDisponibles(stock.unites_admises || []);
      setProposition(f => ({ ...f, lot_id: lotId, unite: stock.unite || stock.unites_admises?.[0] || '' }));
    }
    if (isSuperAdmin && lotId) loadSourcesForLot(lotId);
  };

  const handleLotSuperAdmin = (lotId) => {
    const lot = lots.find(l => l.id === parseInt(lotId));
    setProposition(f => ({ ...f, lot_id: lotId, unite: lot?.unite || lot?.unites_admises?.[0] || '', magasin_depart: '' }));
    setUnitesDisponibles(lot?.unites_admises || (lot?.unite ? [lot.unite] : []));
    if (lotId) loadSourcesForLot(lotId);
  };

  const handleSubmitProposition = async () => {
    if (proposition.magasin_depart === proposition.magasin_destination) return showAlert('❌ Source = Destination', 'error');
    setSubmitting(true);
    try {
      await api.createTransfert({
        lot_id: parseInt(proposition.lot_id), quantite: parseFloat(proposition.quantite),
        quantite_min: proposition.quantite_min ? parseFloat(proposition.quantite_min) : null,
        quantite_max: proposition.quantite_max ? parseFloat(proposition.quantite_max) : null,
        unite: proposition.unite, magasin_depart: parseInt(proposition.magasin_depart),
        magasin_destination: parseInt(proposition.magasin_destination), chauffeur_id: proposition.chauffeur_id || null,
        motif: proposition.motif || null, ordonne: isSuperAdmin,
      });
      showAlert(isSuperAdmin ? '⚡ Transfert ordonné' : '✅ Proposition soumise', 'success');
      setShowSheet(false);
      loadTransferts();
    } catch (err) { showAlert(`❌ ${err.message}`, 'error'); }
    finally { setSubmitting(false); }
  };

  // ── Actions de cycle de vie ──
  const doAction = async (id, action, extra = {}) => {
    try {
      await api.request(`/transferts?id=${id}`, { method: 'PUT', body: JSON.stringify({ action, ...extra }) });
      showAlert('✅ Opération effectuée', 'success');
      loadTransferts();
      setExpanded(null);
      setShowSheet(false);
    } catch (err) { showAlert(`❌ ${err.message}`, 'error'); }
  };

  const handleApprouver = async (t) => {
    if (!t.magasin_depart) {
      try {
        const token = await api.getToken();
        const res = await fetch(`/api/transferts?sources=1&lot_id=${t.lot_id}`, { headers: { Authorization: `Bearer ${token}` } });
        const srcs = await res.json();
        setApprobationData({ transfert: t, sources: srcs });
        setSelectedSourceApprobation('');
        handleOpenSheet('approbation');
      } catch { setApprobationData({ transfert: t, sources: [] }); handleOpenSheet('approbation'); }
    } else {
      if (confirm('Approuver ce transfert ?')) doAction(t.id, 'approuver');
    }
  };

  const handleExpedier = (t) => {
    if (!confirm('Expédier ce transfert ? Le stock sera déduit.')) return;
    if (!t.chauffeur_id) {
      const chaufId = prompt('ID du chauffeur (optionnel) :');
      if (chaufId === null) return;
      doAction(t.id, 'expedier', { chauffeur_id: chaufId || null });
    } else doAction(t.id, 'expedier');
  };

  const getBoutons = (t) => {
    const boutons = [];
    const estSource = t.magasin_depart === magasinId;
    const estDest = t.magasin_destination === magasinId;

    if (t.statut === 'proposé' && isSuperAdmin) boutons.push({ label: '👍 Approuver', action: () => handleApprouver(t), cls: 'btn-primary' });
    if (t.statut === 'approuvé' && (isSuperAdmin || (isAdmin && estSource))) boutons.push({ label: '🚚 Expédier', action: () => handleExpedier(t), cls: 'btn-primary' });
    if (t.statut === 'en_transit' && (isSuperAdmin || (isAdmin && estDest))) boutons.push({ label: '📬 Confirmer réception', action: () => { if(confirm('Confirmer ?')) doAction(t.id, 'recevoir')} , cls: 'btn-primary' });
    if (t.statut === 'reçu' && isSuperAdmin) boutons.push({ label: '✅ Valider', action: () => { if(confirm('Valider définitivement ?')) doAction(t.id, 'valider')}, cls: 'btn-primary' });
    
    if ((isSuperAdmin || (isAdmin && (estSource || estDest))) && ['proposé', 'approuvé', 'en_transit', 'reçu'].includes(t.statut)) {
      boutons.push({ label: '❌ Rejeter', action: () => { const m = prompt('Motif :'); if(m) doAction(t.id, 'rejeter', { observations: m }); }, cls: 'btn-danger' });
    }
    return boutons;
  };

  return (
    <PageLayout
      title="Transferts"
      icon="🔄"
      subtitle="Mouvements inter-magasins"
      actions={
        <button onClick={() => handleOpenSheet(isStock ? 'demande' : 'proposition')} className="btn btn-primary btn-sm">
          {isStock ? '📋 Demande de stock' : '➕ Nouveau transfert'}
        </button>
      }
    >
      <BottomSheetStyles />
      <Alert message={alert?.message} type={alert?.type} onClose={hideAlert} />

      {/* ── Liste des transferts ── */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Historique</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="badge badge-neutral">{transferts.length}</span>
            <button onClick={loadTransferts} className="btn btn-ghost btn-sm">🔄</button>
          </div>
        </div>

        {loading ? <StateLoading /> : transferts.length === 0 ? <StateEmpty message="Aucun transfert." /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 4px' }}>
            {transferts.map(t => {
              const cfg = STATUT_CONFIG[t.statut] || { label: t.statut, cls: 'badge-neutral' };
              const isOpen = expanded === t.id;
              const boutons = getBoutons(t);
              const srcNom = t.magasin_depart_nom || (t.magasin_depart ? `#${t.magasin_depart}` : '⏳ À désigner');
              const destNom = t.magasin_destination_nom || `#${t.magasin_destination}`;

              return (
                <div key={t.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  <div onClick={() => setExpanded(isOpen ? null : t.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', cursor: 'pointer', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>▶</span>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: 700, fontSize: 13, margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {t.lot_description || `Lot #${t.lot_id}`}
                          <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: 12 }}>
                            {t.quantite ? ` — ${t.quantite} ${t.unite}` : ` — ${t.quantite_min}–${t.quantite_max} ${t.unite}`}
                          </span>
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>
                          {srcNom} → {destNom} · {new Date(t.date_creation).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {boutons.length > 0 && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />}
                      <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
                    </div>
                  </div>

                  {isOpen && (
                    <div style={{ borderTop: '1px solid var(--color-border)', padding: 14, background: 'var(--color-surface-alt)' }}>
                      <div className="form-grid" style={{ gap: 8, marginBottom: 12 }}>
                        <div style={{fontSize: 12}}><span style={{color:'var(--color-text-muted)'}}>Demandeur:</span> <strong>{t.magasin_demandeur_nom || '—'}</strong></div>
                        <div style={{fontSize: 12}}><span style={{color:'var(--color-text-muted)'}}>Créé par:</span> <strong>{t.utilisateur}</strong></div>
                        <div style={{fontSize: 12, gridColumn: '1 / -1'}}><span style={{color:'var(--color-text-muted)'}}>Motif:</span> <strong>{t.motif || '—'}</strong></div>
                      </div>
                      {boutons.length > 0 && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {boutons.map((b, i) => <button key={i} onClick={b.action} className={`btn ${b.cls} btn-sm`}>{b.label}</button>)}
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

      {/* ── PORTAL BOTTOM SHEET ── */}
      {typeof document !== 'undefined' && createPortal(
        <>
          <div className={`sheet-overlay ${showSheet ? 'active' : ''}`} onClick={() => !submitting && setShowSheet(false)} />
          <div className={`bottom-sheet ${showSheet ? 'active' : ''}`} style={{ transform: showSheet ? 'translateY(0)' : 'translateY(100%)' }}>
            
            <div className="sheet-header">
              <div className="sheet-handle" />
              <h3 style={{ margin: 0 }}>
                {sheetMode === 'demande' && '📋 Demande de réapprovisionnement'}
                {sheetMode === 'proposition' && (isSuperAdmin ? '⚡ Ordonner un transfert' : '📦 Proposer un transfert')}
                {sheetMode === 'approbation' && '👍 Approuver le transfert'}
              </h3>
            </div>

            <div className="sheet-content">
              
              {/* MODE: DEMANDE (STOCK) */}
              {sheetMode === 'demande' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Lot demandé</label>
                    <select className="form-control" value={demande.lot_id} onChange={e => handleLotDemande(e.target.value)}>
                      <option value="">-- Choisir un lot --</option>
                      {lots.map(l => <option key={l.id} value={l.id}>{l.description} ({STATUT_LOT_CONFIG[l.statut_dynamique]?.label || ''})</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unité</label>
                    <select className="form-control" value={demande.unite} onChange={e => setDemande({...demande, unite: e.target.value})} disabled={!unitesDisponibles.length}>
                      {unitesDisponibles.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="grid-2" style={{ gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Qté min.</label>
                      <input type="number" className="form-control" value={demande.quantite_min} onChange={e => setDemande({...demande, quantite_min: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Qté max.</label>
                      <input type="number" className="form-control" value={demande.quantite_max} onChange={e => setDemande({...demande, quantite_max: e.target.value})} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Motif de la demande</label>
                    <textarea className="form-control" rows={3} value={demande.motif} onChange={e => setDemande({...demande, motif: e.target.value})} placeholder="Urgence, client en attente..."></textarea>
                  </div>
                </div>
              )}

              {/* MODE: PROPOSITION (ADMIN / SUPERADMIN) */}
              {sheetMode === 'proposition' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {isSuperAdmin ? (
                    <>
                      <div className="form-group">
                        <label className="form-label">Lot à transférer</label>
                        <select className="form-control" value={proposition.lot_id} onChange={e => handleLotSuperAdmin(e.target.value)}>
                          <option value="">-- Choisir un lot --</option>
                          {lots.map(l => <option key={l.id} value={l.id}>{l.description}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Magasin Source</label>
                        <select className="form-control" value={proposition.magasin_depart} onChange={e => setProposition({...proposition, magasin_depart: e.target.value})} disabled={!sources.length}>
                          <option value="">{proposition.lot_id ? 'Sélectionner une source' : 'Choisir un lot d\'abord'}</option>
                          {sources.map(s => <option key={s.magasin_id} value={s.magasin_id}>{s.magasin_nom} (Stock: {s.stock_actuel})</option>)}
                        </select>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="form-group">
                        <label className="form-label">Magasin Source</label>
                        <select className="form-control" value={proposition.magasin_depart} onChange={e => handleMagasinSourceChange(e.target.value)} disabled>
                          <option value={magasinId}>{magasins.find(m => m.id === magasinId)?.nom} (Mon magasin)</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Lot disponible</label>
                        <select className="form-control" value={proposition.lot_id} onChange={e => handleLotProposition(e.target.value)}>
                          <option value="">-- Choisir un lot --</option>
                          {stocks.map(s => <option key={s.lot_id} value={s.lot_id}>{s.description} ({s.stock_actuel} {s.unite})</option>)}
                        </select>
                      </div>
                    </>
                  )}

                  <div className="form-group">
                    <label className="form-label">Magasin Destination</label>
                    <select className="form-control" value={proposition.magasin_destination} onChange={e => setProposition({...proposition, magasin_destination: e.target.value})}>
                      <option value="">-- Choisir --</option>
                      {magasins.filter(m => m.id !== parseInt(proposition.magasin_depart)).map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                    </select>
                  </div>

                  <div className="grid-2" style={{ gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Quantité fixe</label>
                      <input type="number" className="form-control" value={proposition.quantite} onChange={e => setProposition({...proposition, quantite: e.target.value})} placeholder="Ex: 50" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Unité</label>
                      <select className="form-control" value={proposition.unite} onChange={e => setProposition({...proposition, unite: e.target.value})} disabled={!unitesDisponibles.length}>
                        {unitesDisponibles.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Motif / Observations</label>
                    <textarea className="form-control" rows={2} value={proposition.motif} onChange={e => setProposition({...proposition, motif: e.target.value})}></textarea>
                  </div>
                </div>
              )}

              {/* MODE: APPROBATION (SUPERADMIN ASSIGNE LA SOURCE) */}
              {sheetMode === 'approbation' && approbationData && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ background: 'var(--color-surface-alt)', padding: 12, borderRadius: 12 }}>
                    <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700 }}>Transfert #{approbationData.transfert.id}</p>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>
                      Lot : {approbationData.transfert.lot_description} <br/>
                      Demandé : {approbationData.transfert.quantite_min}–{approbationData.transfert.quantite_max} {approbationData.transfert.unite}
                    </p>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Désigner le magasin source</label>
                    <select className="form-control" value={selectedSourceApprobation} onChange={e => setSelectedSourceApprobation(e.target.value)}>
                      <option value="">-- Sélectionner une source --</option>
                      {approbationData.sources.map(s => (
                        <option key={s.magasin_id} value={s.magasin_id}>
                          {s.dormant ? '💤' : '📦'} {s.magasin_nom} — Stock : {s.stock_actuel}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

            </div>

            <div className="sheet-footer">
              {sheetMode === 'demande' && (
                <button onClick={handleSubmitDemande} disabled={submitting || !demande.lot_id || !demande.quantite_min || !demande.quantite_max} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                  {submitting ? '⏳ SOUMISSION...' : 'SOUMETTRE LA DEMANDE'}
                </button>
              )}
              {sheetMode === 'proposition' && (
                <button onClick={handleSubmitProposition} disabled={submitting || !proposition.lot_id || !proposition.magasin_destination} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                  {submitting ? '⏳ ENREGISTREMENT...' : (isSuperAdmin ? 'ORDONNER LE TRANSFERT' : 'PROPOSER LE TRANSFERT')}
                </button>
              )}
              {sheetMode === 'approbation' && (
                <button 
                  onClick={() => {
                    if (!selectedSourceApprobation) return showAlert('❌ Sélectionner un magasin source', 'error');
                    doAction(approbationData.transfert.id, 'approuver', { magasin_depart: parseInt(selectedSourceApprobation) });
                  }} 
                  disabled={submitting || !selectedSourceApprobation} 
                  className="btn btn-primary btn-lg" style={{ width: '100%' }}
                >
                  CONFIRMER L'APPROBATION
                </button>
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </PageLayout>
  );
}
