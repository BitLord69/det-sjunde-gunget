import { authEpoch, clearIfAuthEpoch, isReader, markReader } from '/admin/offline-store.js'

// Change this version when any of these static assets changes. No Nuxt or API response is cached.
const CACHE = 'gunget-admin-reader-v4'
const SHELL = ['/admin/offline.html', '/admin/offline-reader.js', '/admin/offline-store.js', '/admin/offline-reader.css']
const readerClients = new Set()

self.addEventListener('message', event => {
  if (event.data === 'offline-reader' && event.source?.id) {
    readerClients.add(event.source.id)
    event.waitUntil(markReader(event.source.id).catch(() => {}))
  }
})

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()))
})
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('gunget-admin-reader-') && key !== CACHE) await caches.delete(key)
    }
    await self.clients.claim()
  })())
})
self.addEventListener('fetch', event => {
  const req = event.request
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // A scoped worker also sees cross-scope fetches from its controlled admin clients.
  // Never cache any API, and invalidate on explicit authentication rejection.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith((async () => {
      const client = event.clientId && await self.clients.get(event.clientId)
      const clientPath = client ? new URL(client.url).pathname : ''
      if (!(clientPath === '/admin' || clientPath.startsWith('/admin/'))) return fetch(req)
      const reader = readerClients.has(event.clientId) || client?.url.includes('/admin/offline.html') || (req.method !== 'GET' && await isReader(event.clientId).catch(() => false))
      if (req.method !== 'GET' && !(req.method === 'POST' && url.pathname === '/api/auth/logout') && reader) {
        return new Response('Offline-läsläget tillåter inga ändringar', { status: 403 })
      }
      const requestEpoch = await authEpoch().catch(() => null)
      const response = await fetch(req)
      if ((response.status === 401 || response.status === 403) && requestEpoch !== null) await clearIfAuthEpoch(requestEpoch).catch(() => {})
      return response
    })())
    return
  }
  if (req.method !== 'GET') return
  if (SHELL.includes(url.pathname) && !url.search) {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(url.pathname)).then(response => response || fetch(req)))
    return
  }
  if (req.mode === 'navigate' && (url.pathname === '/admin' || url.pathname.startsWith('/admin/'))) {
    event.respondWith((async () => {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)
      try {
        const requestEpoch = await authEpoch().catch(() => null)
        const response = await fetch(req, { signal: controller.signal })
        if ((response.status === 401 || response.status === 403) && requestEpoch !== null) await clearIfAuthEpoch(requestEpoch).catch(() => {})
        return response
      } catch {
        if (event.resultingClientId) {
          readerClients.add(event.resultingClientId)
          await markReader(event.resultingClientId).catch(() => {})
        }
        return (await caches.open(CACHE)).match('/admin/offline.html')
      } finally {
        clearTimeout(timeout)
      }
    })())
  }
})