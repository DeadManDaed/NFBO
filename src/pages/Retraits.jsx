// src/pages/Retraits.jsx
import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../hooks/useAuth';
import { useAlert } from '../hooks/useAlert';
import { useStocks } from '../hooks/useStocks';
import api from '../services/api';
import Alert from '../components/Alert';
import PageLayout, { StateLoading, StateEmpty } from '../components/PageLayout';

// ─── STYLES DU BOTTOM SHEET ────────────────────────────────────────────────────
const BottomSheetStyles = () => (
  <style>{`
    .sheet-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(2px); z-index: 99998; opacity: 0; visibility: hidden; transition: all 0.3s; }
    .sheet-overlay.active { opacity: 1; visibility: visible; }
    .bottom-sheet { position: fixed; bottom: 0; left: 0; right: 0; max-height: 80vh; background: var(--color-surface, #fff); border-radius: 24px 24px 0 0; z-index: 99999; transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1); display: flex; flex-direction: column; box-shadow: 0 -10px 40px rgba(0,0,0,0.3); }
    .sheet-header { padding: 12px 20px; border-bottom: 1px solid var(--color-border, #eee); flex-shrink: 0; text-align: center; }
    .sheet-handle { width: 40px; height: 5px; background: #ccc; border-radius: 3px; margin: 0 auto 12px; }
    .sheet-content { flex: 1; overflow-y: auto; padding: 20px; padding-bottom: 100px; }
    .sheet-footer { position: absolute; bottom: 0; left: 0; right: 0; padding: 16px 20px; background: var(--color-surface); border-top: 1px solid var(--color-border); }
    body.sheet-open { overflow: hidden !important; }
  `}</style>
);

const MARGES_FRAICHEUR = {
  'tres_frais': 0.15,
  'frais':      0.12,
  'normal':     0.09,
  'vieux':      0.07,
};

const TYPE_RETRAIT_LABELS = {
  vente: { label: 'Vente client', icon: '🛒', color: 'var(--color-success)' },
  producteur: { label: 'Retour producteur', icon: '👨‍🌾', color: 'var(--color-info)' },
  destruction: { label: 'Destruction', icon: '🗑️', color: 'var(--color-danger)' },
};

export default function Retraits() {
  const { user, magasinId } = useAuth();
  const { alert, showAlert, hideAlert } = useAlert();
  const { stocks, refresh: refreshStocks } = useStocks(magasinId);

  // Données
  const [retraits, setRetraits] = useState([]);
  const [producteurs, setProducteurs] = useState([]);
  const [magasins, setMagasins] = useState([]);

  // États UI Sheet
  const [showSheet, setShowSheet] = useState(false);
  const [sheetMode, setSheetMode] = useState('form'); // 'form', 'insuffisant', 'depot'
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // État du formulaire
  const [form, setForm] = useState({
    lot_id: '', type_retrait: 'vente', quantite: '', unite: '',
    prix_ref: '', destination_producteur_id: '', motif: '', fraicheur: 'frais',
    montantDepot: ''
  });
  
  const [activeLot, setActiveLot] = useState(null);
  const [soldeProd, setSoldeProd] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);

  useEffect(() => {
    Promise.all([
      api.getRetraits(),
      api.getProducteurs(),
      api.getMagasins()
    ]).then(([r, p, m]) => {
      setRetraits(r); setProducteurs(p); setMagasins(m);
    }).finally(() => setLoading(false));
  }, []);

  // Logique de prix auto selon fraîcheur
  useEffect(() => {
    if (!activeLot || form.type_retrait !== 'vente') return;
    const marge = MARGES_FRAICHEUR[form.fraicheur] || 0.09;
    const prixVente = Math.round(parseFloat(activeLot.prix_ref) * (1 + marge));
    setForm(f => ({ ...f, prix_ref: prixVente }));
  }, [form.fraicheur, activeLot, form.type_retrait]);

  // Récupérer solde producteur au changement
  useEffect(() => {
    if (form.destination_producteur_id) {
      api.request(`/producteurs?id=${form.destination_producteur_id}`)
        .then(p => setSoldeProd(parseFloat(p.solde) || 0))
        .catch(() => setSoldeProd(null));
    }
  }, [form.destination_producteur_id]);

  const handleOpenSheet = (mode = 'form') => {
    setSheetMode(mode);
    setShowSheet(true);
    if (mode === 'form') {
       // Reset partiel
       setForm(f => ({ ...f, lot_id: '', quantite: '', destination_producteur_id: '', motif: '' }));
       setActiveLot(null);
    }
  };

  const handleLotChange = (lotId) => {
    const stock = stocks.find(s => String(s.lot_id) === String(lotId));
    setActiveLot(stock || null);
    setForm(f => ({ 
      ...f, 
      lot_id: lotId, 
      unite: stock ? (Array.isArray(stock.unite) ? stock.unite[0] : stock.unite) : '' 
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const payload = {
      lot_id: parseInt(form.lot_id),
      type_retrait: form.type_retrait,
      quantite: parseFloat(form.quantite),
      unite: form.unite,
      prix_ref: parseFloat(form.prix_ref),
      magasin_id: magasinId,
      utilisateur: user?.username || 'unknown',
    };

    if (form.type_retrait === 'producteur') payload.destination_producteur_id = parseInt(form.destination_producteur_id);
    if (form.type_retrait === 'destruction') payload.motif = form.motif;

    try {
      await api.createRetrait(payload);
      showAlert('✅ Retrait enregistré', 'success');
      setShowSheet(false);
      api.getRetraits().then(setRetraits);
      refreshStocks();
    } catch (err) {
      if (err.solde_disponible !== undefined) {
        setErrorDetails({ solde: err.solde_disponible, requis: err.montant_requis });
        setSheetMode('insuffisant');
      } else {
        showAlert(`❌ ${err.message}`, 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDepotEspeces = async () => {
    if (!form.montantDepot) return;
    setSubmitting(true);
    try {
      await api.request(`/producteurs?id=${form.destination_producteur_id}`, {
        method: 'PATCH',
        body: JSON.stringify({ solde_increment: parseFloat(form.montantDepot) }),
      });
      showAlert('✅ Solde crédité', 'success');
      setForm(f => ({ ...f, montantDepot: '' }));
      setSheetMode('form'); // On revient au formulaire pour retenter la vente
    } catch (err) {
      showAlert(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageLayout 
      title="Retraits" 
      icon="📤" 
      subtitle="Sorties de stock et ventes"
      actions={<button onClick={() => handleOpenSheet('form')} className="btn btn-primary btn-sm">➕ Retrait</button>}
    >
      <BottomSheetStyles />
      <Alert message={alert?.message} type={alert?.type} onClose={hideAlert} />

      <div className="card">
        <div className="card-header"><h3 className="card-title">Historique récent</h3></div>
        {loading ? <StateLoading /> : retraits.length === 0 ? <StateEmpty /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 8 }}>
            {retraits.slice(0, 20).map(r => (
              <div key={r.id} style={{ background: 'var(--color-surface-alt)', padding: 12, borderRadius: 12, border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{r.lot_description}</span>
                  <span style={{ fontWeight: 800, color: 'var(--color-text)' }}>{r.quantite} {r.unite}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <span style={{ fontSize: 10, background: 'var(--color-surface)', padding: '2px 6px', borderRadius: 4, color: 'var(--color-text-muted)' }}>
                     {new Date(r.date_retrait).toLocaleDateString()} · {TYPE_RETRAIT_LABELS[r.type_retrait]?.label}
                   </span>
                   <span style={{ fontSize: 11, fontWeight: 600 }}>{r.utilisateur}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── PORTAL BOTTOM SHEET ── */}
      {typeof document !== 'undefined' && createPortal(
        <>
          <div className={`sheet-overlay ${showSheet ? 'active' : ''}`} onClick={() => setShowSheet(false)} />
          <div className={`bottom-sheet ${showSheet ? 'active' : ''}`} style={{ transform: showSheet ? 'translateY(0)' : 'translateY(100%)' }}>
            
            <div className="sheet-header">
              <div className="sheet-handle" />
              <h3 style={{ margin: 0 }}>
                {sheetMode === 'form' && 'Nouveau Retrait'}
                {sheetMode === 'insuffisant' && '⚠️ Solde Insuffisant'}
                {sheetMode === 'depot' && '💵 Dépôt Espèces'}
              </h3>
            </div>

            <div className="sheet-content">
              {sheetMode === 'form' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Type de sortie</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {Object.entries(TYPE_RETRAIT_LABELS).map(([key, cfg]) => (
                        <button key={key} onClick={() => setForm({...form, type_retrait: key})} 
                          style={{ flex: 1, padding: '10px 4px', borderRadius: 8, border: '2px solid', fontSize: 11, fontWeight: 700,
                            borderColor: form.type_retrait === key ? cfg.color : 'var(--color-border)',
                            background: form.type_retrait === key ? cfg.color : 'transparent',
                            color: form.type_retrait === key ? '#fff' : 'var(--color-text)' }}>
                          {cfg.icon} <br/> {cfg.label.split(' ')[1] || cfg.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Lot disponible</label>
                    <select className="form-control" value={form.lot_id} onChange={e => handleLotChange(e.target.value)}>
                      <option value="">-- Choisir un lot --</option>
                      {stocks.map(s => <option key={s.lot_id} value={s.lot_id}>{s.description} ({s.stock_actuel} {s.unite})</option>)}
                    </select>
                  </div>

                  <div className="grid-2" style={{ gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Quantité</label>
                      <input type="number" className="form-control" value={form.quantite} onChange={e => setForm({...form, quantite: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Prix Unitaire</label>
                      <input type="number" className="form-control" value={form.prix_ref} onChange={e => setForm({...form, prix_ref: e.target.value})} />
                    </div>
                  </div>

                  {form.type_retrait === 'vente' && (
                    <div className="form-group">
                      <label className="form-label">Niveau de fraîcheur</label>
                      <select className="form-control" value={form.fraicheur} onChange={e => setForm({...form, fraicheur: e.target.value})}>
                        <option value="tres_frais">🌟 Très frais (+15%)</option>
                        <option value="frais">✅ Frais (+12%)</option>
                        <option value="normal">🔶 Normal (+9%)</option>
                        <option value="vieux">⚠️ Vieux (+7%)</option>
                      </select>
                    </div>
                  )}

                  {form.type_retrait === 'producteur' && (
                    <div className="form-group">
                      <label className="form-label">Producteur destinataire</label>
                      <select className="form-control" value={form.destination_producteur_id} onChange={e => setForm({...form, destination_producteur_id: e.target.value})}>
                        <option value="">-- Choisir --</option>
                        {producteurs.map(p => <option key={p.id} value={p.id}>{p.nom_producteur}</option>)}
                      </select>
                      {soldeProd !== null && <p style={{ fontSize: 11, marginTop: 4, color: soldeProd < 0 ? 'red' : 'green' }}>Solde : {soldeProd.toLocaleString()} FCFA</p>}
                    </div>
                  )}

                  {form.quantite && form.prix_ref && (
                    <div style={{ background: 'var(--color-primary-light)', padding: 12, borderRadius: 12, textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--color-primary)' }}>VALEUR TOTALE</p>
                      <p style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>{(form.quantite * form.prix_ref).toLocaleString()} FCFA</p>
                    </div>
                  )}
                </div>
              )}

              {sheetMode === 'insuffisant' && errorDetails && (
                <div style={{ textAlign: 'center' }}>
                   <p>Le solde du producteur est insuffisant.</p>
                   <div style={{ background: '#fef2f2', padding: 12, borderRadius: 12, marginBottom: 20 }}>
                      <p style={{ margin: 0 }}>Disponible : <strong>{errorDetails.solde.toLocaleString()} FCFA</strong></p>
                      <p style={{ margin: 0 }}>Requis : <strong style={{color:'red'}}>{errorDetails.requis.toLocaleString()} FCFA</strong></p>
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <button className="btn btn-primary" onClick={() => setSheetMode('depot')}>💵 Encaisser un dépôt espèces</button>
                      <button className="btn btn-ghost" style={{border:'1px solid #ccc'}} onClick={() => {
                        const qteAjustee = Math.floor(errorDetails.solde / form.prix_ref);
                        setForm({...form, quantite: qteAjustee});
                        setSheetMode('form');
                      }}>✂️ Ajuster la quantité au solde</button>
                   </div>
                </div>
              )}

              {sheetMode === 'depot' && (
                <div className="form-group">
                   <label className="form-label">Montant déposé par le producteur</label>
                   <input type="number" className="form-control" value={form.montantDepot} onChange={e => setForm({...form, montantDepot: e.target.value})} autoFocus />
                </div>
              )}
            </div>

            <div className="sheet-footer">
              {sheetMode === 'form' && (
                <button onClick={handleSubmit} disabled={submitting || !form.lot_id} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                  {submitting ? '⏳ ENREGISTREMENT...' : 'CONFIRMER LA SORTIE'}
                </button>
              )}
              {sheetMode === 'depot' && (
                <button onClick={handleDepotEspeces} disabled={submitting} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                  VALIDER LE DÉPÔT
                </button>
              )}
              {sheetMode === 'insuffisant' && (
                <button onClick={() => setShowSheet(false)} className="btn btn-ghost" style={{ width: '100%' }}>ANNULER</button>
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </PageLayout>
  );
}
