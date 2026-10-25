export default defineNuxtRouteMiddleware(async (to) => {
  const { fetchUser } = useAdminAuth()

  // Always verify that the session is still active with the server
  const user = await fetchUser()
  if (!user) {
    return navigateTo({
      path: '/admin/login',
      query: { redirect: to.fullPath },
    })
  }
})
