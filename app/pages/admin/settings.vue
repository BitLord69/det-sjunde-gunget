<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
})

useSeoMeta({
  title: 'Inställningar & Notiser | Det 7:e Gunget Admin',
})

const toastMessage = ref('')

const showToast = (msg: string) => {
  toastMessage.value = msg
  setTimeout(() => {
    toastMessage.value = ''
  }, 4000)
}

const { data: adminSettings, refresh: refreshSettings } = await useFetch<{
  newsletterEnabled: boolean
  landingSongCount?: number
  landingMerchCount?: number
  lastMerchSync?: number
  geminiApiKey?: string
  customCoverPrompt?: string
  discordWebhookUrl?: string
  discordNotifyBookings?: boolean
  discordNotifyFanPhotos?: boolean
  discordNotifyGuestbook?: boolean
  socialMockMode?: boolean
  notificationEmail?: string
  youtubeChannelId?: string
  youtubeChannelIdResolved?: string
  youtubeAutoImport?: boolean
  youtubeAutoSocial?: boolean
  youtubeLastSynced?: number | null
  settings?: Record<string, string>
}>('/api/admin/settings')

const settingsForm = reactive({
  newsletterEnabled: false,
  landingSongCount: 4,
  landingMerchCount: 4,
  geminiApiKey: '',
  customCoverPrompt: '',
  discordWebhookUrl: '',
  discordNotifyBookings: true,
  discordNotifyFanPhotos: false,
  discordNotifyGuestbook: false,
  notificationEmail: 'info@det7egunget.se',
  socialMockMode: false,
  youtubeChannelId: '@det7egunget',
  youtubeAutoImport: true,
  youtubeAutoSocial: true,
})

watch(
  adminSettings,
  (newVal) => {
    if (newVal) {
      settingsForm.newsletterEnabled = newVal.newsletterEnabled ?? false
      settingsForm.landingSongCount = newVal.landingSongCount ?? 4
      settingsForm.landingMerchCount = newVal.landingMerchCount ?? 4
      settingsForm.geminiApiKey = newVal.geminiApiKey ?? ''
      settingsForm.customCoverPrompt = newVal.customCoverPrompt ?? ''
      settingsForm.discordWebhookUrl = newVal.discordWebhookUrl ?? ''
      settingsForm.discordNotifyBookings = newVal.discordNotifyBookings ?? true
      settingsForm.discordNotifyFanPhotos = newVal.discordNotifyFanPhotos ?? false
      settingsForm.discordNotifyGuestbook = newVal.discordNotifyGuestbook ?? false
      settingsForm.notificationEmail = newVal.notificationEmail || 'info@det7egunget.se'
      settingsForm.socialMockMode = newVal.socialMockMode ?? false
      settingsForm.youtubeChannelId = newVal.youtubeChannelId || '@det7egunget'
      settingsForm.youtubeAutoImport = newVal.youtubeAutoImport ?? true
      settingsForm.youtubeAutoSocial = newVal.youtubeAutoSocial ?? true
    }
  },
  { immediate: true },
)

const isSettingsDirty = computed(() => {
  if (!adminSettings.value) return false
  const orig = adminSettings.value
  return (
    settingsForm.newsletterEnabled !== (orig.newsletterEnabled ?? false) ||
    settingsForm.landingSongCount !== (orig.landingSongCount ?? 4) ||
    settingsForm.landingMerchCount !== (orig.landingMerchCount ?? 4) ||
    settingsForm.geminiApiKey !== (orig.geminiApiKey ?? '') ||
    settingsForm.customCoverPrompt !== (orig.customCoverPrompt ?? '') ||
    settingsForm.discordWebhookUrl !== (orig.discordWebhookUrl ?? '') ||
    settingsForm.discordNotifyBookings !== (orig.discordNotifyBookings ?? true) ||
    settingsForm.discordNotifyFanPhotos !== (orig.discordNotifyFanPhotos ?? false) ||
    settingsForm.discordNotifyGuestbook !== (orig.discordNotifyGuestbook ?? false) ||
    settingsForm.notificationEmail !== (orig.notificationEmail || 'info@det7egunget.se') ||
    settingsForm.socialMockMode !== (orig.socialMockMode ?? false) ||
    settingsForm.youtubeChannelId !== (orig.youtubeChannelId || '@det7egunget') ||
    settingsForm.youtubeAutoImport !== (orig.youtubeAutoImport ?? true) ||
    settingsForm.youtubeAutoSocial !== (orig.youtubeAutoSocial ?? true)
  )
})

// Browser Guard: Warn before closing tab or reloading
const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  if (isSettingsDirty.value) {
    e.preventDefault()
    e.returnValue = ''
    return ''
  }
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

const isTestingDiscord = ref(false)
const discordTestStatus = ref<{ success: boolean; message: string } | null>(null)

const testDiscordWebhook = async () => {
  if (!settingsForm.discordWebhookUrl.trim()) {
    showToast('⚠️ Ange en Discord Webhook URL först.')
    return
  }
  isTestingDiscord.value = true
  discordTestStatus.value = null
  try {
    const res = await $fetch<{ success: boolean; message: string }>('/api/admin/discord-test', {
      method: 'POST',
      body: {
        webhookUrl: settingsForm.discordWebhookUrl.trim(),
      },
    })
    discordTestStatus.value = { success: true, message: res.message || '✓ Testnotis skickades!' }
    showToast('✓ Testnotis skickad till Discord!')
  } catch (err: unknown) {
    const errorObj = err as { data?: { statusMessage?: string }; message?: string }
    const msg = errorObj.data?.statusMessage || errorObj.message || 'Kunde inte skicka testnotis'
    discordTestStatus.value = { success: false, message: `⚠️ ${msg}` }
    showToast(`⚠️ ${msg}`)
  } finally {
    isTestingDiscord.value = false
  }
}

const isSyncingYouTube = ref(false)
const syncYouTubeNow = async () => {
  isSyncingYouTube.value = true
  try {
    const res = await $fetch<{ success: boolean; addedCount: number; totalFound: number; skipped?: boolean }>('/api/admin/youtube/sync', {
      method: 'POST',
    })
    await refreshSettings()
    if (res.addedCount > 0) {
      showToast(`🎬 ${res.addedCount} nya videor importerades från YouTube!`)
    } else {
      showToast(`✓ YouTube är redan uppdaterad (${res.totalFound || 0} videor hittades).`)
    }
  } catch (err: any) {
    const msg = err?.data?.message || err?.message || 'Ett fel uppstod vid YouTube-synk'
    showToast(`⚠️ ${msg}`)
  } finally {
    isSyncingYouTube.value = false
  }
}

const isSavingSettings = ref(false)

const saveSettings = async () => {
  isSavingSettings.value = true
  try {
    await $fetch('/api/admin/settings', {
      method: 'POST',
      body: {
        ...settingsForm,
      },
    })
    await refreshSettings()
    showToast('✓ Inställningar & aviseringar har sparats!')
  } catch {
    showToast('⚠️ Kunde inte spara inställningar.')
  } finally {
    isSavingSettings.value = false
  }
}

const resetSettings = () => {
  if (adminSettings.value) {
    const orig = adminSettings.value
    settingsForm.newsletterEnabled = orig.newsletterEnabled ?? false
    settingsForm.landingSongCount = orig.landingSongCount ?? 4
    settingsForm.landingMerchCount = orig.landingMerchCount ?? 4
    settingsForm.geminiApiKey = orig.geminiApiKey ?? ''
    settingsForm.customCoverPrompt = orig.customCoverPrompt ?? ''
    settingsForm.discordWebhookUrl = orig.discordWebhookUrl ?? ''
    settingsForm.discordNotifyBookings = orig.discordNotifyBookings ?? true
    settingsForm.discordNotifyFanPhotos = orig.discordNotifyFanPhotos ?? false
    settingsForm.discordNotifyGuestbook = orig.discordNotifyGuestbook ?? false
    settingsForm.notificationEmail = orig.notificationEmail || 'info@det7egunget.se'
    settingsForm.socialMockMode = orig.socialMockMode ?? false
    settingsForm.youtubeChannelId = orig.youtubeChannelId || '@det7egunget'
    settingsForm.youtubeAutoImport = orig.youtubeAutoImport ?? true
    settingsForm.youtubeAutoSocial = orig.youtubeAutoSocial ?? true
  }
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-3 sm:px-6 pt-3 pb-10 lg:px-10 space-y-6 font-sans">
    <!-- Toast Notification -->
    <div
      v-if="toastMessage"
      class="fixed bottom-6 right-6 z-50 bg-secondary text-secondary-content px-6 py-3 rounded-xl font-bold shadow-2xl animate-bounce flex items-center gap-2"
    >
      <span>{{ toastMessage }}</span>
    </div>

    <!-- CMS Tab Navigation -->
    <AdminNavBar :dirty="isSettingsDirty" @discard="resetSettings" />

    <!-- SETTINGS & ALERTS MANAGER -->
    <div class="space-y-8">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-3">
            <h2 class="font-heading text-2xl text-primary font-bold flex items-center gap-2">
              <span>⚙️</span> Inställningar & Notiser
            </h2>
            <span
              v-if="isSettingsDirty"
              class="badge badge-warning badge-sm font-bold animate-pulse"
            >
              ⚠️ Osparade ändringar
            </span>
          </div>
          <p class="text-xs text-base-content/70 mt-1">
            Ställ in Discord-aviseringar, testläge för sociala medier, e-postmottagare, startsidans innehåll och AI-studio.
          </p>
        </div>
        <button
          type="button"
          class="btn btn-primary btn-sm rounded-full font-bold px-6 shadow-lg shadow-primary/30 flex items-center gap-2 cursor-pointer"
          :class="isSettingsDirty ? 'ring-2 ring-warning animate-pulse' : ''"
          :disabled="isSavingSettings"
          @click="saveSettings"
        >
          <span v-if="isSavingSettings" class="loading loading-spinner loading-xs"/>
          <span>💾 {{ isSettingsDirty ? 'Spara ändringar!' : 'Spara inställningar' }}</span>
        </button>
      </div>

      <div class="grid lg:grid-cols-2 gap-6 items-start">
        <!-- LEFT COLUMN: DISCORD & SOCIAL MEDIA MOCK MODE -->
        <div class="space-y-6">
          <!-- CARD 1: DISCORD NOTIFICATIONS -->
          <div class="stage-card p-6 rounded-3xl border border-primary/30 shadow-xl space-y-4 bg-base-100/95">
            <div class="flex items-center justify-between border-b border-primary/20 pb-3">
              <div class="flex items-center gap-2.5">
                <span class="text-xl">🤖</span>
                <div>
                  <h3 class="font-heading text-base text-primary font-bold flex items-center gap-2">
                    Discord-aviseringar
                    <span class="badge badge-accent badge-xs font-mono font-bold text-[9px] uppercase">Nyhet</span>
                  </h3>
                  <p class="text-[11px] text-base-content/70">Få blixtsnabba notiser i bandets Discord-kanal</p>
                </div>
              </div>
            </div>

            <!-- Webhook URL Input -->
            <div class="space-y-1.5">
              <label class="block text-xs font-bold text-secondary">
                Discord Webhook URL
              </label>
              <div class="flex items-center gap-2">
                <input
                  v-model="settingsForm.discordWebhookUrl"
                  type="url"
                  placeholder="https://discord.com/api/webhooks/..."
                  class="input input-bordered input-sm flex-grow bg-base-200 font-mono text-xs"
                >
                <button
                  type="button"
                  class="btn btn-outline btn-accent btn-sm rounded-lg font-bold flex items-center gap-1 cursor-pointer flex-shrink-0"
                  :disabled="isTestingDiscord || !settingsForm.discordWebhookUrl.trim()"
                  @click="testDiscordWebhook"
                >
                  <span v-if="isTestingDiscord" class="loading loading-spinner loading-xs"/>
                  <span>🔔 Skicka test</span>
                </button>
              </div>
              <p class="text-[10px] text-base-content/60 leading-normal">
                Skapa en webhook i Discord under <em>Kanalinställningar → Integrationer → Webhooks</em>.
              </p>
              <div
                v-if="discordTestStatus"
                class="p-2.5 rounded-xl text-xs font-bold mt-2"
                :class="discordTestStatus.success ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'"
              >
                {{ discordTestStatus.message }}
              </div>
            </div>

            <!-- Notification Event Triggers -->
            <div class="space-y-2.5 pt-1">
              <label class="block text-[11px] font-bold text-secondary uppercase tracking-wider">
                Händelser som ska skicka Discord-notis:
              </label>

              <!-- Trigger 1: Booking Inquiries -->
              <label class="flex items-start justify-between gap-3 p-2.5 bg-base-200/70 rounded-xl border border-primary/10 cursor-pointer hover:border-primary/30 transition-all">
                <div class="space-y-0.5">
                  <span class="text-xs font-bold text-base-content flex items-center gap-1.5">
                    <span>🎸</span> Nya bokningsförfrågningar
                  </span>
                  <p class="text-[11px] text-base-content/65">
                    Skickar kontaktperson, datum, spelplats och länk till admin.
                  </p>
                </div>
                <input
                  v-model="settingsForm.discordNotifyBookings"
                  type="checkbox"
                  class="toggle toggle-primary toggle-sm flex-shrink-0 mt-0.5"
                >
              </label>

              <!-- Trigger 2: Fan Photos -->
              <label class="flex items-start justify-between gap-3 p-2.5 bg-base-200/70 rounded-xl border border-primary/10 cursor-pointer hover:border-primary/30 transition-all">
                <div class="space-y-0.5">
                  <span class="text-xs font-bold text-base-content flex items-center gap-1.5">
                    <span>📸</span> Nya fan-bilder inskickade
                  </span>
                  <p class="text-[11px] text-base-content/65">
                    Aviserar när fans laddat upp foton till Fan Central för granskning.
                  </p>
                </div>
                <input
                  v-model="settingsForm.discordNotifyFanPhotos"
                  type="checkbox"
                  class="toggle toggle-secondary toggle-sm flex-shrink-0 mt-0.5"
                >
              </label>

              <!-- Trigger 3: Guestbook -->
              <label class="flex items-start justify-between gap-3 p-2.5 bg-base-200/70 rounded-xl border border-primary/10 cursor-pointer hover:border-primary/30 transition-all">
                <div class="space-y-0.5">
                  <span class="text-xs font-bold text-base-content flex items-center gap-1.5">
                    <span>📖</span> Nya gästboksinlägg
                  </span>
                  <p class="text-[11px] text-base-content/65">
                    Aviserar när en besökare skrivit en hälsning i gästboken.
                  </p>
                </div>
                <input
                  v-model="settingsForm.discordNotifyGuestbook"
                  type="checkbox"
                  class="toggle toggle-accent toggle-sm flex-shrink-0 mt-0.5"
                >
              </label>
            </div>
          </div>

          <!-- CARD 2: SOCIAL MEDIA TEST / MOCK MODE (MOVED TO LEFT PANEL) -->
          <div class="stage-card p-6 rounded-3xl border border-primary/30 shadow-xl space-y-4 bg-base-100/95">
            <div class="flex items-center justify-between gap-3 border-b border-primary/20 pb-3">
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="text-xl flex-shrink-0">📢</span>
                <div class="min-w-0">
                  <h3 class="font-heading text-base text-primary font-bold truncate">Sociala Medier — Testläge</h3>
                  <p class="text-[11px] text-base-content/70 truncate">Simulerad eller skarp delning</p>
                </div>
              </div>
              <span
                class="badge badge-sm font-mono font-bold text-[11px] whitespace-nowrap flex-shrink-0 px-2.5 py-1"
                :class="settingsForm.socialMockMode ? 'badge-warning text-warning-content' : 'badge-success text-success-content'"
              >
                {{ settingsForm.socialMockMode ? '🟡 Testläge Aktivt' : '🟢 Skarp publicering' }}
              </span>
            </div>

            <div class="space-y-3 text-xs">
              <label class="flex items-start justify-between gap-4 cursor-pointer p-3.5 rounded-2xl bg-base-200/80 border border-primary/20 hover:border-primary transition-all">
                <div class="space-y-1">
                  <span class="font-bold text-base-content block text-sm">
                    Aktivera Testläge (Mock Mode)
                  </span>
                  <p class="text-[11px] text-base-content/75 leading-relaxed">
                    När testläget är <strong>på</strong> simuleras delningar till Facebook och Instagram. Inläggstexterna formateras och loggas, men inget publiceras på bandets riktiga Facebook-sida. Slå <strong>av</strong> när ni är redo för skarp livesändning!
                  </p>
                </div>
                <input
                  v-model="settingsForm.socialMockMode"
                  type="checkbox"
                  class="toggle toggle-warning toggle-md flex-shrink-0 mt-1"
                >
              </label>
            </div>
          </div>

          <!-- CARD: YOUTUBE INTEGRATION -->
          <div class="stage-card p-6 rounded-3xl border border-primary/30 shadow-xl space-y-4 bg-base-100/95">
            <div class="flex items-center justify-between gap-3 border-b border-primary/20 pb-3">
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="text-xl flex-shrink-0">🎬</span>
                <div class="min-w-0">
                  <h3 class="font-heading text-base text-primary font-bold truncate">YouTube-integrering & Synk</h3>
                  <p class="text-[11px] text-base-content/70 truncate">Automatisk videoimport och delning</p>
                </div>
              </div>
              <span
                class="badge badge-sm font-mono font-bold text-[11px] whitespace-nowrap flex-shrink-0 px-2.5 py-1"
                :class="settingsForm.youtubeAutoImport ? 'badge-success text-success-content' : 'badge-ghost text-base-content/60'"
              >
                {{ settingsForm.youtubeAutoImport ? '🟢 Auto-import På' : '⚪ Auto-import Av' }}
              </span>
            </div>

            <div class="space-y-3.5 text-xs">
              <!-- Channel Handle / ID Input -->
              <div>
                <label class="block text-xs font-bold text-secondary mb-1">
                  YouTube Kanal-ID eller @Handtag
                </label>
                <input
                  v-model="settingsForm.youtubeChannelId"
                  type="text"
                  placeholder="@det7egunget eller UCFbpKRd0ggDlw4RPIXwIauQ"
                  class="input input-bordered input-sm w-full bg-base-200 font-mono text-xs"
                >
                <p class="text-[10px] text-base-content/60 mt-1">
                  Kopplad till <code>@det7egunget</code> (Kanal-ID: <code>UCFbpKRd0ggDlw4RPIXwIauQ</code>).
                </p>
              </div>

              <!-- Toggle: Auto Import -->
              <label class="flex items-start justify-between gap-4 cursor-pointer p-3 rounded-2xl bg-base-200/70 border border-primary/10 hover:border-primary/30 transition-all">
                <div class="space-y-0.5">
                  <span class="font-bold text-base-content block">
                    🔄 Automatisk import (Dygnscron)
                  </span>
                  <p class="text-[11px] text-base-content/70 leading-relaxed">
                    Sajten kontrollerar YouTube-kanalen automatiskt 1 gång per dygn via Vercel Cron och sparar nya videolänkar i databasen.
                  </p>
                </div>
                <input
                  v-model="settingsForm.youtubeAutoImport"
                  type="checkbox"
                  class="toggle toggle-primary toggle-sm flex-shrink-0 mt-1"
                >
              </label>

              <!-- Toggle: Auto Post to Social Media -->
              <label class="flex items-start justify-between gap-4 cursor-pointer p-3 rounded-2xl bg-base-200/70 border border-primary/10 hover:border-primary/30 transition-all">
                <div class="space-y-0.5">
                  <span class="font-bold text-base-content block">
                    📢 Posta automatiskt till sociala medier
                  </span>
                  <p class="text-[11px] text-base-content/70 leading-relaxed">
                    När en ny video upptäcks delas den direkt till Facebook och Instagram med titel, YouTube-länk och hashtags.
                  </p>
                </div>
                <input
                  v-model="settingsForm.youtubeAutoSocial"
                  type="checkbox"
                  class="toggle toggle-secondary toggle-sm flex-shrink-0 mt-1"
                >
              </label>

              <!-- Manual Sync Action Bar -->
              <div class="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-primary/10">
                <div>
                  <span class="text-[11px] text-base-content/60 block">Senaste synkning:</span>
                  <span class="text-xs font-mono font-bold text-base-content">
                    {{
                      adminSettings?.youtubeLastSynced
                        ? new Date(adminSettings.youtubeLastSynced).toLocaleString('sv-SE', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })
                        : 'Aldrig synkad'
                    }}
                  </span>
                </div>
                <button
                  type="button"
                  class="btn btn-outline btn-primary btn-sm rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-sm w-full sm:w-auto"
                  :disabled="isSyncingYouTube"
                  @click="syncYouTubeNow"
                >
                  <span v-if="isSyncingYouTube" class="loading loading-spinner loading-xs"/>
                  <span v-else>⚡</span>
                  <span>{{ isSyncingYouTube ? 'Synkar från YouTube...' : 'Synka från YouTube nu' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: EMAIL, HOMEPAGE SLIDERS & AI COVER STUDIO -->
        <div class="space-y-6">
          <!-- CARD 3: EMAIL NOTIFICATIONS -->
          <div class="stage-card p-6 rounded-3xl border border-primary/30 shadow-lg space-y-4 bg-base-100/95">
            <div class="flex items-center gap-2.5 border-b border-primary/20 pb-3">
              <span class="text-xl">📧</span>
              <div>
                <h3 class="font-heading text-base text-primary font-bold">E-postaviseringar (Brevo)</h3>
                <p class="text-[11px] text-base-content/70">Mottagare av bokningsförfrågningar via e-post</p>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-secondary mb-1">
                Mottagande e-postadress(er) för bokningar
              </label>
              <input
                v-model="settingsForm.notificationEmail"
                type="text"
                placeholder="info@det7egunget.se, janis@example.com"
                class="input input-bordered input-sm w-full bg-base-200 font-mono text-xs"
              >
              <p class="text-[10px] text-base-content/60 mt-1">
                Tips: Du kan ange flera e-postadresser separerade med kommatecken (<code>,</code>) eller semikolon (<code>;</code>).
              </p>
            </div>
          </div>

          <!-- CARD 4: HOMEPAGE SLIDERS & CONTENT -->
          <div class="stage-card p-6 rounded-3xl border border-primary/30 shadow-lg space-y-4 bg-base-100/95">
            <div class="flex items-center gap-2.5 border-b border-primary/20 pb-3">
              <span class="text-xl">🎛️</span>
              <div>
                <h3 class="font-heading text-base text-primary font-bold">Startsidans visningsreglage</h3>
                <p class="text-[11px] text-base-content/70">Hur mycket slumpat innehåll som exponeras för besökaren</p>
              </div>
            </div>

            <div class="space-y-4 text-xs">
              <!-- Slider 1: Songs count -->
              <div class="space-y-1">
                <div class="flex justify-between items-center text-xs">
                  <span class="font-bold text-base-content">🎵 Antal låtar i jukebox-puffen</span>
                  <span class="badge badge-primary badge-sm font-mono font-bold">{{ settingsForm.landingSongCount }} st</span>
                </div>
                <input
                  v-model.number="settingsForm.landingSongCount"
                  type="range"
                  min="2"
                  max="10"
                  step="1"
                  class="range range-primary range-xs w-full"
                >
                <div class="flex justify-between text-[10px] text-base-content/50 font-mono">
                  <span>2 st</span>
                  <span>6 st</span>
                  <span>10 st</span>
                </div>
              </div>

              <!-- Slider 2: Merch items count -->
              <div class="space-y-1">
                <div class="flex justify-between items-center text-xs">
                  <span class="font-bold text-base-content">👕 Antal merch-artiklar på startsidan</span>
                  <span class="badge badge-primary badge-sm font-mono font-bold">{{ settingsForm.landingMerchCount }} st</span>
                </div>
                <input
                  v-model.number="settingsForm.landingMerchCount"
                  type="range"
                  min="2"
                  max="8"
                  step="1"
                  class="range range-primary range-xs w-full"
                >
                <div class="flex justify-between text-[10px] text-base-content/50 font-mono">
                  <span>2 st</span>
                  <span>5 st</span>
                  <span>8 st</span>
                </div>
              </div>

              <!-- Toggle: Newsletter -->
              <label class="flex items-center justify-between gap-3 pt-2 border-t border-primary/10 cursor-pointer">
                <div>
                  <span class="font-bold text-base-content block">📬 Nyhetsbrevsprenumeration</span>
                  <span class="text-[11px] text-base-content/65">Visa anmälningsformulär för nyhetsbrev på sajten</span>
                </div>
                <input
                  v-model="settingsForm.newsletterEnabled"
                  type="checkbox"
                  class="toggle toggle-primary toggle-sm"
                >
              </label>
            </div>
          </div>

          <!-- CARD 5: AI COVER STUDIO SETTINGS -->
          <div class="stage-card p-6 rounded-3xl border border-primary/30 shadow-lg space-y-4 bg-base-100/95">
            <div class="flex items-center gap-2.5 border-b border-primary/20 pb-3">
              <span class="text-xl">✨</span>
              <div>
                <h3 class="font-heading text-base text-primary font-bold">AI Single Cover Studio</h3>
                <p class="text-[11px] text-base-content/70">Google Gemini API & bildgenerering</p>
              </div>
            </div>

            <div class="space-y-3">
              <div>
                <label class="block text-xs font-bold text-secondary mb-1">
                  Gemini API-nyckel (valfritt)
                </label>
                <input
                  v-model="settingsForm.geminiApiKey"
                  type="password"
                  placeholder="AIzaSy..."
                  class="input input-bordered input-sm w-full bg-base-200 font-mono text-xs"
                >
                <p class="text-[10px] text-base-content/60 mt-1">
                  Om lämnad tom används miljövariabeln <code>GEMINI_API_KEY</code> från Vercel.
                </p>
              </div>

              <div>
                <label class="block text-xs font-bold text-secondary mb-1">
                  Anpassad stilinstruktion för omslag
                </label>
                <textarea
                  v-model="settingsForm.customCoverPrompt"
                  rows="2"
                  placeholder="T.ex. Extra sliten vinyl vintage 70-tal med rökig känsla..."
                  class="textarea textarea-bordered text-xs w-full bg-base-200"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Save Bar -->
      <div class="p-4 rounded-2xl bg-base-200/90 border border-primary/30 flex items-center justify-between gap-4">
        <span class="text-xs text-base-content/70">
          Glöm inte att spara efter att du ändrat Discord Webhook eller e-postadresser.
        </span>
        <button
          type="button"
          class="btn btn-primary btn-sm rounded-full font-bold px-7 shadow-lg shadow-primary/30 cursor-pointer flex items-center gap-2"
          :class="isSettingsDirty ? 'ring-2 ring-warning animate-pulse' : ''"
          :disabled="isSavingSettings"
          @click="saveSettings"
        >
          <span v-if="isSavingSettings" class="loading loading-spinner loading-xs"/>
          <span>💾 {{ isSettingsDirty ? 'Spara ändringar!' : 'Spara inställningar' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
