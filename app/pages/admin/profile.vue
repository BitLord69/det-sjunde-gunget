<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
})

useSeoMeta({
  title: 'Min Profil & Kontoinställningar | Det 7:e Gunget Admin',
})

const { adminUser, changePassword, updateProfile, isLoading } = useAdminAuth()
const route = useRoute()

const toastMessage = ref('')
const showToast = (msg: string) => {
  toastMessage.value = msg
  setTimeout(() => {
    toastMessage.value = ''
  }, 4000)
}

// Connected Social Accounts Fetch
const { data: socialAccounts, refresh: refreshSocialAccounts } = await useFetch<{
  google: { connected: boolean; email?: string; name?: string; avatarUrl?: string }
  github: { connected: boolean; username?: string; email?: string; avatarUrl?: string }
  facebook: { connected: boolean; email?: string; name?: string; avatarUrl?: string }
}>('/api/auth/social-accounts', {
  default: () => ({
    google: { connected: false },
    github: { connected: false },
    facebook: { connected: false },
  }),
})

// Profile & Email Form
const profileForm = reactive({
  name: '',
  email: '',
  username: '',
  avatarUrl: '',
})
const profileMsg = ref<{ type: 'success' | 'error'; text: string } | null>(null)
const isUploadingAvatar = ref(false)

const isProfileDirty = computed(() => {
  if (!adminUser.value) return false
  return (
    profileForm.name !== (adminUser.value.name || '') ||
    profileForm.email !== (adminUser.value.email || '') ||
    profileForm.username !== (adminUser.value.username || '') ||
    profileForm.avatarUrl !== (adminUser.value.avatarUrl || '')
  )
})

// Password Form
const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordMsg = ref<{ type: 'success' | 'error'; text: string } | null>(null)
const isSavingPassword = ref(false)

const isPasswordDirty = computed(() => {
  return oldPassword.value.length > 0 || newPassword.value.length > 0 || confirmPassword.value.length > 0
})

const isDirty = computed(() => isProfileDirty.value || isPasswordDirty.value)

// Populate initial values
watch(
  adminUser,
  (val) => {
    if (val) {
      profileForm.name = val.name || ''
      profileForm.email = val.email || ''
      profileForm.username = val.username || ''
      profileForm.avatarUrl = val.avatarUrl || ''
    }
  },
  { immediate: true },
)

const handleAvatarUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return
  const file = input.files[0]
  if (!file) return

  const formData = new FormData()
  formData.append('file', file)
  isUploadingAvatar.value = true

  try {
    const res = await $fetch<{ success: boolean; url: string }>('/api/admin/upload', {
      method: 'POST',
      body: formData,
    })
    if (res.success && res.url) {
      profileForm.avatarUrl = res.url
      showToast('✓ Profilbild uppladdad!')
    }
  } catch (err: any) {
    showToast(`⚠️ Uppladdning misslyckades: ${err?.data?.message || err?.message || 'Fel'}`)
  } finally {
    isUploadingAvatar.value = false
    input.value = ''
  }
}

const handleProfileSave = async () => {
  profileMsg.value = null
  if (!profileForm.email) {
    profileMsg.value = { type: 'error', text: 'Vänligen fyll i en giltig e-postadress.' }
    return
  }

  const result = await updateProfile(profileForm)
  if (result.success) {
    profileMsg.value = { type: 'success', text: result.message || 'Din e-post och profil har sparats!' }
    showToast('✓ Profilen har uppdaterats!')
  } else {
    profileMsg.value = { type: 'error', text: result.error || 'Kunde inte uppdatera profilen.' }
  }
}

const handlePasswordChange = async () => {
  passwordMsg.value = null

  if (newPassword.value !== confirmPassword.value) {
    passwordMsg.value = { type: 'error', text: 'De nya lösenorden matchar inte varandra.' }
    return
  }

  isSavingPassword.value = true
  try {
    const result = await changePassword(oldPassword.value, newPassword.value)
    if (result.success) {
      passwordMsg.value = { type: 'success', text: result.message || 'Lösenordet har uppdaterats!' }
      oldPassword.value = ''
      newPassword.value = ''
      confirmPassword.value = ''
      showToast('✓ Lösenordet har ändrats!')
    } else {
      passwordMsg.value = { type: 'error', text: result.error || 'Kunde inte ändra lösenord.' }
    }
  } finally {
    isSavingPassword.value = false
  }
}

const isDisconnecting = ref(false)
const connectSocial = (provider: 'google' | 'github' | 'facebook') => {
  if (import.meta.client) {
    window.location.href = `/api/auth/${provider}?action=connect`
  }
}

const disconnectSocial = async (provider: 'google' | 'github' | 'facebook') => {
  const labelMap: Record<string, string> = {
    google: 'Google',
    github: 'GitHub',
    facebook: 'Facebook',
  }
  const label = labelMap[provider] || provider
  if (!confirm(`Vill du verkligen koppla från ditt ${label}-konto?`)) return
  isDisconnecting.value = true
  try {
    const res = await $fetch<{ success: boolean; message: string }>(`/api/auth/social-accounts/${provider}`, {
      method: 'DELETE',
    })
    await refreshSocialAccounts()
    showToast(res.message || `✓ ${label}-konto frånkopplat`)
  } catch (err: any) {
    showToast(`⚠️ Kunde inte koppla från: ${err?.data?.message || err?.message || 'Fel'}`)
  } finally {
    isDisconnecting.value = false
  }
}

onMounted(() => {
  if (route.query.connected) {
    const pMap: Record<string, string> = { google: 'Google', github: 'GitHub', facebook: 'Facebook' }
    const p = pMap[route.query.connected as string] || route.query.connected
    showToast(`✓ Ditt ${p}-konto har kopplats till din profil!`)
  }
})

// Route navigation guard
onBeforeRouteLeave((to, from, next) => {
  if (isDirty.value) {
    const answer = window.confirm('⚠️ Du har osparade ändringar i dina kontouppgifter.\n\nVill du verkligen lämna sidan utan att spara?')
    if (answer) next()
    else next(false)
  } else {
    next()
  }
})
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 sm:px-6 pt-3 pb-12 lg:px-10 space-y-6 font-sans">
    <!-- Toast Notification -->
    <div
      v-if="toastMessage"
      class="fixed bottom-6 right-6 z-50 bg-secondary text-secondary-content px-6 py-3 rounded-xl font-bold shadow-2xl animate-bounce flex items-center gap-2"
    >
      <span>{{ toastMessage }}</span>
    </div>

    <!-- CMS Tab Navigation -->
    <AdminNavBar :dirty="isDirty" />

    <!-- PAGE HEADER -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-3">
          <h2 class="font-heading text-2xl text-primary font-bold flex items-center gap-2">
            <span>👤</span> Min Profil & Kontoinställningar
          </h2>
          <span
            v-if="isDirty"
            class="badge badge-warning badge-sm font-bold animate-pulse"
          >
            ⚠️ Osparade ändringar
          </span>
        </div>
        <p class="text-xs text-base-content/70 mt-1">
          Här hanterar du dina personliga inloggningsuppgifter, e-postadress, lösenord och anslutna konton.
        </p>
      </div>
    </div>

    <!-- MAIN GRID -->
    <div class="grid lg:grid-cols-3 gap-6">
      <!-- COLUMN 1 & 2: PROFILE & PASSWORD -->
      <div class="lg:col-span-2 space-y-6">
        <!-- CARD 1: EDIT PROFILE & EMAIL -->
        <div class="stage-card p-6 sm:p-7 rounded-3xl border border-primary/30 shadow-xl space-y-5 bg-base-100/95">
          <div class="flex items-center justify-between border-b border-primary/20 pb-3">
            <div class="flex items-center gap-2.5">
              <span class="text-2xl">✏️</span>
              <div>
                <h3 class="font-heading text-lg text-primary font-bold">Personliga uppgifter & Inloggningsmail</h3>
                <p class="text-xs text-base-content/70">Uppdatera din primära e-postadress och kontoprofil</p>
              </div>
            </div>
          </div>

          <div v-if="profileMsg" class="p-3.5 rounded-xl text-xs font-bold" :class="profileMsg.type === 'success' ? 'bg-success/20 text-success border border-success/30' : 'bg-error/20 text-error border border-error/30'">
            {{ profileMsg.text }}
          </div>

          <form class="space-y-4" @submit.prevent="handleProfileSave">
            <div>
              <label class="block text-xs font-bold text-secondary mb-1">
                E-postadress (Huvudadress för inloggning) *
              </label>
              <input
                v-model="profileForm.email"
                type="email"
                required
                placeholder="namn@det7egunget.se"
                class="input input-bordered w-full bg-base-200 input-sm text-sm font-mono text-base-content"
              />
              <p class="text-[11px] text-base-content/60 mt-1">
                Denna e-postadress används för att logga in med lösenord och ta emot återställningslänkar.
              </p>
            </div>

            <div class="grid sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-secondary mb-1">Fullständigt namn *</label>
                <input
                  v-model="profileForm.name"
                  type="text"
                  required
                  placeholder="Janis Svensson"
                  class="input input-bordered w-full bg-base-200 input-sm text-sm text-base-content"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-secondary mb-1">Användarnamn (valfritt)</label>
                <input
                  v-model="profileForm.username"
                  type="text"
                  placeholder="janis"
                  class="input input-bordered w-full bg-base-200 input-sm text-sm font-mono text-base-content"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-secondary mb-1">Avatar / Profilbild</label>
              <div class="flex items-center gap-3">
                <div class="avatar placeholder">
                  <div class="w-10 h-10 rounded-full bg-primary text-primary-content font-bold overflow-hidden shadow">
                    <NuxtImg v-if="profileForm.avatarUrl" :src="profileForm.avatarUrl" :alt="profileForm.name" class="w-full h-full object-cover" />
                    <span v-else>{{ (profileForm.name || 'A').charAt(0) }}</span>
                  </div>
                </div>
                <input
                  v-model="profileForm.avatarUrl"
                  type="text"
                  placeholder="/media/band/avatar.jpg"
                  class="input input-bordered flex-grow bg-base-200 input-sm text-xs font-mono text-base-content"
                />
                <label class="btn btn-outline btn-primary btn-sm rounded-xl cursor-pointer whitespace-nowrap" :class="isUploadingAvatar ? 'loading' : ''">
                  <span>📁 Ladda upp</span>
                  <input type="file" accept="image/*" class="hidden" @change="handleAvatarUpload" />
                </label>
              </div>
            </div>

            <div class="flex items-center justify-between pt-3 border-t border-primary/20">
              <span class="text-xs text-base-content/60">
                Alla ändringar sparas direkt i din säkra profil.
              </span>
              <button
                type="submit"
                class="btn btn-primary btn-sm rounded-full font-bold px-6 shadow-md cursor-pointer"
                :disabled="isLoading"
              >
                {{ isLoading ? 'Sparar...' : '💾 Spara profiluppgifter' }}
              </button>
            </div>
          </form>
        </div>

        <!-- CARD 2: CHANGE PASSWORD -->
        <div class="stage-card p-6 sm:p-7 rounded-3xl border border-primary/30 shadow-xl space-y-5 bg-base-100/95">
          <div class="flex items-center justify-between border-b border-primary/20 pb-3">
            <div class="flex items-center gap-2.5">
              <span class="text-2xl">🔑</span>
              <div>
                <h3 class="font-heading text-lg text-primary font-bold">Byt lösenord</h3>
                <p class="text-xs text-base-content/70">Välj ett nytt, starkt lösenord för inloggning</p>
              </div>
            </div>
          </div>

          <div v-if="passwordMsg" class="p-3.5 rounded-xl text-xs font-bold" :class="passwordMsg.type === 'success' ? 'bg-success/20 text-success border border-success/30' : 'bg-error/20 text-error border border-error/30'">
            {{ passwordMsg.text }}
          </div>

          <form class="space-y-4" @submit.prevent="handlePasswordChange">
            <div>
              <label class="block text-xs font-bold text-secondary mb-1">Nuvarande lösenord</label>
              <input
                v-model="oldPassword"
                type="password"
                required
                placeholder="••••••••"
                class="input input-bordered w-full bg-base-200 input-sm text-sm text-base-content"
              />
            </div>

            <div class="grid sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-secondary mb-1">Nytt lösenord (minst 6 tecken)</label>
                <input
                  v-model="newPassword"
                  type="password"
                  required
                  minlength="6"
                  placeholder="••••••••"
                  class="input input-bordered w-full bg-base-200 input-sm text-sm text-base-content"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-secondary mb-1">Bekräfta nytt lösenord</label>
                <input
                  v-model="confirmPassword"
                  type="password"
                  required
                  minlength="6"
                  placeholder="••••••••"
                  class="input input-bordered w-full bg-base-200 input-sm text-sm text-base-content"
                />
              </div>
            </div>

            <div class="flex items-center justify-end pt-3 border-t border-primary/20">
              <button
                type="submit"
                class="btn btn-primary btn-sm rounded-full font-bold px-6 shadow-md cursor-pointer"
                :disabled="isSavingPassword"
              >
                {{ isSavingPassword ? 'Sparar...' : '🔑 Uppdatera lösenord' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- COLUMN 3: CONNECTED SOCIAL ACCOUNTS -->
      <div class="space-y-6">
        <div class="stage-card p-6 sm:p-7 rounded-3xl border border-primary/30 shadow-xl space-y-4 bg-base-100/95">
          <div class="flex items-center justify-between border-b border-primary/20 pb-3">
            <div class="flex items-center gap-2">
              <span class="text-xl">🔗</span>
              <div>
                <h3 class="font-heading text-base text-primary font-bold">Kopplade Konton</h3>
                <p class="text-[11px] text-base-content/70">1-klicks inloggning</p>
              </div>
            </div>
          </div>

          <p class="text-xs text-base-content/80 leading-relaxed">
            Koppla dina externa konton så kan du logga in blixtsnabbt utan lösenord.
          </p>

          <div class="space-y-3 pt-2">
            <!-- GOOGLE -->
            <div class="p-3.5 rounded-2xl bg-base-200 border border-primary/20 space-y-2.5">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                  <div class="w-7 h-7 rounded-full bg-white flex items-center justify-center p-1 shadow-sm flex-shrink-0">
                    <svg viewBox="0 0 24 24" class="w-full h-full">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  </div>
                  <div>
                    <span class="font-bold text-xs text-base-content block">Google</span>
                    <span v-if="socialAccounts?.google?.connected" class="text-[10px] font-mono text-primary truncate max-w-[140px] block">
                      {{ socialAccounts.google.email }}
                    </span>
                    <span v-else class="text-[10px] text-base-content/60">Ej ansluten</span>
                  </div>
                </div>

                <button
                  v-if="socialAccounts?.google?.connected"
                  type="button"
                  class="btn btn-xs btn-outline btn-error rounded font-bold cursor-pointer"
                  :disabled="isDisconnecting"
                  @click="disconnectSocial('google')"
                >
                  Koppla från
                </button>
                <button
                  v-else
                  type="button"
                  class="btn btn-xs btn-primary rounded font-bold cursor-pointer"
                  @click="connectSocial('google')"
                >
                  + Koppla
                </button>
              </div>
            </div>

            <!-- GITHUB -->
            <div class="p-3.5 rounded-2xl bg-base-200 border border-primary/20 space-y-2.5">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                  <div class="w-7 h-7 rounded-full bg-[#24292e] text-white flex items-center justify-center p-1 shadow-sm flex-shrink-0">
                    <svg viewBox="0 0 24 24" fill="currentColor" class="w-full h-full">
                      <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                  </div>
                  <div>
                    <span class="font-bold text-xs text-base-content block">GitHub</span>
                    <span v-if="socialAccounts?.github?.connected" class="text-[10px] font-mono text-primary truncate max-w-[140px] block">
                      {{ socialAccounts.github.username || socialAccounts.github.email }}
                    </span>
                    <span v-else class="text-[10px] text-base-content/60">Ej ansluten</span>
                  </div>
                </div>

                <button
                  v-if="socialAccounts?.github?.connected"
                  type="button"
                  class="btn btn-xs btn-outline btn-error rounded font-bold cursor-pointer"
                  :disabled="isDisconnecting"
                  @click="disconnectSocial('github')"
                >
                  Koppla från
                </button>
                <button
                  v-else
                  type="button"
                  class="btn btn-xs btn-primary rounded font-bold cursor-pointer"
                  @click="connectSocial('github')"
                >
                  + Koppla
                </button>
              </div>
            </div>

            <!-- FACEBOOK -->
            <div class="p-3.5 rounded-2xl bg-base-200 border border-primary/20 space-y-2.5">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                  <div class="w-7 h-7 rounded-full bg-[#1877F2] text-white flex items-center justify-center p-1 shadow-sm flex-shrink-0">
                    <svg viewBox="0 0 24 24" fill="currentColor" class="w-full h-full">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </div>
                  <div>
                    <span class="font-bold text-xs text-base-content block">Facebook</span>
                    <span v-if="socialAccounts?.facebook?.connected" class="text-[10px] font-mono text-primary truncate max-w-[140px] block">
                      {{ socialAccounts.facebook.name || socialAccounts.facebook.email }}
                    </span>
                    <span v-else class="text-[10px] text-base-content/60">Ej ansluten</span>
                  </div>
                </div>

                <button
                  v-if="socialAccounts?.facebook?.connected"
                  type="button"
                  class="btn btn-xs btn-outline btn-error rounded font-bold cursor-pointer"
                  :disabled="isDisconnecting"
                  @click="disconnectSocial('facebook')"
                >
                  Koppla från
                </button>
                <button
                  v-else
                  type="button"
                  class="btn btn-xs btn-primary rounded font-bold cursor-pointer"
                  @click="connectSocial('facebook')"
                >
                  + Koppla
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
