// src/pages/Messagerie.jsx
// Messagerie interne NFBO — inbox, envoi, détail, notifications
// Polling unread-count toutes les 60s — s'intègre dans Dashboard via TabBar

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';


const API_BASE  = '/api';

// ─── Fetch authentifié local ──────────────────────────────────────────────────
async function mFetch(url, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || e.message || `Erreur ${res.status}`);
  }
  return res.json();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '';
  const dt  = new Date(d);
  const now = new Date();
  const diff = now - dt;
  if (diff < 60_000)      return 'À l\'instant';
  if (diff < 3_600_000)   return `Il y a ${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000)  return `Il y a ${Math.floor(diff / 3_600_000)} h`;
  if (diff < 604_800_000) return dt.toLocaleDateString('fr-FR', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function expLabel(msg) {
  if (msg.exp_prenom || msg.exp_nom) return `${msg.exp_prenom || ''} ${msg.exp_nom || ''}`.trim();
  if (msg.exp_username) return msg.exp_username;
  if (msg.expediteur)   return msg.expediteur;
  return 'Système';
}

function roleColor(role) {
  const map = {
    superadmin: '#a855f7',
    admin:      '#3b82f6',
    stock:      '#22c55e',
    caisse:     '#f59e0b',
    auditeur:   '#06b6d4',
  };
  return map[role] || '#64748b';
}

function roleBadge(role) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
      background: `${roleColor(role)}22`, color: roleColor(role),
      textTransform: 'uppercase', letterSpacing: '.5px', flexShrink: 0,
    }}>
      {role}
    </span>
  );
}

function Avatar({ name, role, size = 36 }) {
  const initials = name
    ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';
  const color = roleColor(role);
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2.8,
      background: `${color}22`, border: `1.5px solid ${color}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, color, flexShrink: 0,
      fontFamily: 'Sora, sans-serif',
    }}>
      {initials}
    </div>
  );
}

// ─── Notification toast ───────────────────────────────────────────────────────
function Toast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div style={{
      position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
      background: '#1e293b', border: '1px solid #334155', borderRadius: 14,
      padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: '0 8px 32px rgba(0,0,0,.5)', zIndex: 9999,
      fontFamily: 'Sora, sans-serif', fontSize: 13, color: '#f8fafc',
      maxWidth: 'calc(100vw - 32px)', animation: 'slideUp .25s ease',
    }}>
      <span style={{ fontSize: 18 }}>{message.icon || '✉️'}</span>
      <div>
        <div style={{ fontWeight: 700, marginBottom: 2 }}>{message.title}</div>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>{message.body}</div>
      </div>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 16, marginLeft: 8 }}>✕</button>
    </div>
  );
}

// ─── Vue : Liste des messages ─────────────────────────────────────────────────
function InboxList({ messages, onSelect, selectedId, loading, filter, onFilterChange }) {
  const filtered = messages.filter(m => {
    if (filter === 'unread') return !m.lu;
    if (filter === 'notifications') return m.type_notification !== 'interne';
    return true;
  });

  const unreadCount = messages.filter(m => !m.lu).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Filtres */}
      <div style={{ display: 'flex', gap: 6, padding: '12px 16px 8px', borderBottom: '1px solid #1e293b' }}>
        {[
          { id: 'all',           label: 'Tous' },
          { id: 'unread',        label: `Non lus${unreadCount ? ` (${unreadCount})` : ''}` },
          { id: 'notifications', label: 'Notifs' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => onFilterChange(f.id)}
            style={{
              padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: 600, fontFamily: 'Sora, sans-serif',
              background: filter === f.id ? '#0891b2' : '#1e293b',
              color: filter === f.id ? '#fff' : '#64748b',
              transition: 'all .15s',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Liste */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ height: 70, borderRadius: 14, background: '#1e293b', opacity: 0.6 + i * 0.1 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#475569' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 600 }}>
              {filter === 'unread' ? 'Aucun message non lu' : 'Boîte vide'}
            </div>
          </div>
        ) : filtered.map(msg => (
          <MessageRow
            key={msg.id}
            msg={msg}
            selected={msg.id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

function MessageRow({ msg, selected, onSelect }) {
  const isNotif = msg.type_notification !== 'interne';
  const preview = (msg.contenu || '').replace(/\n/g, ' ').slice(0, 80);

  return (
    <div
      onClick={() => onSelect(msg)}
      style={{
        padding: '14px 16px',
        borderBottom: '1px solid #0f172a',
        cursor: 'pointer',
        background: selected ? '#0c1929' : msg.lu ? 'transparent' : '#0d1f2d',
        borderLeft: selected ? '3px solid #0891b2' : msg.lu ? '3px solid transparent' : '3px solid #22c55e',
        transition: 'background .12s',
        display: 'flex', gap: 12, alignItems: 'flex-start',
      }}
    >
      {isNotif
        ? <div style={{ width: 36, height: 36, borderRadius: 12, background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
            {msg.topic === 'alerte' ? '⚠️' : msg.topic === 'systeme' ? '⚙️' : '🔔'}
          </div>
        : <Avatar name={expLabel(msg)} role={msg.exp_role} size={36} />
      }
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
          <span style={{
            fontFamily: 'Sora, sans-serif', fontSize: 13,
            fontWeight: msg.lu ? 500 : 700,
            color: msg.lu ? '#94a3b8' : '#f8fafc',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%',
          }}>
            {isNotif ? 'Système' : expLabel(msg)}
          </span>
          <span style={{ fontSize: 10, color: '#475569', flexShrink: 0 }}>
            {fmtDate(msg.inserted_at || msg.date)}
          </span>
        </div>
        <div style={{
          fontFamily: 'Sora, sans-serif', fontSize: 12,
          fontWeight: msg.lu ? 400 : 600,
          color: msg.lu ? '#64748b' : '#cbd5e1',
          marginBottom: 3,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {msg.objet}
        </div>
        <div style={{ fontSize: 11, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {preview}
        </div>
      </div>
      {!msg.lu && (
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', flexShrink: 0, marginTop: 4 }} />
      )}
    </div>
  );
}

// ─── Vue : Détail d'un message ────────────────────────────────────────────────
function MessageDetail({ msgId, onBack, onDelete }) {
  const [msg, setMsg]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!msgId) return;
    setLoading(true);
    mFetch(`${API_BASE}/messages?id=${msgId}`)
      .then(setMsg)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [msgId]);

  if (loading) return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {[1,2,3].map(i => <div key={i} style={{ height: 60, borderRadius: 14, background: '#1e293b' }} />)}
    </div>
  );

  if (!msg) return (
    <div style={{ padding: 48, textAlign: 'center', color: '#475569' }}>Message introuvable</div>
  );

  const sender = expLabel(msg);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 20, padding: 4 }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>{msg.objet}</div>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{fmtDate(msg.inserted_at || msg.date)}</div>
        </div>
        <button
          onClick={() => onDelete(msg.id)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 18, padding: 4 }}
          title="Supprimer"
        >🗑</button>
      </div>

      {/* Expéditeur */}
      <div style={{ padding: '16px', borderBottom: '1px solid #1e293b', display: 'flex', gap: 12, alignItems: 'center' }}>
        <Avatar name={sender} role={msg.exp_role} size={42} />
        <div>
          <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 13, fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
            {sender}
            {msg.exp_role && roleBadge(msg.exp_role)}
          </div>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
            {msg.topic && msg.topic !== 'direct' && (
              <span style={{ marginRight: 8, color: '#0891b2' }}>#{msg.topic}</span>
            )}
            {msg.type_notification !== 'interne' && (
              <span style={{ color: '#f59e0b' }}>Notification système</span>
            )}
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
        <div style={{
          fontFamily: 'Sora, sans-serif', fontSize: 14, lineHeight: 1.7,
          color: '#cbd5e1', whiteSpace: 'pre-wrap',
        }}>
          {msg.contenu}
        </div>

        {/* Payload JSON si présent */}
        {msg.payload && (
          <div style={{ marginTop: 20, padding: 16, background: '#0f172a', borderRadius: 12, border: '1px solid #1e293b' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.6px' }}>Données</div>
            <pre style={{ fontSize: 11, color: '#64748b', overflow: 'auto', margin: 0 }}>
              {JSON.stringify(msg.payload, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Vue : Envoyés ────────────────────────────────────────────────────────────
function SentList({ onSelect }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    mFetch(`${API_BASE}/messages?action=sent`)
      .then(setMessages)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[1,2,3].map(i => <div key={i} style={{ height: 70, borderRadius: 14, background: '#1e293b' }} />)}
    </div>
  );

  if (messages.length === 0) return (
    <div style={{ padding: 48, textAlign: 'center', color: '#475569' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📤</div>
      <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 600 }}>Aucun message envoyé</div>
    </div>
  );

  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      {messages.map(msg => {
        const destLabel = msg.destinataire_prenom || msg.destinataire_nom
          ? `${msg.destinataire_prenom || ''} ${msg.destinataire_nom || ''}`.trim()
          : msg.destinataire_username || 'Destinataire';
        return (
          <div
            key={msg.id}
            onClick={() => onSelect(msg)}
            style={{
              padding: '14px 16px', borderBottom: '1px solid #0f172a',
              cursor: 'pointer', display: 'flex', gap: 12,
            }}
          >
            <div style={{ fontSize: 20 }}>📤</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 13, fontWeight: 600, color: '#cbd5e1' }}>
                  À : {destLabel}
                </span>
                <span style={{ fontSize: 10, color: '#475569' }}>{fmtDate(msg.inserted_at)}</span>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {msg.objet}
              </div>
            </div>
            {msg.lu && <span style={{ fontSize: 10, color: '#22c55e', flexShrink: 0, alignSelf: 'center' }}>✓ Lu</span>}
          </div>
        );
      })}
    </div>
  );
}

// ─── Formulaire de composition ────────────────────────────────────────────────
function ComposeForm({ onSent, onCancel }) {
  const { user } = useAuth();
  const [destinataires, setDestinataires] = useState({ grouped: {}, flat: [] });
  const [selected, setSelected]   = useState([]);
  const [objet, setObjet]         = useState('');
  const [contenu, setContenu]     = useState('');
  const [sending, setSending]     = useState(false);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    mFetch(`${API_BASE}/messages?action=destinataires&role=${user?.role}&magasin_id=${user?.magasin_id || ''}`)
      .then(setDestinataires)
      .catch(console.error);
  }, [user]);

  const toggleDest = (u) => {
    setSelected(prev =>
      prev.find(p => p.id === u.id)
        ? prev.filter(p => p.id !== u.id)
        : [...prev, u]
    );
  };

  const filteredFlat = destinataires.flat.filter(u => {
    const label = `${u.prenom || ''} ${u.nom || u.username || ''}`.toLowerCase();
    return label.includes(search.toLowerCase());
  });

  const handleSend = async () => {
    if (!selected.length) return setError('Choisissez au moins un destinataire');
    if (!objet.trim())    return setError('L\'objet est requis');
    if (!contenu.trim())  return setError('Le message est vide');
    setSending(true);
    setError('');
    try {
      await mFetch(`${API_BASE}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          destinataires: selected.map(u => u.id),
          objet: objet.trim(),
          contenu: contenu.trim(),
          topic: 'direct',
          type_notification: 'interne',
        }),
      });
      onSent({ title: 'Message envoyé', body: `À ${selected.length} destinataire${selected.length > 1 ? 's' : ''}`, icon: '✉️' });
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 20 }}>←</button>
        <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, color: '#f8fafc', flex: 1, margin: 0 }}>Nouveau message</h3>
        <button
          onClick={handleSend}
          disabled={sending}
          style={{
            padding: '8px 18px', borderRadius: 12, border: 'none', cursor: sending ? 'default' : 'pointer',
            background: sending ? '#1e293b' : 'linear-gradient(135deg,#0891b2,#0e7490)',
            color: '#fff', fontFamily: 'Sora, sans-serif', fontSize: 13, fontWeight: 700,
            opacity: sending ? .6 : 1, transition: 'all .15s',
          }}
        >
          {sending ? 'Envoi…' : 'Envoyer'}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && (
          <div style={{ padding: '10px 14px', background: '#450a0a', borderRadius: 10, border: '1px solid #ef4444', color: '#fca5a5', fontSize: 12, fontFamily: 'Sora, sans-serif' }}>
            {error}
          </div>
        )}

        {/* Destinataires */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.6px', display: 'block', marginBottom: 8 }}>
            Destinataires
          </label>

          {/* Sélectionnés */}
          {selected.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {selected.map(u => (
                <span
                  key={u.id}
                  onClick={() => toggleDest(u)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '4px 10px', borderRadius: 20,
                    background: `${roleColor(u.role)}22`, border: `1px solid ${roleColor(u.role)}44`,
                    color: roleColor(u.role), fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'Sora, sans-serif',
                  }}
                >
                  {u.label} <span style={{ opacity: .6 }}>✕</span>
                </span>
              ))}
            </div>
          )}

          <div
            onClick={() => setShowPicker(!showPicker)}
            style={{
              padding: '10px 14px', borderRadius: 12, background: '#1e293b',
              border: '1px solid #334155', cursor: 'pointer',
              fontFamily: 'Sora, sans-serif', fontSize: 13, color: '#64748b',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}
          >
            <span>{selected.length ? `${selected.length} sélectionné${selected.length > 1 ? 's' : ''}` : 'Choisir des destinataires…'}</span>
            <span style={{ fontSize: 10, opacity: .6 }}>{showPicker ? '▲' : '▼'}</span>
          </div>

          {showPicker && (
            <div style={{ marginTop: 6, background: '#1e293b', borderRadius: 12, border: '1px solid #334155', overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', borderBottom: '1px solid #334155' }}>
                <input
                  placeholder="Rechercher…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    width: '100%', background: 'transparent', border: 'none', outline: 'none',
                    fontFamily: 'Sora, sans-serif', fontSize: 13, color: '#f8fafc',
                  }}
                />
              </div>
              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                {filteredFlat.map(u => {
                  const isSelected = !!selected.find(s => s.id === u.id);
                  const label = `${u.prenom || ''} ${u.nom || u.username || ''}`.trim();
                  return (
                    <div
                      key={u.id}
                      onClick={() => toggleDest({ ...u, label })}
                      style={{
                        padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
                        cursor: 'pointer',
                        background: isSelected ? '#0c2240' : 'transparent',
                        borderBottom: '1px solid #0f172a',
                      }}
                    >
                      <Avatar name={label} role={u.role} size={30} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 13, fontWeight: 600, color: '#f8fafc' }}>{label}</div>
                      </div>
                      {roleBadge(u.role)}
                      {isSelected && <span style={{ color: '#22c55e', fontSize: 16 }}>✓</span>}
                    </div>
                  );
                })}
                {filteredFlat.length === 0 && (
                  <div style={{ padding: 20, textAlign: 'center', color: '#475569', fontSize: 13 }}>Aucun résultat</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Objet */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.6px', display: 'block', marginBottom: 8 }}>
            Objet
          </label>
          <input
            value={objet}
            onChange={e => setObjet(e.target.value)}
            placeholder="Sujet du message…"
            maxLength={120}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '10px 14px', borderRadius: 12,
              background: '#1e293b', border: '1px solid #334155',
              fontFamily: 'Sora, sans-serif', fontSize: 14, color: '#f8fafc',
              outline: 'none',
            }}
          />
        </div>

        {/* Contenu */}
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.6px', display: 'block', marginBottom: 8 }}>
            Message
          </label>
          <textarea
            value={contenu}
            onChange={e => setContenu(e.target.value)}
            placeholder="Rédigez votre message…"
            rows={8}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '12px 14px', borderRadius: 12,
              background: '#1e293b', border: '1px solid #334155',
              fontFamily: 'Sora, sans-serif', fontSize: 14, color: '#f8fafc',
              outline: 'none', resize: 'vertical', lineHeight: 1.6,
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────────────────────
export default function Messagerie({ onUnreadChange }) {
  const { user } = useAuth();

  const [inbox,   setInbox]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [view,    setView]    = useState('inbox'); // inbox | sent | detail | compose
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [filter,  setFilter]  = useState('all');
  const [toast,   setToast]   = useState(null);

  const pollRef = useRef(null);

  // ─── Chargement inbox ──────────────────────────────────────────────────────
  const loadInbox = useCallback(async () => {
    try {
      const data = await mFetch(`${API_BASE}/messages`);
      setInbox(data);
      const unread = data.filter(m => !m.lu).length;
      onUnreadChange?.(unread);
    } catch (e) {
      console.error('[Messagerie] loadInbox:', e.message);
    } finally {
      setLoading(false);
    }
  }, [onUnreadChange]);

  useEffect(() => {
    loadInbox();
    // Polling toutes les 60s
    pollRef.current = setInterval(loadInbox, 60_000);
    return () => clearInterval(pollRef.current);
  }, [loadInbox]);

  // ─── Actions ───────────────────────────────────────────────────────────────
  const handleSelect = (msg) => {
    setSelectedMsg(msg);
    setView('detail');
    // Marquer lu localement immédiatement
    setInbox(prev => prev.map(m => m.id === msg.id ? { ...m, lu: true } : m));
    onUnreadChange?.(inbox.filter(m => !m.lu && m.id !== msg.id).length);
  };

  const handleDelete = async (id) => {
    try {
      await mFetch(`${API_BASE}/messages?id=${id}`, { method: 'DELETE' });
      setInbox(prev => prev.filter(m => m.id !== id));
      setView('inbox');
    } catch (e) {
      setToast({ title: 'Erreur', body: e.message, icon: '❌' });
    }
  };

  const handleSent = (toastData) => {
    setToast(toastData);
    setView('inbox');
    loadInbox();
  };

  // ─── Tab switcher interne ──────────────────────────────────────────────────
  const navTabs = [
    { id: 'inbox',   label: 'Reçus',   icon: '📥' },
    { id: 'sent',    label: 'Envoyés', icon: '📤' },
    { id: 'compose', label: 'Écrire',  icon: '✏️' },
  ];

  const showNav = view !== 'detail' && view !== 'compose';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 64px)',  // hauteur moins la tabbar
      background: '#0a0f1a',
      fontFamily: 'Sora, sans-serif',
    }}>
      {/* CSS inline */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(16px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      {/* Navigation interne */}
      {showNav && (
        <div style={{
          display: 'flex', borderBottom: '1px solid #1e293b',
          background: '#0a0f1a', padding: '0 16px',
        }}>
          {navTabs.map(t => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              style={{
                flex: 1, padding: '14px 0', background: 'none', border: 'none',
                borderBottom: view === t.id ? '2px solid #0891b2' : '2px solid transparent',
                color: view === t.id ? '#0891b2' : '#475569',
                fontFamily: 'Sora, sans-serif', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 4, transition: 'all .15s',
              }}
            >
              <span style={{ fontSize: 18 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Corps */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {view === 'inbox' && (
          <InboxList
            messages={inbox}
            onSelect={handleSelect}
            selectedId={selectedMsg?.id}
            loading={loading}
            filter={filter}
            onFilterChange={setFilter}
          />
        )}
        {view === 'sent' && (
          <SentList onSelect={(msg) => { setSelectedMsg(msg); setView('detail'); }} />
        )}
        {view === 'detail' && selectedMsg && (
          <MessageDetail
            msgId={selectedMsg.id}
            onBack={() => setView('inbox')}
            onDelete={handleDelete}
          />
        )}
        {view === 'compose' && (
          <ComposeForm
            onSent={handleSent}
            onCancel={() => setView('inbox')}
          />
        )}
      </div>

      {/* Toast notification */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
