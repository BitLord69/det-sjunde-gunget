export default defineNuxtRouteMiddleware(async (to) => {
  const { fetchUser, authStatus, completeSocialOfflineLogin } = useAdminAuth()

  if (import.meta.client) await completeSocialOfflineLogin()

  // Always verify that the session is still active with the server
  const user = await fetchUser()
  if (!user) {
    if (import.meta.client && authStatus.value === 'offline') {
      return navigateTo(`/admin/offline.html?from=${encodeURIComponent(to.path)}`, { external: true })
    }
    if (authStatus.value === 'error') {
      return abortNavigation(createError({ statusCode: 503, statusMessage: 'Servern kunde inte verifiera inloggningen. Försök igen.' }))
    }
    return navigateTo({
      path: '/admin/login',
      query: { redirect: to.fullPath },
    })
  }
})
