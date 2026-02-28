// src/pages/DefinitionLots.jsx
import { useState } from 'react';
import { useLots } from '../hooks/useLots';
import { useAlert } from '../hooks/useAlert';
import Alert from '../components/Alert';
import PageLayout from '../components/PageLayout';

const DEFAULT_CRITERIA = {
  frais:    ["Fraîcheur", "Calibre minimum", "Absence de pesticides", "Présentation propre"],
  court:    ["Date récente", "Durée ≤ 7 jours", "Chaîne de froid", "Emballage adapté"],
  secs:     ["Humidité ≤ 12%", "Absence de moisissures", "Uniformité du tri", "Odeur normale"],
  manualim: ["Conformité hygiène", "Date fabrication & péremption", "Emballage conforme", "Certification interne"],
  nonalim:  ["Finition correcte", "Solidité", "Esthétique", "Traçabilité"],
  sensible: ["Stockage contrôlé", "Traçabilité stricte", "Emballage sécurisé", "Autorisation réglementaire"],
};

export default function DefinitionLots() {
  const { lots, createLot } = useLots();
  const { alert, showAlert, hideAlert } = useAlert();

  const [formData, setFormData] = useState({
    categorie:      '',
    description:    '',
    prix_ref:       '',
    unites_admises: [],
  });
  const [criteria, setCriteria] = useState([]);

  const handleCategoryChange = (e) => {
    const cat = e.target.value;
    setFormData(f => ({ ...f, categorie: cat }));
    setCriteria(DEFAULT_CRITERIA[cat] || []);
  };

  const handleUnitChange = (e) => {
    const options = Array.from(e.target.selectedOptions, o => o.value);
    setFormData(f => ({ ...f, unites_admises: options }));
  };

  const addCriteria = () => {
    const c = prompt("Entrez un nouveau critère d'admission :");
    if (c?.trim()) setCriteria(prev => [...prev, c.trim()]);
  };

  const removeCritere = (idx) => setCriteria(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createLot({
        ...formData,
        prix_ref:           parseFloat(formData.prix_ref),
        criteres_admission: criteria,
        stock_disponible:   0,
      });
      showAlert('Lot créé avec succès ✅', 'success');
      setFormData({ categorie: '', description: '', prix_ref: '', unites_admises: [] });
      setCriteria([]);
    } catch {
      showAlert('Erreur lors de la création du lot ❌', 'error');
    }
  };

  const set = (field) => (e) => setFormData(f => ({ ...f, [field]: e.target.value }));

  return (
    <PageLayout title="Définition des lots" icon="🏷️" subtitle="Créer et gérer le référentiel produits">
      <Alert message={alert?.message} type={alert?.type} onClose={hideAlert} />

      {/* ── Formulaire ── */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Nouveau lot</h3>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Catégorie *</label>
              <select className="form-control" required value={formData.categorie} onChange={handleCategoryChange}>
                <option value="">Sélectionner</option>
                <option value="frais">Produits frais</option>
                <option value="court">Cycle court</option>
                <option value="secs">Produits secs</option>
                <option value="manualim">Manufacturés alimentaires</option>
                <option value="nonalim">Manufacturés non alimentaires</option>
                <option value="sensible">Produits sensibles</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Description *</label>
              <input className="form-control" type="text" required value={formData.description} onChange={set('description')} placeholder="Ex: Maïs blanc séché" />
            </div>

            <div className="form-group">
              <label className="form-label">Prix de référence (FCFA) *</label>
              <input className="form-control" type="number" required min="0" step="0.01" value={formData.prix_ref} onChange={set('prix_ref')} />
            </div>

            <div className="form-group">
              <label className="form-label">Unités admises *</label>
              <select
                className="form-control"
                multiple
                required
                value={formData.unites_admises}
                onChange={handleUnitChange}
                style={{ height: 120 }}
              >
                <option value="kg">Kilogrammes</option>
                <option value="g">Grammes</option>
                <option value="L">Litres</option>
                <option value="unite">Unités</option>
                <option value="sac">Sacs</option>
                <option value="caisse">Caisses</option>
              </select>
              <p className="text-muted text-xs" style={{ marginTop: 4 }}>
                Ctrl+clic (ou Cmd+clic) pour sélectionner plusieurs unités
              </p>
            </div>
          </div>

          {/* Critères d'admission */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <label className="form-label" style={{ margin: 0 }}>Critères d'admission</label>
              <button type="button" onClick={addCriteria} className="btn btn-ghost btn-sm">
                ➕ Ajouter un critère
              </button>
            </div>

            <div style={{
              background: 'var(--color-surface-alt)',
              borderRadius: 'var(--radius-md)',
              padding: criteria.length ? 12 : '24px 16px',
              minHeight: 80,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
              {criteria.length === 0 ? (
                <p className="text-muted text-sm text-center">
                  Sélectionnez une catégorie pour charger les critères par défaut, ou ajoutez-en manuellement.
                </p>
              ) : criteria.map((c, idx) => (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'var(--color-surface)', padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)', borderLeft: '4px solid var(--color-primary)',
                }}>
                  <span style={{ fontSize: 13 }}>{c}</span>
                  <button
                    type="button"
                    onClick={() => removeCritere(idx)}
                    style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}
                    title="Supprimer ce critère"
                  >×</button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary btn-lg">
              ✅ Créer le lot
            </button>
          </div>
        </form>
      </div>

      {/* ── Liste des lots récents ── */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Lots créés récemment</h3>
          <span className="badge badge-neutral">{lots.length} total</span>
        </div>

        {lots.length === 0 ? (
          <p className="text-muted text-sm text-center" style={{ padding: '24px 0' }}>Aucun lot enregistré.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lots.slice(0, 8).map(lot => (
              <div key={lot.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'var(--color-surface-alt)', padding: '12px 16px',
                borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--color-primary)',
                flexWrap: 'wrap', gap: 8,
              }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{lot.description}</span>
                  <span className="badge badge-info" style={{ marginLeft: 8 }}>{lot.categorie}</span>
                </div>
                <span style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: 14 }}>
                  {Number(lot.prix_ref).toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
