//src/components/DashboardUI.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';

// Composant utilitaire pour gérer l'affichage ou le chargement (Skeleton)
const RenderValue = ({ value, suffix = "" }) => {
  if (value === null || value === undefined) {
    return <span className="skeleton-text" style={{ width: '60px' }}></span>;
  }
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

export function SectionBlock({ title, linkLabel, onLink, children, delay = 0 }) {
  return (
    <div className="card fade-up" style={{ animationDelay: `${delay}s` }}>
      <div className="section-header" style={{ padding:'16px 16px 0' }}>
        <span className="section-title">{title}</span>
        {linkLabel && <span className="section-link" onClick={onLink}>{linkLabel} →</span>}
      </div>
      {children}
    </div>
  );
}

export function ActivityRow({ icon, title, sub, right, rightSub, accent }) {
  return (
    <div className="list-item">
      <div style={{ width:40, height:40, borderRadius:12, background:`${accent}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:18 }}>
        {icon}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{title}</div>
        <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{sub}</div>
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <div style={{ fontSize:13, fontWeight:700, color: accent }}>{right}</div>
        {rightSub && <div style={{ fontSize:10, color:'var(--muted)', marginTop:2 }}>{rightSub}</div>}
      </div>
    </div>
  );
}

export function StockRow({ stock, rank }) {
  const val = (parseFloat(stock.stock_actuel)||0) * (parseFloat(stock.prix_ref)||0); 
  const maxVal = 1_000_000;
  const pct = Math.min(100, (val / maxVal) * 100);
  const isLow = stock.stock_actuel < 10;

  return (
    <div className="list-item" style={{ flexDirection:'column', alignItems:'stretch', gap:8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
          <span style={{ fontSize:11, fontWeight:700, color:'var(--muted)', width:18 }}>#{rank}</span>
          <span style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{stock.description}</span>
          {isLow && <span className="badge badge-red">Faible</span>}
        </div>
        <span style={{ fontWeight:700, fontSize:13, color:'var(--green)', flexShrink:0, marginLeft:8 }}>
          {val.toLocaleString('fr-FR')} F
        </span>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div className="prog-track" style={{ flex:1 }}>
          <div className="prog-fill" style={{ width:`${pct}%`, background: isLow ? 'var(--red)' : 'var(--green)' }} />
        </div>
        <span style={{ fontSize:11, color:'var(--muted)', flexShrink:0 }}>{stock.stock_actuel} {stock.unite}</span>
      </div>
    </div>
  );
}

export function QuickAction({ icon, label, accent, onClick, delay }) {
  return (
    <div onClick={onClick} className={`fade-up stagger-${delay}`} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, cursor:'pointer', WebkitTapHighlightColor:'transparent' }}>
      <div style={{ width:56, height:56, borderRadius:18, background:`${accent}18`, border:`1.5px solid ${accent}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>
        {icon}
      </div>
      <span style={{ fontSize:10.5, fontWeight:600, color:'var(--muted)', textAlign:'center', maxWidth:60, lineHeight:1.3 }}>{label}</span>
    </div>
  );
}

export function AlerteBanniere({ alertes, onNavigate }) {
  if (!alertes?.length) return null;

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #7f1d1d, #991b1b)',
        borderRadius: 16,
        padding: '14px 16px',
        marginBottom: 16,
        border: '1px solid #ef444440',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fca5a5' }}>
            {alertes.length} alerte{alertes.length > 1 ? 's' : ''} stock faible
          </span>
        </div>
        <span style={{ fontSize: 11, color: '#fca5a5', opacity: .7 }}>non cliquable</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {alertes.slice(0, 4).map((a, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#fecaca', fontWeight: 500 }}>
              {a.description || a.lot_description}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#f87171' }}>
              {parseFloat(a.stock_actuel).toLocaleString('fr-FR')} {a.unite}
            </span>
          </div>
        ))}
        {alertes.length > 4 && (
          <span style={{ fontSize: 11, color: '#fca5a5', opacity: .7, marginTop: 2 }}>
            +{alertes.length - 4} autres lots…
          </span>
        )}
      </div>
    </div>
  );
}

// ─── ÉCRAN HOME (LE CŒUR DU DASHBOARD) ───
export function HomeScreen({ user, data, onNavigate, reload }) {
  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  const [menuOpen, setMenuOpen] = useState(false);
  const { logout } = useAuth();
  const nomRef = useRef(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  return (
    <div style={{ padding:'0 16px', position: 'relative' }}>
      {/* Header */}
      <div className="fade-up" style={{ padding:'20px 0 24px', position: 'relative', zIndex: 50 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <p style={{ fontSize:12, fontWeight:500, color:'var(--muted)', marginBottom:4, textTransform:'uppercase', letterSpacing:'.8px' }}>{greeting()}</p>

            {/* Nom cliquable */}
            <h1
              ref={nomRef}
              onClick={() => {
                if (nomRef.current) {
                  const rect = nomRef.current.getBoundingClientRect();
                  setMenuPos({ top: rect.bottom + 6, left: rect.left });
                }
                setMenuOpen(v => !v);
              }}
              style={{ fontSize:22, fontWeight:800, lineHeight:1.2, color:'var(--text)',
                cursor:'pointer', display:'inline-flex', alignItems:'center', gap:8,
                WebkitTapHighlightColor:'transparent' }}
            >
              {user?.nom || user?.username || 'Utilisateur'}
              <span style={{ fontSize:14, color:'var(--muted)', fontWeight:400,
                transform: menuOpen ? 'rotate(180deg)' : 'none',
                display:'inline-block', transition:'transform .2s' }}>▾</span>
            </h1>

            {/* Menu */}
            {menuOpen && (
              <>
                <div onClick={() => setMenuOpen(false)}
                  style={{ position:'fixed', inset:0, zIndex:9998 }} />
                <div style={{
                  position:'fixed',
                  top: menuPos.top,
                  left: menuPos.left,
                  zIndex:9999,
                  background:'var(--surface2)', border:'1px solid var(--border)',
                  borderRadius:12, overflow:'hidden',
                  boxShadow:'0 8px 32px rgba(0,0,0,0.4)',
                  minWidth:200,
                }}>
                  <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)' }}>
                    <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', margin:0 }}>
                      {user?.prenom ? `${user.prenom} ${user.nom}` : user?.username}
                    </p>
                    <p style={{ fontSize:11, color:'var(--muted)', margin:'2px 0 0' }}>
                      @{user?.username} · {user?.role}
                    </p>
                  </div>
                  <button
                    onClick={() => { setMenuOpen(false); logout(); }}
                    style={{
                      width:'100%', padding:'12px 16px',
                      background:'transparent', border:'none',
                      display:'flex', alignItems:'center', gap:10,
                      cursor:'pointer', color:'var(--red)',
                      fontSize:13, fontWeight:600, textAlign:'left',
                    }}
                  >
                    🚪 Se déconnecter
                  </button>
                </div>
              </>
            )}

            <div style={{ marginTop:6, display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--green)',
                display:'inline-block', boxShadow:'0 0 0 3px rgba(34,197,94,.25)' }}/>
              <span style={{ fontSize:11, color:'var(--muted)', fontWeight:500 }}>
                {user?.role === 'superadmin' ? 'Vue globale'
                 : user?.role === 'auditeur' ? 'Vue globale'
                 : `Magasin · ${user?.magasin_nom || 'N/A'}`}
              </span>
            </div>
          </div>

          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button
              onClick={reload}
              style={{ width:44, height:44, borderRadius:14, background:'var(--color-surface-alt)', border:'1px solid var(--color-border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, cursor:'pointer' }}
              title="Actualiser"
            >
              🔄
            </button>
            <div style={{ width:44, height:44, borderRadius:14, background:'linear-gradient(135deg,#16a34a,#065f46)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🌿</div>
          </div>
        </div>
      </div>

      {/* Hero Card - Valeur Stock */}
      <div className="fade-up stagger-1" style={{ background:'linear-gradient(135deg,#14532d 0%,#166534 50%,#15803d 100%)', borderRadius:24, padding:'22px 20px', marginBottom:20, position:'relative', zIndex:0 }} onClick={() => onNavigate('audit')}>
        <p style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,.65)', textTransform:'uppercase', letterSpacing:'.8px', marginBottom:8 }}>Valeur totale du stock</p>
        <p style={{ fontSize:30, fontWeight:800, color:'#fff', lineHeight:1, marginBottom:12 }}>
          <RenderValue value={data.valeurStock} suffix="FCFA" />
        </p>
        <div style={{ display:'flex', gap:16 }}>
            <div>
                <p style={{ fontSize:10, color:'rgba(255,255,255,.55)', marginBottom:2 }}>Lots actifs</p>
                <p style={{ fontSize:15, fontWeight:700, color:'#fff' }}>{data.topStocks?.length || 0}</p>
            </div>
            <div style={{ width:1, background:'rgba(255,255,255,.15)' }}/>
            <div>
                <p style={{ fontSize:10, color:'rgba(255,255,255,.55)', marginBottom:2 }}>Alertes</p>
                <p style={{ fontSize:15, fontWeight:700, color: data.alertes?.length > 0 ? '#fbbf24' : '#fff' }}>{data.alertes?.length || 0}</p>
            </div>
        </div>
      </div>

      <AlerteBanniere alertes={data.alertes} />

      {/* Grid Stat Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
        <StatCard icon="📥" label="Admissions" value={data.totalAdmissions} accent="#22c55e" delay={1} onClick={() => onNavigate('admissions')} />
        <StatCard icon="📤" label="Retraits" value={data.totalRetraits} accent="#f59e0b" delay={2} onClick={() => onNavigate('retraits')} />
        <StatCard icon="🔄" label="Transferts" value={data.totalTransferts} accent="#3b82f6" delay={3} onClick={() => onNavigate('transferts')} />
        <StatCard icon="⚠️" label="Alertes" value={data.alertes?.length} accent={data.alertes?.length > 0 ? '#ef4444' : '#22c55e'} delay={4} onClick={() => onNavigate('stock')} />
      </div>

      {/* Recent Admissions */}
      <SectionBlock title="Admissions récentes" linkLabel="Tout voir" onLink={() => onNavigate('admissions')} delay={0.2}>
        {data.admissionsRecentes.length === 0 ? <p style={{ padding:20, textAlign:'center', color:'var(--muted)' }}>Aucune donnée</p> : 
          data.admissionsRecentes.slice(0,4).map((a,i) => (
            <ActivityRow key={i} icon="📥" accent="#22c55e" title={a.lot_description} sub={`${a.quantite} ${a.unite}`} right={`${(a.quantite * a.prix_ref).toLocaleString()} F`} />
          ))
        }
      </SectionBlock>
    </div>
  );
}

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
    <div style={{
      position: 'fixed', bottom: 90, left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(30,30,30,0.92)',
      color: '#fff', borderRadius: 24,
      padding: '10px 20px', fontSize: 13,
      fontWeight: 600, zIndex: 9999,
      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
    }}>
      🚪 Appuyez encore pour quitter
    </div>
  );
}
