<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
})

useSeoMeta({
  title: 'Bokningar & Meddelanden | Det 7:e Gunget Admin',
})

const route = useRoute()
const toastMessage = ref('')

const showToast = (msg: string) => {
  toastMessage.value = msg
  setTimeout(() => {
    toastMessage.value = ''
  }, 4000)
}

const { data: messagesData, refresh: refreshMessages } = await useFetch<any[]>('/api/admin/messages', {
  default: () => [],
})

const selectedMessage = ref<any | null>(null)
const activeStatusFilter = ref<string>('all')
const adminNotesInput = ref('')
const isSavingNotes = ref(false)
const notesSavedFeedback = ref(false)
const copiedEmail = ref(false)

const copyEmailToClipboard = async (email: string) => {
  if (!email) return
  try {
    await navigator.clipboard.writeText(email)
    copiedEmail.value = true
    setTimeout(() => {
      copiedEmail.value = false
    }, 2500)
    showToast('✓ E-postadressen kopierades till urklipp!')
  } catch (_) {
    showToast('⚠️ Kunde inte kopiera automatiskt.')
  }
}

const statusOptions: Array<{ value: string; label: string; icon: string; badgeClass: string }> = [
  { value: 'unread', label: 'Oläst', icon: '📬', badgeClass: 'bg-primary/20 text-primary border-primary/40' },
  { value: 'pending', label: 'Väntar på svar', icon: '⏳', badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  { value: 'accepted', label: 'Accepterad', icon: '✓', badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  { value: 'declined', label: 'Avböjd', icon: '✕', badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
  { value: 'archived', label: 'Arkiverad', icon: '📁', badgeClass: 'bg-base-content/10 text-base-content/60 border-base-content/20' },
]

const getStatusMeta = (status: string) => {
  return statusOptions.find((o) => o.value === status) || {
    value: status,
    label: status === 'read' ? 'Läst' : status,
    icon: '•',
    badgeClass: 'badge-ghost',
  }
}

const openMessageFromRoute = () => {
  const targetId = (route.query.msg || route.query.messageId || route.query.id) as string
  if (targetId && messagesData.value && messagesData.value.length > 0) {
    const found = messagesData.value.find((m: any) => m.id === targetId)
    if (found) {
      selectedMessage.value = found
    }
  }
}

watch(
  messagesData,
  () => {
    openMessageFromRoute()
  },
  { immediate: true },
)

watch(selectedMessage, (newVal) => {
  if (newVal) {
    adminNotesInput.value = newVal.adminNotes || ''
    notesSavedFeedback.value = false
  }
})

onMounted(() => {
  openMessageFromRoute()
})

const filteredMessages = computed(() => {
  const list = messagesData.value || []
  if (activeStatusFilter.value === 'all') return list
  return list.filter((m: any) => m.status === activeStatusFilter.value)
})

const getStatusCount = (statusKey: string) => {
  const list = messagesData.value || []
  if (statusKey === 'all') return list.length
  return list.filter((m: any) => m.status === statusKey).length
}

const updateMessageStatus = async (msg: any, newStatus: string) => {
  await $fetch('/api/admin/messages', {
    method: 'PATCH',
    body: { id: msg.id, status: newStatus },
  })
  msg.status = newStatus
  if (selectedMessage.value?.id === msg.id) {
    selectedMessage.value.status = newStatus
  }
  await refreshMessages()
  const meta = getStatusMeta(newStatus)
  showToast(`✓ Status ändrades till "${meta.label}".`)
}

const saveAdminNotes = async () => {
  if (!selectedMessage.value) return
  isSavingNotes.value = true
  try {
    await $fetch('/api/admin/messages', {
      method: 'PATCH',
      body: {
        id: selectedMessage.value.id,
        adminNotes: adminNotesInput.value,
      },
    })
    selectedMessage.value.adminNotes = adminNotesInput.value
    await refreshMessages()
    notesSavedFeedback.value = true
    setTimeout(() => {
      notesSavedFeedback.value = false
    }, 3000)
    showToast('✓ Intern anteckning sparades!')
  } catch (err: any) {
    showToast(`⚠️ Kunde inte spara anteckning: ${err?.data?.message || err?.message || 'Fel'}`)
  } finally {
    isSavingNotes.value = false
  }
}

const deleteMessage = async (id: string) => {
  if (!confirm('Är du säker på att du vill radera denna förfrågan?')) return
  await $fetch(`/api/admin/messages?id=${id}`, {
    method: 'DELETE',
  })
  selectedMessage.value = null
  await refreshMessages()
  showToast('✓ Förfrågan raderades.')
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-6 pt-3 pb-10 lg:px-10 space-y-6 font-sans">
    <!-- Toast Notification -->
    <div
      v-if="toastMessage"
      class="fixed bottom-6 right-6 z-50 bg-secondary text-secondary-content px-6 py-3 rounded-xl font-bold shadow-2xl animate-bounce flex items-center gap-2"
    >
      <span>{{ toastMessage }}</span>
    </div>

    <!-- CMS Tab Navigation -->
    <AdminNavBar />

    <!-- MESSAGES & INQUIRIES -->
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="font-heading text-2xl text-primary font-bold">Bokningsförfrågningar & meddelanden</h2>
          <p class="text-xs text-base-content/70">Inkomna förfrågningar från kontaktformuläret på webbplatsen.</p>
        </div>
        <button type="button" class="btn btn-outline btn-primary btn-sm rounded-full cursor-pointer" @click="() => refreshMessages()">
          🔄 Uppdatera lista
        </button>
      </div>

      <!-- Filter Tabs -->
      <div class="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          class="btn btn-xs rounded-full cursor-pointer font-bold transition-all gap-1.5"
          :class="activeStatusFilter === 'all' ? 'btn-primary shadow' : 'btn-ghost border border-primary/20 text-base-content/70'"
          @click="activeStatusFilter = 'all'"
        >
          <span>Alla</span>
          <span class="badge badge-xs font-mono">{{ getStatusCount('all') }}</span>
        </button>

        <button
          v-for="opt in statusOptions"
          :key="opt.value"
          type="button"
          class="btn btn-xs rounded-full cursor-pointer font-bold transition-all gap-1.5"
          :class="activeStatusFilter === opt.value ? 'btn-primary shadow' : 'btn-ghost border border-primary/20 text-base-content/70'"
          @click="activeStatusFilter = opt.value"
        >
          <span>{{ opt.icon }}</span>
          <span>{{ opt.label }}</span>
          <span class="badge badge-xs font-mono">{{ getStatusCount(opt.value) }}</span>
        </button>
      </div>

      <!-- Messages Table -->
      <div class="overflow-x-auto rounded-2xl border border-primary/20 stage-card">
        <table class="table table-zebra w-full text-xs">
          <thead>
            <tr class="text-secondary font-bold uppercase text-[10px] tracking-wider border-b border-primary/20">
              <th>Datum</th>
              <th>Kontaktperson</th>
              <th>E-post & Telefon</th>
              <th>Typ av event</th>
              <th>Önskat datum & Plats</th>
              <th>Status</th>
              <th class="text-right">Åtgärd</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="msg in filteredMessages"
              :key="msg.id"
              class="cursor-pointer hover:bg-base-200/60 transition-colors"
              :class="msg.status === 'unread' ? 'font-bold bg-primary/5' : ''"
              @click="selectedMessage = msg"
            >
              <td class="font-mono text-[11px] whitespace-nowrap">
                {{ new Date(msg.createdAt).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }}
              </td>
              <td class="font-bold text-primary">
                <div class="flex items-center gap-1.5">
                  <span>{{ msg.name }}</span>
                  <span
                    v-if="msg.adminNotes"
                    class="tooltip tooltip-right text-amber-400 font-bold cursor-help"
                    :data-tip="'Anteckning: ' + msg.adminNotes"
                  >
                    📝
                  </span>
                </div>
              </td>
              <td class="font-mono text-[11px]">
                <div>{{ msg.email }}</div>
                <div v-if="msg.phone" class="text-base-content/60">{{ msg.phone }}</div>
              </td>
              <td><span class="badge badge-sm font-bold text-[10px]">{{ msg.eventType || 'Allmänt' }}</span></td>
              <td class="text-xs">
                <div v-if="msg.eventDate" class="font-bold text-primary">{{ msg.eventDate }}</div>
                <div v-if="msg.venue" class="font-semibold text-base-content/90">{{ msg.venue }}</div>
                <div v-if="msg.city || msg.streetAddress" class="text-base-content/70">
                  {{ [msg.streetAddress, [msg.postalCode, msg.city].filter(Boolean).join(' ')].filter(Boolean).join(', ') }}
                </div>
                <div v-else-if="msg.location" class="text-base-content/60">{{ msg.location }}</div>
                <div v-if="!msg.eventDate && !msg.venue && !msg.location && !msg.city" class="text-base-content/40">—</div>
              </td>
              <td>
                <span
                  class="badge badge-sm font-bold gap-1 text-[10px] border shadow-xs"
                  :class="getStatusMeta(msg.status).badgeClass"
                >
                  <span>{{ getStatusMeta(msg.status).icon }}</span>
                  <span>{{ getStatusMeta(msg.status).label }}</span>
                </span>
              </td>
              <td class="text-right space-x-2" @click.stop>
                <button
                  type="button"
                  class="btn btn-xs btn-outline btn-primary rounded cursor-pointer"
                  @click="selectedMessage = msg"
                >
                  Visa
                </button>
                <button
                  type="button"
                  class="btn btn-xs btn-outline btn-error rounded cursor-pointer"
                  @click="deleteMessage(msg.id)"
                >
                  Ta bort
                </button>
              </td>
            </tr>
            <tr v-if="!filteredMessages || filteredMessages.length === 0">
              <td colspan="7" class="text-center py-8 text-base-content/60 italic">
                Inga förfrågningar matchar det valda filtret.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Message Detail Modal -->
      <div v-if="selectedMessage" class="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
        <div class="stage-card max-w-2xl w-full p-6 sm:p-8 rounded-3xl border border-primary/40 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
          <div class="flex items-start justify-between gap-4 border-b border-primary/20 pb-4">
            <div>
              <span class="text-xs font-mono uppercase text-secondary font-bold">Förfrågan #{{ selectedMessage.id }}</span>
              <h3 class="font-heading text-2xl text-primary font-bold">{{ selectedMessage.name }}</h3>
              <span class="text-xs text-base-content/60">
                Mottagen: {{ new Date(selectedMessage.createdAt).toLocaleString('sv-SE') }}
              </span>
            </div>
            <button type="button" class="btn btn-sm btn-circle btn-ghost cursor-pointer" @click="selectedMessage = null">✕</button>
          </div>

          <div class="grid sm:grid-cols-2 gap-4 text-sm bg-base-200/80 p-5 rounded-2xl border border-primary/20">
            <div>
              <span class="text-[10px] uppercase font-bold text-secondary block">Kontaktperson</span>
              <span class="font-bold text-base-content">{{ selectedMessage.name }}</span>
            </div>
            <div>
              <span class="text-[10px] uppercase font-bold text-secondary block">E-post</span>
              <div class="flex items-center gap-2 mt-0.5">
                <a :href="`mailto:${selectedMessage.email}`" class="text-primary font-bold hover:underline truncate">{{ selectedMessage.email }}</a>
                <button
                  type="button"
                  class="btn btn-ghost btn-xs px-2 py-0.5 h-auto min-h-0 text-[11px] font-mono border border-primary/20 hover:border-primary rounded-lg text-base-content/80 hover:text-primary transition-colors cursor-pointer gap-1"
                  :title="copiedEmail ? 'Kopierad!' : 'Kopiera e-postadress'"
                  @click="copyEmailToClipboard(selectedMessage.email)"
                >
                  <span>{{ copiedEmail ? '✓' : '📋' }}</span>
                  <span>{{ copiedEmail ? 'Kopierad' : 'Kopiera' }}</span>
                </button>
              </div>
            </div>
            <div>
              <span class="text-[10px] uppercase font-bold text-secondary block">Telefon</span>
              <span>{{ selectedMessage.phone || 'Ej angivet' }}</span>
            </div>
            <div>
              <span class="text-[10px] uppercase font-bold text-secondary block">Typ av event</span>
              <span>{{ selectedMessage.eventType || 'Ej angivet' }}</span>
            </div>
            <div>
              <span class="text-[10px] uppercase font-bold text-secondary block">Önskat datum</span>
              <span class="font-bold text-primary">{{ selectedMessage.eventDate || 'Inget datum specificerat' }}</span>
            </div>
            <div>
              <span class="text-[10px] uppercase font-bold text-secondary block">Lokal / Spelställe</span>
              <span class="font-bold">{{ selectedMessage.venue || 'Ej angivet' }}</span>
            </div>
            <div class="sm:col-span-2 pt-2 border-t border-primary/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span class="text-[10px] uppercase font-bold text-secondary block">Adress</span>
                <span class="text-xs sm:text-sm text-base-content/90">
                  {{ [selectedMessage.streetAddress, [selectedMessage.postalCode, selectedMessage.city].filter(Boolean).join(' ')].filter(Boolean).join(', ') || selectedMessage.location || 'Ej angiven' }}
                </span>
              </div>
              <a
                v-if="selectedMessage.venue || selectedMessage.streetAddress || selectedMessage.city"
                :href="'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([selectedMessage.venue, selectedMessage.streetAddress, selectedMessage.postalCode, selectedMessage.city].filter(Boolean).join(', '))"
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-xs btn-outline btn-primary rounded-full font-bold self-start sm:self-auto gap-1"
              >
                <IconMapPin class="w-3.5 h-3.5" />
                <span>Öppna i Google Maps ↗</span>
              </a>
            </div>
            <div v-if="selectedMessage.website" class="sm:col-span-2 pt-2 border-t border-primary/10 flex items-center justify-between gap-2">
              <div>
                <span class="text-[10px] uppercase font-bold text-secondary block">Webbadress / Länk</span>
                <a
                  :href="selectedMessage.website.startsWith('http') ? selectedMessage.website : 'https://' + selectedMessage.website"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-xs sm:text-sm text-primary font-bold hover:underline flex items-center gap-1.5"
                >
                  <span>🌐</span>
                  <span>{{ selectedMessage.website }} ↗</span>
                </a>
              </div>
            </div>
          </div>

          <div class="space-y-2">
            <span class="text-xs uppercase font-bold text-secondary">Meddelande:</span>
            <div class="bg-base-200 p-4 rounded-xl text-sm whitespace-pre-wrap leading-relaxed border border-primary/10">
              {{ selectedMessage.body }}
            </div>
          </div>

          <!-- Status Selector in Modal -->
          <div class="p-4 bg-base-200/90 rounded-2xl border border-primary/20 space-y-2">
            <span class="text-xs uppercase font-bold text-secondary block">Ändra bokningsstatus:</span>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="opt in statusOptions"
                :key="opt.value"
                type="button"
                class="btn btn-xs rounded-full cursor-pointer transition-all gap-1.5"
                :class="selectedMessage.status === opt.value ? opt.badgeClass + ' font-black shadow ring-1 ring-primary' : 'btn-ghost border border-primary/20 text-base-content/70'"
                @click="updateMessageStatus(selectedMessage, opt.value)"
              >
                <span>{{ opt.icon }}</span>
                <span>{{ opt.label }}</span>
              </button>
            </div>
          </div>

          <!-- Internal Admin Notes (Gage, Overenskommelse, Orsak) -->
          <div class="space-y-2 p-4 bg-base-200/90 rounded-2xl border border-primary/30">
            <div class="flex items-center justify-between">
              <label class="text-xs uppercase font-bold text-secondary flex items-center gap-1.5">
                <span>📝</span>
                <span>Bandets interna anteckningar (gage, villkor, avböjningsorsak etc.)</span>
              </label>
              <span v-if="isSavingNotes" class="text-[11px] text-primary animate-pulse font-mono">Sparar...</span>
              <span v-else-if="notesSavedFeedback" class="text-[11px] text-emerald-400 font-bold font-mono">✓ Sparad!</span>
            </div>
            <textarea
              v-model="adminNotesInput"
              rows="3"
              placeholder="Skriv vad ni kommit överens om (t.ex. 'Gage 15 000:-, PA ingår, ljudkoll kl 18') eller varför bokningen avböjts..."
              class="textarea textarea-bordered w-full bg-base-100 text-xs text-base-content/90 font-sans leading-relaxed focus:border-primary"
            />
            <div class="flex justify-end">
              <button
                type="button"
                class="btn btn-xs btn-primary font-bold rounded-lg cursor-pointer"
                :disabled="isSavingNotes"
                @click="saveAdminNotes"
              >
                <span>💾</span>
                <span>Spara anteckning</span>
              </button>
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-primary/20">
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="btn btn-sm btn-outline btn-error rounded-full cursor-pointer"
                @click="deleteMessage(selectedMessage.id)"
              >
                Ta bort förfrågan
              </button>
            </div>

            <div class="flex items-center gap-2">
              <button type="button" class="btn btn-sm btn-ghost rounded-full cursor-pointer" @click="selectedMessage = null">
                Stäng
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
