import { useState, useLayoutEffect, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCapacitorContext } from './CapacitorProvider';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  // const { isNative, platform } = useCapacitorContext(); // Décommente si tu l'utilises toujours
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // États pour l'animation et le scroll
  const [isFading, setIsFading] = useState(false);
  const mainRef = useRef(null);
  const scrollPositions = useRef({});

  // 1. Couper l'herbe sous le pied du navigateur
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  // 2. useLayoutEffect s'exécute AVANT que l'écran ne soit mis à jour visuellement
  useLayoutEffect(() => {
    const path = location.pathname;
    
    // On déclenche le fondu (l'écran devient temporairement invisible/transparent)
    setIsFading(true);

    // On récupère l'ancienne position (ou 0 par défaut)
    const savedPos = scrollPositions.current[path] || 0;

    // On force le scroll immédiatement de manière "brutale" (instant) en arrière-plan
    window.scrollTo({ top: savedPos, left: 0, behavior: 'instant' });
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: savedPos, left: 0, behavior: 'instant' });
    }

    // On retire le fondu après un court délai (150ms) pour laisser les données s'afficher
    const timer = setTimeout(() => {
      setIsFading(false);
    }, 150);

    // Nettoyage avant de changer de page : on sauvegarde la position exacte
    return () => {
      scrollPositions.current[path] = window.scrollY || mainRef.current?.scrollTop || 0;
      clearTimeout(timer);
    };
  }, [location.pathname]);

  const handleLogout = async () => {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) { 
      await logout(); 
      navigate('/login'); 
    }
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

  const filteredMenuItems = menuItems.filter(item => {
    if (!item.roles) return true;
    return item.roles.includes(user?.role);
  });

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header Fixe */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b z-50 flex items-center justify-between px-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 lg:hidden text-2xl">
            {sidebarOpen ? '✕' : '☰'}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌿</span>
            <span className="font-bold text-xl text-green-700 tracking-tight">NFBO</span>
          </div>
        </div>
        <button onClick={handleLogout} className="text-red-500 text-sm font-bold border border-red-200 px-3 py-1.5 rounded-full hover:bg-red-50">
          Quitter
        </button>
      </header>

      <div className="flex flex-1 pt-16">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed inset-y-0 left-0 z-40 w-64 bg-white border-r transition-transform duration-300 ease-in-out pt-16 lg:pt-0`}>
          <nav className="p-4 space-y-1.5">
            {filteredMenuItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname === item.path ? 'bg-green-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-semibold text-sm">{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Overlay mobile */}
        {sidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden" />}

        {/* Zone de contenu principale AVEC ANIMATION */}
        <main 
          ref={mainRef}
          className="flex-1 lg:ml-64 p-4 md:p-6 overflow-x-hidden"
        >
          <div 
            className={`max-w-5xl mx-auto transition-opacity duration-300 ease-in-out ${isFading ? 'opacity-0' : 'opacity-100'}`}
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
