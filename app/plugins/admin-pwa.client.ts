import { createAdminPwa } from '../utils/admin-pwa'

export default defineNuxtPlugin((nuxtApp) => {
  const status = useState<string>('adminOfflineStatus', () => 'Inte förberedd')
  const workerReady = useState<boolean>('adminOfflineWorkerReady', () => false)
  let registered = false
  const register = async () => {
    const path = window.location.pathname
    if (registered || !(path === '/admin' || path.startsWith('/admin/')) || !('serviceWorker' in navigator)) return
    registered = true
    try {
      await navigator.serviceWorker.register('/admin-sw.js', { scope: '/admin', type: 'module' })
      await navigator.serviceWorker.ready
      workerReady.value = true
    } catch {
      registered = false
      status.value = 'Offline-start kunde inte förberedas i denna webbläsare'
    }
  }
  void register()
  nuxtApp.hook('page:finish', () => { void register() })
  window.addEventListener('offline', () => {
    const path = window.location.pathname
    if (path === '/admin' || path.startsWith('/admin/')) {
      window.location.assign(`/admin/offline.html?from=${encodeURIComponent(path)}`)
    }
  })
  return { provide: { adminPwa: createAdminPwa(window) } }
})