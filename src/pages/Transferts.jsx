// src/pages/Transferts.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAlert } from '../hooks/useAlert';
import api from '../services/api';
import Alert from '../components/Alert';
import PageLayout, { StateEmpty } from '../components/PageLayout';

export default function Transferts() {
  const { user, magasinId, isSuperAdmin } = useAuth();
  const { alert, showAlert, hideAlert }   = useAlert();

  const [showForm,          setShowForm]          = useState(false);
  const [magasins,          setMagasins]          = useState([]);
  const [stocks,            setStocks]            = useState([]);
  const [chauffeurs,        setChauffeurs]        = useState([]);
  const [transferts,        setTransferts]        = useState([]);
  const [unitesDisponibles, setUnitesDisponibles] = useState([]);

  const [formData, setFormData] = useState({
    magasin_source_id: magasinId || '',
    magasin_dest_id:   '',
    lot_id:            '',
    quantite:          '',
    unite:             '',
    chauffeur_id:      '',
    observations:      '',
  });

  useEffect(() => {
    loadMagasins();
    loadTransferts();
    if (magasinId) {
      loadStocksForMagasin(magasinId);
      loadChauffeurs(magasinId);
    }
  }, [magasinId]);

  const loadMagasins      = async () => { try { setMagasins(await api.getMagasins());   } catch {} };
  const loadTransferts    = async () => {
    try {
      const data = await api.getRetraits();
      setTransferts(data.filter(r => r.type_retrait === 'magasin'));
    } catch {}
  };
  const loadStocksForMagasin = async (magId) => {
    try { setStocks(await api.getStockDisponible(magId)); } catch {}
  };
  const loadChauffeurs = async (magSourceId, magDestId = null) => {
    try {
      const all = await api.getChauffeurs();
      const prioritized = all.map(c => {
        if (c.magasin_id === parseInt(magSourceId)) return { ...c, priority: 1, label: '🟢 Source' };
        if (magDestId && c.magasin_id === parseInt(magDestId)) return { ...c, priority: 2, label: '🔵 Destination' };
        return { ...c, priority: 3, label: '⚪' };
      });
      prioritized.sort((a, b) => a.priority - b.priority);
      setChauffeurs(prioritized);
    } catch {}
  };

  const handleMagasinSourceChange = (magId) => {
    setFormData(f => ({ ...f, magasin_source_id: magId, lot_id: '', quantite: '' }));
    loadStocksForMagasin(magId);
    loadChauffeurs(magId, formData.magasin_dest_id);
  };

  const handleMagasinDestChange = (magId) => {
    setFormData(f => ({ ...f, magasin_dest_id: magId }));
    loadChauffeurs(formData.magasin_source_id, magId);
  };

  const handleLotChange = (lotId) => {
    const stock = stocks.find(s => s.lot_id === parseInt(lotId));
    if (stock) {
      setUnitesDisponibles(stock.unites_admises || []);
      setFormData(f => ({
        ...f,
        lot_id: lotId,
        unite: stock.unite || stock.unites_admises?.[0] || '',
      }));
    }
  };

  const set = (field) => (e) => setFormData(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.magasin_source_id === formData.magasin_dest_id) {
      showAlert('❌ Le magasin source et destination ne peuvent pas être identiques', 'error');
      return;
    }
    const stock = stocks.find(s => s.lot_id === parseInt(formData.lot_id));
    try {
      await api.createTransfert({
        lot_id:                parseInt(formData.lot_id),
        type_retrait:          'magasin',
        quantite:              parseFloat(formData.quantite),
        unite:                 formData.unite,
        prix_ref:              stock?.prix_ref || 0,
        magasin_id:            parseInt(formData.magasin_source_id),
        destination_magasin_id:parseInt(formData.magasin_dest_id),
        utilisateur:           user?.username || 'unknown',
        chauffeur_id:          formData.chauffeur_id ? parseInt(formData.chauffeur_id) : null,
        observations:          formData.observations || null,
      });
      showAlert('✅ Transfert enregistré avec succès', 'success');
      setFormData({ magasin_source_id: magasinId || '', magasin_dest_id: '', lot_id: '', quantite: '', unite: '', chauffeur_id: '', observations: '' });
      setUnitesDisponibles([]);
      setShowForm(false);
      loadTransferts();
      if (magasinId) loadStocksForMagasin(magasinId);
    } catch (err) {
      showAlert(`❌ Erreur: ${err.message}`, 'error');
    }
  };

  const toggleForm = () => setShowForm(v => !v);

  return (
    <PageLayout
      title="Transferts inter-magasins"
      icon="🔄"
      subtitle="Gérer les mouvements de stock entre magasins"
      actions={
        <button onClick={toggleForm} className={showForm ? 'btn btn-ghost' : 'btn btn-primary'}>
          {showForm ? '✖ Annuler' : '➕ Nouveau transfert'}
        </button>
      }
    >
      <Alert message={alert?.message} type={alert?.type} onClose={hideAlert} />

      {/* ── Formulaire ── */}
      {showForm && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Nouveau transfert</h3>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-grid">
              {/* Magasin source */}
              <div className="form-group">
                <label className="form-label">Magasin source *</label>
                <select
                  className="form-control"
                  required
                  value={formData.magasin_source_id}
                  onChange={e => handleMagasinSourceChange(e.target.value)}
                  disabled={!isSuperAdmin}
                  style={!isSuperAdmin ? { background: 'var(--color-surface-alt)' } : {}}
                >
                  <option value="">Sélectionner</option>
                  {magasins.map(m => <option key={m.id} value={m.id}>{m.nom} ({m.code})</option>)}
                </select>
                {!isSuperAdmin && (
                  <p className="text-muted text-xs" style={{ marginTop: 4 }}>🔒 Verrouillé à votre magasin</p>
                )}
              </div>

              {/* Magasin destination */}
              <div className="form-group">
                <label className="form-label">Magasin destination *</label>
                <select
                  className="form-control"
                  required
                  value={formData.magasin_dest_id}
                  onChange={e => handleMagasinDestChange(e.target.value)}
                >
                  <option value="">Sélectionner</option>
                  {magasins
                    .filter(m => m.id !== parseInt(formData.magasin_source_id))
                    .map(m => <option key={m.id} value={m.id}>{m.nom} ({m.code})</option>)
                  }
                </select>
              </div>

              {/* Lot */}
              <div className="form-group">
                <label className="form-label">Lot à transférer *</label>
                <select
                  className="form-control"
                  required
                  value={formData.lot_id}
                  onChange={e => handleLotChange(e.target.value)}
                  disabled={!formData.magasin_source_id}
                >
                  <option value="">Sélectionner un lot</option>
                  {stocks.map(s => (
                    <option key={s.lot_id} value={s.lot_id}>
                      {s.description} — Stock: {s.stock_actuel} {s.unite}
                    </option>
                  ))}
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

              {/* Chauffeur */}
              <div className="form-group">
                <label className="form-label">Chauffeur (optionnel)</label>
                <select className="form-control" value={formData.chauffeur_id} onChange={set('chauffeur_id')}>
                  <option value="">Sélectionner</option>
                  {chauffeurs.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.label} {c.nom} — {magasins.find(m => m.id === c.magasin_id)?.code || ''}
                    </option>
                  ))}
                </select>
                <p className="text-muted text-xs" style={{ marginTop: 4 }}>
                  🟢 = Source · 🔵 = Destination · ⚪ = Autres
                </p>
              </div>
            </div>

            {/* Observations pleine largeur */}
            <div className="form-group">
              <label className="form-label">Observations</label>
              <textarea
                className="form-control"
                rows={2}
                value={formData.observations}
                onChange={set('observations')}
                placeholder="Notes ou remarques sur ce transfert..."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary btn-lg">
                ✅ Enregistrer le transfert
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Historique ── */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Historique des transferts</h3>
          <span className="badge badge-neutral">{transferts.length} total</span>
        </div>

        {transferts.length === 0 ? (
          <StateEmpty message="Aucun transfert enregistré." />
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Lot</th>
                  <th>Quantité</th>
                  <th>Source → Destination</th>
                  <th>Utilisateur</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {transferts.slice(0, 15).map(t => {
                  const srcCode  = magasins.find(m => m.id === t.magasin_id)?.code || '?';
                  const destCode = magasins.find(m => m.id === t.destination_magasin_id)?.code || '?';
                  return (
                    <tr key={t.id}>
                      <td>{new Date(t.date_retrait || Date.now()).toLocaleDateString('fr-FR')}</td>
                      <td style={{ fontWeight: 600 }}>{t.lot_description || '—'}</td>
                      <td>{t.quantite} {t.unite}</td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                          <code style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)', padding: '2px 8px', borderRadius: 4 }}>
                            {srcCode}
                          </code>
                          →
                          <code style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)', padding: '2px 8px', borderRadius: 4 }}>
                            {destCode}
                          </code>
                        </span>
                      </td>
                      <td className="text-muted">{t.utilisateur}</td>
                      <td><span className="badge badge-success">✓ Transféré</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
