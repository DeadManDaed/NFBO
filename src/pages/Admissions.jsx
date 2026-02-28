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

// ─── Page principale ────────────────────────────────────────────────────────────
export default function Admissions() {
  const { user, magasinId } = useAuth();
  const { alert, showAlert, hideAlert } = useAlert();
  const { lots } = useLots();

  const [admissions,  setAdmissions]  = useState([]);
  const [producteurs, setProducteurs] = useState([]);
  const [magasins,    setMagasins]    = useState([]);
  const [activeLot,   setActiveLot]   = useState(null);
  const [gradeInfo,   setGradeInfo]   = useState({ grade: null, coef: 1.0 });
  const [submitting,  setSubmitting]  = useState(false);

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
      icon="📥"
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
                {['Date', 'Lot', 'Producteur', 'Quantité', 'Prix', 'Grade', 'Paiement'].map(h => (
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageLayout>
  );
}
