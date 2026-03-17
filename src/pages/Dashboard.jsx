/* src/pages/Dashboard.jsx */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useStocks } from '../hooks/useStocks';
import { useDashboardData } from '../hooks/useDashboardData';
import { HomeScreen, BackToast } from '../components/DashboardUI';
import { TabBar } from '../components/TabBar';
import ModuleView from '../components/ModuleView';
import * as Icons from '../components/DashboardIcons';
import '../styles/Dashboard.css';

const TABS = [
  { id:'home',          label:'Accueil',   icon: Icons.HomeIcon,  roles:['all'] },
  { id:'admissions',    label:'Entrées',   icon: Icons.AdmIcon,   roles:['superadmin','admin','stock'] },
  { id:'retraits',      label:'Sorties',   icon: Icons.RetIcon,   roles:['superadmin','admin','stock'] },
  { id:'transferts',    label:'Transf.',   icon: Icons.TransfIcon,roles:['superadmin','admin', 'stock', 'auditeur'] },
  { id:'stock',         label:'Stock',     icon: Icons.StockIcon, roles:['superadmin','admin','stock','caisse'] },
  { id:'caisse',        label:'Caisse',    icon: Icons.CaisseIcon,roles:['superadmin','admin','gestionnaire','caisse'] },
  { id:'audit',         label:'Audit',     icon: Icons.AuditIcon, roles:['superadmin','auditeur'] },
  { id:'messagerie',    label:'Messages',  icon: Icons.MsgIcon,   roles:['all'] },
  { id:'administration',label:'Admin',     icon: Icons.AdminIcon, roles:['superadmin','admin'] },
];

// Seuils du swipe
const SWIPE_MIN_X    = 60;  // distance horizontale minimale (px)
const SWIPE_MAX_Y    = 40;  // distance verticale maximale (px) — évite les conflits avec le scroll
const SWIPE_MAX_TIME = 400; // durée maximale du geste (ms)

export default function Dashboard() {
  const { user, magasinId } = useAuth();
  const { stocks } = useStocks(magasinId);
  const { data, loading, reload } = useDashboardData(magasinId, stocks);

  const [activeTab, setActiveTab]           = useState('home');
  const [unreadMessages, setUnreadMessages] = useState(0);

  const visibleTabs = TABS.filter(t =>
    t.roles.includes('all') || t.roles.includes(user?.role)
  );

  // ─── Bouton retour Android ────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => {
      if (activeTab !== 'home') setActiveTab('home');
    };
    window.addEventListener('nfbo:back-home', handler);
    return () => window.removeEventListener('nfbo:back-home', handler);
  }, [activeTab]);

  // ─── Swipe horizontal ────────────────────────────────────────────────────
  const touchStart = useRef(null);

  const handleTouchStart = useCallback((e) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY, time: Date.now() };
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (!touchStart.current) return;

    const t = e.changedTouches[0];
    const dx   = t.clientX - touchStart.current.x;
    const dy   = t.clientY - touchStart.current.y;
    const dt   = Date.now() - touchStart.current.time;
    touchStart.current = null;

    // Ignorer si trop lent, trop vertical, ou trop court
    if (dt > SWIPE_MAX_TIME) return;
    if (Math.abs(dy) > SWIPE_MAX_Y) return;
    if (Math.abs(dx) < SWIPE_MIN_X) return;

    const currentIndex = visibleTabs.findIndex(t => t.id === activeTab);
    if (currentIndex === -1) return;

    if (dx < 0) {
      // Swipe gauche → onglet suivant
      const next = visibleTabs[currentIndex + 1];
      if (next) setActiveTab(next.id);
    } else {
      // Swipe droite → onglet précédent
      const prev = visibleTabs[currentIndex - 1];
      if (prev) setActiveTab(prev.id);
    }
  }, [activeTab, visibleTabs]);

  const activeTabLabel = TABS.find(t => t.id === activeTab)?.label;

  return (
    <div
      className="page-scroll"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {activeTab === 'home' ? (
        <HomeScreen user={user} data={data} onNavigate={setActiveTab} reload={reload} />
      ) : (
        <ModuleView
          moduleId={activeTab}
          tabLabel={activeTabLabel}
          onBack={() => setActiveTab('home')}
          onUnreadChange={setUnreadMessages}
        />
      )}

      <TabBar
        tabs={visibleTabs}
        activeTab={activeTab}
        onSelect={setActiveTab}
        unreadMessages={unreadMessages}
      />
      <BackToast />
    </div>
  );
}
