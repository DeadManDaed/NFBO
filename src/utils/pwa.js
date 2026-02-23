// Enregistrement et gestion du Service Worker

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        
        console.log('✅ Service Worker enregistré:', registration.scope);

        // Vérifier les mises à jour
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Nouvelle version disponible
              showUpdateNotification(registration);
            }
          });
        });

        // Vérifier périodiquement les mises à jour
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000); // Toutes les heures

      } catch (error) {
        console.error('❌ Erreur enregistrement Service Worker:', error);
      }
    });
  }
}

function showUpdateNotification(registration) {
  const updateBanner = document.createElement('div');
  updateBanner.id = 'update-banner';
  updateBanner.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #667eea;
      color: white;
      padding: 15px 25px;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 15px;
    ">
      <span>🔄 Nouvelle version disponible !</span>
      <button id="update-btn" style="
        background: white;
        color: #667eea;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
      ">
        Mettre à jour
      </button>
      <button id="dismiss-btn" style="
        background: transparent;
        color: white;
        border: 1px solid white;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
      ">
        Plus tard
      </button>
    </div>
  `;

  document.body.appendChild(updateBanner);

  document.getElementById('update-btn').addEventListener('click', () => {
    registration.waiting.postMessage('SKIP_WAITING');
    window.location.reload();
  });

  document.getElementById('dismiss-btn').addEventListener('click', () => {
    updateBanner.remove();
  });
}

// Détecter si l'app est installée
export function isAppInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

// Afficher le prompt d'installation
let deferredPrompt;

export function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Afficher un bouton d'installation personnalisé
    showInstallButton();
  });

  window.addEventListener('appinstalled', () => {
    console.log('✅ PWA installée');
    deferredPrompt = null;
    hideInstallButton();
  });
}

function showInstallButton() {
  const installButton = document.createElement('button');
  installButton.id = 'install-pwa-btn';
  installButton.innerHTML = '📱 Installer l\'application';
  installButton.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 25px;
    cursor: pointer;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    z-index: 9998;
    transition: transform 0.2s;
  `;

  installButton.addEventListener('mouseenter', () => {
    installButton.style.transform = 'scale(1.05)';
  });

  installButton.addEventListener('mouseleave', () => {
    installButton.style.transform = 'scale(1)';
  });

  installButton.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('✅ Utilisateur a accepté l\'installation');
      } else {
        console.log('❌ Utilisateur a refusé l\'installation');
      }
      
      deferredPrompt = null;
      installButton.remove();
    }
  });

  document.body.appendChild(installButton);
}

function hideInstallButton() {
  const button = document.getElementById('install-pwa-btn');
  if (button) button.remove();
}

// Gestion du mode hors ligne
export function setupOfflineDetection() {
  function updateOnlineStatus() {
    const status = navigator.onLine ? 'online' : 'offline';
    
    if (status === 'offline') {
      showOfflineBanner();
    } else {
      hideOfflineBanner();
    }
  }

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
}

function showOfflineBanner() {
  const banner = document.createElement('div');
  banner.id = 'offline-banner';
  banner.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #f56565;
      color: white;
      padding: 10px;
      text-align: center;
      z-index: 10000;
      font-weight: 600;
    ">
      🔌 Mode hors ligne - Certaines fonctionnalités sont limitées
    </div>
  `;
  document.body.appendChild(banner);
}

function hideOfflineBanner() {
  const banner = document.getElementById('offline-banner');
  if (banner) banner.remove();
}

// Initialiser toutes les fonctionnalités PWA
export function initPWA() {
  registerServiceWorker();
  setupInstallPrompt();
  setupOfflineDetection();
  
  console.log('🚀 PWA initialisée');
  console.log('📱 App installée:', isAppInstalled());
}