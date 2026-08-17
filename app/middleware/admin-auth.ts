export default defineNuxtRouteMiddleware(async (to) => {
  const { adminUser, fetchUser } = useAdminAuth()

  if (!adminUser.value) {
    const user = await fetchUser()
    if (!user) {
      return navigateTo({
        path: '/admin/login',
        query: { redirect: to.fullPath },
      })
    }
  }
})
