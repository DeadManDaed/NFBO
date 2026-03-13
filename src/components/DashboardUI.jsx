import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';

// --- COMPOSANTS UTILITAIRES ---
const RenderValue = ({ value, suffix = "" }) => {
  if (value === null || value === undefined) return <span className="skeleton-text" style={{ width: '60px' }}></span>;
  return <>{value.toLocaleString('fr-FR')} {suffix}</>;
};

export function StatCard({ icon, label, value, sub, accent, delay, onClick }) {
  return (
    <div className={`stat-card fade-up stagger-${delay}`} style={{ '--accent-color': accent }} onClick={onClick}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
        <span style={{ fontSize:26 }}>{icon}</span>
        {sub && <span className={`badge badge-${accent === '#22c55e' ? 'green' : accent === '#f59e0b' ? 'amber' : accent === '#ef4444' ? 'red' : 'blue'}`}>{sub}</span>}
      </div>
      <div style={{ fontSize:24, fontWeight:800, lineHeight:1, marginBottom:4, color:'#f8fafc' }}>
        <RenderValue value={value} />
      </div>
      <div style={{ fontSize:11, fontWeight:500, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.6px' }}>{label}</div>
    </div>
  );
}

// ... (Garder SectionBlock, ActivityRow, StockRow, QuickAction, AlerteBanniere identiques)

// --- SOUS-COMPOSANT HEADER (Factorisé) ---
function UserHeader({ user, reload, logout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const nomRef = useRef(null);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  const handleMenuToggle = () => {
    if (nomRef.current) {
      const rect = nomRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 6, left: rect.left });
    }
    setMenuOpen(!menuOpen);
  };

  return (
    <div className="fade-up" style={{ padding: '20px 0 24px', position: 'relative', zIndex: 50 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.8px' }}>{greeting()}</p>
          <h1 ref={nomRef} onClick={handleMenuToggle} style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2, color: 'var(--text)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {user?.nom || user?.username || 'Utilisateur'}
            <span style={{ fontSize: 14, color: 'var(--muted)', transform: menuOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▾</span>
          </h1>
          {menuOpen && (
            <>
              <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 9998 }} />
              <div style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 9999, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', minWidth: 200 }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{user?.prenom} {user?.nom}</p>
                  <p style={{ fontSize: 11, color: 'var(--muted)', margin: '2px 0 0' }}>@{user?.username} · {user?.role}</p>
                </div>
                <button onClick={() => { setMenuOpen(false); logout(); }} style={{ width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', color: 'var(--red)', fontSize: 13, fontWeight: 600 }}>🚪 Se déconnecter</button>
              </div>
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={reload} style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', cursor: 'pointer' }}>🔄</button>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg,#16a34a,#065f46)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🌿</div>
        </div>
      </div>
    </div>
  );
}

// --- ÉCRAN PRINCIPAL ---
export function HomeScreen({ user, data, onNavigate, reload }) {
  const { logout } = useAuth();
  return (
    <div style={{ padding: '0 16px', position: 'relative' }}>
      <UserHeader user={user} reload={reload} logout={logout} />
      
      {/* Hero Card */}
      <div className="fade-up stagger-1" style={{ background: 'linear-gradient(135deg,#14532d 0%,#166534 50%,#15803d 100%)', borderRadius: 24, padding: '22px 20px', marginBottom: 20, position: 'relative', zIndex: 0 }} onClick={() => onNavigate('audit')}>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.65)', textTransform: 'uppercase', marginBottom: 8 }}>Valeur totale du stock</p>
        <p style={{ fontSize: 30, fontWeight: 800, color: '#fff', lineHeight: 1, marginBottom: 12 }}>
          <RenderValue value={data.valeurStock} suffix="FCFA" />
        </p>
      </div>

      <AlerteBanniere alertes={data.alertes} />

      {/* Reste du contenu (Stats Grid, SectionBlock, etc.) */}
    </div>
  );
}

// --- COMPOSANT GLOBAL ---
export function BackToast() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const handler = () => {
      setVisible(true);
      setTimeout(() => setVisible(false), 2000);
    };
    window.addEventListener('nfbo:back-toast', handler);
    return () => window.removeEventListener('nfbo:back-toast', handler);
  }, []);

  if (!visible) return null;
  return (
    <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', background: 'rgba(30,30,30,0.92)', color: '#fff', borderRadius: 24, padding: '10px 20px', fontSize: 13, fontWeight: 600, zIndex: 10000, boxShadow: '0 4px 16px rgba(0,0,0,0.4)', pointerEvents: 'none' }}>
      🚪 Appuyez encore pour quitter
    </div>
  );
}
