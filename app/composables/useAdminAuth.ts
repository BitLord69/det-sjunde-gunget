export interface AdminUser {
  id: string
  name: string
  email: string
  username: string
  role: string
  provider: string
  avatarUrl: string | null
}

export const useAdminAuth = () => {
  const adminUser = useState<AdminUser | null>('adminUser', () => null)
  const isLoading = ref(false)
  const authError = ref<string | null>(null)

  const fetchUser = async () => {
    try {
      const data = await $fetch<{ authenticated: boolean; user: AdminUser | null }>('/api/auth/me')
      adminUser.value = data.user
      return data.user
    } catch {
      adminUser.value = null
      return null
    }
  }

  const login = async (identifier: string, password: string) => {
    isLoading.value = true
    authError.value = null
    try {
      const data = await $fetch<{ success: boolean; user: AdminUser }>('/api/auth/login', {
        method: 'POST',
        body: { identifier, password },
      })
      adminUser.value = data.user
      return { success: true, user: data.user }
    } catch (err: any) {
      const msg = err?.data?.message || 'Kunde inte logga in. Kontrollera dina uppgifter.'
      authError.value = msg
      return { success: false, error: msg }
    } finally {
      isLoading.value = false
    }
  }

  const changePassword = async (currentPassword: string, newPassword: string) => {
    isLoading.value = true
    authError.value = null
    try {
      const data = await $fetch<{ success: boolean; message: string }>('/api/auth/change-password', {
        method: 'POST',
        body: { currentPassword, newPassword },
      })
      return { success: true, message: data.message }
    } catch (err: any) {
      const msg = err?.data?.message || 'Kunde inte byta lösenord.'
      authError.value = msg
      return { success: false, error: msg }
    } finally {
      isLoading.value = false
    }
  }

  const updateProfile = async (profileData: {
    name?: string
    email?: string
    username?: string
    avatarUrl?: string
  }) => {
    isLoading.value = true
    authError.value = null
    try {
      const data = await $fetch<{ success: boolean; user: AdminUser; message: string }>(
        '/api/auth/profile',
        {
          method: 'PUT',
          body: profileData,
        }
      )
      if (data.user) {
        adminUser.value = data.user
      }
      return { success: true, message: data.message, user: data.user }
    } catch (err: any) {
      const msg = err?.data?.message || 'Kunde inte uppdatera profilen.'
      authError.value = msg
      return { success: false, error: msg }
    } finally {
      isLoading.value = false
    }
  }

  const logout = async () => {
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Ignore
    } finally {
      adminUser.value = null
      await navigateTo('/admin/login')
    }
  }

  return {
    adminUser,
    isLoading,
    authError,
    fetchUser,
    login,
    changePassword,
    updateProfile,
    logout,
  }
}
