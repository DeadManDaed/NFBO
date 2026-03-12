/* src/pages/Dashboard.jsx */

import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useStocks } from '../hooks/useStocks';
import { useDashboardData } from '../hooks/useDashboardData';
import { HomeScreen } from '../components/DashboardUI';
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

export default function Dashboard() {
  const { user, magasinId } = useAuth();
  const { stocks } = useStocks(magasinId);
  const { data, loading, reload } = useDashboardData(magasinId, stocks);

  const [activeTab, setActiveTab]         = useState('home');
  const [unreadMessages, setUnreadMessages] = useState(0);

  const visibleTabs = TABS.filter(t =>
    t.roles.includes('all') || t.roles.includes(user?.role)
  );

  const activeTabLabel = TABS.find(t => t.id === activeTab)?.label;

  return (
    <div className="page-scroll">
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
    </div>
  );
}