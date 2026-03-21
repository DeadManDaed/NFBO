// src/pages/Admissions.jsx

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useAlert } from '../hooks/useAlert';
import { useLots } from '../hooks/useLots';
import api from '../services/api';
import Alert from '../components/Alert';
import PageLayout from '../components/PageLayout';

// ─── STYLES DU BOTTOM SHEET ───────────────────────────────────────────────────
const BottomSheetStyles = () => (
  <style>{`
    .sheet-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.4);
      backdrop-filter: blur(2px);
      z-index: 1000; opacity: 0; visibility: hidden;
      transition: all 0.3s ease;
    }
    .sheet-overlay.active { opacity: 1; visibility: visible; }
    .bottom-sheet {
      position: fixed; bottom: 0; left: 0; right: 0;
      max-height: 80vh;
      background: var(--color-surface, #ffffff);
      border-radius: 24px 24px 0 0;
      z-index: 1001;
      transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.15);
      display: flex; flex-direction: column;
      box-shadow: 0 -10px 40px rgba(0,0,0,0.2);
      touch-action: none;
    }
    .bottom-sheet.dragging { transition: none; }
    .sheet-header {
      padding: 12px 20px 20px;
      border-bottom: 1px solid var(--color-border, #eee);
      flex-shrink: 0; text-align: center; cursor: grab;
    }
    .sheet-header:active { cursor: grabbing; }
    .sheet-handle {
      width: 40px; height: 5px; background: #ccc;
      border-radius: 3px; margin: 0 auto 12px;
    }
    .sheet-content {
      flex: 1; overflow-y: auto;
      padding: 20px; padding-bottom: 120px;
      touch-action: pan-y;
      -webkit-overflow-scrolling: touch;
    }
    .sheet-footer {
      position: absolute; bottom: 0; left: 0; right: 0;
      padding: 16px 20px;
      background: linear-gradient(to top, var(--color-surface, #ffffff) 80%, rgba(255,255,255,0));
      z-index: 2;
    }
    body.sheet-open { overflow: hidden; }
  `}</style>
);

// ─── CRITÈRES D'AUDIT QUALITÉ ─────────────────────────────────────────────────
const COOP_CRITERIA = {
  frais:                ['Aspect visuel (couleur/forme)', 'Absence de moisissures', 'Odeur', 'Fermeté / Texture', 'Présence de parasites'],
  court:                ['Aspect visuel', 'Odeur', 'Conditionnement', 'Humidité', 'Conformité étiquetage'],
  secs:                 ['Humidité résiduelle', "Absence d'impuretés", 'Granulométrie', 'Couleur homogène', 'Absence de parasites', 'Taux de brisures'],
  manufactures_alim:    ['Intégrité emballage', 'Date de péremption', 'Conformité poids', 'Aspect général', 'Traçabilité lot'],
  manufactures_non_alim:['Intégrité emballage', 'Conformité référence', 'Absence de défauts', 'Fonctionnalité', 'Étiquetage'],
  sensibles:            ['Température de stockage', 'Intégrité conditionnement', 'Date validité', 'Conformité réglementaire', 'Traçabilité'],
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

// ─── COMPOSANT : AUDIT QUALITÉ ────────────────────────────────────────────────
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
  }, [categorie, notifyParent]);

  const handleSlider = (index, value) => {
    const updated = [...notes];
    updated[index] = Number(value);
    setNotes(updated);
    notifyParent(updated);
  };

  if (!categorie) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', color: '#aaa' }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
        <p style={{ fontSize: 13 }}>Sélectionnez un lot pour afficher les critères d'audit</p>
      </div>
    );
  }

  if (!criteres.length) {
    return (
      <div className="alert alert-warning">
        ⚠️ Aucun protocole d'examen pour la catégorie : <strong>{categorie}</strong>
      </div>
    );
  }

  const moyenne = notes.reduce((a, b) => a + b, 0) / notes.length;
  const grade = getGrade(moyenne);
  const gradeInfo = GRADE_CONFIG[grade];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {criteres.map((critere, i) => (
        <div key={i} style={{ background: '#f8f9f8', borderRadius: 8, padding: '10px 12px', border: '1px solid #e8ece8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#444' }}>{critere}</span>
            <span style={{ fontWeight: 700, color: '#2e7d32', fontSize: 13, minWidth: 20, textAlign: 'right' }}>{notes[i]}</span>
          </div>
          <input
            type="range" min="1" max="10"
            value={notes[i]}
            onChange={(e) => handleSlider(i, e.target.value)}
            style={{ width: '100%', accentColor: '#2e7d32', cursor: 'pointer' }}
          />
        </div>
      ))}
      <div style={{
        marginTop: 8, padding: '14px 16px', borderRadius: 10,
        textAlign: 'center', fontWeight: 700,
        background: gradeInfo.color, color: gradeInfo.textColor,
        border: `1px solid ${gradeInfo.color}`,
      }}>
        GRADE : <span style={{ fontSize: 20 }}>{grade}</span> — {gradeInfo.label}
        <div style={{ fontSize: 13, fontWeight: 400, marginTop: 4 }}>
          Moyenne : {moyenne.toFixed(1)}/10 · Coefficient : {gradeInfo.coef.toFixed(1)}
        </div>
      </div>
    </div>
  );
}

// ─── COMPOSANT : APERÇU FINANCIER ─────────────────────────────────────────────
function FinancePreview({ quantite, prixRef, coefQualite, modePaiement, dateExpiration, source }) {
  const qty  = parseFloat(quantite)    || 0;
  const prix = parseFloat(prixRef)     || 0;
  const coef = parseFloat(coefQualite) || 1.0;

  if (!qty || !prix) return null;

  const baseMontant = qty * prix * coef;
  const rowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 };

  // Achat direct — pas de commission, juste le montant débité de la caisse
  if (source === 'achat_direct') {
    return (
      <div style={{ background: '#fff3e0', border: '1px solid #ffe0b2', borderRadius: 10, padding: '14px 16px' }}>
        <div style={rowStyle}>
          <span style={{ color: '#555' }}>Montant total (débit caisse) :</span>
          <span style={{ fontWeight: 700, color: '#e65100', fontSize: 15 }}>
            {Math.round(baseMontant).toLocaleString()} FCFA
          </span>
        </div>
      </div>
    );
  }

  // Admission producteur — calcul commission
  let taxeTaux = modePaiement === 'mobile_money' ? 0.07 : 0.05;
  if (dateExpiration) {
    const joursRestants = Math.ceil((new Date(dateExpiration) - new Date()) / 86400000);
    if (joursRestants > 0 && joursRestants < 30) taxeTaux += (30 - joursRestants) * 0.005;
  }

  const montantTaxe   = baseMontant * taxeTaux;
  const netProducteur = baseMontant - montantTaxe;

  return (
    <div style={{ background: '#e8f5e9', border: '1px solid #c8e6c9', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={rowStyle}>
        <span style={{ color: '#555' }}>Base (qty × prix × coef) :</span>
        <span style={{ fontWeight: 600 }}>{Math.round(baseMontant).toLocaleString()} FCFA</span>
      </div>
      <div style={rowStyle}>
        <span style={{ color: '#555' }}>Commission ({(taxeTaux * 100).toFixed(1)}%) :</span>
        <span style={{ fontWeight: 600, color: '#388e3c' }}>+{Math.round(montantTaxe).toLocaleString()} FCFA</span>
      </div>
      <div style={{ ...rowStyle, borderTop: '1px solid #c8e6c9', paddingTop: 8, fontWeight: 700 }}>
        <span>Dû au producteur :</span>
        <span style={{ color: '#1b5e20', fontSize: 15 }}>{Math.round(netProducteur).toLocaleString()} FCFA</span>
      </div>
    </div>
  );
}

// ─── COMPOSANT : CARTE ADMISSION ──────────────────────────────────────────────
function AdmissionCard({ admission: a }) {
  const [open, setOpen] = useState(false);

  const gradeColors     = { A: '#c8e6c9', B: '#fff9c4', C: '#ffe0b2', D: '#ffcdd2' };
  const gradeTextColors = { A: '#1b5e20', B: '#f57f17', C: '#e65100', D: '#b71c1c' };
  const g = a.grade_qualite;
  const unite = Array.isArray(a.unite) ? a.unite[0] : a.unite;

  const exportPDF = (e) => {
    e.stopPropagation();
    const w = window.open('', '_blank', 'height=800,width=800');
    w.document.write(`
      <html><head>
        <title>Admission #${a.id} — NFBO</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          .header { border-bottom: 2px solid #166534; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; }
          .brand { font-size: 20px; font-weight: bold; color: #166534; }
          .meta { font-size: 11px; color: #666; text-align: right; }
          .section { margin-bottom: 24px; }
          .section-title { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #666; border-bottom: 1px solid #eee; padding-bottom: 6px; margin-bottom: 12px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .field { margin-bottom: 8px; }
          .label { font-size: 11px; color: #888; margin-bottom: 2px; }
          .value { font-size: 14px; font-weight: 600; }
          .finance { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; }
          .finance-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #dcfce7; font-size: 13px; }
          .finance-total { display: flex; justify-content: space-between; padding: 10px 0; font-weight: bold; font-size: 15px; color: #166534; }
          .grade { display: inline-block; padding: 4px 12px; border-radius: 20px; font-weight: bold; font-size: 13px; }
          .grade-A { background: #c8e6c9; color: #1b5e20; }
          .grade-B { background: #fff9c4; color: #f57f17; }
          .grade-C { background: #ffe0b2; color: #e65100; }
          .grade-D { background: #ffcdd2; color: #b71c1c; }
          .footer { margin-top: 40px; font-size: 10px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 10px; }
        </style>
      </head><body>
        <div class="header">
          <div class="brand">NFBO — Reçu d'Admission</div>
          <div class="meta">Admission #${a.id}<br>Imprimé le ${new Date().toLocaleString('fr-FR')}</div>
        </div>
        <div class="section">
          <div class="section-title">Informations générales</div>
          <div class="grid">
            <div class="field"><div class="label">Lot</div><div class="value">${a.lot_description || `Lot #${a.lot_id}`}</div></div>
            <div class="field"><div class="label">Date de réception</div><div class="value">${new Date(a.date_reception).toLocaleDateString('fr-FR')}</div></div>
            <div class="field"><div class="label">Producteur</div><div class="value">${a.nom_producteur || `#${a.producteur_id}`}</div></div>
            <div class="field"><div class="label">Magasin</div><div class="value">${a.magasin_nom || `#${a.magasin_id}`}</div></div>
            <div class="field"><div class="label">Quantité</div><div class="value">${a.quantite} ${unite}</div></div>
            <div class="field"><div class="label">Prix unitaire</div><div class="value">${Number(a.prix_ref).toLocaleString('fr-FR')} FCFA</div></div>
            ${a.date_expiration ? `<div class="field"><div class="label">Date d'expiration</div><div class="value">${new Date(a.date_expiration).toLocaleDateString('fr-FR')}</div></div>` : ''}
            <div class="field"><div class="label">Mode de paiement</div><div class="value">${a.mode_paiement || '—'}</div></div>
          </div>
        </div>
        <div class="section">
          <div class="section-title">Audit qualité</div>
          <div class="grid">
            <div class="field"><div class="label">Grade</div><div class="value"><span class="grade grade-${g || 'A'}">${g || '—'}</span></div></div>
            <div class="field"><div class="label">Coefficient qualité</div><div class="value">${a.coef_qualite || '1.00'}</div></div>
            <div class="field"><div class="label">Taux commission</div><div class="value">${a.taux_tax ? (parseFloat(a.taux_tax) * 100).toFixed(1) + '%' : '—'}</div></div>
          </div>
        </div>
        <div class="section">
          <div class="section-title">Récapitulatif financier</div>
          <div class="finance">
            <div class="finance-row"><span>Valeur totale du lot</span><span>${Number(a.valeur_totale || 0).toLocaleString('fr-FR')} FCFA</span></div>
            <div class="finance-row"><span>Commission (${a.taux_tax ? (parseFloat(a.taux_tax) * 100).toFixed(1) : 5}%)</span><span>${Number(a.benefice_estime || 0).toLocaleString('fr-FR')} FCFA</span></div>
            <div class="finance-total"><span>Net versé au producteur</span><span>${Number(a.montant_verse || 0).toLocaleString('fr-FR')} FCFA</span></div>
          </div>
        </div>
        <div class="section">
          <div class="section-title">Enregistré par</div>
          <div class="field"><div class="value">${a.utilisateur || '—'}</div></div>
        </div>
        <div class="footer">Document officiel NFBO — Ne pas diffuser sans autorisation.<br>© ${new Date().getFullYear()} NFBO System</div>
      </body></html>
    `);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 500);
  };

  return (
    <div style={{
      background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)',
      border: '1px solid var(--color-border)', overflow: 'hidden',
    }}>
      <div
        onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', cursor: 'pointer', gap: 10 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block' }}>▶</span>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontWeight: 700, fontSize: 13, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {a.lot_description || `Lot #${a.lot_id}`}
            </p>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>
              {new Date(a.date_reception).toLocaleDateString('fr-FR')} · {a.quantite} {unite}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {g && (
            <span style={{ padding: '2px 10px', borderRadius: 12, fontWeight: 700, fontSize: 11, background: gradeColors[g], color: gradeTextColors[g] }}>
              {g}
            </span>
          )}
          <button onClick={exportPDF} className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', fontSize: 14 }} title="Exporter PDF">
            🖨
          </button>
        </div>
      </div>

      {open && (
        <div style={{ borderTop: '1px solid var(--color-border)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="grid-2" style={{ gap: 10 }}>
            {[
              ['Lot',            a.lot_description || `Lot #${a.lot_id}`],
              ['Date réception', new Date(a.date_reception).toLocaleDateString('fr-FR')],
              ['Producteur',     a.nom_producteur || `#${a.producteur_id}`],
              ['Magasin',        a.magasin_nom || `#${a.magasin_id}`],
              ['Quantité',       `${a.quantite} ${unite}`],
              ['Prix unitaire',  `${Number(a.prix_ref).toLocaleString('fr-FR')} FCFA`],
              ['Mode paiement',  a.mode_paiement || '—'],
              ['Expiration',     a.date_expiration ? new Date(a.date_expiration).toLocaleDateString('fr-FR') : '—'],
              ['Enregistré par', a.utilisateur || '—'],
            ].map(([label, value]) => (
              <div key={label} style={{ background: 'var(--color-surface)', borderRadius: 6, padding: '8px 10px' }}>
                <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', margin: '0 0 3px 0' }}>{label}</p>
                <p style={{ fontWeight: 600, fontSize: 13, margin: 0, color: 'var(--color-text)' }}>{value}</p>
              </div>
            ))}
          </div>

          <div style={{
            display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center',
            background: g ? gradeColors[g] : 'var(--color-surface)',
            borderRadius: 'var(--radius-sm)', padding: '8px 12px',
          }}>
            {g && <span style={{ fontWeight: 800, fontSize: 15, color: gradeTextColors[g] }}>Grade {g}</span>}
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Coef : {a.coef_qualite || '1.00'}</span>
            <span style={{ fontSize: 12, color: 'var(--color-text)' }}>Commission : {a.taux_tax ? (parseFloat(a.taux_tax) * 100).toFixed(1) + '%' : '—'}</span>
          </div>

          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-sm)', padding: '10px 14px' }}>
            {[
              ['Valeur totale', a.valeur_totale, '#333'],
              ['Commission',    a.benefice_estime, '#166534'],
            ].map(([label, val, color]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid #dcfce7' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                <span style={{ fontWeight: 600, color }}>{Number(val || 0).toLocaleString('fr-FR')} FCFA</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: '#166534', paddingTop: 8 }}>
              <span>Net producteur</span>
              <span>{Number(a.montant_verse || 0).toLocaleString('fr-FR')} FCFA</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PAGE PRINCIPALE ───────────────────────────────────────────────────────────
export default function Admissions({ onBack }) {
  const { user, magasinId } = useAuth();
  const { alert, showAlert, hideAlert } = useAlert();
  const queryClient = useQueryClient();
  const { lots } = useLots();

  const [activeLot,  setActiveLot]  = useState(null);
  const [gradeInfo,  setGradeInfo]  = useState({ grade: null, coef: 1.0 });
  const [showForm,   setShowForm]   = useState(false);
  const [dragY,      setDragY]      = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startY,     setStartY]     = useState(0);

  // État initial du formulaire — tout en string pour cohérence avec les selects HTML
  const emptyForm = useCallback(() => ({
    lot_id:        '',
    producteur_id: '',
    quantite:      '',
    unite:         '',
    prix_ref:      '',
    date_expiration: '',
    magasin_id:    user?.role === 'superadmin' ? '' : String(user?.magasin_id || magasinId || ''),
    mode_paiement: 'especes',
    source:        'achat_direct',
  }), [user, magasinId]);

  const [formData, setFormData] = useState(emptyForm);

  // ─── REQUÊTES ──────────────────────────────────────────────────────────────
  const { data: admissions = [] } = useQuery({
    queryKey: ['admissions', magasinId],
    queryFn:  () => api.getAdmissions(magasinId || null),
  });

  const { data: producteurs = [] } = useQuery({
    queryKey: ['producteurs'],
    queryFn:  () => api.getProducteurs(),
  });

  const { data: magasins = [] } = useQuery({
    queryKey: ['magasins'],
    queryFn:  () => api.getMagasins(),
  });

  // ─── MUTATION ──────────────────────────────────────────────────────────────
  const createAdmissionMutation = useMutation({
    mutationFn: (payload) => api.createAdmission(payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['admissions']);
      showAlert('✅ Admission validée avec succès !', 'success');
      setFormData(emptyForm());
      setActiveLot(null);
      setGradeInfo({ grade: null, coef: 1.0 });
      setShowForm(false);
    },
    onError: (err) => showAlert(`❌ Erreur : ${err.message}`, 'error'),
  });

  // ─── DRAG DU SHEET ─────────────────────────────────────────────────────────
  const handleTouchStart = (e) => {
    if (e.touches?.length > 0) { setStartY(e.touches[0].clientY); setIsDragging(true); }
  };
  const handleTouchMove = (e) => {
    if (!isDragging || !e.touches?.length) return;
    const delta = e.touches[0].clientY - startY;
    if (delta > 0) setDragY(delta);
  };
  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragY > 150) setShowForm(false);
    else setDragY(0);
  };

  useEffect(() => {
    if (showForm) document.body.classList.add('sheet-open');
    else { document.body.classList.remove('sheet-open'); setDragY(0); }
    return () => document.body.classList.remove('sheet-open');
  }, [showForm]);

  // ─── HANDLERS ──────────────────────────────────────────────────────────────
  const set = (field) => (e) => setFormData(f => ({ ...f, [field]: e.target.value }));

  const handleLotChange = async (lotId) => {
    setFormData(f => ({ ...f, lot_id: lotId, unite: '', prix_ref: '' }));
    setActiveLot(null);
    if (!lotId) return;

    const cached = lots.find(l => l.id === parseInt(lotId));
    const lot = cached || await api.getLot(lotId).catch(() => null);
    if (!lot) return;

    setActiveLot(lot);
    const unites = Array.isArray(lot.unites_admises)
      ? lot.unites_admises
      : JSON.parse(lot.unites_admises || '[]');
    setFormData(f => ({ ...f, lot_id: lotId, prix_ref: String(lot.prix_ref), unite: unites[0] || '' }));
  };

  const handleGradeChange = useCallback((info) => setGradeInfo(info), []);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!['superadmin', 'admin', 'stock'].includes(user?.role)) {
      showAlert('❌ Droits insuffisants', 'error');
      return;
    }

    const magasinFinal = user?.role === 'superadmin'
      ? parseInt(formData.magasin_id)
      : parseInt(user?.magasin_id || magasinId);

    if (!magasinFinal) {
      showAlert('❌ Veuillez sélectionner un magasin', 'error');
      return;
    }

    const payload = {
      lot_id:          parseInt(formData.lot_id),
      producteur_id:   formData.source === 'achat_direct' ? null : parseInt(formData.producteur_id),
      quantite:        parseFloat(formData.quantite),
      unite:           formData.unite,
      prix_ref:        parseFloat(formData.prix_ref),
      coef_qualite:    gradeInfo.coef ?? 1.0,
      grade_qualite:   gradeInfo.grade || null,
      date_expiration: formData.date_expiration || null,
      magasin_id:      magasinFinal,
      mode_paiement:   formData.source === 'achat_direct' ? 'especes' : formData.mode_paiement,
      utilisateur:     user?.username || 'system',
      source:          formData.source,
    };

    createAdmissionMutation.mutate(payload);
  };

  const unitesDisponibles = activeLot
    ? (Array.isArray(activeLot.unites_admises)
        ? activeLot.unites_admises
        : JSON.parse(activeLot.unites_admises || '[]'))
    : [];

  const colStyle     = { display: 'flex', flexDirection: 'column', gap: 16, background: 'var(--color-surface-alt)', borderRadius: 12, padding: 16 };
  const colHeadStyle = { fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6 };

  // ─── RENDU ─────────────────────────────────────────────────────────────────
  return (
    <PageLayout title="Réception de Lot" icon="📥" onBack={onBack} subtitle="Admission avec audit qualité automatique">
      <BottomSheetStyles />
      <Alert message={alert?.message} type={alert?.type} onClose={hideAlert} />

      {/* Bouton d'ouverture */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header" style={{ border: 'none' }}>
          <h3 className="card-title">📥 Nouvelle admission</h3>
          <button onClick={() => setShowForm(true)} className="btn btn-primary btn-sm">+ Nouveau</button>
        </div>
      </div>

      {/* Overlay */}
      <div className={`sheet-overlay ${showForm ? 'active' : ''}`} onClick={() => setShowForm(false)} />

      {/* Bottom Sheet */}
      <div
        className={`bottom-sheet ${isDragging ? 'dragging' : ''}`}
        style={{ transform: showForm ? `translateY(${dragY}px)` : 'translateY(100%)' }}
      >
        {/* Header draggable */}
        <div className="sheet-header" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
          <div className="sheet-handle" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Nouvelle Réception</h3>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: 20 }}>✕</button>
          </div>
        </div>

        {/* Contenu scrollable */}
        <div className="sheet-content">
          <form id="form-admission-mobile" onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>

              {/* ── Colonne 1 : Source & Destination ── */}
              <div style={colStyle}>
                <p style={colHeadStyle}><span>🏪</span> Source & Destination</p>

                {/* Lot */}
                <div className="form-group">
                  <label className="form-label">Produit / Lot *</label>
                  <select required value={formData.lot_id} onChange={(e) => handleLotChange(e.target.value)} className="form-control">
                    <option value="">-- Sélectionner un lot --</option>
                    {lots.map(l => (
                      <option key={l.id} value={String(l.id)}>{l.description} ({l.prix_ref} FCFA)</option>
                    ))}
                  </select>
                  {activeLot && (
                    <div className="alert alert-info" style={{ marginTop: 8, fontSize: 12 }}>
                      <div><strong>Prix réf. :</strong> {activeLot.prix_ref} FCFA</div>
                      <div><strong>Catégorie :</strong> {activeLot.categorie}</div>
                      <div><strong>Unités :</strong> {unitesDisponibles.join(', ')}</div>
                    </div>
                  )}
                </div>

                {/* Source */}
                <div className="form-group">
                  <label className="form-label">Source *</label>
                  <select value={formData.source} onChange={set('source')} className="form-control">
                    <option value="achat_direct">🛒 Achat direct</option>
                    <option value="producteur">🧑‍🌾 Producteur / Déposant</option>
                  </select>
                </div>

                {/* Producteur — uniquement si source = producteur */}
                {formData.source === 'producteur' && (
                  <div className="form-group">
                    <label className="form-label">Producteur / Déposant *</label>
                    <select required value={formData.producteur_id} onChange={set('producteur_id')} className="form-control">
                      <option value="">-- Sélectionner --</option>
                      {producteurs
                        .filter(p => p.type_producteur !== 'interne')
                        .map(p => (
                          <option key={p.id} value={String(p.id)}>{p.nom_producteur}</option>
                        ))
                      }
                    </select>
                  </div>
                )}

                {/* Magasin — select pour superadmin, affichage fixe sinon */}
                {user?.role === 'superadmin' ? (
                  <div className="form-group">
                    <label className="form-label">Magasin *</label>
                    <select
                      required
                      className="form-control"
                      value={formData.magasin_id}
                      onChange={e => setFormData(f => ({ ...f, magasin_id: e.target.value }))}
                    >
                      <option value="">-- Sélectionner un magasin --</option>
                      {magasins
                        .filter(m => m.id !== 21)
                        .map(m => (
                          <option key={m.id} value={String(m.id)}>{m.nom}</option>
                        ))
                      }
                    </select>
                  </div>
                ) : ['admin', 'stock'].includes(user?.role) ? (
                  <div className="form-group">
                    <label className="form-label">Magasin</label>
                    <p style={{ padding: '10px 14px', background: '#f0f0f0', borderRadius: 8, fontSize: 13, color: '#555' }}>
                      {magasins.find(m => m.id === parseInt(user?.magasin_id || magasinId))?.nom || `Magasin #${user?.magasin_id || magasinId}`}
                    </p>
                  </div>
                ) : (
                  <div className="form-group">
                    <p style={{ padding: '10px 14px', background: 'rgba(244,67,54,0.1)', color: '#d32f2f', borderRadius: 8, fontSize: 13, border: '1px solid #ffcdd2' }}>
                      ⚠️ Vous n'avez pas l'autorisation d'enregistrer des admissions.
                    </p>
                  </div>
                )}
              </div>

              {/* ── Colonne 2 : Mesures & Finance ── */}
              <div style={colStyle}>
                <p style={colHeadStyle}><span>⚖️</span> Mesures & Finance</p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Quantité *</label>
                    <input type="number" required min="0" step="0.01"
                      value={formData.quantite} onChange={set('quantite')} className="form-control" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unité *</label>
                    <select required value={formData.unite} onChange={set('unite')} className="form-control" disabled={!unitesDisponibles.length}>
                      <option value="">--</option>
                      {unitesDisponibles.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Prix unitaire (FCFA) *</label>
                  <input type="number" required min="0" step="0.01"
                    value={formData.prix_ref} onChange={set('prix_ref')} className="form-control" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Expiration</label>
                    <input type="date" value={formData.date_expiration} onChange={set('date_expiration')} className="form-control" />
                  </div>
                  {formData.source !== 'achat_direct' && (
                    <div className="form-group">
                      <label className="form-label">Paiement *</label>
                      <select required value={formData.mode_paiement} onChange={set('mode_paiement')} className="form-control">
                        <option value="solde">Crédit compte (5%)</option>
                        <option value="mobile_money">Mobile Money (7%)</option>
                        <option value="especes">Espèces</option>
                      </select>
                    </div>
                  )}
                </div>

                <FinancePreview
                  quantite={formData.quantite}
                  prixRef={formData.prix_ref}
                  coefQualite={gradeInfo.coef}
                  modePaiement={formData.mode_paiement}
                  dateExpiration={formData.date_expiration}
                  source={formData.source}
                />
              </div>

              {/* ── Colonne 3 : Audit qualité ── */}
              <div style={colStyle}>
                <p style={colHeadStyle}><span>📋</span> Audit Qualité</p>
                <AuditQualite categorie={activeLot?.categorie} onGradeChange={handleGradeChange} />
              </div>

            </div>
          </form>
        </div>

        {/* Bouton de validation fixe en bas */}
        <div className="sheet-footer">
          <button
            type="submit"
            form="form-admission-mobile"
            disabled={createAdmissionMutation.isLoading}
            className="btn btn-primary btn-lg"
            style={{ width: '100%', boxShadow: '0 4px 12px rgba(22,101,52,0.2)' }}
          >
            {createAdmissionMutation.isLoading ? '⏳ Enregistrement...' : "✅ VALIDER L'ADMISSION"}
          </button>
        </div>
      </div>

      {/* ── Historique ── */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Admissions récentes</h3>
          <span className="badge badge-neutral">{admissions.length} total</span>
        </div>
        {admissions.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Aucune admission enregistrée
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 4px 4px' }}>
            {admissions.slice(0, 15).map(a => (
              <AdmissionCard key={a.id} admission={a} />
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
