import { offlineStore, prepareOffline } from '~/utils/admin-offline'

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
  const authStatus = useState<'ok' | 'offline' | 'denied' | 'error'>('adminAuthStatus', () => 'error')
  const offlineProofStatus = useState<string>('adminOfflineProofStatus', () => '')

  const completeSocialOfflineLogin = async () => {
    try {
      const saved = sessionStorage.getItem('admin-offline-login')
      if (!saved) return
      const { nonce, epoch } = JSON.parse(saved)
      if (!/^[a-f0-9]{64}$/.test(nonce) || !Number.isSafeInteger(epoch) || epoch < 0) throw new Error('Ogiltigt bevis')
      const store = await offlineStore()
      if (await store.epoch() !== epoch) {
        if (sessionStorage.getItem('admin-offline-login') === saved) sessionStorage.removeItem('admin-offline-login')
        return
      }
      const proof = await $fetch<{ verified: boolean }>('/api/auth/offline-login-proof', { method: 'POST', body: { nonce }, cache: 'no-store', timeout: 8000, retry: 0 })
      if (sessionStorage.getItem('admin-offline-login') === saved) sessionStorage.removeItem('admin-offline-login')
      const unlocked = proof.verified && await store.unlock(epoch)
      offlineProofStatus.value = unlocked ? '' : 'Offlineförberedelsen kunde inte aktiveras. Starta en ny inloggning om offlineåtkomst behövs.'
    } catch {
      offlineProofStatus.value = 'Offlineförberedelsen kunde inte verifieras. Ett nytt försök görs vid nästa adminnavigering; om det inte lyckas, logga in på nytt.'
    }
  }

  const fetchUser = async () => {
    let generation: number | null = null
    let authorization: number | null = null
    try {
      const store = await offlineStore()
      generation = await store.epoch()
      authorization = await store.authEpochForGeneration(generation)
    } catch { /* Online login does not require local storage. */ }
    try {
      const data = await $fetch<{ authenticated: boolean; user: AdminUser | null; sessionExpiresAt: string | null }>('/api/auth/me', { cache: 'no-store', timeout: 8000, retry: 0 })
      if (!data.authenticated || !data.user || !data.sessionExpiresAt) {
        try { if (authorization !== null) await (await offlineStore()).clearIfAuthEpoch(authorization) } catch { /* Storage may be disabled. */ }
        authStatus.value = 'denied'
        adminUser.value = null
        return null
      }
      authStatus.value = 'ok'
      adminUser.value = data.user
      if (generation !== null) void prepareOffline(data.user.id, generation)
      return data.user
    } catch (error: unknown) {
      const status = (error as { statusCode?: number; response?: { status?: number } })?.response?.status || (error as { statusCode?: number })?.statusCode
      if (status === 401 || status === 403) {
        try { if (authorization !== null) await (await offlineStore()).clearIfAuthEpoch(authorization) } catch { /* Storage may be disabled. */ }
        authStatus.value = 'denied'
      } else {
        authStatus.value = status ? 'error' : 'offline'
      }
      adminUser.value = null
      return null
    }
  }

  const login = async (identifier: string, password: string) => {
    isLoading.value = true
    authError.value = null
    let generation: number | null = null
    try { sessionStorage.removeItem('admin-offline-login') } catch { /* Storage may be disabled. */ }
    try {
      const store = await offlineStore()
      await store.clear(true)
      generation = await store.epoch()
    } catch { /* Online login remains available without local storage. */ }
    try {
      const data = await $fetch<{ success: boolean; user: AdminUser }>('/api/auth/login', {
        method: 'POST',
        body: { identifier, password },
      })
      if (generation !== null) {
        try { await (await offlineStore()).unlock(generation) } catch { /* Offline preparation remains disabled. */ }
      }
      adminUser.value = data.user
      return { success: true, user: data.user }
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message || 'Kunde inte logga in. Kontrollera dina uppgifter.'
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
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message || 'Kunde inte byta lösenord.'
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
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message || 'Kunde inte uppdatera profilen.'
      authError.value = msg
      return { success: false, error: msg }
    } finally {
      isLoading.value = false
    }
  }

  const logout = async () => {
    // Invalidate in-flight snapshots before sending the logout request.
    let offlineClearFailed = false
    let serverLogoutFailed = false
    try { sessionStorage.removeItem('admin-offline-login') } catch { /* Storage may be disabled. */ }
    try { await (await offlineStore()).clear(true) } catch { offlineClearFailed = true }
    try {
      const result = await $fetch<{ revoked: boolean }>('/api/auth/logout', { method: 'POST', timeout: 8000, retry: 0 })
      serverLogoutFailed = result.revoked !== true
    } catch {
      serverLogoutFailed = true
    } finally {
      adminUser.value = null
      const query = new URLSearchParams()
      if (offlineClearFailed) query.set('offlineClearFailed', '1')
      if (serverLogoutFailed) query.set('serverLogoutFailed', '1')
      await navigateTo(`/admin/login${query.size ? `?${query}` : ''}`)
    }
  }

  return {
    adminUser,
    isLoading,
    authError,
    authStatus,
    completeSocialOfflineLogin,
    fetchUser,
    login,
    changePassword,
    updateProfile,
    logout,
  }
}
