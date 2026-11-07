export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.client) return

  const router = useRouter()
  let lastTrackedPath = ''
  let lastTrackedTime = 0

  const trackRoute = (fullPath: string, path: string, query: Record<string, unknown>) => {
    if (!path || path.startsWith('/admin') || path.startsWith('/en/admin')) {
      return
    }

    const now = Date.now()
    // Prevent duplicate firing within 1.5s for the exact same route
    if (fullPath === lastTrackedPath && now - lastTrackedTime < 1500) {
      return
    }
    lastTrackedPath = fullPath
    lastTrackedTime = now

    const locale = path === '/en' || path.startsWith('/en/') ? 'en' : 'sv'
    const campaign =
      (typeof query?.ref === 'string' ? query.ref : null) ||
      (typeof query?.utm_source === 'string' ? query.utm_source : null) ||
      null

    $fetch('/api/analytics/track', {
      method: 'POST',
      body: {
        eventType: 'pageview',
        path,
        referrer: document.referrer || null,
        campaign,
        locale,
      },
    }).catch(() => { })
  }

  nuxtApp.hook('page:finish', () => {
    const current = router.currentRoute.value
    if (current) {
      trackRoute(current.fullPath, current.path, current.query)
    }
  })
})
