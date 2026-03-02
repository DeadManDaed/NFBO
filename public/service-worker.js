//public/service-worker.js

const CACHE_NAME = 'nfbo-v1';
const RUNTIME_CACHE = 'nfbo-runtime-v1';

// Ressources à mettre en cache immédiatement
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/css/all.css',
  '/js/common.js',
  '/js/auth.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installation');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Mise en cache des ressources statiques');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activation et nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker: Activation');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => {
            console.log('🗑️ Suppression ancien cache:', name);
            return caches.delete(name);
          })
      );
    })
    .then(() => self.clients.claim())
  );
});

// Stratégie de fetch
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-HTTP
  if (!request.url.startsWith('http')) {
    return;
  }

  // Stratégie pour les requêtes API
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Stratégie pour les ressources statiques
  event.respondWith(cacheFirst(request));
});

// Stratégie Cache First (pour HTML, CSS, JS, images)
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  if (cached) {
    console.log('📦 Cache HIT:', request.url);
    return cached;
  }

  try {
    const response = await fetch(request);

    // Ne mettre en cache que les réponses valides
    if (response.status === 200) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('❌ Fetch échoué:', request.url, error);

    // Retourner une page offline si disponible
    return cache.match('/offline.html') || new Response('Hors ligne', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

// Stratégie Network First (pour les API)
async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);

  try {
    const response = await fetch(request);

    // Mettre en cache les réponses API réussies
    if (response.status === 200) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('🌐 Network échoué, utilisation du cache:', request.url);

    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    // Retourner une erreur JSON pour les API
    return new Response(JSON.stringify({ 
      error: 'Hors ligne', 
      offline: true 
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Gestion des messages (pour forcer la mise à jour)
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Synchronisation en arrière-plan (pour les actions différées)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-admissions') {
    event.waitUntil(syncAdmissions());
  }
});

async function syncAdmissions() {
  console.log('🔄 Synchronisation des admissions en attente');
  // Logique de synchronisation à implémenter
}

// Notifications Push (optionnel)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};

  const options = {
    body: data.body || 'Nouvelle notification nfbo',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: data.url || '/',
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'NFBO', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data)
  );
});