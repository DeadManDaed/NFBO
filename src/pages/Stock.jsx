// src/pages/Stock.jsx
// Enrichi avec useStockIntelligence : analyse péremption, rupture, dormants, stars

import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useStocks } from '../hooks/useStocks';
import { useStockIntelligence } from '../hooks/useStockIntelligence';
import api from '../services/api';

// ─── Score santé visuel ────────────────────────────────────────────────────────
function ScoreSante({ score }) {
  const color = score >= 80 ? '#2e7d32' : score >= 50 ? '#f57f17' : '#c62828';
  const label = score >= 80 ? 'Bon' : score >= 50 ? 'Moyen' : 'Critique';
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center justify-center">
      <p className="text-xs font-bold uppercase text-gray-500 mb-2 tracking-wide">Score Santé Stock</p>
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#eee" strokeWidth="3" />
          <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={`${score} ${100 - score}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" style={{ color }}>{score}</span>
          <span className="text-xs text-gray-500">/100</span>
        </div>
      </div>
      <span className="mt-2 text-sm font-semibold" style={{ color }}>{label}</span>
    </div>
  );
}

// ─── Bandeau alertes intelligence ─────────────────────────────────────────────
function AlertesBandeau({ alertes }) {
  if (!alertes.length) return null;
  const styles = {
    warning: 'bg-yellow-50 border-yellow-400 text-yellow-800',
    error: 'bg-red-50 border-red-400 text-red-800',
    info: 'bg-blue-50 border-blue-400 text-blue-800',
  };
  return (
    <div className="space-y-2">
      {alertes.map((a, i) => (
        <div key={i} className={`border-l-4 rounded-lg p-3 text-sm font-medium ${styles[a.type]}`}>
          {a.msg}
        </div>
      ))}
    </div>
  );
}

// ─── Panneau dormants / stars ──────────────────────────────────────────────────
function PanneauIntelligence({ rapport }) {
  const [tab, setTab] = useState('rupture');

  const tabs = [
    { key: 'rupture', label: `📉 Ruptures (${rapport.rupture.length})` },
    { key: 'peremption', label: `⏰ Péremption (${rapport.peremption.length})` },
    { key: 'stars', label: `⭐ Stars (${rapport.stars.length})` },
    { key: 'dormants', label: `💤 Dormants (${rapport.dormants.length})` },
  ];

  const urgenceColor = { CRITIQUE: 'text-red-700 bg-red-100', HAUTE: 'text-orange-700 bg-orange-100', MOYENNE: 'text-yellow-700 bg-yellow-100' };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="font-bold text-gray-800 mb-4 text-lg">🧠 Analyse intelligente du stock</h3>

      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {tab === 'rupture' && (
          rapport.rupture.length === 0
            ? <p className="text-gray-400 text-sm text-center py-4">✅ Aucune rupture détectée</p>
            : rapport.rupture.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                <span className="font-medium">{p.nom}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">{p.stock_actuel} {p.unite}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${urgenceColor[p.urgence]}`}>{p.status}</span>
                </div>
              </div>
            ))
        )}

        {tab === 'peremption' && (
          rapport.peremption.length === 0
            ? <p className="text-gray-400 text-sm text-center py-4">✅ Aucun lot proche de la péremption</p>
            : rapport.peremption.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                <span className="font-medium">{p.nom}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${urgenceColor[p.urgence]}`}>{p.status}</span>
              </div>
            ))
        )}

        {tab === 'stars' && (
          rapport.stars.length === 0
            ? <p className="text-gray-400 text-sm text-center py-4">Aucun produit star identifié</p>
            : rapport.stars.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg text-sm">
                <span className="font-medium">⭐ {p.nom}</span>
                <span className="text-yellow-700 text-xs font-bold">{p.performance}</span>
              </div>
            ))
        )}

        {tab === 'dormants' && (
          rapport.dormants.length === 0
            ? <p className="text-gray-400 text-sm text-center py-4">Aucun stock dormant détecté</p>
            : rapport.dormants.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg text-sm">
                <span className="font-medium">{p.nom}</span>
                <div className="text-right">
                  <div className="text-blue-700 text-xs font-bold">{p.jours_immobilise} jours</div>
                  <div className="text-gray-500 text-xs">{Number(p.value).toLocaleString()} FCFA</div>
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
  const { user, magasinId, isSuperAdmin } = useAuth();
  const [selectedMagasin, setSelectedMagasin] = useState(magasinId || '');
  const { stocks, loading, refresh } = useStocks(selectedMagasin);
  const [magasins, setMagasins] = useState([]);
  const [retraits, setRetraits] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategorie, setFilterCategorie] = useState('');

  const { rapport, alertes } = useStockIntelligence(stocks, retraits);

  useEffect(() => {
    api.getMagasins().then(setMagasins).catch(console.error);
    api.getRetraits().then(setRetraits).catch(() => setRetraits([]));
  }, []);

  const filteredStocks = stocks.filter((s) => {
    const matchSearch = s.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = !filterCategorie || s.categorie === filterCategorie;
    return matchSearch && matchCat;
  });

  const totalValeur = filteredStocks.reduce((sum, s) => sum + (parseFloat(s.stock_actuel) * parseFloat(s.prix_ref)), 0);
  const categories = [...new Set(stocks.map((s) => s.categorie).filter(Boolean))];

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">📦 Stock disponible</h2>
            <p className="text-gray-500 text-sm mt-1">Consultation temps réel avec analyse intelligente</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {isSuperAdmin && (
              <select
                value={selectedMagasin}
                onChange={(e) => setSelectedMagasin(e.target.value)}
                className="p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
              >
                <option value="">Tous les magasins</option>
                {magasins.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
              </select>
            )}
            <button onClick={refresh} className="px-4 py-2.5 bg-green-700 text-white rounded-lg hover:bg-green-800 transition text-sm font-medium">
              🔄 Actualiser
            </button>
          </div>
        </div>
      </div>

      {/* ── Alertes intelligence ── */}
      {alertes.length > 0 && <AlertesBandeau alertes={alertes} />}

      {/* ── Stats + Score santé ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
          <p className="text-blue-100 text-sm">Lots en stock</p>
          <p className="text-3xl font-bold mt-1">{filteredStocks.length}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
          <p className="text-green-100 text-sm">Valeur totale</p>
          <p className="text-2xl font-bold mt-1">{totalValeur.toLocaleString()} FCFA</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
          <p className="text-purple-100 text-sm">Catégories</p>
          <p className="text-3xl font-bold mt-1">{categories.length}</p>
        </div>
        <ScoreSante score={rapport.score_sante} />
      </div>

      {/* ── Panneau intelligence ── */}
      <PanneauIntelligence rapport={rapport} />

      {/* ── Filtres ── */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-gray-700 mb-1 text-sm">🔍 Rechercher</label>
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nom du produit..." className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm" />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-1 text-sm">🏷️ Catégorie</label>
            <select value={filterCategorie} onChange={(e) => setFilterCategorie(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm">
              <option value="">Toutes</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Tableau ── */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">
          Détail ({filteredStocks.length} produits)
        </h3>

        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-5xl mb-4 animate-bounce">📦</div>
            <p>Chargement...</p>
          </div>
        ) : filteredStocks.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-5xl mb-4">📭</div>
            <p>Aucun stock disponible</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  {['Produit', 'Catégorie', 'Stock', 'Prix unit.', 'Valeur', 'Unités', 'Statut'].map((h) => (
                    <th key={h} className="p-3 text-left font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStocks.map((stock, i) => {
                  const stockNum = parseFloat(stock.stock_actuel);
                  const seuilCat = { frais: 20, court: 15, secs: 50, manufactures_alim: 30, manufactures_non_alim: 25, sensibles: 10 };
                  const seuil = seuilCat[stock.categorie] ?? 10;
                  const isEpuise = stockNum <= 0;
                  const isFaible = stockNum > 0 && stockNum <= seuil;
                  const valeur = stockNum * parseFloat(stock.prix_ref || 0);

                  return (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium text-gray-800">{stock.description}</td>
                      <td className="p-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">{stock.categorie || '—'}</span>
                      </td>
                      <td className="p-3">
                        <span className={`font-semibold ${isEpuise ? 'text-red-600' : isFaible ? 'text-orange-600' : 'text-gray-800'}`}>
                          {stockNum} {stock.unite}
                        </span>
                      </td>
                      <td className="p-3 text-gray-700">{Number(stock.prix_ref).toLocaleString()} FCFA</td>
                      <td className="p-3 font-semibold text-green-700">{valeur.toLocaleString()} FCFA</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {(Array.isArray(stock.unites_admises) ? stock.unites_admises : []).map((u) => (
                            <span key={u} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{u}</span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">
                        {isEpuise ? (
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold">🚫 Épuisé</span>
                        ) : isFaible ? (
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-bold">⚠️ Faible</span>
                        ) : (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">✓ OK</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
