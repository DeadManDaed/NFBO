import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCapacitorContext } from './CapacitorProvider';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Référence vers la zone de contenu qui scrolle réellement
  const mainRef = useRef(null);
  const scrollPositions = useRef({});

  // 1. Désactiver la restauration automatique du navigateur (Crucial)
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  // 2. Gérer le scroll manuellement
  useEffect(() => {
    const path = location.pathname;
    
    // On attend que le DOM soit prêt et les données potentiellement chargées
    const timer = setTimeout(() => {
      const savedPos = scrollPositions.current[path] || 0;
      
      // On scrolle à la fois la fenêtre ET le conteneur principal (pour être sûr)
      window.scrollTo(0, savedPos);
      if (mainRef.current) mainRef.current.scrollTo(0, savedPos);
    }, 50); // Un délai légèrement plus long pour le mobile

    return () => {
      // On sauvegarde la position avant de partir (utilise le scroll de la fenêtre par défaut)
      scrollPositions.current[path] = window.scrollY || mainRef.current?.scrollTop || 0;
      clearTimeout(timer);
    };
  }, [location.pathname]);

  const handleLogout = async () => {
    if (confirm('Déconnexion ?')) { await logout(); navigate('/login'); }
  };

  const menuItems = [
    { path: '/dashboard', label: 'Tableau de bord', icon: '🏠' },
    { path: '/lots', label: 'Définition lots', icon: '📋' },
    { path: '/admissions', label: 'Admissions', icon: '📥' },
    { path: '/retraits', label: 'Retraits', icon: '📤' },
    { path: '/transferts', label: 'Transferts', icon: '🔄' },
    { path: '/stock', label: 'Stock', icon: '📦' },
    { path: '/audit', label: 'Audit', icon: '🔍', roles: ['admin', 'superadmin'] },
    { path: '/administration', label: 'Administration', icon: '⚙️', roles: ['superadmin'] },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header Fixe */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 lg:hidden text-2xl">
            {sidebarOpen ? '✕' : '☰'}
          </button>
          <span className="font-bold text-xl text-green-700">NFBO</span>
        </div>
        <button onClick={handleLogout} className="text-red-500 text-sm font-bold">Quitter</button>
      </header>

      <div className="flex flex-1 pt-16">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed inset-y-0 left-0 z-40 w-64 bg-white border-r transition-transform pt-16 lg:pt-0`}>
          <nav className="p-4 space-y-2">
            {menuItems.filter(i => !i.roles || i.roles.includes(user?.role)).map(item => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 p-3 rounded-xl ${location.pathname === item.path ? 'bg-green-600 text-white' : 'text-gray-600'}`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Zone de contenu principale */}
        <main 
          ref={mainRef}
          className="flex-1 lg:ml-64 p-4 md:p-6 overflow-x-hidden"
        >
          <div className="max-w-5xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Overlay mobile */}
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-30 lg:hidden" />}
    </div>
  );
}
