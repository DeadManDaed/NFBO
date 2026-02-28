// src/pages/Retraits.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAlert } from '../hooks/useAlert';
import { useStocks } from '../hooks/useStocks';
import api from '../services/api';
import Alert from '../components/Alert';
import PageLayout, { StateEmpty } from '../components/PageLayout';

// Couleur de badge selon le type de retrait
const typeClass = {
  vente:      'badge badge-success',
  producteur: 'badge badge-info',
  magasin:    'badge badge-warning',
  destruction:'badge badge-danger',
};

export default function Retraits() {
  const { user, magasinId }             = useAuth();
  const { alert, showAlert, hideAlert } = useAlert();
  const { stocks, refresh: refreshStocks } = useStocks(magasinId);

  const [retraits,          setRetraits]          = useState([]);
  const [producteurs,       setProducteurs]       = useState([]);
  const [magasins,          setMagasins]          = useState([]);
  const [showForm,          setShowForm]          = useState(false);
  const [unitesDisponibles, setUnitesDisponibles] = useState([]);

  const [formData, setFormData] = useState({
    lot_id:                     '',
    type_retrait:               'vente',
    quantite:                   '',
    unite:                      '',
    prix_ref:                   '',
    destination_producteur_id:  '',
    destination_magasin_id:     '',
    motif:                      '',
    magasin_id:                 magasinId || '',
  });

  useEffect(() => {
    api.getRetraits().then(setRetraits).catch(console.error);
    api.getProducteurs().then(setProducteurs).catch(console.error);
    api.getMagasins().then(setMagasins).catch(console.error);
  }, []);

  const set = (field) => (e) => setFormData(f => ({ ...f, [field]: e.target.value }));

  const handleLotChange = (lotId) => {
    const stock = stocks.find(s => s.lot_id === parseInt(lotId));
    if (stock) {
      setUnitesDisponibles(stock.unites_admises || []);
      setFormData(f => ({
        ...f,
        lot_id:   lotId,
        prix_ref: stock.prix_ref,
        unite:    stock.unite || stock.unites_admises?.[0] || '',
      }));
    }
  };

  const handleTypeRetraitChange = (type) => {
    setFormData(f => ({ ...f, type_retrait: type, destination_producteur_id: '', destination_magasin_id: '', motif: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const retrait = {
      lot_id:       parseInt(formData.lot_id),
      type_retrait: formData.type_retrait,
      quantite:     parseFloat(formData.quantite),
      unite:        formData.unite,
      prix_ref:     parseFloat(formData.prix_ref),
      magasin_id:   parseInt(formData.magasin_id),
      utilisateur:  user?.username || 'unknown',
    };
    if (formData.type_retrait === 'producteur' && formData.destination_producteur_id)
      retrait.destination_producteur_id = parseInt(formData.destination_producteur_id);
    if (formData.type_retrait === 'magasin' && formData.destination_magasin_id)
      retrait.destination_magasin_id = parseInt(formData.destination_magasin_id);
    if (formData.type_retrait === 'destruction' && formData.motif)
      retrait.motif = formData.motif;

    try {
      await api.createRetrait(retrait);
      showAlert('✅ Retrait enregistré avec succès', 'success');
      setFormData({ lot_id: '', type_retrait: 'vente', quantite: '', unite: '', prix_ref: '', destination_producteur_id: '', destination_magasin_id: '', motif: '', magasin_id: magasinId || '' });
      setUnitesDisponibles([]);
      setShowForm(false);
      api.getRetraits().then(setRetraits).catch(console.error);
      refreshStocks();
    } catch (err) {
      showAlert(`❌ Erreur: ${err.message}`, 'error');
    }
  };

  return (
    <PageLayout
      title="Retraits de stock"
      icon="📤"
      subtitle="Ventes, retours et destructions"
      actions={
        <button
          onClick={() => setShowForm(v => !v)}
          className={showForm ? 'btn btn-ghost' : 'btn btn-primary'}
        >
          {showForm ? '✖ Annuler' : '➕ Nouveau retrait'}
        </button>
      }
    >
      <Alert message={alert?.message} type={alert?.type} onClose={hideAlert} />

      {/* ── Formulaire ── */}
      {showForm && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Nouveau retrait</h3>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-grid">
              {/* Lot */}
              <div className="form-group">
                <label className="form-label">Lot à retirer *</label>
                <select className="form-control" required value={formData.lot_id} onChange={e => handleLotChange(e.target.value)}>
                  <option value="">Sélectionner un lot</option>
                  {stocks.map(s => (
                    <option key={s.lot_id} value={s.lot_id}>
                      {s.description} — Stock: {s.stock_actuel} {s.unite}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type */}
              <div className="form-group">
                <label className="form-label">Type de retrait *</label>
                <select className="form-control" required value={formData.type_retrait} onChange={e => handleTypeRetraitChange(e.target.value)}>
                  <option value="vente">🛒 Vente client</option>
                  <option value="producteur">👨‍🌾 Retour producteur</option>
                  <option value="magasin">🏪 Transfert magasin</option>
                  <option value="destruction">🗑️ Destruction</option>
                </select>
              </div>

              {/* Quantité */}
              <div className="form-group">
                <label className="form-label">Quantité *</label>
                <input className="form-control" type="number" required min="0" step="0.01" value={formData.quantite} onChange={set('quantite')} />
              </div>

              {/* Unité */}
              <div className="form-group">
                <label className="form-label">Unité *</label>
                <select className="form-control" required value={formData.unite} onChange={set('unite')} disabled={!unitesDisponibles.length}>
                  <option value="">Sélectionner</option>
                  {unitesDisponibles.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              {/* Prix */}
              <div className="form-group">
                <label className="form-label">Prix unitaire (FCFA) *</label>
                <input className="form-control" type="number" required min="0" step="0.01" value={formData.prix_ref} onChange={set('prix_ref')} />
              </div>

              {/* Champ conditionnel : producteur */}
              {formData.type_retrait === 'producteur' && (
                <div className="form-group">
                  <label className="form-label">Producteur destinataire *</label>
                  <select className="form-control" required value={formData.destination_producteur_id} onChange={set('destination_producteur_id')}>
                    <option value="">Sélectionner</option>
                    {producteurs.map(p => <option key={p.id} value={p.id}>{p.nom_producteur}</option>)}
                  </select>
                </div>
              )}

              {/* Champ conditionnel : magasin */}
              {formData.type_retrait === 'magasin' && (
                <div className="form-group">
                  <label className="form-label">Magasin destinataire *</label>
                  <select className="form-control" required value={formData.destination_magasin_id} onChange={set('destination_magasin_id')}>
                    <option value="">Sélectionner</option>
                    {magasins.filter(m => m.id !== magasinId).map(m => (
                      <option key={m.id} value={m.id}>{m.nom} ({m.code})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Motif destruction — pleine largeur */}
            {formData.type_retrait === 'destruction' && (
              <div className="form-group">
                <label className="form-label">Motif de destruction *</label>
                <textarea
                  className="form-control"
                  required
                  rows={3}
                  value={formData.motif}
                  onChange={set('motif')}
                  placeholder="Expliquez la raison de la destruction..."
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary btn-lg">
                ✅ Enregistrer le retrait
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Historique ── */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Retraits récents</h3>
          <span className="badge badge-neutral">{retraits.length} total</span>
        </div>

        {retraits.length === 0 ? (
          <StateEmpty message="Aucun retrait enregistré." />
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Lot</th>
                  <th>Type</th>
                  <th>Quantité</th>
                  <th>Destination</th>
                  <th>Utilisateur</th>
                </tr>
              </thead>
              <tbody>
                {retraits.slice(0, 15).map(r => (
                  <tr key={r.id}>
                    <td>{new Date(r.date_retrait || Date.now()).toLocaleDateString('fr-FR')}</td>
                    <td style={{ fontWeight: 600 }}>{r.lot_description || '—'}</td>
                    <td>
                      <span className={typeClass[r.type_retrait] || 'badge badge-neutral'}>
                        {r.type_retrait}
                      </span>
                    </td>
                    <td>{r.quantite} {r.unite}</td>
                    <td>
                      {r.destination_producteur_id ? r.nom_producteur
                        : r.destination_magasin_id ? 'Magasin'
                        : r.type_retrait === 'destruction' ? (
                          <span className="text-muted text-xs" title={r.motif}>
                            {r.motif?.slice(0, 30)}{r.motif?.length > 30 ? '…' : ''}
                          </span>
                        ) : 'Client'}
                    </td>
                    <td className="text-muted">{r.utilisateur}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
