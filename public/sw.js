const CACHE = 'ugsouq-v9'
const SHELL = [
  '/',
  '/manifest.webmanifest',
  '/admin-manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/admin-icon-192.png',
  '/admin-icon-512.png',
  '/admin-icon-maskable-512.png',
]

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  // Never cache API calls — always hit the network.
  if (url.pathname.startsWith('/api/')) return
  if (e.request.method !== 'GET') return

  // App navigation, code, and web app manifests should prefer the network.
  // This keeps installed customer/admin PWAs on current metadata after deploys.
  if (
    e.request.mode === 'navigate' ||
    ['script', 'style', 'manifest'].includes(e.request.destination) ||
    url.pathname.endsWith('.webmanifest')
  ) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok && url.origin === location.origin) {
            const clone = res.clone()
            caches.open(CACHE).then((c) => c.put(e.request, clone))
          }
          return res
        })
        .catch(() => caches.match(e.request).then((cached) => cached || caches.match('/')))
    )
    return
  }

  // Images and icons may render immediately from cache while refreshing in the background.
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request)
        .then((res) => {
          if (res.ok && url.origin === location.origin) {
            const clone = res.clone()
            caches.open(CACHE).then((c) => c.put(e.request, clone))
          }
          return res
        })
        .catch(() => cached)
      return cached || fetchPromise
    })
  )
})
