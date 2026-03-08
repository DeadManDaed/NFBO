// src/pages/Admissions.jsx
// Port complet de admission.js : grille d'audit qualité, sliders, calcul financier temps réel

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAlert } from '../hooks/useAlert';
import { useLots } from '../hooks/useLots';
import api from '../services/api';
import Alert from '../components/Alert';
import PageLayout from '../components/PageLayout';

// ─── Critères d'audit qualité par catégorie ────────────────────────────────────
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

// ─── Grille d'audit qualité ────────────────────────────────────────────────────
function AuditQualite({ categorie, onGradeChange }) {
  const criteres = COOP_CRITERIA[categorie] || [];
  const [notes, setNotes] = useState(criteres.map(() => 10));

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
  }, [categorie]); // eslint-disable-line react-hooks/exhaustive-deps

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
            type="range"
            min="1" max="10"
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

// ─── Aperçu financier ──────────────────────────────────────────────────────────
function FinancePreview({ quantite, prixRef, coefQualite, modePaiement, dateExpiration }) {
  const qty  = parseFloat(quantite)    || 0;
  const prix = parseFloat(prixRef)     || 0;
  const coef = parseFloat(coefQualite) || 1.0;

  if (!qty || !prix) return null;

  const baseMontant = qty * prix * coef;
  let taxeTaux = modePaiement === 'mobile_money' ? 0.07 : 0.05;

  if (dateExpiration) {
    const joursRestants = Math.ceil((new Date(dateExpiration) - new Date()) / 86400000);
    if (joursRestants > 0 && joursRestants < 30) taxeTaux += (30 - joursRestants) * 0.005;
  }

  const montantTaxe   = baseMontant * taxeTaux;
  const netProducteur = baseMontant - montantTaxe;

  const rowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 };

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

// ─── Modal détail admission ────────────────────────────────────────────────────
function ModalDetailAdmission({ admission, magasins, onClose }) {
  if (!admission) return null;

  const exportPDF = () => {
    const w = window.open('', '_blank', 'height=800,width=800');
    w.document.write(`
      <html><head>
        <title>Admission #${admission.id} — NFBO</title>
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
          @media print { body { padding: 20px; } }
        </style>
      </head><body>
        <div class="header">
          <div class="brand">NFBO — Reçu d'Admission</div>
          <div class="meta">
            Admission #${admission.id}<br>
            Imprimé le ${new Date().toLocaleString('fr-FR')}
          </div>
        </div>

        <div class="section">
          <div class="section-title">Informations générales</div>
          <div class="grid">
            <div class="field"><div class="label">Lot</div><div class="value">${admission.lot_description || `Lot #${admission.lot_id}`}</div></div>
            <div class="field"><div class="label">Date de réception</div><div class="value">${new Date(admission.date_reception).toLocaleDateString('fr-FR')}</div></div>
            <div class="field"><div class="label">Producteur</div><div class="value">${admission.nom_producteur || `#${admission.producteur_id}`}</div></div>
            <div class="field"><div class="label">Magasin</div><div class="value">${magasins.find(m => m.id === admission.magasin_id)?.nom || `#${admission.magasin_id}`}</div></div>
            <div class="field"><div class="label">Quantité</div><div class="value">${admission.quantite} ${admission.unite}</div></div>
            <div class="field"><div class="label">Prix unitaire</div><div class="value">${Number(admission.prix_ref).toLocaleString('fr-FR')} FCFA</div></div>
            ${admission.date_expiration ? `<div class="field"><div class="label">Date d'expiration</div><div class="value">${new Date(admission.date_expiration).toLocaleDateString('fr-FR')}</div></div>` : ''}
            <div class="field"><div class="label">Mode de paiement</div><div class="value">${admission.mode_paiement || '—'}</div></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Audit qualité</div>
          <div class="grid">
            <div class="field">
              <div class="label">Grade</div>
              <div class="value"><span class="grade grade-${admission.grade_qualite || 'A'}">${admission.grade_qualite || '—'}</span></div>
            </div>
            <div class="field"><div class="label">Coefficient qualité</div><div class="value">${admission.coef_qualite || '1.00'}</div></div>
            <div class="field"><div class="label">Taux commission</div><div class="value">${admission.taux_tax ? (parseFloat(admission.taux_tax) * 100).toFixed(1) + '%' : '—'}</div></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Récapitulatif financier</div>
          <div class="finance">
            <div class="finance-row"><span>Valeur totale du lot</span><span>${Number(admission.valeur_totale || 0).toLocaleString('fr-FR')} FCFA</span></div>
            <div class="finance-row"><span>Commission coopérative (${admission.taux_tax ? (parseFloat(admission.taux_tax) * 100).toFixed(1) : 5}%)</span><span>${Number(admission.benefice_estime || 0).toLocaleString('fr-FR')} FCFA</span></div>
            <div class="finance-total"><span>Net versé au producteur</span><span>${Number(admission.montant_verse || 0).toLocaleString('fr-FR')} FCFA</span></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Enregistré par</div>
          <div class="field"><div class="value">${admission.utilisateur || '—'}</div></div>
        </div>

        <div class="footer">
          Document officiel NFBO — Ne pas diffuser sans autorisation.<br>
          © ${new Date().getFullYear()} NFBO System
        </div>
      </body></html>
    `);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 500);
  };

  const gradeColors = { A: '#c8e6c9', B: '#fff9c4', C: '#ffe0b2', D: '#ffcdd2' };
  const gradeTextColors = { A: '#1b5e20', B: '#f57f17', C: '#e65100', D: '#b71c1c' };
  const g = admission.grade_qualite;

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 560, width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* En-tête */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0 }}>📥 Admission #{admission.id}</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm">✕</button>
        </div>

        {/* Infos générales */}
        <div style={{ background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 16 }}>
          <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--color-text-muted)', marginBottom: 10 }}>Informations générales</p>
          <div className="grid-2" style={{ gap: 10 }}>
            {[
              ['Lot', admission.lot_description || `Lot #${admission.lot_id}`],
              ['Date', new Date(admission.date_reception).toLocaleDateString('fr-FR')],
              ['Producteur', admission.nom_producteur || `#${admission.producteur_id}`],
              ['Magasin', magasins.find(m => m.id === admission.magasin_id)?.nom || `#${admission.magasin_id}`],
              ['Quantité', `${admission.quantite} ${admission.unite}`],
              ['Prix unitaire', `${Number(admission.prix_ref).toLocaleString('fr-FR')} FCFA`],
              ['Mode paiement', admission.mode_paiement || '—'],
              ['Expiration', admission.date_expiration ? new Date(admission.date_expiration).toLocaleDateString('fr-FR') : '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-muted text-xs" style={{ marginBottom: 2 }}>{label}</p>
                <p style={{ fontWeight: 600, fontSize: 13 }}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Audit qualité */}
        <div style={{ background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 16 }}>
          <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--color-text-muted)', marginBottom: 10 }}>Audit qualité</p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            {g && (
              <span style={{ padding: '6px 16px', borderRadius: 20, fontWeight: 700, fontSize: 15, background: gradeColors[g], color: gradeTextColors[g] }}>
                Grade {g}
              </span>
            )}
            <span className="text-muted text-sm">Coef : {admission.coef_qualite || '1.00'}</span>
            <span className="text-muted text-sm">Commission : {admission.taux_tax ? (parseFloat(admission.taux_tax) * 100).toFixed(1) + '%' : '—'}</span>
          </div>
        </div>

        {/* Récapitulatif financier */}
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 20 }}>
          <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#166534', marginBottom: 10 }}>Récapitulatif financier</p>
          {[
            ['Valeur totale du lot', admission.valeur_totale, '#333'],
            [`Commission (${admission.taux_tax ? (parseFloat(admission.taux_tax) * 100).toFixed(1) : 5}%)`, admission.benefice_estime, '#166534'],
          ].map(([label, val, color]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderBottom: '1px solid #dcfce7' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
              <span style={{ fontWeight: 600, color }}>{Number(val || 0).toLocaleString('fr-FR')} FCFA</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, color: '#166534', paddingTop: 10 }}>
            <span>Net versé au producteur</span>
            <span>{Number(admission.montant_verse || 0).toLocaleString('fr-FR')} FCFA</span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={exportPDF} className="btn btn-primary">📄 Exporter PDF</button>
          <button onClick={onClose} className="btn btn-ghost">Fermer</button>
        </div>
      </div>
    </div>
  );
}
// ─── Page principale ────────────────────────────────────────────────────────────
export default function Admissions({ onBack }) {
  const { user, magasinId } = useAuth();
  const { alert, showAlert, hideAlert } = useAlert();
  const { lots } = useLots();

  const [admissions,  setAdmissions]  = useState([]);
  const [producteurs, setProducteurs] = useState([]);
  const [magasins,    setMagasins]    = useState([]);
  const [activeLot,   setActiveLot]   = useState(null);
  const [gradeInfo,   setGradeInfo]   = useState({ grade: null, coef: 1.0 });
  const [submitting,  setSubmitting]  = useState(false);
const [selectedAdmission, setSelectedAdmission] = useState(null);

  const [formData, setFormData] = useState({
    lot_id: '', producteur_id: '', quantite: '', unite: '',
    prix_ref: '', date_expiration: '',
    magasin_id: magasinId || '', mode_paiement: 'solde',
  });

  const unitesDisponibles = activeLot
    ? (Array.isArray(activeLot.unites_admises)
        ? activeLot.unites_admises
        : JSON.parse(activeLot.unites_admises || '[]'))
    : [];

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [admData, prodData, magData] = await Promise.all([
        api.getAdmissions().catch(() => []),
        api.getProducteurs().catch(() => []),
        api.getMagasins().catch(() => []),
      ]);
      setAdmissions(admData);
      setProducteurs(prodData);
      setMagasins(magData);
    } catch (err) {
      console.error('Erreur chargement données:', err);
    }
  };

  const handleLotChange = async (lotId) => {
    setFormData(f => ({ ...f, lot_id: lotId, unite: '', prix_ref: '' }));
    setActiveLot(null);
    if (!lotId) return;

    const cached = lots.find(l => l.id === parseInt(lotId));
    if (cached) {
      setActiveLot(cached);
      const unites = Array.isArray(cached.unites_admises) ? cached.unites_admises : JSON.parse(cached.unites_admises || '[]');
      setFormData(f => ({ ...f, lot_id: lotId, prix_ref: cached.prix_ref, unite: unites[0] || '' }));
    } else {
      try {
        const lot = await api.getLot(lotId);
        setActiveLot(lot);
        const unites = Array.isArray(lot.unites_admises) ? lot.unites_admises : JSON.parse(lot.unites_admises || '[]');
        setFormData(f => ({ ...f, lot_id: lotId, prix_ref: lot.prix_ref, unite: unites[0] || '' }));
      } catch (err) {
        console.error('Erreur chargement lot:', err);
      }
    }
  };

  const handleGradeChange = useCallback((info) => setGradeInfo(info), []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      lot_id:          parseInt(formData.lot_id),
      producteur_id:   parseInt(formData.producteur_id),
      quantite:        parseFloat(formData.quantite),
      unite:           formData.unite,
      prix_ref:        parseFloat(formData.prix_ref),
      coef_qualite:    gradeInfo.coef ?? 1.0,
      grade_qualite:   gradeInfo.grade || null,
      date_expiration: formData.date_expiration || null,
      magasin_id:      parseInt(formData.magasin_id),
      mode_paiement:   formData.mode_paiement || null,
      utilisateur:     user?.username || 'system',
    };

    try {
      await api.createAdmission(payload);
      showAlert('✅ Admission validée avec succès !', 'success');
      setFormData({
        lot_id: '', producteur_id: '', quantite: '', unite: '',
        prix_ref: '', date_expiration: '',
        magasin_id: magasinId || '', mode_paiement: 'solde',
      });
      setActiveLot(null);
      setGradeInfo({ grade: null, coef: 1.0 });
      loadData();
    } catch (err) {
      showAlert(`❌ Erreur : ${err.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const set = (field) => (e) => setFormData(f => ({ ...f, [field]: e.target.value }));

  // Classes Tailwind conservées pour compatibilité avec votre setup existant
  const inputClass = 'form-control';
  const labelClass = 'form-label';

  const colStyle = {
    display: 'flex', flexDirection: 'column', gap: 16,
    background: 'var(--color-surface-alt)', borderRadius: 12, padding: 16,
  };

  const colHeadStyle = {
    fontWeight: 700, fontSize: 11, textTransform: 'uppercase',
    letterSpacing: '.06em', color: 'var(--color-text-muted)',
    display: 'flex', alignItems: 'center', gap: 6,
  };

  const gradeColors = {
    A: 'badge-success', B: 'badge-warning',
    C: 'badge-warning', D: 'badge-danger',
  };

  return (
    <PageLayout
      title="Réception de Lot"
      icon="📥" onBack={onBack}
      subtitle="Admission avec audit qualité automatique"
    >
      <Alert message={alert?.message} type={alert?.type} onClose={hideAlert} />

      {/* ── Formulaire ── */}
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>

            {/* Colonne 1 : Source & Destination */}
            <div style={colStyle}>
              <p style={colHeadStyle}><span>🏪</span> Source & Destination</p>

              <div className="form-group">
                <label className={labelClass}>Produit / Lot *</label>
                <select required value={formData.lot_id} onChange={(e) => handleLotChange(e.target.value)} className={inputClass}>
                  <option value="">-- Sélectionner un lot --</option>
                  {lots.map(l => (
                    <option key={l.id} value={l.id}>{l.description} ({l.prix_ref} FCFA)</option>
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

              <div className="form-group">
                <label className={labelClass}>Producteur / Déposant *</label>
                <select required value={formData.producteur_id} onChange={set('producteur_id')} className={inputClass}>
                  <option value="">-- Sélectionner --</option>
                  {producteurs.map(p => (
                    <option key={p.id} value={p.id}>{p.nom_producteur}</option>
                  ))}
                </select>
              </div>

              {user?.role === 'superadmin' ? (
                <div className="form-group">
                  <label className={labelClass}>Magasin de stockage *</label>
                  <select required value={formData.magasin_id} onChange={set('magasin_id')} className={inputClass}>
                    <option value="">-- Sélectionner --</option>
                    {magasins.map(m => (
                      <option key={m.id} value={m.id}>{m.nom} ({m.code})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="form-group">
                  <label className={labelClass}>Magasin</label>
                  <p style={{ padding: '10px 14px', background: '#f0f0f0', borderRadius: 8, fontSize: 13, color: '#555' }}>
                    {magasins.find(m => m.id === parseInt(magasinId))?.nom || `Magasin #${magasinId}`}
                  </p>
                </div>
              )}
            </div>

            {/* Colonne 2 : Mesures & Finance */}
            <div style={colStyle}>
              <p style={colHeadStyle}><span>⚖️</span> Mesures & Finance</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className={labelClass}>Quantité *</label>
                  <input type="number" required min="0" step="0.01"
                    value={formData.quantite} onChange={set('quantite')} className={inputClass} />
                </div>
                <div className="form-group">
                  <label className={labelClass}>Unité *</label>
                  <select required value={formData.unite} onChange={set('unite')} className={inputClass} disabled={!unitesDisponibles.length}>
                    <option value="">--</option>
                    {unitesDisponibles.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className={labelClass}>Prix unitaire (FCFA) *</label>
                <input type="number" required min="0" step="0.01"
                  value={formData.prix_ref} onChange={set('prix_ref')} className={inputClass} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className={labelClass}>Expiration</label>
                  <input type="date" value={formData.date_expiration} onChange={set('date_expiration')} className={inputClass} />
                </div>
                <div className="form-group">
                  <label className={labelClass}>Paiement *</label>
                  <select required value={formData.mode_paiement} onChange={set('mode_paiement')} className={inputClass}>
                    <option value="solde">Crédit compte (5%)</option>
                    <option value="mobile_money">Mobile Money (7%)</option>
                    <option value="especes">Espèces</option>
                  </select>
                </div>
              </div>

              <FinancePreview
                quantite={formData.quantite}
                prixRef={formData.prix_ref}
                coefQualite={gradeInfo.coef}
                modePaiement={formData.mode_paiement}
                dateExpiration={formData.date_expiration}
              />
            </div>

            {/* Colonne 3 : Audit qualité */}
            <div style={colStyle}>
              <p style={colHeadStyle}><span>📋</span> Audit Qualité</p>
              <div style={{ maxHeight: 380, overflowY: 'auto', paddingRight: 4 }}>
                <AuditQualite
                  categorie={activeLot?.categorie}
                  onGradeChange={handleGradeChange}
                />
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary btn-lg"
            >
              {submitting ? '⏳ Enregistrement...' : "✅ VALIDER L'ADMISSION"}
            </button>
          </div>
        </form>
      </div>

      {/* ── Historique ── */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Admissions récentes</h3>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                {['Date', 'Lot', 'Producteur', 'Quantité', 'Prix', 'Grade', 'Paiement', ''].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {admissions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#aaa' }}>
                    Aucune admission enregistrée
                  </td>
                </tr>
              ) : admissions.slice(0, 15).map(a => (
                <tr key={a.id}>
                  <td>{new Date(a.date_reception).toLocaleDateString('fr-FR')}</td>
                  <td style={{ fontWeight: 600 }}>{a.lot_description || `Lot #${a.lot_id}`}</td>
                  <td>{a.nom_producteur || `Prod. #${a.producteur_id}`}</td>
                  <td>{a.quantite} {a.unite}</td>
                  <td>{Number(a.prix_ref).toLocaleString()} FCFA</td>
                  <td>
                    {a.grade_qualite
                      ? <span className={`badge ${gradeColors[a.grade_qualite] || 'badge-neutral'}`}>{a.grade_qualite}</span>
                      : a.coef_qualite
                        ? <span className="text-muted text-sm">coef {a.coef_qualite}</span>
                        : '—'
                    }
                  </td>
                  <td className="text-muted">{a.mode_paiement || '—'}</td>
<td>
  <button onClick={() => setSelectedAdmission(a)} className="btn btn-ghost btn-sm">
    🔍
  </button>
</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
{selectedAdmission && (
  <ModalDetailAdmission
    admission={selectedAdmission}
    magasins={magasins}
    onClose={() => setSelectedAdmission(null)}
  />
)}
    </PageLayout>
  );
}
