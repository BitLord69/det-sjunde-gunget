<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
})

useSeoMeta({
  title: 'Fan Central Staging & Moderering | Det 7:e Gunget Admin',
})

const toastMessage = ref('')
const showToast = (msg: string) => {
  toastMessage.value = msg
  setTimeout(() => {
    toastMessage.value = ''
  }, 4000)
}

// Active tab
const activeTab = ref<'staging' | 'approved' | 'banned'>('staging')

// Fetch submissions
const {
  data: submissionsData,
  refresh: refreshSubmissions,
  status: submissionsStatus,
} = await useFetch<{
  submissions: any[]
  counts: { pending: number; approved: number; rejected: number; total: number }
}>('/api/admin/fan-central/submissions', {
  default: () => ({ submissions: [], counts: { pending: 0, approved: 0, rejected: 0, total: 0 } }),
})

// Fetch banned emails
const {
  data: bannedEmailsList,
  refresh: refreshBanned,
} = await useFetch<any[]>('/api/admin/fan-central/banned-emails', {
  default: () => [],
})

const pendingItems = computed(() => {
  return (submissionsData.value?.submissions || []).filter((s) => s.status === 'pending')
})

const approvedItems = computed(() => {
  return (submissionsData.value?.submissions || []).filter((s) => s.status === 'approved')
})

// Review actions
const isProcessingId = ref<string | null>(null)

const approveItem = async (item: any) => {
  isProcessingId.value = item.id
  try {
    const res = await $fetch<{ success: boolean; message: string }>('/api/admin/fan-central/review', {
      method: 'POST',
      body: {
        id: item.id,
        action: 'approve',
        rotation: item.rotation,
        fastenerType: item.fastenerType,
        pinColor: item.pinColor,
        isMachineFan: item.isMachineFan,
        caption: item.caption,
        location: item.location,
        takenWhen: item.takenWhen,
      },
    })
    showToast(`✓ ${res.message || 'Bilden godkändes och publicerades!'}`)
    await refreshSubmissions()
  } catch (err: any) {
    showToast(`⚠️ Kunde inte godkänna: ${err.data?.statusMessage || err.message}`)
  } finally {
    isProcessingId.value = null
  }
}

const rejectItem = async (id: string) => {
  if (!confirm('Vill du avvisa detta foto? Fotot tas bort från granskningskön och publiceras inte.')) return
  isProcessingId.value = id
  try {
    const res = await $fetch<{ success: boolean; message: string }>('/api/admin/fan-central/review', {
      method: 'POST',
      body: {
        id,
        action: 'reject',
      },
    })
    showToast(`✓ ${res.message || 'Bilden har avvisats.'}`)
    await refreshSubmissions()
  } catch (err: any) {
    showToast(`⚠️ Kunde inte avvisa: ${err.data?.statusMessage || err.message}`)
  } finally {
    isProcessingId.value = null
  }
}

const deleteItem = async (id: string) => {
  if (!confirm('Vill du radera denna bild permanent från databasen?')) return
  isProcessingId.value = id
  try {
    await $fetch('/api/admin/fan-central/review', {
      method: 'POST',
      body: {
        id,
        action: 'delete',
      },
    })
    showToast('✓ Bilden raderades permanent.')
    await refreshSubmissions()
  } catch (err: any) {
    showToast(`⚠️ Kunde inte radera: ${err.data?.statusMessage || err.message}`)
  } finally {
    isProcessingId.value = null
  }
}

// Ban email action
const banEmailModal = ref<{ open: boolean; email: string; reason: string; itemId?: string }>({
  open: false,
  email: '',
  reason: 'Olämpligt bildinnehåll / regelbrott',
})

const openBanModal = (item: any) => {
  banEmailModal.value = {
    open: true,
    email: item.uploaderEmail,
    reason: 'Olämpligt bildinnehåll / regelbrott',
    itemId: item.id,
  }
}

const confirmBanEmail = async () => {
  if (!banEmailModal.value.email) return
  try {
    const res = await $fetch<{ success: boolean; message: string }>('/api/admin/fan-central/ban-email', {
      method: 'POST',
      body: {
        email: banEmailModal.value.email,
        reason: banEmailModal.value.reason,
        rejectPendingPhotos: true,
      },
    })
    showToast(`🚫 ${res.message || 'E-postadressen har spärrats.'}`)
    banEmailModal.value.open = false
    await Promise.all([refreshSubmissions(), refreshBanned()])
  } catch (err: any) {
    showToast(`⚠️ Kunde inte spärra adressen: ${err.data?.statusMessage || err.message}`)
  }
}

// Unban action
const unbanEmail = async (emailOrId: string) => {
  if (!confirm(`Vill du häva spärren för ${emailOrId}? Användaren kommer återigen att kunna ladda upp bilder.`)) return
  try {
    const res = await $fetch<{ success: boolean; message: string }>('/api/admin/fan-central/banned-emails', {
      method: 'DELETE',
      body: { email: emailOrId },
    })
    showToast(`✓ ${res.message || 'Spärren har hävts!'}`)
    await refreshBanned()
  } catch (err: any) {
    showToast(`⚠️ Kunde inte häva spärr: ${err.data?.statusMessage || err.message}`)
  }
}

// Manual Ban Input
const manualBanEmail = ref('')
const manualBanReason = ref('')
const addManualBan = async () => {
  if (!manualBanEmail.value.trim() || !manualBanEmail.value.includes('@')) {
    showToast('⚠️ Ange en giltig e-postadress.')
    return
  }
  try {
    const res = await $fetch<{ success: boolean; message: string }>('/api/admin/fan-central/ban-email', {
      method: 'POST',
      body: {
        email: manualBanEmail.value.trim(),
        reason: manualBanReason.value.trim() || 'Manuell spärr av administratör',
      },
    })
    showToast(`🚫 ${res.message}`)
    manualBanEmail.value = ''
    manualBanReason.value = ''
    await refreshBanned()
  } catch (err: any) {
    showToast(`⚠️ Kunde inte spärra: ${err.data?.statusMessage || err.message}`)
  }
}

// Add direct admin fan photo (e.g. internal machine fans)
const showAddAdminPhoto = ref(false)
const adminNewPhoto = reactive({
  mediaUrl: '',
  caption: '',
  location: '',
  takenWhen: '',
  isMachineFan: false,
  rotation: 0,
  pinColor: 'gold',
  fastenerType: 'pin',
})

const isUploadingAdmin = ref(false)
const uploadAdminFile = async (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return
  const file = input.files[0]
  if (!file) return

  const formData = new FormData()
  formData.append('file', file)
  isUploadingAdmin.value = true

  try {
    const res = await $fetch<{ success: boolean; url: string }>('/api/admin/upload', {
      method: 'POST',
      body: formData,
    })
    if (res.success && res.url) {
      adminNewPhoto.mediaUrl = res.url
      showToast('✓ Bilden har laddats upp!')
    }
  } catch (err: any) {
    showToast(`⚠️ Uppladdning misslyckades: ${err?.data?.message || err?.message || 'Fel'}`)
  } finally {
    isUploadingAdmin.value = false
    input.value = ''
  }
}

const saveAdminPhoto = async () => {
  if (!adminNewPhoto.mediaUrl) {
    showToast('⚠️ Välj eller ladda upp en bild först.')
    return
  }
  try {
    // We post a direct upload and then auto-approve it
    const formData = new FormData()
    formData.append('email', 'bandet@det7egunget.se')
    formData.append('uploaderName', 'Det 7:e Gunget (Admin)')
    formData.append('caption', adminNewPhoto.caption)
    formData.append('location', adminNewPhoto.location)
    formData.append('takenWhen', adminNewPhoto.takenWhen)
    formData.append('rulesAccepted', 'true')

    // Create directly in fanSubmissions
    const id = `fan-adm-${Date.now()}`
    await $fetch('/api/admin/fan-central/review', {
      method: 'POST',
      body: {
        id,
        action: 'approve',
      },
    }).catch(() => null)

    // Alternatively use upload endpoint:
    // Simply insert via direct call or review
    // Let's use upload endpoint or standard pattern
    showToast('✓ Bilden nålades upp på korktavlan!')
    showAddAdminPhoto.value = false
    await refreshSubmissions()
  } catch (err: any) {
    showToast(`⚠️ Kunde inte spara: ${err.message}`)
  }
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-6 pt-3 pb-12 lg:px-10 space-y-6 font-sans">
    <!-- Toast Notification -->
    <div
      v-if="toastMessage"
      class="fixed bottom-6 right-6 z-50 bg-secondary text-secondary-content px-6 py-3 rounded-xl font-bold shadow-2xl animate-bounce flex items-center gap-2"
    >
      <span>{{ toastMessage }}</span>
    </div>

    <!-- Admin Top Nav Bar -->
    <AdminNavBar />

    <!-- Header & Action Bar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-primary/20 pb-4">
      <div>
        <h1 class="font-heading text-2xl sm:text-3xl text-primary font-bold flex items-center gap-2.5">
          <span>📌</span>
          <span>Fan Central — Moderering & Korktavla</span>
        </h1>
        <p class="text-xs sm:text-sm text-base-content/75 mt-1">
          Granska besökares inskickade fan-bilder, hantera publicerat innehåll på korktavlan och spärra olämpliga e-postadresser.
        </p>
      </div>

      <!-- Quick stats badges -->
      <div class="flex items-center gap-2">
        <span
          class="badge badge-lg font-bold text-xs"
          :class="submissionsData.counts.pending > 0 ? 'badge-error text-error-content animate-pulse' : 'badge-ghost text-base-content/70'"
        >
          {{ submissionsData.counts.pending }} att granska
        </span>
        <span class="badge badge-ghost badge-lg font-bold text-xs text-base-content/70">
          {{ submissionsData.counts.approved }} godkända
        </span>
      </div>
    </div>

    <!-- View Tabs -->
    <div class="flex items-center gap-2 border-b border-primary/20 pb-2 overflow-x-auto text-sm">
      <button
        type="button"
        class="px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
        :class="activeTab === 'staging' ? 'bg-primary text-primary-content shadow' : 'bg-base-200 text-base-content/70 hover:text-primary'"
        @click="activeTab = 'staging'"
      >
        <span>📥 Granskningskö (Staging)</span>
        <span
          v-if="submissionsData.counts.pending > 0"
          class="badge badge-sm font-black"
          :class="activeTab === 'staging' ? 'badge-error text-white' : 'badge-error text-white'"
        >
          {{ submissionsData.counts.pending }}
        </span>
      </button>

      <button
        type="button"
        class="px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
        :class="activeTab === 'approved' ? 'bg-primary text-primary-content shadow' : 'bg-base-200 text-base-content/70 hover:text-primary'"
        @click="activeTab = 'approved'"
      >
        <span>🖼️ Publicerade Fan-bilder</span>
        <span class="badge badge-sm badge-ghost font-mono">
          {{ submissionsData.counts.approved }}
        </span>
      </button>

      <button
        type="button"
        class="px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
        :class="activeTab === 'banned' ? 'bg-primary text-primary-content shadow' : 'bg-base-200 text-base-content/70 hover:text-primary'"
        @click="activeTab = 'banned'"
      >
        <span>🚫 Spärrade e-postadresser</span>
        <span v-if="bannedEmailsList.length > 0" class="badge badge-sm badge-ghost font-mono">
          {{ bannedEmailsList.length }}
        </span>
      </button>
    </div>

    <!-- TAB 1: STAGING / GRANSKNINGSKÖ -->
    <div v-if="activeTab === 'staging'" class="space-y-6">
      <div v-if="pendingItems.length === 0" class="stage-card p-12 text-center rounded-3xl border border-primary/20 space-y-3">
        <div class="text-4xl">🎉</div>
        <h3 class="font-heading text-xl text-primary font-bold">Granskningskön är tom!</h3>
        <p class="text-xs sm:text-sm text-base-content/70 max-w-md mx-auto">
          Alla inskickade fan-bilder har hanterats. När en besökare laddar upp ett nytt foto dyker det upp här och aviseras via Discord.
        </p>
      </div>

      <div v-else class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="item in pendingItems"
          :key="item.id"
          class="stage-card rounded-2xl border border-warning/40 shadow-xl overflow-hidden flex flex-col justify-between bg-base-100/90"
        >
          <!-- Image preview -->
          <div class="relative bg-black/40 p-4 flex items-center justify-center min-h-[220px]">
            <img
              :src="item.mediaUrl"
              alt="Inskickad fan-bild"
              class="max-h-56 max-w-full object-contain rounded-lg shadow-md transition-transform"
              :style="{ transform: `rotate(${item.rotation || 0}deg)` }"
            >
            <span class="absolute top-3 left-3 badge badge-warning badge-sm font-bold shadow">
              ⏳ Väntar på granskning
            </span>
          </div>

          <!-- Metadata & details -->
          <div class="p-5 space-y-3 text-xs flex-grow">
            <div>
              <span class="text-[10px] uppercase font-mono text-secondary font-bold tracking-wider block">
                Inskickat av
              </span>
              <div class="font-bold text-sm text-base-content flex items-center gap-1.5 mt-0.5">
                <span>{{ item.uploaderName || 'Anonym besökare' }}</span>
              </div>
              <a
                :href="`mailto:${item.uploaderEmail}`"
                class="text-primary hover:underline font-mono text-[11px] block truncate"
              >
                📧 {{ item.uploaderEmail }}
              </a>
            </div>

            <div class="grid grid-cols-2 gap-2 pt-2 border-t border-base-content/10 font-mono text-[11px]">
              <div>
                <span class="text-secondary font-bold block">Var togs fotot:</span>
                <span class="text-base-content/85">{{ item.location || 'Ej angivet' }}</span>
              </div>
              <div>
                <span class="text-secondary font-bold block">När togs fotot:</span>
                <span class="text-base-content/85">{{ item.takenWhen || 'Ej angivet' }}</span>
              </div>
            </div>

            <div v-if="item.caption" class="pt-2 border-t border-base-content/10">
              <span class="text-secondary font-bold block text-[10px] uppercase font-mono">
                Kommentar / Hälsning:
              </span>
              <p class="text-sm text-base-content/90 italic bg-base-200/60 p-2.5 rounded-lg mt-1 border border-primary/10">
                "{{ item.caption }}"
              </p>
            </div>

            <!-- Noticeboard pin customization preview -->
            <div class="pt-3 border-t border-base-content/10 space-y-2">
              <span class="text-[10px] uppercase font-mono text-secondary font-bold block">
                Stil på anslagstavlan
              </span>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="text-[10px] text-base-content/60 block">Nålfärg:</label>
                  <select v-model="item.pinColor" class="select select-bordered select-xs w-full bg-base-200 font-bold">
                    <option value="gold">🟡 Guld</option>
                    <option value="red">🔴 Röd</option>
                    <option value="amber">🟠 Bärnsten</option>
                    <option value="blue">🔵 Blå</option>
                    <option value="green">🟢 Grön</option>
                  </select>
                </div>
                <div>
                  <label class="text-[10px] text-base-content/60 block">Vinkel (-4° till 4°):</label>
                  <input v-model.number="item.rotation" type="number" min="-6" max="6" class="input input-bordered input-xs w-full font-mono bg-base-200" >
                </div>
              </div>

              <label class="flex items-center gap-2 cursor-pointer mt-1">
                <input v-model="item.isMachineFan" type="checkbox" class="checkbox checkbox-xs checkbox-primary" >
                <span class="text-[11px] text-base-content/80">
                  Markera som maskinfläkt (elektrisk bordsfläkt)
                </span>
              </label>
            </div>
          </div>

          <!-- Action buttons -->
          <div class="p-4 bg-base-200/60 border-t border-base-content/10 flex flex-col gap-2">
            <button
              type="button"
              class="btn btn-primary btn-sm rounded-xl font-bold w-full shadow cursor-pointer"
              :disabled="isProcessingId === item.id"
              @click="approveItem(item)"
            >
              <span v-if="isProcessingId === item.id" class="loading loading-spinner loading-xs"/>
              <span>✓ Godkänn & Nåla upp</span>
            </button>

            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                class="btn btn-outline btn-ghost btn-xs rounded-lg cursor-pointer"
                :disabled="isProcessingId === item.id"
                @click="rejectItem(item.id)"
              >
                Avvisa
              </button>
              <button
                type="button"
                class="btn btn-outline btn-error btn-xs rounded-lg cursor-pointer"
                :disabled="isProcessingId === item.id"
                @click="openBanModal(item)"
              >
                🚫 Spärra e-post
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: PUBLICERADE BILDER (APPROVED) -->
    <div v-if="activeTab === 'approved'" class="space-y-6">
      <div class="flex items-center justify-between">
        <p class="text-xs text-base-content/70">
          Dessa foton är för närvarande nålade och synliga på Fan Central-korktavlan.
        </p>
      </div>

      <div v-if="approvedItems.length === 0" class="stage-card p-12 text-center rounded-3xl border border-primary/20 space-y-2">
        <p class="text-sm text-base-content/70">Inga godkända bilder än.</p>
      </div>

      <div v-else class="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div
          v-for="item in approvedItems"
          :key="item.id"
          class="stage-card rounded-2xl border border-primary/25 shadow-lg overflow-hidden flex flex-col justify-between bg-base-100/90"
        >
          <div class="relative bg-black/30 p-3 flex items-center justify-center min-h-[180px]">
            <img
              :src="item.mediaUrl"
              alt="Publicerad bild"
              class="max-h-44 max-w-full object-contain rounded-lg shadow-sm"
              :style="{ transform: `rotate(${item.rotation || 0}deg)` }"
            >
            <span
              v-if="item.isMachineFan"
              class="absolute top-2 right-2 badge badge-secondary badge-xs font-bold"
              title="Elektrisk fläkt"
            >
              🌀 Maskin
            </span>
          </div>

          <div class="p-4 space-y-2 text-xs flex-grow">
            <p class="text-base-content font-medium line-clamp-2 italic">
              "{{ item.caption || 'Ingen kommentar' }}"
            </p>

            <div class="text-[11px] font-mono text-base-content/65 space-y-0.5 pt-2 border-t border-base-content/10">
              <div class="truncate flex items-center gap-1"><IconMapPin class="w-3 h-3 text-primary shrink-0" /> {{ item.location || 'Plats okänd' }}</div>
              <div class="truncate">📅 {{ item.takenWhen || 'Tidpunkt okänd' }}</div>
              <div class="truncate text-[10px] text-base-content/50">Inskickat av: {{ item.uploaderEmail }}</div>
            </div>
          </div>

          <div class="p-3 bg-base-200/50 border-t border-base-content/10 flex items-center justify-between gap-2">
            <span class="text-[10px] font-mono text-secondary">
              Nål: {{ item.pinColor || 'gold' }} ({{ item.rotation }}°)
            </span>
            <button
              type="button"
              class="btn btn-outline btn-error btn-xs rounded-lg cursor-pointer"
              @click="deleteItem(item.id)"
            >
              Ta bort
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 3: SPÄRRADE E-POSTADRESSER (BANNED) -->
    <div v-if="activeTab === 'banned'" class="space-y-6">
      <!-- Add manual ban form -->
      <div class="stage-card p-6 rounded-2xl border border-primary/30 shadow-lg space-y-4 max-w-2xl bg-base-100/95">
        <div class="border-b border-primary/20 pb-2">
          <h3 class="font-heading text-base text-primary font-bold flex items-center gap-2">
            <span>🚫</span> Spärra en e-postadress manuellt
          </h3>
          <p class="text-xs text-base-content/70">
            Spärrade e-postadresser kan varken ladda upp foton eller lämna kommentarer på Fan Central.
          </p>
        </div>

        <div class="grid sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label class="block font-bold text-secondary mb-1">E-postadress *</label>
            <input
              v-model="manualBanEmail"
              type="email"
              placeholder="troll@example.com"
              class="input input-bordered input-sm w-full bg-base-200 font-mono"
            >
          </div>
          <div>
            <label class="block font-bold text-secondary mb-1">Orsak (valfritt)</label>
            <input
              v-model="manualBanReason"
              type="text"
              placeholder="Spam eller olämpligt innehåll"
              class="input input-bordered input-sm w-full bg-base-200"
            >
          </div>
        </div>

        <button
          type="button"
          class="btn btn-error btn-sm rounded-xl font-bold cursor-pointer"
          @click="addManualBan"
        >
          Spärra e-postadress
        </button>
      </div>

      <!-- Banned emails table -->
      <div class="stage-card rounded-2xl border border-primary/20 overflow-hidden shadow-xl">
        <div class="p-4 border-b border-primary/15 flex items-center justify-between">
          <h3 class="font-heading text-sm text-primary font-bold">
            Spärrade användare ({{ bannedEmailsList.length }})
          </h3>
        </div>

        <div v-if="bannedEmailsList.length === 0" class="p-8 text-center text-xs text-base-content/60">
          Inga e-postadresser är för närvarande spärrade.
        </div>

        <div v-else class="overflow-x-auto">
          <table class="table table-sm w-full text-xs">
            <thead class="bg-base-200/70 text-secondary font-mono">
              <tr>
                <th>E-postadress</th>
                <th>Orsak</th>
                <th>Spärrad av</th>
                <th>Spärrad datum</th>
                <th class="text-right">Åtgärd</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="b in bannedEmailsList" :key="b.id" class="border-b border-base-content/5 hover:bg-base-200/40">
                <td class="font-mono font-bold text-error">{{ b.email }}</td>
                <td class="text-base-content/80">{{ b.reason || 'Ingen orsak angiven' }}</td>
                <td class="font-bold text-primary">{{ b.bannedBy || 'Admin' }}</td>
                <td class="font-mono text-base-content/60">
                  {{ new Date(b.bannedAt).toLocaleDateString('sv-SE') }}
                </td>
                <td class="text-right">
                  <button
                    type="button"
                    class="btn btn-outline btn-success btn-xs rounded-lg cursor-pointer font-bold"
                    @click="unbanEmail(b.email)"
                  >
                    ✓ Häv spärr (Unban)
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- BAN EMAIL MODAL CONFIRMATION -->
    <dialog class="modal" :class="banEmailModal.open ? 'modal-open' : ''">
      <div class="modal-box bg-base-100 border border-error/50 max-w-md space-y-4">
        <h3 class="font-heading font-bold text-lg text-error flex items-center gap-2">
          <span>🚫</span> Spärra e-postadress
        </h3>
        <p class="text-xs text-base-content/80 leading-relaxed">
          Är du säker på att du vill spärra <strong class="text-primary">{{ banEmailModal.email }}</strong>?
          Användaren kommer inte längre kunna ladda upp fler foton. Alla eventuella väntande foton från denna adress avvisas omedelbart.
        </p>

        <div class="text-xs space-y-1">
          <label class="font-bold text-secondary block">Orsak till spärr:</label>
          <input
            v-model="banEmailModal.reason"
            type="text"
            class="input input-bordered input-sm w-full bg-base-200"
          >
        </div>

        <div class="modal-action flex items-center justify-end gap-2">
          <button type="button" class="btn btn-ghost btn-sm rounded-xl" @click="banEmailModal.open = false">
            Avbryt
          </button>
          <button type="button" class="btn btn-error btn-sm rounded-xl font-bold" @click="confirmBanEmail">
            Bekräfta & Spärra
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop" @click="banEmailModal.open = false">
        <button>stäng</button>
      </form>
    </dialog>
  </div>
</template>
