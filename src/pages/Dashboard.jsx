import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useStocks } from '../hooks/useStocks';
import api from '../services/api';

// ─── Imports des modules — tous présents dans src/pages/ ─────────────────────
import Administration  from './Administration';
import Admissions      from './Admissions';
import Retraits        from './Retraits';
import Transferts      from './Transferts';
import Audit           from './Audit';
import Stock           from './Stock';
import DefinitionLots  from './DefinitionLots';

// Messagerie n'a pas encore son fichier dédié — placeholder léger
function Messagerie() {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'60vh', gap:16 }}>
      <div style={{ fontSize:56 }}>✉️</div>
      <p style={{ fontFamily:'Sora,sans-serif', fontSize:18, fontWeight:700, color:'#0891b2' }}>Messagerie</p>
      <p style={{ fontFamily:'Sora,sans-serif', fontSize:13, color:'#94a3b8' }}>Module à venir</p>
    </div>
  );
}

// ─── Config de la tab bar ─────────────────────────────────────────────────────
const TABS = [
  { id: 'home',           label: 'Accueil',   icon: HomeIcon,       roles: ['all'] },
  { id: 'admissions',     label: 'Entrées',   icon: AdmIcon,        roles: ['superadmin','admin','stock','auditeur'] },
  { id: 'retraits',       label: 'Sorties',   icon: RetIcon,        roles: ['superadmin','admin','caisse'] },
  { id: 'transferts',     label: 'Transf.',   icon: TransfIcon,     roles: ['superadmin','admin','stock','auditeur'] },
  { id: 'stock',          label: 'Stock',     icon: StockIcon,      roles: ['superadmin','admin','stock','auditeur'] },
  { id: 'audit',          label: 'Audit',     icon: AuditIcon,      roles: ['superadmin','admin','auditeur'] },
  { id: 'messagerie',     label: 'Messages',  icon: MsgIcon,        roles: ['all'] },
  { id: 'administration', label: 'Admin',     icon: AdminIcon,      roles: ['superadmin','admin'] },
];

const MODULE_MAP = {
  admissions:     Admissions,
  retraits:       Retraits,
  transferts:     Transferts,
  stock:          Stock,
  audit:          Audit,
  messagerie:     Messagerie,
  administration: Administration,
  definitionlots: DefinitionLots,
};

// ─── SVG Icons ────────────────────────────────────────────────────────────────
function HomeIcon({ active })  { return <svg width="22" height="22" viewBox="0 0 24 24" fill={active?'currentColor':'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>; }
function AdmIcon({ active })   { return <svg width="22" height="22" viewBox="0 0 24 24" fill={active?'currentColor':'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>; }
function RetIcon({ active })   { return <svg width="22" height="22" viewBox="0 0 24 24" fill={active?'currentColor':'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>; }
function TransfIcon({ active }){ return <svg width="22" height="22" viewBox="0 0 24 24" fill={active?'currentColor':'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>; }
function StockIcon({ active }) { return <svg width="22" height="22" viewBox="0 0 24 24" fill={active?'currentColor':'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>; }
function AuditIcon({ active }) { return <svg width="22" height="22" viewBox="0 0 24 24" fill={active?'currentColor':'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>; }
function MsgIcon({ active })   { return <svg width="22" height="22" viewBox="0 0 24 24" fill={active?'currentColor':'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>; }
function AdminIcon({ active }) { return <svg width="22" height="22" viewBox="0 0 24 24" fill={active?'currentColor':'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/><circle cx="12" cy="8" r="1.5" fill="currentColor"/></svg>; }

// ─── Styles globaux injectés une seule fois ───────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:         #0a0f1e;
    --surface:    #111827;
    --surface2:   #1e2a3a;
    --border:     rgba(255,255,255,0.07);
    --green:      #22c55e;
    --green-dim:  #166534;
    --amber:      #f59e0b;
    --red:        #ef4444;
    --blue:       #3b82f6;
    --text:       #f1f5f9;
    --muted:      #64748b;
    --tab-h:      68px;
    --safe-bottom: env(safe-area-inset-bottom, 0px);
  }

  html, body, #root { height: 100%; background: var(--bg); font-family: 'Sora', sans-serif; color: var(--text); overscroll-behavior: none; }

  ::-webkit-scrollbar { width: 0; }

  /* ── Animations ── */
  @keyframes fadeUp   { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
  @keyframes slideIn  { from { opacity:0; transform:translateX(28px); } to { opacity:1; transform:translateX(0); } }
  @keyframes pulse2   { 0%,100%{opacity:1} 50%{opacity:.5} }
  @keyframes ripple   { to { transform:scale(4); opacity:0; } }
  @keyframes tabPop   { 0%{transform:scale(1)} 40%{transform:scale(1.25)} 100%{transform:scale(1)} }

  .fade-up { animation: fadeUp .38s cubic-bezier(.22,1,.36,1) both; }
  .slide-in { animation: slideIn .32s cubic-bezier(.22,1,.36,1) both; }
  .stagger-1 { animation-delay: .06s; }
  .stagger-2 { animation-delay: .12s; }
  .stagger-3 { animation-delay: .18s; }
  .stagger-4 { animation-delay: .24s; }

  /* ── Cards ── */
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    overflow: hidden;
    transition: transform .2s, box-shadow .2s;
  }
  .card:active { transform: scale(.975); }

  /* ── Tab bar ── */
  .tab-bar {
    position: fixed; bottom: 0; left: 0; right: 0;
    height: calc(var(--tab-h) + var(--safe-bottom));
    background: rgba(17,24,39,.92);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border-top: 1px solid var(--border);
    display: flex; align-items: flex-start; padding-top: 8px;
    z-index: 100;
  }
  .tab-item {
    flex: 1; display:flex; flex-direction:column; align-items:center; gap:3px;
    cursor:pointer; padding: 4px 2px;
    -webkit-tap-highlight-color: transparent;
    position: relative; overflow: hidden;
  }
  .tab-item .tab-label {
    font-size: 9.5px; font-weight: 600; letter-spacing:.2px;
    transition: color .2s;
  }
  .tab-item.active .icon-wrap { color: var(--green); }
  .tab-item.active .tab-label { color: var(--green); }
  .tab-item:not(.active) .icon-wrap { color: var(--muted); }
  .tab-item:not(.active) .tab-label { color: var(--muted); }
  .tab-item.active .icon-wrap { animation: tabPop .3s cubic-bezier(.22,1,.36,1); }
  .tab-dot {
    position: absolute; top: 4px; right: calc(50% - 14px);
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--red); border: 2px solid var(--bg);
  }

  /* ── Badge ── */
  .badge {
    display: inline-flex; align-items: center; padding: 2px 9px;
    border-radius: 99px; font-size: 10px; font-weight: 700; letter-spacing:.4px;
    text-transform: uppercase;
  }
  .badge-green { background: rgba(34,197,94,.15); color: var(--green); }
  .badge-amber { background: rgba(245,158,11,.15); color: var(--amber); }
  .badge-red   { background: rgba(239,68,68,.15);  color: var(--red); }
  .badge-blue  { background: rgba(59,130,246,.15); color: var(--blue); }
  .badge-muted { background: rgba(100,116,139,.15); color: var(--muted); }

  /* ── Stat Card ── */
  .stat-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 18px 16px;
    cursor: pointer;
    transition: transform .18s, box-shadow .18s;
    position: relative; overflow: hidden;
  }
  .stat-card::before {
    content:''; position:absolute; inset:0;
    background: radial-gradient(circle at 80% 20%, var(--accent-color, transparent) 0%, transparent 65%);
    opacity: .08;
    pointer-events: none;
  }
  .stat-card:active { transform: scale(.96); }

  /* ── List item ── */
  .list-item {
    display: flex; align-items: center; gap: 12px;
    padding: 13px 16px;
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    transition: background .15s;
    -webkit-tap-highlight-color: transparent;
  }
  .list-item:last-child { border-bottom: none; }
  .list-item:active { background: rgba(255,255,255,.04); }

  /* ── Section header ── */
  .section-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 0 2px 12px;
  }
  .section-title { font-size: 15px; font-weight: 700; color: var(--text); }
  .section-link  { font-size: 12px; font-weight: 600; color: var(--green); cursor: pointer; }

  /* ── Module header ── */
  .module-header {
    display: flex; align-items: center; gap: 12px;
    padding: 16px;
    border-bottom: 1px solid var(--border);
    position: sticky; top: 0;
    background: rgba(17,24,39,.95);
    backdrop-filter: blur(20px);
    z-index: 10;
  }
  .back-btn {
    width: 36px; height: 36px; border-radius: 10px;
    background: var(--surface2); border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    color: var(--text); flex-shrink: 0;
    transition: background .15s;
  }
  .back-btn:active { background: rgba(255,255,255,.1); }

  /* ── Progress bar ── */
  .prog-track { height: 4px; background: rgba(255,255,255,.08); border-radius: 99px; overflow: hidden; }
  .prog-fill  { height: 100%; border-radius: 99px; transition: width .6s cubic-bezier(.22,1,.36,1); }

  /* ── Alert strip ── */
  .alert-strip {
    display: flex; align-items: flex-start; gap: 10px;
    background: rgba(245,158,11,.1);
    border: 1px solid rgba(245,158,11,.25);
    border-radius: 16px; padding: 14px;
  }

  /* ── Scrollable content area ── */
  .page-scroll {
    height: 100dvh;
    overflow-y: auto;
    padding-bottom: calc(var(--tab-h) + var(--safe-bottom) + 16px);
    -webkit-overflow-scrolling: touch;
  }
`;

// ─── Hook données dashboard ───────────────────────────────────────────────────
function useDashboardData(magasinId, stocks) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [admissions, retraits] = await Promise.all([
        api.getAdmissions().catch(() => []),
        api.getRetraits().catch(() => []),
      ]);
      const adm = magasinId ? admissions.filter(a => a.magasin_id === magasinId) : admissions;
      const ret = magasinId ? retraits.filter(r => r.magasin_id === magasinId) : retraits;
      const valeurStock = (stocks || []).reduce((s, x) => s + x.stock_actuel * x.prix_ref, 0);
      const alertes = (stocks || []).filter(s => s.stock_actuel < 10);

      setData({
        totalAdmissions: adm.length,
        totalRetraits: ret.length,
        totalTransferts: ret.filter(r => r.type_retrait === 'magasin').length,
        valeurStock,
        admissionsRecentes: adm.slice(0, 8),
        retraitsRecents: ret.slice(0, 8),
        alertes,
        topStocks: (stocks || []).sort((a, b) => b.stock_actuel * b.prix_ref - a.stock_actuel * a.prix_ref).slice(0, 8),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [magasinId, stocks]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, reload: load };
}

// ─── Composants UI atomiques ──────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, accent, delay, onClick }) {
  return (
    <div className={`stat-card fade-up stagger-${delay}`} style={{ '--accent-color': accent }} onClick={onClick}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
        <span style={{ fontSize:26 }}>{icon}</span>
        {sub && <span className={`badge badge-${accent === '#22c55e' ? 'green' : accent === '#f59e0b' ? 'amber' : accent === '#ef4444' ? 'red' : 'blue'}`}>{sub}</span>}
      </div>
      <div style={{ fontSize:24, fontWeight:800, lineHeight:1, marginBottom:4, color:'#f8fafc' }}>{value}</div>
      <div style={{ fontSize:11, fontWeight:500, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.6px' }}>{label}</div>
    </div>
  );
}

function SectionBlock({ title, linkLabel, onLink, children, delay = 0 }) {
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

function ActivityRow({ icon, title, sub, right, rightSub, accent }) {
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

function StockRow({ stock, rank }) {
  const val = stock.stock_actuel * stock.prix_ref;
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

function QuickAction({ icon, label, accent, onClick, delay }) {
  return (
    <div
      onClick={onClick}
      className={`fade-up stagger-${delay}`}
      style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, cursor:'pointer', WebkitTapHighlightColor:'transparent' }}
    >
      <div style={{ width:56, height:56, borderRadius:18, background:`${accent}18`, border:`1.5px solid ${accent}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, transition:'transform .15s' }}
        onPointerDown={e => e.currentTarget.style.transform='scale(.88)'}
        onPointerUp={e => e.currentTarget.style.transform='scale(1)'}
        onPointerLeave={e => e.currentTarget.style.transform='scale(1)'}
      >
        {icon}
      </div>
      <span style={{ fontSize:10.5, fontWeight:600, color:'var(--muted)', textAlign:'center', maxWidth:60, lineHeight:1.3 }}>{label}</span>
    </div>
  );
}

// ─── Écran Home ───────────────────────────────────────────────────────────────
function HomeScreen({ user, data, loading, onNavigate }) {
  const fmt = n => n == null ? '…' : n.toLocaleString('fr-FR');

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  if (loading || !data) {
    return (
      <div style={{ padding:20, display:'flex', flexDirection:'column', gap:16 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ height:80, borderRadius:20, background:'var(--surface)', animation:'pulse2 1.4s ease infinite', animationDelay:`${i*.15}s` }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ padding:'0 16px' }}>
      {/* Hero header */}
      <div className="fade-up" style={{ padding:'20px 0 24px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <p style={{ fontSize:12, fontWeight:500, color:'var(--muted)', marginBottom:4, textTransform:'uppercase', letterSpacing:'.8px' }}>{greeting()}</p>
            <h1 style={{ fontSize:22, fontWeight:800, lineHeight:1.2, color:'var(--text)' }}>
              {user?.nom || user?.username || 'Utilisateur'}
            </h1>
            <div style={{ marginTop:6, display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--green)', display:'inline-block', boxShadow:'0 0 0 3px rgba(34,197,94,.25)' }}/>
              <span style={{ fontSize:11, color:'var(--muted)', fontWeight:500 }}>
                {user?.role === 'superadmin' ? 'Vue globale' : `Magasin · ${user?.magasin_nom || 'N/A'}`}
              </span>
            </div>
          </div>
          <div style={{ width:44, height:44, borderRadius:14, background:'linear-gradient(135deg,#16a34a,#065f46)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
            🌿
          </div>
        </div>
      </div>

      {/* Valeur stock — carte héro */}
      <div className="fade-up stagger-1" style={{ background:'linear-gradient(135deg,#14532d 0%,#166534 50%,#15803d 100%)', borderRadius:24, padding:'22px 20px', marginBottom:20, position:'relative', overflow:'hidden', cursor:'pointer' }}
        onClick={() => onNavigate('audit')}
      >
        <div style={{ position:'absolute', top:-20, right:-20, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,.06)' }}/>
        <div style={{ position:'absolute', bottom:-30, right:20, width:80, height:80, borderRadius:'50%', background:'rgba(255,255,255,.04)' }}/>
        <p style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,.65)', textTransform:'uppercase', letterSpacing:'.8px', marginBottom:8 }}>Valeur totale du stock</p>
        <p style={{ fontSize:30, fontWeight:800, color:'#fff', lineHeight:1, marginBottom:12 }}>
          {fmt(data.valeurStock)} <span style={{ fontSize:14, fontWeight:500, opacity:.7 }}>FCFA</span>
        </p>
        <div style={{ display:'flex', gap:16 }}>
          <div>
            <p style={{ fontSize:10, color:'rgba(255,255,255,.55)', marginBottom:2 }}>Lots actifs</p>
            <p style={{ fontSize:15, fontWeight:700, color:'#fff' }}>{data.topStocks.length}</p>
          </div>
          <div style={{ width:1, background:'rgba(255,255,255,.15)' }}/>
          <div>
            <p style={{ fontSize:10, color:'rgba(255,255,255,.55)', marginBottom:2 }}>Alertes faible</p>
            <p style={{ fontSize:15, fontWeight:700, color: data.alertes.length > 0 ? '#fbbf24' : '#fff' }}>{data.alertes.length}</p>
          </div>
          <div style={{ width:1, background:'rgba(255,255,255,.15)' }}/>
          <div>
            <p style={{ fontSize:10, color:'rgba(255,255,255,.55)', marginBottom:2 }}>Transferts</p>
            <p style={{ fontSize:15, fontWeight:700, color:'#fff' }}>{data.totalTransferts}</p>
          </div>
        </div>
        <div style={{ position:'absolute', top:20, right:20, fontSize:11, fontWeight:600, color:'rgba(255,255,255,.55)', display:'flex', alignItems:'center', gap:4 }}>Voir audit <span>›</span></div>
      </div>

      {/* Stat cards 2x2 */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
        <StatCard icon="📥" label="Admissions" value={fmt(data.totalAdmissions)} sub={`+${data.admissionsRecentes.length}`} accent="#22c55e" delay={1} onClick={() => onNavigate('admissions')} />
        <StatCard icon="📤" label="Retraits"   value={fmt(data.totalRetraits)}   sub={`${data.retraitsRecents.length} récents`} accent="#f59e0b" delay={2} onClick={() => onNavigate('retraits')} />
        <StatCard icon="🔄" label="Transferts" value={fmt(data.totalTransferts)} sub="Inter-mag" accent="#3b82f6" delay={3} onClick={() => onNavigate('transferts')} />
        <StatCard icon="⚠️" label="Alertes stock" value={data.alertes.length}   sub={data.alertes.length > 0 ? 'Urgent' : 'OK'} accent={data.alertes.length > 0 ? '#ef4444' : '#22c55e'} delay={4} onClick={() => {}} />
      </div>

      {/* Alertes */}
      {data.alertes.length > 0 && (
        <div className="alert-strip fade-up" style={{ marginBottom:20 }}>
          <span style={{ fontSize:20, flexShrink:0 }}>⚠️</span>
          <div>
            <p style={{ fontSize:13, fontWeight:700, color:'var(--amber)', marginBottom:6 }}>
              {data.alertes.length} produit{data.alertes.length > 1 ? 's' : ''} en stock faible
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
              {data.alertes.slice(0,4).map((a,i) => (
                <p key={i} style={{ fontSize:11, color:'rgba(245,158,11,.8)' }}>
                  · <strong>{a.description}</strong> — {a.stock_actuel} {a.unite} restants
                </p>
              ))}
              {data.alertes.length > 4 && <p style={{ fontSize:11, color:'var(--amber)', fontWeight:600 }}>+ {data.alertes.length - 4} autres</p>}
            </div>
          </div>
        </div>
      )}

      {/* Actions rapides */}
      <div className="card fade-up" style={{ padding:'16px', marginBottom:20 }}>
        <p className="section-title" style={{ marginBottom:16 }}>Actions rapides</p>
        <div style={{ display:'flex', justifyContent:'space-around' }}>
          <QuickAction icon="📥" label="Nouvelle admission"  accent="#22c55e" delay={1} onClick={() => onNavigate('admissions')} />
          <QuickAction icon="📤" label="Nouveau retrait"     accent="#f59e0b" delay={2} onClick={() => onNavigate('retraits')} />
          <QuickAction icon="🔄" label="Transfert"          accent="#3b82f6" delay={3} onClick={() => onNavigate('transferts')} />
          <QuickAction icon="📊" label="Voir audit"         accent="#a855f7" delay={4} onClick={() => onNavigate('audit')} />
        </div>
      </div>

      {/* Admissions récentes */}
      <SectionBlock title="Admissions récentes" linkLabel="Tout voir" onLink={() => onNavigate('admissions')} delay={0.2}>
        {data.admissionsRecentes.length === 0
          ? <p style={{ padding:'20px 16px', textAlign:'center', color:'var(--muted)', fontSize:13 }}>Aucune admission récente</p>
          : data.admissionsRecentes.slice(0,5).map((a,i) => (
            <ActivityRow key={i}
              icon="📥" accent="#22c55e"
              title={a.lot_description || 'Produit N/A'}
              sub={`${a.nom_producteur || '—'} · ${a.quantite} ${a.unite}`}
              right={`${((a.quantite||0)*(a.prix_ref||0)).toLocaleString('fr-FR')} F`}
              rightSub={a.date_reception ? new Date(a.date_reception).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'}) : ''}
            />
          ))
        }
      </SectionBlock>

      <div style={{ height:12 }}/>

      {/* Retraits récents */}
      <SectionBlock title="Retraits récents" linkLabel="Tout voir" onLink={() => onNavigate('retraits')} delay={0.28}>
        {data.retraitsRecents.length === 0
          ? <p style={{ padding:'20px 16px', textAlign:'center', color:'var(--muted)', fontSize:13 }}>Aucun retrait récent</p>
          : data.retraitsRecents.slice(0,5).map((r,i) => {
            const typeColor = r.type_retrait==='vente'?'#22c55e':r.type_retrait==='producteur'?'#3b82f6':r.type_retrait==='magasin'?'#a855f7':'#ef4444';
            return (
              <ActivityRow key={i}
                icon="📤" accent={typeColor}
                title={r.lot_description || 'Produit N/A'}
                sub={`${r.quantite} ${r.unite}`}
                right={r.type_retrait}
                rightSub={r.date_retrait ? new Date(r.date_retrait).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'}) : ''}
              />
            );
          })
        }
      </SectionBlock>

      <div style={{ height:12 }}/>

      {/* Top stocks */}
      <SectionBlock title="Top produits en stock" delay={0.34}>
        {data.topStocks.length === 0
          ? <p style={{ padding:'20px 16px', textAlign:'center', color:'var(--muted)', fontSize:13 }}>Stock vide</p>
          : data.topStocks.map((s,i) => <StockRow key={i} stock={s} rank={i+1} />)
        }
      </SectionBlock>
    </div>
  );
}

// ─── Wrapper module exclusif ──────────────────────────────────────────────────
function ModuleView({ moduleId, onBack }) {
  const Component = MODULE_MAP[moduleId];
  const cfg = TABS.find(t => t.id === moduleId);
  if (!Component) return null;

  return (
    <div className="slide-in" style={{ minHeight:'100%' }}>
      <div className="module-header">
        <button className="back-btn" onClick={onBack} aria-label="Retour">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h2 style={{ fontFamily:'Sora,sans-serif', fontSize:16, fontWeight:700, flex:1 }}>
          {cfg?.label || moduleId}
        </h2>
      </div>
      <div style={{ padding:'16px' }}>
        <Component />
      </div>
    </div>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────
function TabBar({ tabs, activeTab, onSelect, unreadMessages }) {
  return (
    <nav className="tab-bar" role="tablist">
      {tabs.map(tab => (
        <div
          key={tab.id}
          className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onSelect(tab.id)}
          role="tab"
          aria-selected={activeTab === tab.id}
        >
          <div className="icon-wrap" style={{ position:'relative' }}>
            <tab.icon active={activeTab === tab.id} />
            {tab.id === 'messagerie' && unreadMessages > 0 && <span className="tab-dot"/>}
          </div>
          <span className="tab-label">{tab.label}</span>
        </div>
      ))}
    </nav>
  );
}

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, magasinId } = useAuth();
  const { stocks } = useStocks(magasinId);
  const { data, loading } = useDashboardData(magasinId, stocks);

  const [activeTab, setActiveTab] = useState('home');
  const scrollRef = useRef(null);



  // Filtrer les onglets selon le rôle
  const visibleTabs = TABS.filter(t =>
    t.roles.includes('all') || t.roles.includes(user?.role)
  );

  const handleTabSelect = (id) => {
    setActiveTab(id);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  const isHome = activeTab === 'home';

  return (
    <>
      {/* Injection CSS globale */}
      <style>{GLOBAL_CSS}</style>

      <div ref={scrollRef} className="page-scroll" data-dashboard="true">
        {isHome ? (
          <HomeScreen
            user={user}
            data={data}
            loading={loading}
            onNavigate={handleTabSelect}
          />
        ) : (
          <ModuleView
            moduleId={activeTab}
            onBack={() => setActiveTab('home')}
          />
        )}
      </div>

      <TabBar
        tabs={visibleTabs}
        activeTab={activeTab}
        onSelect={handleTabSelect}
        unreadMessages={0}
      />
    </>
  );
}
