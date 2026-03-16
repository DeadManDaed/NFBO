// src/pages/Caisse.jsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useAlert } from '../hooks/useAlert';
import api from '../services/api';
import Alert from '../components/Alert';
import QRCode from 'qrcode';
import PageLayout, { StateLoading, StateEmpty } from '../components/PageLayout';

// ─── STYLES DU BOTTOM SHEET (inchangé) ─────────────────────────────────────
const BottomSheetStyles = () => (
  <style>{`
    .sheet-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(2px);
      z-index: 99998;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;
    }
    .sheet-overlay.active {
      opacity: 1;
      visibility: visible;
    }
    .bottom-sheet {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      max-height: 80vh;
      background: var(--color-surface, #ffffff);
      border-radius: 24px 24px 0 0;
      z-index: 99999;
      transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.15);
      display: flex;
      flex-direction: column;
      box-shadow: 0 -10px 40px rgba(0,0,0,0.3);
      touch-action: none;
    }
    .bottom-sheet.dragging {
      transition: none;
    }
    .sheet-header {
      padding: 12px 20px 20px;
      border-bottom: 1px solid var(--color-border, #eee);
      flex-shrink: 0;
      text-align: center;
      cursor: grab;
    }
    .sheet-handle {
      width: 40px;
      height: 5px;
      background: #ccc;
      border-radius: 3px;
      margin: 0 auto 12px;
    }
    .sheet-content {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      padding-bottom: 100px;
      touch-action: pan-y;
      -webkit-overflow-scrolling: touch;
    }
    .sheet-footer {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 16px 20px;
      background: linear-gradient(to top, var(--color-surface, #ffffff) 80%, rgba(255,255,255,0));
      z-index: 2;
    }
    body.sheet-open {
      overflow: hidden !important;
    }
  `}</style>
);

const TYPE_CONFIG = {
  depot:               { label: 'Dépôt',              color: '#22c55e', bg: '#f0fdf4', icon: '💰' },
  retrait:             { label: 'Retrait',             color: '#ef4444', bg: '#fef2f2', icon: '💸' },
  paiement_producteur: { label: 'Paiement producteur', color: '#f59e0b', bg: '#fffbeb', icon: '👨‍🌾' },
  transfert:           { label: 'Transfert émis',      color: '#3b82f6', bg: '#eff6ff', icon: '➡️' },
  reception_transfert: { label: 'Transfert reçu',      color: '#8b5cf6', bg: '#f5f3ff', icon: '⬅️' },
};

// ─── SOUS-COMPOSANTS UI (inchangés) ────────────────────────────────────────

function CarteCAisse({ caisse, selected, onClick }) {
  const solde = parseFloat(caisse.solde) || 0;
  return (
    <div
      onClick={onClick}
      style={{
        background: selected ? 'var(--color-primary)' : 'var(--color-surface-alt)',
        borderRadius: 'var(--radius-md)',
        border: `2px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
        padding: '14px 16px', cursor: 'pointer', transition: 'all 0.2s',
      }}
    >
      <p style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', margin: '0 0 4px', color: selected ? '#fff' : 'var(--color-text-muted)' }}>
        {caisse.magasin_nom || caisse.nom}
      </p>
      <p style={{ fontSize: 18, fontWeight: 800, margin: 0, color: selected ? '#fff' : 'var(--color-text)' }}>
        {solde.toLocaleString('fr-FR')} <span style={{fontSize: 10}}>FCFA</span>
      </p>
    </div>
  );
}

function LigneOperation({ op, onSignaler, isGlobal }) {
  const [open, setOpen] = useState(false);
  const cfg = TYPE_CONFIG[op.type_operation] || { label: op.type_operation, color: '#666', bg: '#f9f9f9', icon: '📋' };
  const montant = parseFloat(op.montant) || 0;
  const estDebit = ['retrait', 'paiement_producteur', 'transfert'].includes(op.type_operation);

  return (
    <div style={{ background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
      <div onClick={() => setOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', cursor: 'pointer', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0)', display: 'inline-block' }}>▶</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span style={{ fontSize: 10, background: cfg.bg, color: cfg.color, borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>
                {cfg.icon} {cfg.label}
              </span>
              {op.signale && <span style={{ fontSize: 10, background: '#fef2f2', color: '#ef4444', borderRadius: 4, padding: '1px 6px' }}>⚠️ Signalé</span>}
            </div>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>
              {new Date(op.date_operation).toLocaleDateString('fr-FR')} · {op.utilisateur}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 13, color: estDebit ? 'var(--color-danger)' : 'var(--color-success)' }}>
            {estDebit ? '−' : '+'}{montant.toLocaleString('fr-FR')}
          </span>
        </div>
      </div>
      {open && (
        <div style={{ borderTop: '1px solid var(--color-border)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
           <div className="grid-2" style={{ gap: 8 }}>
            {[
              ['Solde après',  `${parseFloat(op.solde_apres||0).toLocaleString('fr-FR')} FCFA`],
              ['Opérateur',    op.utilisateur || '—'],
              ['Description',  op.description || '—'],
              op.nom_producteur && ['Producteur', op.nom_producteur],
              op.magasin_destination_nom && ['Destination', op.magasin_destination_nom],
            ].filter(Boolean).map(([label, value]) => (
              <div key={label} style={{ background: 'var(--color-surface)', borderRadius: 6, padding: '8px 10px' }}>
                <p style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--color-text-muted)', margin: '0 0 2px' }}>{label}</p>
                <p style={{ fontWeight: 600, fontSize: 12, margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>
          {!op.signale && (
            <button onClick={e => { e.stopPropagation(); onSignaler(op); }} className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)', width: '100%', marginTop: 4 }}>
              ⚠️ Signaler une anomalie
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CarteProducteur({ prod }) {
  const [open, setOpen] = useState(false);
  const solde = parseFloat(prod.solde) || 0;
  return (
    <div style={{ background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
      <div onClick={() => setOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', cursor: 'pointer' }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: 13, margin: 0 }}>{prod.nom_producteur}</p>
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>{prod.tel_producteur || 'Pas de numéro'}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontWeight: 800, fontSize: 14, margin: 0, color: solde > 0 ? 'var(--color-success)' : 'var(--color-text)' }}>
            {solde.toLocaleString('fr-FR')} <span style={{fontSize: 9}}>FCFA</span>
          </p>
          <p style={{ fontSize: 10, color: 'var(--color-primary)', margin: 0 }}>🏆 {prod.points_fidelite || 0} pts</p>
        </div>
      </div>
      {open && (
        <div style={{ borderTop: '1px solid var(--color-border)', padding: '12px 16px', background: 'var(--color-surface)' }}>
           <p style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 8 }}>Localisation & Infos</p>
           <p style={{ fontSize: 12, margin: 0 }}>{prod.region} / {prod.departement} / {prod.arrondissement}</p>
        </div>
      )}
    </div>
  );
}

// ─── PAGE PRINCIPALE ────────────────────────────────────────────────────────────

export default function Caisse() {
  const { user, magasinId } = useAuth();
  const { alert, showAlert, hideAlert } = useAlert();
  const queryClient = useQueryClient();

  const [selectedCaisse, setSelectedCaisse] = useState(null);
  const [onglet, setOnglet] = useState('caisse');

  // États du Bottom Sheet
  const [sheetMode, setSheetMode] = useState(null); // 'operation', 'cheque', 'scanner', 'signalement'
  const [opType, setOpType] = useState(null); // 'depot', 'retrait', etc.
  const [showSheet, setShowSheet] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);

  // État spécifique pour les formulaires du sheet
  const [form, setForm] = useState({ montant: '', description: '', producteurId: '', caisseDestId: '', codeCheque: '', motifSignalement: '' });
  const [chequeEmis, setChequeEmis] = useState(null);
  const [qrUrl, setQrUrl] = useState('');
  const [chequeVerifie, setChequeVerifie] = useState(null);
  const [opASignaler, setOpASignaler] = useState(null);

  const isGlobal = ['superadmin', 'auditeur'].includes(user?.role);
  const canCaisse = ['superadmin', 'admin', 'caisse'].includes(user?.role);

  // ─── REQUÊTES AVEC REACT QUERY ───────────────────────────────────────────────

  const {
    data: caisses = [],
    isLoading: caissesLoading,
    refetch: refetchCaisses,
  } = useQuery({
    queryKey: ['caisses'],
    queryFn: () => api.getCaisses(),
    onSuccess: (data) => {
      if (!selectedCaisse && data.length > 0) setSelectedCaisse(data[0]);
    },
  });

  const {
    data: operations = [],
    isLoading: operationsLoading,
    refetch: refetchOperations,
  } = useQuery({
    queryKey: ['operations-caisse'],
    queryFn: () => api.getOperationsCaisse(),
  });

  const {
    data: producteurs = [],
    isLoading: producteursLoading,
    refetch: refetchProducteurs,
  } = useQuery({
    queryKey: ['producteurs-solde'],
    queryFn: () => api.getProducteursSolde(),
  });

  const isLoading = caissesLoading || operationsLoading || producteursLoading;

  // ─── MUTATIONS ───────────────────────────────────────────────────────────────

  const depotMutation = useMutation({
    mutationFn: (payload) => api.depotCaisse(payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['caisses']);
      queryClient.invalidateQueries(['operations-caisse']);
      showAlert('✅ Dépôt effectué', 'success');
    },
    onError: (err) => showAlert(`❌ ${err.message}`, 'error'),
  });

  const retraitMutation = useMutation({
    mutationFn: (payload) => api.retraitCaisse(payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['caisses']);
      queryClient.invalidateQueries(['operations-caisse']);
      showAlert('✅ Retrait effectué', 'success');
    },
    onError: (err) => showAlert(`❌ ${err.message}`, 'error'),
  });

  const paiementMutation = useMutation({
    mutationFn: (payload) => api.paiementProducteur(payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['caisses']);
      queryClient.invalidateQueries(['operations-caisse']);
      queryClient.invalidateQueries(['producteurs-solde']);
      showAlert('✅ Paiement effectué', 'success');
    },
    onError: (err) => showAlert(`❌ ${err.message}`, 'error'),
  });

  const transfertMutation = useMutation({
    mutationFn: (payload) => api.transfertCaisse(payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['caisses']);
      queryClient.invalidateQueries(['operations-caisse']);
      showAlert('✅ Transfert effectué', 'success');
    },
    onError: (err) => showAlert(`❌ ${err.message}`, 'error'),
  });

  const chequeMutation = useMutation({
    mutationFn: (payload) => api.emettreChecque(payload),
    onSuccess: async (res) => {
      const url = await QRCode.toDataURL(res.code, { width: 200 });
      setQrUrl(url);
      setChequeEmis(res);
      // On ne ferme pas le sheet, on affiche le QR
    },
    onError: (err) => showAlert(`❌ ${err.message}`, 'error'),
  });

  const scannerMutation = useMutation({
    mutationFn: (code) => api.scannerCheque(code),
    onSuccess: (res) => {
      showAlert(`✅ Encaissé : ${res.montant} FCFA`, 'success');
      queryClient.invalidateQueries(['caisses']);
      queryClient.invalidateQueries(['operations-caisse']);
      queryClient.invalidateQueries(['producteurs-solde']);
      setShowSheet(false);
    },
    onError: (err) => showAlert(`❌ ${err.message}`, 'error'),
  });

  const signalementMutation = useMutation({
    mutationFn: ({ operation_id, motif }) => api.signalerOperationCaisse({ operation_id, motif }),
    onSuccess: () => {
      queryClient.invalidateQueries(['operations-caisse']);
      showAlert('⚠️ Signalement envoyé', 'info');
      setShowSheet(false);
    },
    onError: (err) => showAlert(`❌ ${err.message}`, 'error'),
  });

  // Gestion du drag du sheet (inchangé)
  const handleTouchStart = (e) => { setStartY(e.touches[0].clientY); setIsDragging(true); };
  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const deltaY = e.touches[0].clientY - startY;
    if (deltaY > 0) setDragY(deltaY);
  };
  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragY > 150) { setShowSheet(false); setSheetMode(null); }
    else setDragY(0);
  };

  useEffect(() => {
    if (showSheet) document.body.classList.add('sheet-open');
    else { document.body.classList.remove('sheet-open'); setDragY(0); }
  }, [showSheet]);

  const resetForm = () => {
    setForm({ montant: '', description: '', producteurId: '', caisseDestId: '', codeCheque: '', motifSignalement: '' });
    setChequeEmis(null); setQrUrl(''); setChequeVerifie(null);
  };

  const handleOpenSheet = (mode, type = null) => {
    resetForm();
    setSheetMode(mode);
    setOpType(type);
    setShowSheet(true);
  };

  const executeAction = async () => {
    const payload = {
      montant: parseFloat(form.montant),
      caisse_id: selectedCaisse.id,
      description: form.description,
    };

    if (sheetMode === 'operation') {
      if (opType === 'depot') depotMutation.mutate(payload);
      else if (opType === 'retrait') retraitMutation.mutate(payload);
      else if (opType === 'paiement_producteur') {
        if (!form.producteurId) return showAlert('❌ Sélectionnez un producteur', 'error');
        paiementMutation.mutate({ ...payload, producteur_id: parseInt(form.producteurId) });
      }
      else if (opType === 'transfert') {
        if (!form.caisseDestId) return showAlert('❌ Sélectionnez une caisse destination', 'error');
        transfertMutation.mutate({ ...payload, caisse_destination_id: parseInt(form.caisseDestId) });
      }
    }
    else if (sheetMode === 'cheque') {
      if (!form.producteurId) return showAlert('❌ Sélectionnez un producteur', 'error');
      chequeMutation.mutate({
        producteur_id: parseInt(form.producteurId),
        montant: parseFloat(form.montant),
        date_expiration: new Date(Date.now() + 30*86400000).toISOString().split('T')[0],
      });
    }
    else if (sheetMode === 'scanner') {
      if (!form.codeCheque.trim()) return showAlert('❌ Entrez un code', 'error');
      scannerMutation.mutate(form.codeCheque.trim());
    }
    else if (sheetMode === 'signalement') {
      if (!form.motifSignalement.trim()) return showAlert('❌ Entrez un motif', 'error');
      signalementMutation.mutate({ operation_id: opASignaler.id, motif: form.motifSignalement });
    }
  };

  const checkCheque = async () => {
    try {
      const c = await api.verifierCheque(form.codeCheque.trim());
      setChequeVerifie(c);
    } catch (err) { showAlert(err.message, 'error'); }
  };

  // Filtrage data
  const opsFiltrees = selectedCaisse ? operations.filter(o => o.caisse_id === selectedCaisse.id) : operations;
  const soldeGlobal = caisses.reduce((s, c) => s + parseFloat(c.solde||0), 0);

  const anyMutationLoading = 
    depotMutation.isLoading ||
    retraitMutation.isLoading ||
    paiementMutation.isLoading ||
    transfertMutation.isLoading ||
    chequeMutation.isLoading ||
    scannerMutation.isLoading ||
    signalementMutation.isLoading;

  if (isLoading) return <PageLayout title="Caisse" icon="💰"><StateLoading /></PageLayout>;

  return (
    <PageLayout title="Caisse" icon="💰" subtitle={isGlobal ? 'Gestion des flux financiers' : `Caisse ${selectedCaisse?.magasin_nom || ''}`}>
      <BottomSheetStyles />
      <Alert message={alert?.message} type={alert?.type} onClose={hideAlert} />

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)', padding: 4 }}>
        <button onClick={() => setOnglet('caisse')} className={onglet === 'caisse' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'} style={{ flex: 1 }}>💰 Ma Caisse</button>
        <button onClick={() => setOnglet('producteurs')} className={onglet === 'producteurs' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'} style={{ flex: 1 }}>👥 Producteurs</button>
      </div>

      {onglet === 'caisse' && (
        <>
          {isGlobal && (
            <div className="stat-card stat-card-gradient" style={{ background: 'linear-gradient(135deg, #166534, #15803d)', marginBottom: 16 }}>
              <p className="stat-card-label">Solde global réseau</p>
              <p className="stat-card-value">{soldeGlobal.toLocaleString('fr-FR')} <span style={{ fontSize: 14 }}>FCFA</span></p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
            {caisses.map(c => <CarteCAisse key={c.id} caisse={c} selected={selectedCaisse?.id === c.id} onClick={() => setSelectedCaisse(c)} />)}
          </div>

          {canCaisse && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
               <button onClick={() => handleOpenSheet('operation', 'depot')} className="btn btn-primary">➕ Dépôt</button>
               <button onClick={() => handleOpenSheet('operation', 'retrait')} className="btn btn-ghost" style={{border:'1px solid var(--color-border)'}}>➖ Retrait</button>
               <button onClick={() => handleOpenSheet('cheque')} className="btn btn-ghost" style={{border:'1px solid var(--color-border)'}}>🎫 Émettre Chèque</button>
               <button onClick={() => handleOpenSheet('scanner')} className="btn btn-ghost" style={{border:'1px solid var(--color-border)'}}>📷 Scanner</button>
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Historique</h3>
              <button onClick={() => queryClient.invalidateQueries(['operations-caisse'])} className="btn btn-ghost btn-sm">🔄</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 8 }}>
              {opsFiltrees.slice(0, 20).map(op => (
                <LigneOperation key={op.id} op={op} onSignaler={(o) => { setOpASignaler(o); handleOpenSheet('signalement'); }} />
              ))}
            </div>
          </div>
        </>
      )}

      {onglet === 'producteurs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {producteurs.map(p => <CarteProducteur key={p.id} prod={p} />)}
        </div>
      )}

      {/* ── BOTTOM SHEET PORTAL ── */}
      {typeof document !== 'undefined' && createPortal(
        <>
          <div className={`sheet-overlay ${showSheet ? 'active' : ''}`} onClick={() => setShowSheet(false)} />
          <div 
            className={`bottom-sheet ${showSheet ? 'active' : ''} ${isDragging ? 'dragging' : ''}`}
            style={{ transform: showSheet ? `translateY(${dragY}px)` : `translateY(100%)` }}
          >
            <div className="sheet-header" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
              <div className="sheet-handle" />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
                  {sheetMode === 'operation' && (TYPE_CONFIG[opType]?.label || 'Opération')}
                  {sheetMode === 'cheque' && 'Émettre un chèque'}
                  {sheetMode === 'scanner' && 'Scanner un chèque'}
                  {sheetMode === 'signalement' && 'Signaler anomalie'}
                </h3>
                <button onClick={() => setShowSheet(false)} style={{ background: 'none', border: 'none', fontSize: 20 }}>✕</button>
              </div>
            </div>

            <div className="sheet-content">
              {/* FORMULAIRE OPÉRATIONS CAISSE */}
              {sheetMode === 'operation' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Montant (FCFA) *</label>
                    <input type="number" className="form-control" value={form.montant} onChange={e => setForm({...form, montant: e.target.value})} placeholder="Ex: 5000" />
                  </div>
                  {opType === 'paiement_producteur' && (
                    <div className="form-group">
                      <label className="form-label">Producteur</label>
                      <select className="form-control" value={form.producteurId} onChange={e => setForm({...form, producteurId: e.target.value})}>
                        <option value="">Sélectionner...</option>
                        {producteurs.map(p => <option key={p.id} value={p.id}>{p.nom_producteur} ({p.solde} FCFA)</option>)}
                      </select>
                    </div>
                  )}
                  {opType === 'transfert' && (
                    <div className="form-group">
                      <label className="form-label">Caisse destination</label>
                      <select className="form-control" value={form.caisseDestId} onChange={e => setForm({...form, caisseDestId: e.target.value})}>
                        <option value="">Sélectionner...</option>
                        {caisses.filter(c => c.id !== selectedCaisse?.id).map(c => <option key={c.id} value={c.id}>{c.magasin_nom || c.nom}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">Note / Motif</label>
                    <textarea className="form-control" rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Facultatif..." />
                  </div>
                </div>
              )}

              {/* FORMULAIRE CHÈQUE */}
              {sheetMode === 'cheque' && !chequeEmis && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                   <div className="form-group">
                    <label className="form-label">Producteur bénéficiaire</label>
                    <select className="form-control" value={form.producteurId} onChange={e => setForm({...form, producteurId: e.target.value})}>
                      <option value="">Sélectionner...</option>
                      {producteurs.map(p => <option key={p.id} value={p.id}>{p.nom_producteur}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Montant du chèque</label>
                    <input type="number" className="form-control" value={form.montant} onChange={e => setForm({...form, montant: e.target.value})} />
                  </div>
                </div>
              )}

              {/* AFFICHAGE CHÈQUE ÉMIS */}
              {chequeEmis && (
                <div style={{ textAlign: 'center' }}>
                  <img src={qrUrl} style={{ width: 180, margin: '0 auto' }} alt="QR Code" />
                  <p style={{ fontWeight: 800, fontSize: 18, marginTop: 10 }}>{parseFloat(chequeEmis.montant).toLocaleString()} FCFA</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Code : {chequeEmis.code}</p>
                </div>
              )}

              {/* SCANNER CHÈQUE */}
              {sheetMode === 'scanner' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Code UUID du chèque</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="text" className="form-control" value={form.codeCheque} onChange={e => setForm({...form, codeCheque: e.target.value})} />
                      <button onClick={checkCheque} className="btn btn-ghost" style={{border:'1px solid #ccc'}}>Vérifier</button>
                    </div>
                  </div>
                  {chequeVerifie && (
                    <div style={{ background: '#f0fdf4', padding: 12, borderRadius: 8, border: '1px solid #bbf7d0' }}>
                       <p style={{ margin: 0, fontSize: 13 }}><strong>Bénéficiaire :</strong> {chequeVerifie.nom_producteur}</p>
                       <p style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{parseFloat(chequeVerifie.montant).toLocaleString()} FCFA</p>
                    </div>
                  )}
                </div>
              )}

              {/* SIGNALEMENT */}
              {sheetMode === 'signalement' && (
                 <div className="form-group">
                   <label className="form-label">Pourquoi signalez-vous cette transaction ?</label>
                   <textarea className="form-control" rows={3} value={form.motifSignalement} onChange={e => setForm({...form, motifSignalement: e.target.value})} />
                 </div>
              )}
            </div>

            <div className="sheet-footer">
              {!chequeEmis ? (
                <button 
                  onClick={executeAction} 
                  disabled={anyMutationLoading} 
                  className="btn btn-primary btn-lg" 
                  style={{ width: '100%' }}
                >
                  {anyMutationLoading ? '⏳ Traitement...' : 'CONFIRMER'}
                </button>
              ) : (
                <button onClick={() => setShowSheet(false)} className="btn btn-primary btn-lg" style={{ width: '100%' }}>TERMINER</button>
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </PageLayout>
  );
}