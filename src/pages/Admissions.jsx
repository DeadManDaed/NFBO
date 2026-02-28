// src/pages/Admissions.jsx
// Port complet de admission.js : grille d'audit qualité, sliders, calcul financier temps réel

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAlert } from '../hooks/useAlert';
import { useLots } from '../hooks/useLots';
import api from '../services/api';
import Alert from '../components/Alert';

import PageLayout, { StateLoading, StateEmpty } from '../components/PageLayout';

export default function Admissions() {
  return (
    <PageLayout
      title="Réception de Lot"
      icon="📥"
      subtitle="Admission avec audit qualité"
      actions={<button className="btn btn-primary">+ Nouvelle admission</button>}
    >
// ─── Critères d'audit qualité par catégorie (portés depuis window.COOP_CRITERIA) ───
const COOP_CRITERIA = {
  frais: ['Aspect visuel (couleur/forme)', 'Absence de moisissures', 'Odeur', 'Fermeté / Texture', 'Présence de parasites'],
  court: ['Aspect visuel', 'Odeur', 'Conditionnement', 'Humidité', 'Conformité étiquetage'],
  secs: ['Humidité résiduelle', 'Absence d\'impuretés', 'Granulométrie', 'Couleur homogène', 'Absence de parasites', 'Taux de brisures'],
  manufactures_alim: ['Intégrité emballage', 'Date de péremption', 'Conformité poids', 'Aspect général', 'Traçabilité lot'],
  manufactures_non_alim: ['Intégrité emballage', 'Conformité référence', 'Absence de défauts', 'Fonctionnalité', 'Étiquetage'],
  sensibles: ['Température de stockage', 'Intégrité conditionnement', 'Date validité', 'Conformité réglementaire', 'Traçabilité'],
};

const GRADE_CONFIG = {
  A: { min: 9, coef: 1.0, color: '#c8e6c9', textColor: '#1b5e20', label: 'Excellente' },
  B: { min: 7.5, coef: 0.9, color: '#fff9c4', textColor: '#f57f17', label: 'Bonne' },
  C: { min: 6, coef: 0.8, color: '#ffe0b2', textColor: '#e65100', label: 'Moyenne' },
  D: { min: 0, coef: 0.7, color: '#ffcdd2', textColor: '#b71c1c', label: 'Faible' },
};

function getGrade(moyenne) {
  if (moyenne >= 9) return 'A';
  if (moyenne >= 7.5) return 'B';
  if (moyenne >= 6) return 'C';
  return 'D';
}

// ─── Composant : Grille d'audit qualité ────────────────────────────────────────
function AuditQualite({ categorie, onGradeChange }) {
  const criteres = COOP_CRITERIA[categorie] || [];
  const [notes, setNotes] = useState(criteres.map(() => 10));

  // Reset quand la catégorie change
  useEffect(() => {
    const newNotes = (COOP_CRITERIA[categorie] || []).map(() => 10);
    setNotes(newNotes);
    notifyParent(newNotes);
  }, [categorie]);

  const notifyParent = useCallback((currentNotes) => {
    if (!currentNotes.length) { onGradeChange({ grade: null, coef: 1.0 }); return; }
    const moyenne = currentNotes.reduce((a, b) => a + b, 0) / currentNotes.length;
    const grade = getGrade(moyenne);
    onGradeChange({ grade, coef: GRADE_CONFIG[grade].coef, moyenne });
  }, [onGradeChange]);

  const handleSlider = (index, value) => {
    const updated = [...notes];
    updated[index] = Number(value);
    setNotes(updated);
    notifyParent(updated);
  };

  if (!categorie) {
    return (
      <div className="text-center py-8 text-gray-400">
        <div className="text-4xl mb-2">🔍</div>
        <p className="text-sm">Sélectionnez un lot pour afficher les critères d'audit</p>
      </div>
    );
  }

  if (!criteres.length) {
    return (
      <div className="border border-dashed border-orange-300 bg-orange-50 rounded-lg p-4 text-orange-700 text-sm text-center">
        ⚠️ Aucun protocole d'examen pour la catégorie : <strong>{categorie}</strong>
      </div>
    );
  }

  const moyenne = notes.reduce((a, b) => a + b, 0) / notes.length;
  const grade = getGrade(moyenne);
  const gradeInfo = GRADE_CONFIG[grade];

  return (
    <div className="space-y-3">
      {criteres.map((critere, i) => (
        <div key={i} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-gray-700">{critere}</span>
            <span className="font-bold text-green-700 text-sm w-6 text-right">{notes[i]}</span>
          </div>
          <input
            type="range"
            min="1" max="10"
            value={notes[i]}
            onChange={(e) => handleSlider(i, e.target.value)}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
            style={{ accentColor: '#2e7d32' }}
          />
        </div>
      ))}

      {/* Badge grade */}
      <div
        className="mt-4 p-4 rounded-lg text-center font-bold border"
        style={{ background: gradeInfo.color, borderColor: gradeInfo.color, color: gradeInfo.textColor }}
      >
        GRADE : <span className="text-xl">{grade}</span> — {gradeInfo.label}
        <div className="text-sm font-normal mt-1">
          Moyenne : {moyenne.toFixed(1)}/10 · Coefficient : {gradeInfo.coef.toFixed(1)}
        </div>
      </div>
    </div>
  );
}

// ─── Composant : Aperçu financier ──────────────────────────────────────────────
function FinancePreview({ quantite, prixRef, coefQualite, modePaiement, dateExpiration }) {
  const qty = parseFloat(quantite) || 0;
  const prix = parseFloat(prixRef) || 0;
  const coef = parseFloat(coefQualite) || 1.0;

  const baseMontant = qty * prix * coef;

  let taxeTaux = modePaiement === 'mobile_money' ? 0.07 : 0.05;
  if (dateExpiration) {
    const joursRestants = Math.ceil((new Date(dateExpiration) - new Date()) / (1000 * 60 * 60 * 24));
    if (joursRestants > 0 && joursRestants < 30) {
      taxeTaux += (30 - joursRestants) * 0.005;
    }
  }

  const montantTaxe = baseMontant * taxeTaux;
  const netProducteur = baseMontant - montantTaxe;

  if (!qty || !prix) return null;

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">Base (qty × prix × coef) :</span>
        <span className="font-medium">{Math.round(baseMontant).toLocaleString()} FCFA</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">Commission coopérative ({(taxeTaux * 100).toFixed(1)}%) :</span>
        <span className="font-medium text-green-700">+{Math.round(montantTaxe).toLocaleString()} FCFA</span>
      </div>
      <div className="border-t border-green-200 pt-2 flex justify-between font-bold">
        <span>Dû au producteur :</span>
        <span className="text-green-800">{Math.round(netProducteur).toLocaleString()} FCFA</span>
      </div>
    </div>
  );
}

// ─── Page principale ────────────────────────────────────────────────────────────
export default function Admissions() {
  const { user, magasinId } = useAuth();
  const { alert, showAlert, hideAlert } = useAlert();
  const { lots } = useLots();

  const [admissions, setAdmissions] = useState([]);
  const [producteurs, setProducteurs] = useState([]);
  const [magasins, setMagasins] = useState([]);
  const [activeLot, setActiveLot] = useState(null);
  const [gradeInfo, setGradeInfo] = useState({ grade: null, coef: 1.0 });
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    lot_id: '',
    producteur_id: '',
    quantite: '',
    unite: '',
    prix_ref: '',
    date_expiration: '',
    magasin_id: magasinId || '',
    mode_paiement: 'solde',
  });

  const unitesDisponibles = activeLot
    ? (Array.isArray(activeLot.unites_admises) ? activeLot.unites_admises : JSON.parse(activeLot.unites_admises || '[]'))
    : [];

  useEffect(() => {
    loadData();
  }, []);

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

    // Chercher d'abord dans le cache local
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

  const handleGradeChange = useCallback((info) => {
    setGradeInfo(info);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      lot_id: parseInt(formData.lot_id),
      producteur_id: parseInt(formData.producteur_id),
      quantite: parseFloat(formData.quantite),
      unite: formData.unite,
      prix_ref: parseFloat(formData.prix_ref),
      coef_qualite: gradeInfo.coef ?? 1.0,
      grade_qualite: gradeInfo.grade || null,
      date_expiration: formData.date_expiration || null,
      magasin_id: parseInt(formData.magasin_id),
      mode_paiement: formData.mode_paiement || null,
      utilisateur: user?.username || 'system',
    };

    try {
      await api.createAdmission(payload);
      showAlert('✅ Admission validée avec succès !', 'success');
      setFormData({ lot_id: '', producteur_id: '', quantite: '', unite: '', prix_ref: '', date_expiration: '', magasin_id: magasinId || '', mode_paiement: 'solde' });
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

  const inputClass = "w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm";
  const labelClass = "block font-semibold text-gray-700 mb-1 text-sm";

  return (
    <div className="space-y-6">
      <Alert message={alert?.message} type={alert?.type} onClose={hideAlert} />

      {/* ── Formulaire ── */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center gap-3 border-b-2 border-green-700 pb-4 mb-6">
          <span className="text-3xl">📥</span>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Réception de Lot</h2>
            <p className="text-gray-500 text-sm">Admission avec audit qualité automatique</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Colonne 1 : Source & destination */}
            <div className="space-y-4 bg-gray-50 rounded-xl p-4">
              <h3 className="font-bold text-gray-600 text-sm uppercase tracking-wide flex items-center gap-2">
                <span>🏪</span> Source & Destination
              </h3>

              <div>
                <label className={labelClass}>Produit / Lot *</label>
                <select required value={formData.lot_id} onChange={(e) => handleLotChange(e.target.value)} className={inputClass}>
                  <option value="">-- Sélectionner un lot --</option>
                  {lots.map(l => (
                    <option key={l.id} value={l.id}>{l.description} ({l.prix_ref} FCFA)</option>
                  ))}
                </select>

                {activeLot && (
                  <div className="mt-2 p-3 bg-blue-50 border-l-4 border-blue-500 rounded text-xs space-y-1">
                    <div><strong>Prix réf. :</strong> {activeLot.prix_ref} FCFA</div>
                    <div><strong>Catégorie :</strong> {activeLot.categorie}</div>
                    <div><strong>Unités :</strong> {unitesDisponibles.join(', ')}</div>
                  </div>
                )}
              </div>

              <div>
                <label className={labelClass}>Producteur / Déposant *</label>
                <select required value={formData.producteur_id} onChange={set('producteur_id')} className={inputClass}>
                  <option value="">-- Sélectionner --</option>
                  {producteurs.map(p => (
                    <option key={p.id} value={p.id}>{p.nom_producteur}</option>
                  ))}
                </select>
              </div>

              {user?.role === 'superadmin' ? (
                <div>
                  <label className={labelClass}>Magasin de stockage *</label>
                  <select required value={formData.magasin_id} onChange={set('magasin_id')} className={inputClass}>
                    <option value="">-- Sélectionner --</option>
                    {magasins.map(m => (
                      <option key={m.id} value={m.id}>{m.nom} ({m.code})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className={labelClass}>Magasin</label>
                  <p className="p-3 bg-gray-100 rounded-lg text-sm text-gray-600">
                    {magasins.find(m => m.id === parseInt(magasinId))?.nom || `Magasin #${magasinId}`}
                  </p>
                </div>
              )}
            </div>

            {/* Colonne 2 : Mesures & Finance */}
            <div className="space-y-4 bg-gray-50 rounded-xl p-4">
              <h3 className="font-bold text-gray-600 text-sm uppercase tracking-wide flex items-center gap-2">
                <span>⚖️</span> Mesures & Finance
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Quantité *</label>
                  <input type="number" required min="0" step="0.01"
                    value={formData.quantite} onChange={set('quantite')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Unité *</label>
                  <select required value={formData.unite} onChange={set('unite')} className={inputClass} disabled={!unitesDisponibles.length}>
                    <option value="">--</option>
                    {unitesDisponibles.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Prix unitaire (FCFA) *</label>
                <input type="number" required min="0" step="0.01"
                  value={formData.prix_ref} onChange={set('prix_ref')} className={inputClass} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Expiration</label>
                  <input type="date" value={formData.date_expiration} onChange={set('date_expiration')} className={inputClass} />
                </div>
                <div>
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
            <div className="space-y-4 bg-gray-50 rounded-xl p-4">
              <h3 className="font-bold text-gray-600 text-sm uppercase tracking-wide flex items-center gap-2">
                <span>📋</span> Audit Qualité
              </h3>
              <div className="max-h-96 overflow-y-auto pr-1">
                <AuditQualite
                  categorie={activeLot?.categorie}
                  onGradeChange={handleGradeChange}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-10 py-3 bg-green-700 hover:bg-green-800 text-white font-bold rounded-lg shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? '⏳ Enregistrement...' : '✅ VALIDER L\'ADMISSION'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Historique ── */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Admissions récentes</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                {['Date', 'Lot', 'Producteur', 'Quantité', 'Prix', 'Grade', 'Mode paiement'].map(h => (
                  <th key={h} className="p-3 text-left font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {admissions.slice(0, 15).map(a => {
                const gradeColors = { A: 'bg-green-100 text-green-800', B: 'bg-yellow-100 text-yellow-800', C: 'bg-orange-100 text-orange-800', D: 'bg-red-100 text-red-800' };
                return (
                  <tr key={a.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-gray-600">{new Date(a.date_reception).toLocaleDateString('fr-FR')}</td>
                    <td className="p-3 font-medium">{a.lot_description || `Lot #${a.lot_id}`}</td>
                    <td className="p-3">{a.nom_producteur || `Prod. #${a.producteur_id}`}</td>
                    <td className="p-3">{a.quantite} {a.unite}</td>
                    <td className="p-3">{Number(a.prix_ref).toLocaleString()} FCFA</td>
                    <td className="p-3">
                      {a.grade_qualite ? (
                        <span className={`px-2 py-1 rounded text-xs font-bold ${gradeColors[a.grade_qualite] || 'bg-gray-100'}`}>
                          {a.grade_qualite}
                        </span>
                      ) : a.coef_qualite ? (
                        <span className="text-gray-500">coef {a.coef_qualite}</span>
                      ) : '—'}
                    </td>
                    <td className="p-3 text-gray-600">{a.mode_paiement || '—'}</td>
                  </tr>
                );
              })}
              {admissions.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-gray-400">Aucune admission enregistrée</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
</PageLayout>
  );
}