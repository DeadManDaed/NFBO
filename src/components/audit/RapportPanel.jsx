// src/components/audit/RapportPanel.jsx

import { useState } from 'react';

const TYPE_CONFIG = {
  admission:  { icon: '📥', label: 'Admission',  color: '#22c55e' },
  retrait:    { icon: '📤', label: 'Retrait',    color: '#f59e0b' },
  transfert:  { icon: '🔄', label: 'Transfert',  color: '#3b82f6' },
  stock:      { icon: '📦', label: 'Stock',      color: '#8b5cf6' },
  magasin:    { icon: '🏪', label: 'Magasin',    color: '#06b6d4' },
  anomalie:   { icon: '⚠️', label: 'Anomalie',   color: '#ef4444' },
};

export default function RapportPanel({ rapport }) {
  const {
    elements, open, setOpen,
    retirerElement, mettreAJourDetails,
    vider, exporterPDF, count,
  } = rapport;

  const [editingId, setEditingId] = useState(null);
  const [editTexte, setEditTexte] = useState('');

  if (!open && count === 0) return null;

  const startEdit = (e) => {
    setEditingId(`${e.type}-${e.id}`);
    setEditTexte(e.details);
  };

  const saveEdit = (e) => {
    mettreAJourDetails(e.type, e.id, editTexte);
    setEditingId(null);
  };

  return (
    <>
      {/* ── Bouton flottant ── */}
      {!open && count > 0 && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed', bottom: 80, right: 16, zIndex: 900,
            background: '#166534', color: '#fff',
            border: 'none', borderRadius: 24,
            padding: '10px 18px', fontWeight: 700, fontSize: 13,
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          📋 Rapport <span style={{ background: '#ef4444', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>{count}</span>
        </button>
      )}

      {/* ── Panneau ── */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 950,
          background: 'var(--color-surface)',
          borderTop: '2px solid #166534',
          borderRadius: '16px 16px 0 0',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.2)',
          maxHeight: '70vh', display: 'flex', flexDirection: 'column',
        }}>

          {/* En-tête panneau */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--color-text)' }}>
                📋 Rapport en construction
              </span>
              <span style={{ background: '#ef4444', color: '#fff', borderRadius: 10, padding: '1px 8px', fontSize: 12, fontWeight: 700 }}>
                {count}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {count > 0 && (
                <>
                  <button onClick={exporterPDF} className="btn btn-primary btn-sm">
                    📄 Exporter PDF
                  </button>
                  <button onClick={vider} className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }}>
                    🗑 Vider
                  </button>
                </>
              )}
              <button onClick={() => setOpen(false)} className="btn btn-ghost btn-sm">✕</button>
            </div>
          </div>

          {/* Liste éléments */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {count === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 32, fontSize: 13 }}>
                Aucun élément — cliquez sur 📋 ou ⚠️ pour ajouter des éléments au rapport.
              </p>
            ) : (
              elements.map(e => {
                const cfg = TYPE_CONFIG[e.type] || TYPE_CONFIG.anomalie;
                const uid = `${e.type}-${e.id}`;
                const isEditing = editingId === uid;

                return (
                  <div
                    key={uid}
                    style={{
                      background: 'var(--color-surface-alt)',
                      borderLeft: `4px solid ${cfg.color}`,
                      borderRadius: '0 8px 8px 0',
                      padding: '10px 14px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 11, background: cfg.color, color: '#fff', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>
                            {cfg.icon} {cfg.label}
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                            {new Date(e.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p style={{ fontWeight: 700, fontSize: 13, margin: '0 0 4px', color: 'var(--color-text)' }}>
                          {e.label}
                        </p>

                        {isEditing ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                            <textarea
                              className="form-control"
                              rows={2}
                              value={editTexte}
                              onChange={ev => setEditTexte(ev.target.value)}
                              autoFocus
                              style={{ fontSize: 12 }}
                            />
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => saveEdit(e)} className="btn btn-primary btn-sm">✓ Sauver</button>
                              <button onClick={() => setEditingId(null)} className="btn btn-ghost btn-sm">Annuler</button>
                            </div>
                          </div>
                        ) : (
                          <p
                            onClick={() => startEdit(e)}
                            style={{ fontSize: 12, color: e.details ? 'var(--color-text-muted)' : 'var(--color-primary)', fontStyle: e.details ? 'italic' : 'normal', margin: 0, cursor: 'pointer' }}
                          >
                            {e.details || '+ Ajouter des observations...'}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => retirerElement(e.type, e.id)}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '2px 6px', fontSize: 12, color: 'var(--color-text-muted)', flexShrink: 0 }}
                        title="Retirer"
                      >✕</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </>
  );
}

