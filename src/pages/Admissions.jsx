// src/pages/Admissions.jsx
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAlert } from '../hooks/useAlert';
import { useLots } from '../hooks/useLots';
import api from '../services/api';
import Alert from '../components/Alert';
import PageLayout from '../components/PageLayout';

// ─── STYLES DU BOTTOM SHEET ───
const BottomSheetStyles = () => (
  /* Dans BottomSheetStyles */
<style>{`
  .bottom-sheet {
    position: fixed;
    bottom: 0; left: 0; right: 0;
    height: 85vh;
    background: var(--color-surface);
    border-radius: 24px 24px 0 0;
    z-index: 1001;
    /* transition avec effet rebond (cubic-bezier) */
    transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.15);
    display: flex;
    flex-direction: column;
    box-shadow: 0 -10px 40px rgba(0,0,0,0.2);
    touch-action: none; /* Empêche le scroll natif pendant le drag sur le header */
  }

  /* Quand on drague, on enlève la transition pour que ça colle au doigt */
  .bottom-sheet.dragging {
    transition: none;
  }

  .sheet-header {
    padding: 12px 20px 20px;
    cursor: grab;
    flex-shrink: 0;
  }
  
  .sheet-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    touch-action: pan-y; /* Autorise le scroll normal à l'intérieur */
  }
`}</style>

);

// ─── CONFIG & HELPERS (Identiques à ton code) ─────────────────────────────────
const COOP_CRITERIA = {
  frais: ['Aspect visuel (couleur/forme)', 'Absence de moisissures', 'Odeur', 'Fermeté / Texture', 'Présence de parasites'],
  court: ['Aspect visuel', 'Odeur', 'Conditionnement', 'Humidité', 'Conformité étiquetage'],
  secs: ['Humidité résiduelle', "Absence d'impuretés", 'Granulométrie', 'Couleur homogène', 'Absence de parasites', 'Taux de brisures'],
  manufactures_alim: ['Intégrité emballage', 'Date de péremption', 'Conformité poids', 'Aspect général', 'Traçabilité lot'],
  manufactures_non_alim: ['Intégrité emballage', 'Conformité référence', 'Absence de défauts', 'Fonctionnalité', 'Étiquetage'],
  sensibles: ['Température de stockage', 'Intégrité conditionnement', 'Date validité', 'Conformité réglementaire', 'Traçabilité'],
};

const GRADE_CONFIG = {
  A: { min: 9,   coef: 1.0, color: '#c8e6c9', textColor: '#1b5e20', label: 'Excellente' },
  B: { min: 7.5, coef: 0.9, color: '#fff9c4', textColor: '#f57f17', label: 'Bonne' },
  C: { min: 6,   coef: 0.8, color: '#ffe0b2', textColor: '#e65100', label: 'Moyenne' },
  D: { min: 0,   coef: 0.7, color: '#ffcdd2', textColor: '#b71c1c', label: 'Faible' },
};

function getGrade(moyenne) {
  if (moyenne >= 9)   return 'A';
  if (moyenne >= 7.5) return 'B';
  if (moyenne >= 6)   return 'C';
  return 'D';
}

// ─── COMPOSANTS ENFANTS (Identiques à ton code) ───────────────────────────────
function AuditQualite({ categorie, onGradeChange }) {
  const criteres = COOP_CRITERIA[categorie] || [];
  const [notes, setNotes] = useState(() => (COOP_CRITERIA[categorie] || []).map(() => 10));

  const notifyParent = useCallback((currentNotes) => {
    if (!currentNotes.length) { onGradeChange({ grade: null, coef: 1.0 }); return; }
    const moyenne = currentNotes.reduce((a, b) => a + b, 0) / currentNotes.length;
    const grade = getGrade(moyenne);
    onGradeChange({ grade, coef: GRADE_CONFIG[grade].coef, moyenne });
  }, [onGradeChange]);

  useEffect(() => {
    const newNotes = (COOP_CRITERIA[categorie] || []).map(() => 10);
    setNotes(newNotes);
    notifyParent(newNotes);
  }, [categorie]);

  const handleSlider = (index, value) => {
    const updated = [...notes];
    updated[index] = Number(value);
    setNotes(updated);
    notifyParent(updated);
  };

  if (!categorie) return <div style={{ textAlign: 'center', padding: '20px', color: '#aaa' }}>🔍 Sélectionnez un lot</div>;

  const moyenne = notes.reduce((a, b) => a + b, 0) / notes.length;
  const grade = getGrade(moyenne);
  const gradeInfo = GRADE_CONFIG[grade];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {criteres.map((critere, i) => (
        <div key={i} style={{ background: 'var(--color-surface-alt)', borderRadius: 12, padding: '12px', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{critere}</span>
            <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{notes[i]}</span>
          </div>
          <input type="range" min="1" max="10" value={notes[i]} onChange={(e) => handleSlider(i, e.target.value)} style={{ width: '100%', accentColor: 'var(--color-primary)' }} />
        </div>
      ))}
      <div style={{ marginTop: 10, padding: 16, borderRadius: 12, textAlign: 'center', background: gradeInfo.color, color: gradeInfo.textColor }}>
        <strong>GRADE {grade}</strong> — {moyenne.toFixed(1)}/10
      </div>
    </div>
  );
}

function FinancePreview({ quantite, prixRef, coefQualite, modePaiement, dateExpiration }) {
  const qty = parseFloat(quantite) || 0;
  const prix = parseFloat(prixRef) || 0;
  const coef = parseFloat(coefQualite) || 1.0;
  if (!qty || !prix) return null;

  const baseMontant = qty * prix * coef;
  let taxeTaux = modePaiement === 'mobile_money' ? 0.07 : 0.05;
  const montantTaxe = baseMontant * taxeTaux;
  const netProducteur = baseMontant - montantTaxe;

  return (
    <div style={{ background: 'rgba(22, 101, 52, 0.05)', border: '1px solid rgba(22, 101, 52, 0.1)', borderRadius: 12, padding: 16, marginTop: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <span>Base :</span> <span>{Math.round(baseMontant).toLocaleString()} F</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: '#166534' }}>
        <span>Net producteur :</span> <span>{Math.round(netProducteur).toLocaleString()} FCFA</span>
      </div>
    </div>
  );
}

function AdmissionCard({ admission: a }) {
    const [open, setOpen] = useState(false);
    const gradeColors     = { A: '#c8e6c9', B: '#fff9c4', C: '#ffe0b2', D: '#ffcdd2' };
    const gradeTextColors = { A: '#1b5e20', B: '#f57f17', C: '#e65100', D: '#b71c1c' };
    const g = a.grade_qualite;
    const unite = Array.isArray(a.unite) ? a.unite[0] : a.unite;
  
    return (
      <div style={{ background: 'var(--color-surface-alt)', borderRadius: 12, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
        <div onClick={() => setOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', cursor: 'pointer' }}>
          <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: 13, margin: 0 }}>{a.lot_description || `Lot #${a.lot_id}`}</p>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>{new Date(a.date_reception).toLocaleDateString()} · {a.quantite} {unite}</p>
          </div>
          {g && <span style={{ padding: '2px 8px', borderRadius: 8, fontWeight: 700, fontSize: 10, background: gradeColors[g], color: gradeTextColors[g] }}>{g}</span>}
        </div>
        {open && <div style={{ padding: 14, borderTop: '1px solid var(--color-border)', fontSize: 12 }}>
            <p><strong>Producteur :</strong> {a.nom_producteur || 'N/A'}</p>
            <p><strong>Montant versé :</strong> {Number(a.montant_verse).toLocaleString()} FCFA</p>
        </div>}
      </div>
    );
}

// ─── PAGE PRINCIPALE ────────────────────────────────────────────────────────────
export default function Admissions({ onBack }) {
  const { user, magasinId } = useAuth();
  const { alert, showAlert, hideAlert } = useAlert();
  const { lots } = useLots();

  const [admissions, setAdmissions] = useState([]);
  const [producteurs, setProducteurs] = useState([]);
  const [activeLot, setActiveLot] = useState(null);
  const [gradeInfo, setGradeInfo] = useState({ grade: null, coef: 1.0 });
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    lot_id: '', producteur_id: '', quantite: '', unite: '',
    prix_ref: '', date_expiration: '', magasin_id: 1, mode_paiement: 'especes', source: 'achat_direct',
  });

  useEffect(() => { loadData(); }, []);

  // Bloquer le scroll du body quand le panneau est ouvert
  useEffect(() => {
    if (showForm) document.body.classList.add('sheet-open');
    else document.body.classList.remove('sheet-open');
  }, [showForm]);

  const loadData = async () => {
    try {
      const [admData, prodData] = await Promise.all([
        api.getAdmissions(magasinId || null).catch(() => []),
        api.getProducteurs().catch(() => []),
      ]);
      setAdmissions(admData);
      setProducteurs(prodData);
    } catch (err) { console.error(err); }
  };

  const handleLotChange = async (lotId) => {
    const lot = lots.find(l => l.id === parseInt(lotId));
    setActiveLot(lot);
    if (lot) {
        const unites = Array.isArray(lot.unites_admises) ? lot.unites_admises : JSON.parse(lot.unites_admises || '[]');
        setFormData(f => ({ ...f, lot_id: lotId, prix_ref: lot.prix_ref, unite: unites[0] || '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createAdmission({
        ...formData,
        lot_id: parseInt(formData.lot_id),
        producteur_id: formData.source === 'achat_direct' ? null : parseInt(formData.producteur_id),
        quantite: parseFloat(formData.quantite),
        prix_ref: parseFloat(formData.prix_ref),
        coef_qualite: gradeInfo.coef,
        grade_qualite: gradeInfo.grade,
        utilisateur: user?.username,
      });
      showAlert('✅ Validé !', 'success');
      setShowForm(false);
      loadData();
    } catch (err) { showAlert(err.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const set = (fld) => (e) => setFormData(f => ({ ...f, [fld]: e.target.value }));

  return (
    <PageLayout title="Admissions" icon="📥" onBack={onBack}>
      <BottomSheetStyles />
      <Alert message={alert?.message} type={alert?.type} onClose={hideAlert} />

      {/* Bouton d'ouverture */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header" style={{ border: 'none' }}>
            <h3 className="card-title">Opérations</h3>
            <button onClick={() => setShowForm(true)} className="btn btn-primary btn-sm">+ Nouvelle Admission</button>
        </div>
      </div>

      {/* ── BOTTOM SHEET (LE FORMULAIRE) ── */}
      <div className={`sheet-overlay ${showForm ? 'active' : ''}`} onClick={() => setShowForm(false)} />
      {/* La div principale du panneau */}
<div 
  className={`bottom-sheet ${showForm ? 'active' : ''} ${isDragging ? 'dragging' : ''}`}
  style={{ 
    transform: showForm 
      ? `translateY(${dragY}px)` 
      : `translateY(100%)` 
  }}
>
  {/* On place les écouteurs sur le header (la zone de saisie) */}
  <div 
    className="sheet-header"
    onTouchStart={handleTouchStart}
    onTouchMove={handleTouchMove}
    onTouchEnd={handleTouchEnd}
  >
    <div className="sheet-handle" />
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>📥 Nouvelle Réception</h3>
      <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: 20 }}>✕</button>
    </div>
  </div>

  <div className="sheet-content">
    
          <form id="admission-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            <div className="form-group">
              <label className="form-label">Produit / Lot *</label>
              <select required value={formData.lot_id} onChange={(e) => handleLotChange(e.target.value)} className="form-control">
                <option value="">-- Choisir --</option>
                {lots.map(l => <option key={l.id} value={l.id}>{l.description}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                    <label className="form-label">Quantité *</label>
                    <input type="number" required step="0.01" value={formData.quantite} onChange={set('quantite')} className="form-control" />
                </div>
                <div className="form-group">
                    <label className="form-label">Unité</label>
                    <input type="text" value={formData.unite} readOnly className="form-control" style={{ background: '#f5f5f5' }} />
                </div>
            </div>

            <div className="form-group">
              <label className="form-label">Source</label>
              <select value={formData.source} onChange={set('source')} className="form-control">
                <option value="achat_direct">🛒 Achat direct</option>
                <option value="producteur">🧑‍🌾 Producteur</option>
              </select>
            </div>

            {/* Audit Qualité (Section qui défile sous le titre) */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 15 }}>
              <p style={{ fontWeight: 700, fontSize: 12, marginBottom: 15, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>📋 Audit Qualité</p>
              <AuditQualite categorie={activeLot?.categorie} onGradeChange={setGradeInfo} />
            </div>

            <FinancePreview 
                quantite={formData.quantite} 
                prixRef={formData.prix_ref} 
                coefQualite={gradeInfo.coef} 
                modePaiement={formData.mode_paiement} 
            />
          </form>
        </div>

        <div className="sheet-footer">
          <button type="submit" form="admission-form" disabled={submitting} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
            {submitting ? 'Enregistrement...' : 'VALIDER L\'ADMISSION'}
          </button>
        </div>
      </div>

      {/* Historique */}
      <div className="card">
        <div className="card-header"><h3 className="card-title">Dernières entrées</h3></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12 }}>
          {admissions.map(a => <AdmissionCard key={a.id} admission={a} />)}
        </div>
      </div>
    </PageLayout>
  );
}
