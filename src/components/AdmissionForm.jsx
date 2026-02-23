//src/components/AdmissionForm.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { Package, User, Store, Calculator, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

// Critères d'audit NFBO (On peut les sortir dans un fichier constants.js plus tard)
const AUDIT_CRITERIA = [
  { id: 'humidite', label: 'Taux d\'humidité', weight: 0.4 },
  { id: 'purete', label: 'Pureté / Déchets', weight: 0.3 },
  { id: 'grain', label: 'Calibrage du grain', weight: 0.3 },
];

const AdmissionForm = () => {
  // États pour les référentiels
  const [lots, setLots] = useState([]);
  const [producers, setProducers] = useState([]);
  const [stores, setStores] = useState([]);

  // État du formulaire
  const [formData, setFormData] = useState({
    lot_id: '',
    producteur_id: '',
    magasin_id: '',
    quantite: '',
    unite: 'kg',
    mode_paiement: 'mobile_money',
  });

  // État de l'audit qualité (sliders de 0 à 100, transformés en coef 0.0 à 1.0)
  const [auditNotes, setAuditNotes] = useState({
    humidite: 100,
    purete: 100,
    grain: 100,
  });

  const [loading, setLoading] = useState(false);

  // 1. Chargement des données au montage
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resLots, resProds, resStores] = await Promise.all([
          api.get('/lots'),
          api.get('/producteurs'),
          api.get('/magasins')
        ]);
        setLots(resLots.data);
        setProducers(resProds.data);
        setStores(resStores.data);
      } catch (err) {
        console.error("Erreur de chargement des référentiels", err);
      }
    };
    fetchData();
  }, []);

  // 2. Calculs en temps réel (Memoïsés pour la performance)
  const selectedLot = useMemo(() => lots.find(l => l.id == formData.lot_id), [formData.lot_id, lots]);

  const qualityCoef = useMemo(() => {
    const score = AUDIT_CRITERIA.reduce((acc, crit) => {
      return acc + (auditNotes[crit.id] * crit.weight);
    }, 0);
    return (score / 100).toFixed(2);
  }, [auditNotes]);

  const financialSummary = useMemo(() => {
    const qty = parseFloat(formData.quantite) || 0;
    const price = parseFloat(selectedLot?.prix_ref) || 0;
    const taxRate = 0.07; // 7% de taxe coopérative par défaut

    const brute = qty * price * qualityCoef;
    const taxAmount = brute * taxRate;
    const net = brute - taxAmount;

    return { brute, taxAmount, net };
  }, [formData.quantite, selectedLot, qualityCoef]);

  // 3. Handlers
  const handleSliderChange = (id, val) => {
    setAuditNotes(prev => ({ ...prev, [id]: parseInt(val) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      ...formData,
      coef_qualite: qualityCoef,
      prix_ref: selectedLot?.prix_ref,
      utilisateur: JSON.parse(sessionStorage.getItem('user'))?.username,
      notes_audit: Object.values(auditNotes).join('|')
    };

    try {
      await api.post('/admissions', payload);
      alert("✅ Admission enregistrée avec succès !");
      // Reset ou redirection ici
    } catch (err) {
      alert("❌ Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-6 pb-10">
      {/* SECTION 1 : INFOS DE BASE */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <Package size={14} /> Origine & Destination
        </h3>

        <select 
          required
          className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500"
          value={formData.lot_id}
          onChange={e => setFormData({...formData, lot_id: e.target.value})}
        >
          <option value="">Sélectionner le Lot / Produit</option>
          {lots.map(l => <option key={l.id} value={l.id}>{l.description} ({l.prix_ref} FCFA)</option>)}
        </select>

        <select 
          required
          className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500"
          value={formData.producteur_id}
          onChange={e => setFormData({...formData, producteur_id: e.target.value})}
        >
          <option value="">Producteur (Membre NFBO)</option>
          {producers.map(p => <option key={p.id} value={p.id}>{p.nom_producteur}</option>)}
        </select>

        <div className="flex gap-2">
          <input 
            type="number" 
            placeholder="Quantité"
            className="flex-1 p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500"
            value={formData.quantite}
            onChange={e => setFormData({...formData, quantite: e.target.value})}
            required
          />
          <select className="bg-gray-100 rounded-xl px-4 border-none" value={formData.unite}>
            <option value="kg">kg</option>
            <option value="sac">sac</option>
          </select>
        </div>
      </div>

      {/* SECTION 2 : AUDIT QUALITÉ (SLIDERS) */}
      <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-blue-700 text-xs font-bold uppercase tracking-wider">Audit Qualité</h3>
          <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">
            Coef: {qualityCoef}
          </span>
        </div>

        {AUDIT_CRITERIA.map(crit => (
          <div key={crit.id} className="space-y-1">
            <div className="flex justify-between text-xs font-medium text-blue-900">
              <span>{crit.label}</span>
              <span>{auditNotes[crit.id]}%</span>
            </div>
            <input 
              type="range"
              className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              value={auditNotes[crit.id]}
              onChange={e => handleSliderChange(crit.id, e.target.value)}
            />
          </div>
        ))}
      </div>

      {/* SECTION 3 : RÉCAPITULATIF FINANCIER */}
      <div className="bg-gray-900 text-white p-5 rounded-2xl shadow-xl space-y-3">
        <div className="flex justify-between text-gray-400 text-sm">
          <span>Montant Brut</span>
          <span>{financialSummary.brute.toLocaleString()} FCFA</span>
        </div>
        <div className="flex justify-between text-red-400 text-sm">
          <span>Taxe Coopérative (7%)</span>
          <span>-{financialSummary.taxAmount.toLocaleString()} FCFA</span>
        </div>
        <div className="pt-2 border-t border-gray-700 flex justify-between items-center">
          <span className="font-bold text-lg">Net à payer</span>
          <span className="text-2xl font-black text-green-400">
            {Math.round(financialSummary.net).toLocaleString()} <small className="text-xs">FCFA</small>
          </span>
        </div>
      </div>

      {/* BOUTON DE VALIDATION STYLE APK */}
      <button 
        type="submit"
        disabled={loading}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-transform disabled:opacity-50"
      >
        <CheckCircle2 />
        {loading ? "Traitement..." : "Valider l'Admission"}
      </button>
    </form>
  );
};

export default AdmissionForm;