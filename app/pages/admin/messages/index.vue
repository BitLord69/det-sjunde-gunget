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

onMounted(() => {
  openMessageFromRoute()
})

const markMessageStatus = async (msg: any, status: 'read' | 'unread' | 'archived') => {
  await $fetch('/api/admin/messages', {
    method: 'PATCH',
    body: { id: msg.id, status, read: status === 'read' },
  })
  await refreshMessages()
  showToast(`✓ Meddelandet markerades som ${status === 'read' ? 'läst' : status === 'archived' ? 'arkiverat' : 'oläst'}.`)
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
              v-for="msg in messagesData || []"
              :key="msg.id"
              class="cursor-pointer hover:bg-base-200/60 transition-colors"
              :class="msg.status === 'unread' ? 'font-bold bg-primary/5' : ''"
              @click="selectedMessage = msg"
            >
              <td class="font-mono text-[11px] whitespace-nowrap">
                {{ new Date(msg.createdAt).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }}
              </td>
              <td class="font-bold text-primary">{{ msg.name }}</td>
              <td class="font-mono text-[11px]">
                <div>{{ msg.email }}</div>
                <div v-if="msg.phone" class="text-base-content/60">{{ msg.phone }}</div>
              </td>
              <td><span class="badge badge-sm font-bold text-[10px]">{{ msg.eventType || 'Allmänt' }}</span></td>
              <td class="text-xs">
                <div v-if="msg.eventDate" class="font-bold">{{ msg.eventDate }}</div>
                <div v-if="msg.location" class="text-base-content/60">{{ msg.location }}</div>
                <div v-if="!msg.eventDate && !msg.location" class="text-base-content/40">—</div>
              </td>
              <td>
                <span
                  class="badge badge-xs font-bold uppercase text-[9px]"
                  :class="msg.status === 'unread' ? 'badge-accent' : msg.status === 'read' ? 'badge-success' : 'badge-ghost'"
                >
                  {{ msg.status === 'unread' ? 'Oläst' : msg.status === 'read' ? 'Läst' : 'Arkiverad' }}
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
            <tr v-if="!messagesData || messagesData.length === 0">
              <td colspan="7" class="text-center py-8 text-base-content/60 italic">
                Inga meddelanden har inkommit ännu.
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

          <div class="grid sm:grid-cols-2 gap-4 text-sm bg-base-200/80 p-4 rounded-xl border border-primary/20">
            <div>
              <span class="text-[10px] uppercase font-bold text-secondary block">E-post</span>
              <a :href="`mailto:${selectedMessage.email}`" class="text-primary font-bold hover:underline">{{ selectedMessage.email }}</a>
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
              <span class="text-[10px] uppercase font-bold text-secondary block">Önskat datum & Plats</span>
              <span>{{ selectedMessage.eventDate || 'Inget datum' }} • {{ selectedMessage.location || 'Ingen plats' }}</span>
            </div>
          </div>

          <div class="space-y-2">
            <span class="text-xs uppercase font-bold text-secondary">Meddelande:</span>
            <div class="bg-base-200 p-4 rounded-xl text-sm whitespace-pre-wrap leading-relaxed border border-primary/10">
              {{ selectedMessage.body }}
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-primary/20">
            <div class="flex items-center gap-2">
              <button
                v-if="selectedMessage.status === 'unread'"
                type="button"
                class="btn btn-sm btn-outline btn-success rounded-full cursor-pointer"
                @click="markMessageStatus(selectedMessage, 'read')"
              >
                ✓ Markera som läst
              </button>
              <button
                v-else
                type="button"
                class="btn btn-sm btn-outline btn-ghost rounded-full cursor-pointer"
                @click="markMessageStatus(selectedMessage, 'unread')"
              >
                Markera som oläst
              </button>
              <button
                type="button"
                class="btn btn-sm btn-outline btn-error rounded-full cursor-pointer"
                @click="deleteMessage(selectedMessage.id)"
              >
                Ta bort
              </button>
            </div>

            <div class="flex items-center gap-2">
              <a
                :href="`mailto:${selectedMessage.email}?subject=${encodeURIComponent('Svar angående bokningsförfrågan - Det 7:e Gunget')}`"
                class="btn btn-sm btn-primary rounded-full font-bold px-5"
              >
                ✉️ Svara via e-post
              </a>
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
