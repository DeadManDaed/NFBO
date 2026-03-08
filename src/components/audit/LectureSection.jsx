// src/components/audit/LectureSection.jsx

import { useState } from 'react';
import api from '../../services/api';

// ─── Helpers formatage ─────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString('fr-FR');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
const joursAvant = (d) => {
  if (!d) return null;
  return Math.ceil((new Date(d) - new Date()) / 86400000);
};

// ─── Carte générique fold/unfold ───────────────────────────────────────────────
function LectureCard({ item, type, onAjouter, onSignaler }) {
  const [open, setOpen] = useState(false);
  const [detailsModal, setDetailsModal] = useState(false);
  const [detailsTexte, setDetailsTexte] = useState('');

  const handleAjouter = (e) => {
    e.stopPropagation();
    setDetailsModal(true);
  };

  const handleSignaler = async (e) => {
  e.stopPropagation();
  try {
    await api.signalerAnomalie({ label: getLabel(), details: null, user: null });
    onSignaler('anomalie', item, `Anomalie signalée sur : ${getLabel()}`);
  } catch (err) {
    console.error('Erreur signalement:', err);
  }
};

  const confirmerAjout = () => {
    onAjouter(type, item, detailsTexte);
    setDetailsModal(false);
    setDetailsTexte('');
  };

  const getLabel = () =>
    item.lot_description || item.description || item.nom_magasin || `#${item.id}`;

  const getResume = () => {
    switch (type) {
      case 'admissions':
        return `${fmtDate(item.date_reception)} · ${item.quantite} ${Array.isArray(item.unite) ? item.unite[0] : item.unite || ''}`;
      case 'retraits':
        return `${fmtDate(item.date_retrait)} · ${item.quantite} ${item.unite || ''}`;
      case 'transferts':
        return `${item.magasin_depart_nom || '?'} → ${item.magasin_destination_nom || '?'}`;
      case 'stock':
        return `${item.stock_actuel} ${item.unite || ''} · ${fmt(item.stock_actuel * item.prix_ref)} FCFA`;
      case 'magasins':
        return `${item.nombre_admissions} admissions · ${fmt(item.valeur_totale_admise)} FCFA`;
      default:
        return '';
    }
  };

  const getBadge = () => {
    switch (type) {
      case 'admissions':
        return item.grade_qualite
          ? { A: '#c8e6c9', B: '#fff9c4', C: '#ffe0b2', D: '#ffcdd2' }[item.grade_qualite]
          : null;
      case 'transferts':
        return item.statut === 'livré' ? '#c8e6c9' : '#fef08a';
      case 'stock':
        return parseFloat(item.stock_actuel) <= 0 ? '#ffcdd2' : '#c8e6c9';
      default:
        return null;
    }
  };

  const getBadgeLabel = () => {
    switch (type) {
      case 'admissions':  return item.grade_qualite || null;
      case 'transferts':  return item.statut || null;
      case 'stock':       return parseFloat(item.stock_actuel) <= 0 ? 'ÉPUISÉ' : 'OK';
      default:            return null;
    }
  };

  const renderDetails = () => {
    switch (type) {
      case 'admissions':
        return [
          ['Lot',           item.lot_description || `#${item.lot_id}`],
          ['Date',          fmtDate(item.date_reception)],
          ['Producteur',    item.nom_producteur || '—'],
          ['Magasin',       item.magasin_nom || '—'],
          ['Quantité',      `${item.quantite} ${Array.isArray(item.unite) ? item.unite[0] : item.unite || ''}`],
          ['Prix unitaire', `${fmt(item.prix_ref)} FCFA`],
          ['Mode paiement', item.mode_paiement || '—'],
          ['Expiration',    fmtDate(item.date_expiration)],
          ['Grade',         item.grade_qualite || '—'],
          ['Coef qualité',  item.coef_qualite || '—'],
          ['Commission',    item.taux_tax ? `${(parseFloat(item.taux_tax)*100).toFixed(1)}%` : '—'],
          ['Valeur totale', `${fmt(item.valeur_totale)} FCFA`],
          ['Net producteur',`${fmt(item.montant_verse)} FCFA`],
          ['Enregistré par',item.utilisateur || '—'],
        ];
      case 'retraits':
        return [
          ['Lot',           item.lot_description || `#${item.lot_id}`],
          ['Date',          fmtDate(item.date_retrait)],
          ['Quantité',      `${item.quantite} ${item.unite || ''}`],
          ['Type',          item.type_retrait || '—'],
          ['Prix unitaire', `${fmt(item.prix_ref)} FCFA`],
          ['Producteur',    item.nom_producteur || '—'],
          ['Observations',  item.observations || '—'],
          ['Enregistré par',item.utilisateur || '—'],
        ];
      case 'transferts':
        return [
          ['Lot',           item.lot_description || `#${item.lot_id}`],
          ['Date création', fmtDate(item.date_creation)],
          ['Date réception',fmtDate(item.date_reception)],
          ['Quantité',      `${item.quantite} ${item.unite || ''}`],
          ['Source',        item.magasin_depart_nom || '—'],
          ['Destination',   item.magasin_destination_nom || '—'],
          ['Statut',        item.statut || '—'],
          ['Chauffeur',     item.chauffeur_nom || '—'],
          ['Initiateur',    item.utilisateur || '—'],
          ['Motif',         item.motif || '—'],
        ];
      case 'stock':
        const j = joursAvant(item.date_expiration);
        return [
          ['Produit',       item.description || '—'],
          ['Catégorie',     item.categorie || '—'],
          ['Magasin',       item.magasin_nom || `#${item.magasin_id}`],
          ['Stock actuel',  `${item.stock_actuel} ${item.unite || ''}`],
          ['Prix unitaire', `${fmt(item.prix_ref)} FCFA`],
          ['Valeur',        `${fmt((item.stock_actuel||0)*(item.prix_ref||0))} FCFA`],
          ['Bénéfice esp.', `${fmt(item.benefice_espere)} FCFA`],
          ['Expiration',    j !== null ? `J-${j}` : '—'],
          ['Dernière récep',fmtDate(item.derniere_reception)],
        ];
      case 'magasins':
        return [
          ['Magasin',         item.nom_magasin || '—'],
          ['Admissions',      item.nombre_admissions || 0],
          ['Quantité totale', item.quantite_totale || 0],
          ['Valeur admise',   `${fmt(item.valeur_totale_admise)} FCFA`],
          ['Profit généré',   `${fmt(item.profit_virtuel_genere)} FCFA`],
          ['Alertes qualité', item.alertes_qualite || 0],
        ];
      default:
        return [];
    }
  };

  const badgeColor = getBadge();
  const badgeLabel = getBadgeLabel();

  return (
    <>
      <div style={{
        background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)', overflow: 'hidden',
      }}>
        {/* ── Ligne principale ── */}
        <div
          onClick={() => setOpen(v => !v)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', cursor: 'pointer', gap: 10 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block' }}>▶</span>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: 13, margin: 0, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {getLabel()}
              </p>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>{getResume()}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {badgeLabel && (
              <span style={{ padding: '2px 10px', borderRadius: 12, fontWeight: 700, fontSize: 11, background: badgeColor, color: '#333' }}>
                {badgeLabel}
              </span>
            )}
            <button
              onClick={handleSignaler}
              className="btn btn-ghost btn-sm"
              style={{ padding: '4px 8px', fontSize: 12, color: 'var(--color-danger)' }}
              title="Signaler une anomalie"
            >⚠️</button>
            <button
              onClick={handleAjouter}
              className="btn btn-ghost btn-sm"
              style={{ padding: '4px 8px', fontSize: 12, color: 'var(--color-primary)' }}
              title="Ajouter au rapport"
            >📋</button>
            <button
              onClick={(e) => { e.stopPropagation(); /* export PDF individuel */ }}
              className="btn btn-ghost btn-sm"
              style={{ padding: '4px 8px', fontSize: 14 }}
              title="Imprimer"
            >🖨</button>
          </div>
        </div>

        {/* ── Contenu déplié ── */}
        {open && (
          <div style={{ borderTop: '1px solid var(--color-border)', padding: '14px 16px' }}>
            <div className="grid-2" style={{ gap: 10 }}>
              {renderDetails().map(([label, value]) => (
                <div key={label} style={{ background: 'var(--color-surface)', borderRadius: 6, padding: '8px 10px' }}>
                  <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', margin: '0 0 3px 0' }}>{label}</p>
                  <p style={{ fontWeight: 600, fontSize: 13, margin: 0, color: 'var(--color-text)' }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Modal "Ajouter au rapport" ── */}
      {detailsModal && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setDetailsModal(false); }}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal" style={{ maxWidth: 480, width: '95%' }}>
            <h3 style={{ margin: '0 0 16px' }}>📋 Ajouter au rapport</h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12 }}>
              <strong style={{ color: 'var(--color-text)' }}>{getLabel()}</strong>
            </p>
            <div className="form-group">
              <label className="form-label">Observations / Détails</label>
              <textarea
                className="form-control"
                rows={4}
                value={detailsTexte}
                onChange={e => setDetailsTexte(e.target.value)}
                placeholder="Décrivez l'élément à inclure dans le rapport..."
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={confirmerAjout} className="btn btn-primary">✅ Ajouter</button>
              <button onClick={() => setDetailsModal(false)} className="btn btn-ghost">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
// ─── Section lecture avec titre et liste ───────────────────────────────────────
export default function LectureSection({ type, items, onAjouter, onSignaler }) {
  const [collapsed, setCollapsed] = useState(true);

  const titres = {
    admissions: { icon: '📥', label: 'Admissions' },
    retraits:   { icon: '📤', label: 'Retraits' },
    transferts: { icon: '🔄', label: 'Transferts' },
    stock:      { icon: '📦', label: 'Stock' },
    magasins:   { icon: '🏪', label: 'Performance magasins' },
  };

  const { icon, label } = titres[type] || { icon: '📄', label: type };

  return (
    <div className="card">
      <div
        className="card-header"
        onClick={() => setCollapsed(v => !v)}
        style={{ cursor: 'pointer' }}
      >
        <h3 className="card-title">{icon} {label}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="badge badge-neutral">{items.length}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{collapsed ? '▼' : '▲'}</span>
        </div>
      </div>

      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 4px 4px' }}>
          {items.length === 0
            ? <p style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>Aucune donnée</p>
            : items.map((item, i) => (
              <LectureCard
                key={item.id || i}
                item={item}
                type={type}
                onAjouter={onAjouter}
                onSignaler={onSignaler}
              />
            ))
          }
        </div>
      )}
    </div>
  );
}

