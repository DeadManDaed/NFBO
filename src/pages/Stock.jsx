// src/pages/Stock.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useStocks } from '../hooks/useStocks';
import { useStockIntelligence } from '../hooks/useStockIntelligence';
import api from '../services/api';
import PageLayout, { StateLoading, StateEmpty } from '../components/PageLayout';

// ─── Score santé — anneau SVG ─────────────────────────────────────────────────
function ScoreSante({ score }) {
  const color = score >= 80 ? 'var(--color-success)' : score >= 50 ? 'var(--color-warning)' : 'var(--color-danger)';
  const label = score >= 80 ? 'Bon' : score >= 50 ? 'Moyen' : 'Critique';
  const dash  = `${score} ${100 - score}`;

  return (
    <div className="stat-card" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <p className="stat-card-label">Score Santé Stock</p>
      <div style={{ position: 'relative', width: 88, height: 88, margin: '8px 0' }}>
        <svg viewBox="0 0 36 36" style={{ width: 88, height: 88, transform: 'rotate(-90deg)' }}>
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--color-border)" strokeWidth="3" />
          <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={dash} strokeLinecap="round" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 20, fontWeight: 800, color }}>{score}</span>
          <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>/100</span>
        </div>
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color }}>{label}</span>
    </div>
  );
}

// ─── Bandeau alertes intelligence ─────────────────────────────────────────────
function AlertesBandeau({ alertes }) {
  if (!alertes.length) return null;
  const alertClass = { warning: 'alert alert-warning', error: 'alert alert-danger', info: 'alert alert-info' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {alertes.map((a, i) => (
        <div key={i} className={alertClass[a.type] || 'alert alert-info'}>
          {a.msg}
        </div>
      ))}
    </div>
  );
}

// ─── Panneau intelligence — onglets ───────────────────────────────────────────
function PanneauIntelligence({ rapport }) {
  const [tab, setTab] = useState('rupture');

  const tabs = [
    { key: 'rupture',   label: `📉 Ruptures (${rapport.rupture.length})` },
    { key: 'peremption',label: `⏰ Péremption (${rapport.peremption.length})` },
    { key: 'stars',     label: `⭐ Stars (${rapport.stars.length})` },
    { key: 'dormants',  label: `💤 Dormants (${rapport.dormants.length})` },
  ];

  const urgBadge = {
    CRITIQUE: 'badge badge-danger',
    HAUTE:    'badge badge-warning',
    MOYENNE:  'badge badge-neutral',
  };

  const rowStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 12px', background: 'var(--color-surface-alt)',
    borderRadius: 'var(--radius-sm)', fontSize: 13,
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">🧠 Analyse intelligente du stock</h3>
      </div>

      {/* Onglets */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={tab === t.key ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenu onglet */}
      <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {tab === 'rupture' && (
          rapport.rupture.length === 0
            ? <p className="text-muted text-sm text-center" style={{ padding: 16 }}>✅ Aucune rupture détectée</p>
            : rapport.rupture.map((p, i) => (
              <div key={i} style={rowStyle}>
                <span style={{ fontWeight: 600 }}>{p.nom}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="text-muted text-sm">{p.stock_actuel} {p.unite}</span>
                  <span className={urgBadge[p.urgence] || 'badge badge-neutral'}>{p.status}</span>
                </div>
              </div>
            ))
        )}

        {tab === 'peremption' && (
          rapport.peremption.length === 0
            ? <p className="text-muted text-sm text-center" style={{ padding: 16 }}>✅ Aucun lot proche de la péremption</p>
            : rapport.peremption.map((p, i) => (
              <div key={i} style={rowStyle}>
                <span style={{ fontWeight: 600 }}>{p.nom}</span>
                <span className={urgBadge[p.urgence] || 'badge badge-neutral'}>{p.status}</span>
              </div>
            ))
        )}

        {tab === 'stars' && (
          rapport.stars.length === 0
            ? <p className="text-muted text-sm text-center" style={{ padding: 16 }}>Aucun produit star identifié</p>
            : rapport.stars.map((p, i) => (
              <div key={i} style={{ ...rowStyle, background: '#fffde7' }}>
                <span style={{ fontWeight: 600 }}>⭐ {p.nom}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#b45309' }}>{p.performance}</span>
              </div>
            ))
        )}

        {tab === 'dormants' && (
          rapport.dormants.length === 0
            ? <p className="text-muted text-sm text-center" style={{ padding: 16 }}>Aucun stock dormant détecté</p>
            : rapport.dormants.map((p, i) => (
              <div key={i} style={{ ...rowStyle, background: 'var(--color-info-bg)' }}>
                <span style={{ fontWeight: 600 }}>{p.nom}</span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-info)' }}>{p.jours_immobilise} jours</div>
                  <div className="text-muted text-xs">{Number(p.value).toLocaleString('fr-FR')} FCFA</div>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}

// ─── Page principale ───────────────────────────────────────────────────────────
export default function Stock() {
  const { magasinId, isSuperAdmin } = useAuth();
  const [selectedMagasin,  setSelectedMagasin]  = useState(magasinId || '');
  const { stocks, loading, refresh }            = useStocks(selectedMagasin);
  const [magasins,         setMagasins]          = useState([]);
  const [retraits,         setRetraits]          = useState([]);
  const [searchTerm,       setSearchTerm]        = useState('');
  const [filterCategorie,  setFilterCategorie]   = useState('');

  const { rapport, alertes } = useStockIntelligence(stocks, retraits);

  useEffect(() => {
    api.getMagasins().then(setMagasins).catch(console.error);
    api.getRetraits().then(setRetraits).catch(() => setRetraits([]));
  }, []);

  const filteredStocks = stocks.filter(s =>
    (s.description?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (!filterCategorie || s.categorie === filterCategorie)
  );

  const totalValeur = filteredStocks.reduce(
    (sum, s) => sum + parseFloat(s.stock_actuel) * parseFloat(s.prix_ref), 0
  );
  const categories = [...new Set(stocks.map(s => s.categorie).filter(Boolean))];

  const seuilCat = { frais: 20, court: 15, secs: 50, manufactures_alim: 30, manufactures_non_alim: 25, sensibles: 10 };

  const actions = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      {isSuperAdmin && (
        <select
          className="form-control"
          style={{ width: 'auto' }}
          value={selectedMagasin}
          onChange={e => setSelectedMagasin(e.target.value)}
        >
          <option value="">Tous les magasins</option>
          {magasins.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
        </select>
      )}
      <button onClick={refresh} className="btn btn-ghost btn-sm">🔄 Actualiser</button>
    </div>
  );

  return (
    <PageLayout
      title="Stock disponible"
      icon="📦"
      subtitle="Consultation temps réel avec analyse intelligente"
      actions={actions}
    >
      {/* ── Alertes ── */}
      {alertes.length > 0 && <AlertesBandeau alertes={alertes} />}

      {/* ── Stats ── */}
      <div className="grid-4">
        <div className="stat-card stat-card-gradient" style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}>
          <p className="stat-card-label">Lots en stock</p>
          <p className="stat-card-value">{filteredStocks.length}</p>
        </div>
        <div className="stat-card stat-card-gradient" style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>
          <p className="stat-card-label">Valeur totale</p>
          <p className="stat-card-value" style={{ fontSize: 20 }}>{totalValeur.toLocaleString('fr-FR')} FCFA</p>
        </div>
        <div className="stat-card stat-card-gradient" style={{ background: 'linear-gradient(135deg,#a855f7,#7c3aed)' }}>
          <p className="stat-card-label">Catégories</p>
          <p className="stat-card-value">{categories.length}</p>
        </div>
        <ScoreSante score={rapport.score_sante} />
      </div>

      {/* ── Panneau intelligence ── */}
      <PanneauIntelligence rapport={rapport} />

      {/* ── Filtres ── */}
      <div className="card">
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">🔍 Rechercher</label>
            <input
              className="form-control"
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Nom du produit..."
            />
          </div>
          <div className="form-group">
            <label className="form-label">🏷️ Catégorie</label>
            <select className="form-control" value={filterCategorie} onChange={e => setFilterCategorie(e.target.value)}>
              <option value="">Toutes</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Tableau ── */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Détail du stock</h3>
          <span className="badge badge-neutral">{filteredStocks.length} produits</span>
        </div>

        {loading ? (
          <StateLoading message="Chargement du stock..." />
        ) : filteredStocks.length === 0 ? (
          <StateEmpty icon="📭" message="Aucun stock disponible" />
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  {['Produit', 'Catégorie', 'Stock', 'Prix unit.', 'Valeur', 'Unités', 'Statut'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStocks.map((stock, i) => {
                  const stockNum = parseFloat(stock.stock_actuel);
                  const seuil    = seuilCat[stock.categorie] ?? 10;
                  const isEpuise = stockNum <= 0;
                  const isFaible = stockNum > 0 && stockNum <= seuil;
                  const valeur   = stockNum * parseFloat(stock.prix_ref || 0);

                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{stock.description}</td>
                      <td>
                        <span className="badge badge-info">{stock.categorie || '—'}</span>
                      </td>
                      <td style={{ color: isEpuise ? 'var(--color-danger)' : isFaible ? 'var(--color-warning)' : 'inherit', fontWeight: 600 }}>
                        {stockNum} {stock.unite}
                      </td>
                      <td>{Number(stock.prix_ref).toLocaleString('fr-FR')} FCFA</td>
                      <td style={{ fontWeight: 700, color: 'var(--color-success)' }}>
                        {valeur.toLocaleString('fr-FR')} FCFA
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {(Array.isArray(stock.unites_admises) ? stock.unites_admises : []).map(u => (
                            <span key={u} className="badge badge-neutral">{u}</span>
                          ))}
                        </div>
                      </td>
                      <td>
                        {isEpuise
                          ? <span className="badge badge-danger">🚫 Épuisé</span>
                          : isFaible
                            ? <span className="badge badge-warning">⚠️ Faible</span>
                            : <span className="badge badge-success">✓ OK</span>
                        }
                      </td>
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
