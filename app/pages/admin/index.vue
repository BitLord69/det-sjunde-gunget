<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
})

useSeoMeta({
  title: 'Band Admin CMS | Det 7:e Gunget',
})

const { adminUser } = useAdminAuth()

const activeTab = ref<'gigs' | 'band' | 'songs' | 'gallery' | 'admins' | 'messages' | 'subscribers'>('gigs')
const toastMessage = ref('')

const showToast = (msg: string) => {
  toastMessage.value = msg
  setTimeout(() => {
    toastMessage.value = ''
  }, 4000)
}

// Fetch all fresh data
const { data: gigsData, refresh: refreshGigs } = await useFetch<{ upcoming: any[]; past: any[]; all: any[] }>('/api/gigs')
const { data: bandMembers, refresh: refreshBand } = await useFetch('/api/band')
const { data: galleryItems, refresh: refreshGallery } = await useFetch('/api/gallery')
const { data: songsData, refresh: refreshSongs } = await useFetch('/api/songs')
const { data: adminUsers, refresh: refreshAdmins } = await useFetch('/api/admin/users', {
  default: () => [],
  ignoreResponseError: true,
})
const { data: messagesData, refresh: refreshMessages } = await useFetch<any[]>('/api/admin/messages', {
  default: () => [],
  ignoreResponseError: true,
})
const { data: subscribersData, refresh: refreshSubscribers } = await useFetch<any[]>('/api/admin/subscribers', {
  default: () => [],
  ignoreResponseError: true,
})

const unreadMessagesCount = computed(() => {
  return (messagesData.value || []).filter((m) => m.status === 'unread').length
})

// ---------------- GIGS CRUD ----------------
const editingGig = ref<any | null>(null)
const gigForm = reactive({
  id: '',
  venue: '',
  city: '',
  date: '',
  time: '20:00',
  ticketUrl: '',
  status: 'upcoming',
  notesSv: '',
  notesEn: '',
  postToSocials: false,
})

const openAddGig = () => {
  gigForm.id = ''
  gigForm.venue = ''
  gigForm.city = 'Ängelholm'
  gigForm.date = new Date().toISOString().split('T')[0] || ''
  gigForm.time = '20:00'
  gigForm.ticketUrl = ''
  gigForm.status = 'upcoming'
  gigForm.notesSv = ''
  gigForm.notesEn = ''
  gigForm.postToSocials = false
  editingGig.value = 'new'
}

const openEditGig = (gig: any) => {
  const d = new Date(gig.date)
  gigForm.id = gig.id
  gigForm.venue = gig.venue
  gigForm.city = gig.city
  gigForm.date = d.toISOString().split('T')[0] || ''
  gigForm.time = d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
  gigForm.ticketUrl = gig.ticketUrl || ''
  gigForm.status = gig.status || 'upcoming'
  gigForm.notesSv = gig.notesSv || ''
  gigForm.notesEn = gig.notesEn || ''
  editingGig.value = gig.id
}

const saveGig = async () => {
  if (!gigForm.venue || !gigForm.city || !gigForm.date) {
    showToast('⚠️ Vänligen fyll i spelplats, stad och datum!')
    return
  }

  const dateTimeStr = `${gigForm.date}T${gigForm.time || '20:00'}:00`
  await $fetch('/api/admin/gigs', {
    method: 'POST',
    body: {
      id: gigForm.id || undefined,
      venue: gigForm.venue,
      city: gigForm.city,
      date: new Date(dateTimeStr).toISOString(),
      ticketUrl: gigForm.ticketUrl,
      status: gigForm.status,
      notesSv: gigForm.notesSv,
      notesEn: gigForm.notesEn,
    },
  })

  editingGig.value = null
  await refreshGigs()
  showToast('✓ Giget har sparats!')
}

const deleteGig = async (id: string) => {
  if (!confirm('Är du säker på att du vill ta bort detta gig?')) return
  await $fetch('/api/admin/gigs', {
    method: 'DELETE',
    body: { id },
  })
  await refreshGigs()
  showToast('✓ Giget raderades.')
}

// ---------------- BAND MEMBER LORE ----------------
const editingMember = ref<any | null>(null)
const memberForm = reactive({
  id: '',
  name: '',
  role: '',
  bioSv: '',
  photoUrl: '',
  gearSv: '',
  favoriteChord: '',
  weaknessSv: '',
  coffeeConsumption: '',
})

const openEditMember = (m: any) => {
  memberForm.id = m.id
  memberForm.name = m.name
  memberForm.role = m.role
  memberForm.bioSv = m.bioSv || ''
  memberForm.photoUrl = m.photoUrl || ''
  memberForm.gearSv = m.gearSv || ''
  memberForm.favoriteChord = m.favoriteChord || ''
  memberForm.weaknessSv = m.weaknessSv || ''
  memberForm.coffeeConsumption = m.coffeeConsumption || ''
  editingMember.value = m.id
}

const saveMember = async () => {
  await $fetch('/api/admin/band', {
    method: 'POST',
    body: memberForm,
  })
  editingMember.value = null
  await refreshBand()
  showToast('✓ Medlemsprofilen har uppdaterats!')
}

// ---------------- SONGS CRUD ----------------
const editingSong = ref<any | null>(null)
const songForm = reactive({
  id: '',
  title: '',
  isOriginal: false,
  originalArtist: '',
  embedProvider: 'spotify',
  embedUrl: '',
  audioUrl: '',
  duration: '',
  postToSocials: false,
})

const openAddSong = () => {
  songForm.id = ''
  songForm.title = ''
  songForm.isOriginal = true
  songForm.originalArtist = ''
  songForm.embedProvider = 'spotify'
  songForm.embedUrl = ''
  songForm.audioUrl = ''
  songForm.duration = ''
  songForm.postToSocials = false
  editingSong.value = 'new'
}

const openEditSong = (s: any) => {
  songForm.id = s.id
  songForm.title = s.title
  songForm.isOriginal = !!s.isOriginal
  songForm.originalArtist = s.originalArtist || ''
  songForm.embedProvider = s.embedProvider || 'spotify'
  songForm.embedUrl = s.embedUrl || ''
  songForm.audioUrl = s.audioUrl || ''
  songForm.duration = s.duration ? String(s.duration) : ''
  songForm.postToSocials = false
  editingSong.value = s.id
}

const saveSong = async () => {
  if (!songForm.title || !songForm.embedUrl) {
    showToast('⚠️ Ange låttitel och länk!')
    return
  }
  await $fetch('/api/admin/songs', {
    method: 'POST',
    body: songForm,
  })
  editingSong.value = null
  await refreshSongs()
  showToast(songForm.postToSocials ? '✓ Låten har sparats & schemalagts för FB & Insta!' : '✓ Låten har sparats i jukeboxen!')
}

const deleteSong = async (id: string) => {
  if (!confirm('Vill du ta bort låten?')) return
  await $fetch('/api/admin/songs', {
    method: 'DELETE',
    body: { id },
  })
  await refreshSongs()
  showToast('✓ Låten togs bort.')
}

// ---------------- MESSAGES & INQUIRIES ----------------
const selectedMessage = ref<any | null>(null)

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

// ---------------- GALLERY CRUD ----------------
const editingGal = ref<any | null>(null)
const galForm = reactive({
  id: '',
  category: 'photo',
  mediaUrl: '',
  frameStyle: 'polaroid',
  rotation: 0,
  captionSv: '',
})

const openAddGal = () => {
  galForm.id = ''
  galForm.category = 'photo'
  galForm.mediaUrl = ''
  galForm.frameStyle = 'polaroid'
  galForm.rotation = 0
  galForm.captionSv = ''
  editingGal.value = 'new'
}

const openEditGal = (g: any) => {
  galForm.id = g.id
  galForm.category = g.category || 'photo'
  galForm.mediaUrl = g.mediaUrl || ''
  galForm.frameStyle = g.frameStyle || 'polaroid'
  galForm.rotation = g.rotation || 0
  galForm.captionSv = g.captionSv || ''
  editingGal.value = g.id
}

const saveGalleryItem = async () => {
  if (!galForm.mediaUrl) {
    showToast('⚠️ Ange sökväg/URL till bilden!')
    return
  }
  await $fetch('/api/admin/gallery', {
    method: 'POST',
    body: galForm,
  })
  editingGal.value = null
  await refreshGallery()
  showToast('✓ Bilden har sparats!')
}

const deleteGalleryItem = async (id: string) => {
  if (!confirm('Vill du ta bort bilden?')) return
  await $fetch('/api/admin/gallery', {
    method: 'DELETE',
    body: { id },
  })
  await refreshGallery()
  showToast('✓ Bilden raderades.')
}

// ---------------- ADMIN USERS CRUD ----------------
const isAddAdminOpen = ref(false)
const newAdminForm = reactive({
  name: '',
  email: '',
  username: '',
  role: 'Administratör',
  password: '',
})

const openAddAdmin = () => {
  newAdminForm.name = ''
  newAdminForm.email = ''
  newAdminForm.username = ''
  newAdminForm.role = 'Administratör'
  newAdminForm.password = ''
  isAddAdminOpen.value = true
}

const saveNewAdmin = async () => {
  if (!newAdminForm.name || !newAdminForm.email || !newAdminForm.password) {
    showToast('⚠️ Vänligen fyll i namn, e-post och lösenord!')
    return
  }
  try {
    await $fetch('/api/admin/users', {
      method: 'POST',
      body: newAdminForm,
    })
    isAddAdminOpen.value = false
    await refreshAdmins()
    showToast('✓ Ny administratör tillagd!')
  } catch (err: any) {
    showToast(`⚠️ ${err?.data?.message || 'Kunde inte lägga till administratör'}`)
  }
}

const deleteAdminUser = async (admin: any) => {
  if (admin.id === adminUser.value?.id) {
    showToast('⚠️ Du kan inte ta bort ditt eget administratörskonto!')
    return
  }
  if (!confirm(`Är du säker på att du vill ta bort administratören ${admin.name}?`)) return

  try {
    await $fetch('/api/admin/users', {
      method: 'DELETE',
      body: { id: admin.id },
    })
    await refreshAdmins()
    showToast('✓ Administratör borttagen.')
  } catch (err: any) {
    showToast(`⚠️ ${err?.data?.message || 'Kunde inte ta bort administratör'}`)
  }
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-6 py-10 lg:px-10 space-y-8 font-sans">
    <!-- Toast Notification -->
    <div
      v-if="toastMessage"
      class="fixed bottom-6 right-6 z-50 bg-secondary text-secondary-content px-6 py-3 rounded-xl font-bold shadow-2xl animate-bounce flex items-center gap-2"
    >
      <span>{{ toastMessage }}</span>
    </div>

    <!-- CMS Tab Navigation (Sentence case) -->
    <div class="flex flex-wrap gap-2 border-b border-primary/20 pb-4 text-sm font-bold">
      <button
        type="button"
        class="px-5 py-2.5 rounded-full transition-all flex items-center gap-1.5"
        :class="activeTab === 'gigs' ? 'bg-primary text-primary-content shadow' : 'bg-base-200 text-base-content/70 hover:text-primary'"
        @click="activeTab = 'gigs'"
      >
        <span>📅</span> Gig & spelningar ({{ gigsData?.all?.length || 0 }})
      </button>
      <button
        type="button"
        class="px-5 py-2.5 rounded-full transition-all flex items-center gap-1.5"
        :class="activeTab === 'band' ? 'bg-primary text-primary-content shadow' : 'bg-base-200 text-base-content/70 hover:text-primary'"
        @click="activeTab = 'band'"
      >
        <span>🎸</span> Bandet & medlemmar ({{ bandMembers?.length || 4 }})
      </button>
      <button
        type="button"
        class="px-5 py-2.5 rounded-full transition-all flex items-center gap-1.5"
        :class="activeTab === 'songs' ? 'bg-primary text-primary-content shadow' : 'bg-base-200 text-base-content/70 hover:text-primary'"
        @click="activeTab = 'songs'"
      >
        <span>🎵</span> Låtar & jukebox ({{ songsData?.length || 0 }})
      </button>
      <button
        type="button"
        class="px-5 py-2.5 rounded-full transition-all flex items-center gap-1.5"
        :class="activeTab === 'gallery' ? 'bg-primary text-primary-content shadow' : 'bg-base-200 text-base-content/70 hover:text-primary'"
        @click="activeTab = 'gallery'"
      >
        <span>📷</span> Galleri & Fan Central ({{ galleryItems?.length || 0 }})
      </button>
      <button
        type="button"
        class="px-5 py-2.5 rounded-full transition-all flex items-center gap-1.5"
        :class="activeTab === 'messages' ? 'bg-primary text-primary-content shadow' : 'bg-base-200 text-base-content/70 hover:text-primary'"
        @click="activeTab = 'messages'"
      >
        <span>✉️</span> Bokningar & förfrågningar ({{ messagesData?.length || 0 }})
        <span v-if="unreadMessagesCount > 0" class="badge badge-xs badge-accent font-mono font-bold ml-1">
          {{ unreadMessagesCount }} nya
        </span>
      </button>
      <button
        type="button"
        class="px-5 py-2.5 rounded-full transition-all flex items-center gap-1.5"
        :class="activeTab === 'subscribers' ? 'bg-primary text-primary-content shadow' : 'bg-base-200 text-base-content/70 hover:text-primary'"
        @click="activeTab = 'subscribers'"
      >
        <span>📬</span> Nyhetsbrev ({{ subscribersData?.length || 0 }})
      </button>
      <button
        type="button"
        class="px-5 py-2.5 rounded-full transition-all flex items-center gap-1.5"
        :class="activeTab === 'admins' ? 'bg-primary text-primary-content shadow' : 'bg-base-200 text-base-content/70 hover:text-primary'"
        @click="activeTab = 'admins'"
      >
        <span>👥</span> Administratörer ({{ adminUsers?.length || 4 }})
      </button>
    </div>

    <!-- 1. GIGS MANAGER -->
    <div v-if="activeTab === 'gigs'" class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="font-heading text-2xl text-primary font-bold">Hantera gig & spelningar</h2>
          <p class="text-xs text-base-content/70">Lägg till turnédatum, uppdatera biljettlänkar och markera slutsålt.</p>
        </div>
        <button type="button" class="btn btn-primary btn-sm rounded-full font-bold px-5" @click="openAddGig">
          + Nytt gig
        </button>
      </div>

      <!-- Add/Edit Modal Form -->
      <div v-if="editingGig" class="stage-card p-6 sm:p-8 rounded-2xl border border-primary/40 space-y-4 shadow-2xl">
        <h3 class="font-heading text-xl text-primary font-bold">
          {{ editingGig === 'new' ? 'Lägg till nytt gig' : 'Redigera gig' }}
        </h3>
        <div class="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Spelplats / lokal *</label>
            <input v-model="gigForm.venue" type="text" placeholder="T.ex. Kulturhuset Svängen" class="input input-bordered w-full bg-base-200 input-sm" />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Stad *</label>
            <input v-model="gigForm.city" type="text" placeholder="T.ex. Ängelholm" class="input input-bordered w-full bg-base-200 input-sm" />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Datum *</label>
            <input v-model="gigForm.date" type="date" class="input input-bordered w-full bg-base-200 input-sm" />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Tid</label>
            <input v-model="gigForm.time" type="time" class="input input-bordered w-full bg-base-200 input-sm" />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Biljettlänk (valfritt)</label>
            <input v-model="gigForm.ticketUrl" type="url" placeholder="https://billetto.se/..." class="input input-bordered w-full bg-base-200 input-sm" />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Status</label>
            <select v-model="gigForm.status" class="select select-bordered w-full bg-base-200 select-sm">
              <option value="upcoming">Kommande</option>
              <option value="free">Fri entré</option>
              <option value="sold_out">Utsålt</option>
              <option value="completed">Avklarat</option>
            </select>
          </div>
          <div class="sm:col-span-2">
            <label class="block text-xs font-bold text-secondary mb-1">Anteckningar / mellansnack (svenska)</label>
            <textarea v-model="gigForm.notesSv" rows="2" placeholder="Dörrarna öppnar 18:30..." class="textarea textarea-bordered w-full bg-base-200 text-sm" />
          </div>

          <!-- Social Media Cross-Posting Switch -->
          <div class="sm:col-span-2 p-3 bg-base-200/80 rounded-xl border border-primary/20 flex items-center justify-between gap-4">
            <div class="space-y-0.5">
              <span class="text-xs font-bold text-primary flex items-center gap-1.5">
                <span>📱</span> Posta automatiskt till Facebook & Instagram
              </span>
              <p class="text-[11px] text-base-content/60">
                Skapar automatiskt ett inlägg på bandets sociala medier när giget publiceras.
              </p>
            </div>
            <input
              v-model="gigForm.postToSocials"
              type="checkbox"
              class="toggle toggle-primary toggle-sm"
              title="Aktivera / inaktivera automatisk delning till FB & Instagram"
            />
          </div>
        </div>

        <div class="flex items-center gap-3 pt-3">
          <button type="button" class="btn btn-primary btn-sm rounded-full font-bold px-6" @click="saveGig">
            Spara gig
          </button>
          <button type="button" class="btn btn-ghost btn-sm rounded-full" @click="editingGig = null">
            Avbryt
          </button>
        </div>
      </div>

      <!-- Gigs List -->
      <div class="overflow-x-auto rounded-2xl border border-primary/20 stage-card">
        <table class="table table-zebra w-full text-xs">
          <thead>
            <tr class="text-secondary font-bold uppercase text-[10px] tracking-wider border-b border-primary/20">
              <th>Datum & Tid</th>
              <th>Spelplats</th>
              <th>Stad</th>
              <th>Status</th>
              <th>Biljettlänk</th>
              <th class="text-right">Åtgärd</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="gig in gigsData?.all || []" :key="gig.id" class="hover:bg-base-200/50">
              <td class="font-mono font-bold">{{ new Date(gig.date).toLocaleDateString('sv-SE') }}</td>
              <td class="font-bold text-primary">{{ gig.venue }}</td>
              <td>{{ gig.city }}</td>
              <td>
                <span
                  class="badge badge-xs font-bold uppercase text-[9px]"
                  :class="gig.status === 'sold_out' ? 'badge-error' : gig.status === 'free' ? 'badge-accent' : 'badge-primary'"
                >
                  {{ gig.status === 'free' ? 'Fri entré' : gig.status === 'sold_out' ? 'Utsålt' : 'Kommande' }}
                </span>
              </td>
              <td class="font-mono text-[10px] text-base-content/60 truncate max-w-xs">{{ gig.ticketUrl || 'I dörren' }}</td>
              <td class="text-right space-x-2">
                <button type="button" class="btn btn-xs btn-outline btn-primary rounded" @click="openEditGig(gig)">
                  Redigera
                </button>
                <button type="button" class="btn btn-xs btn-outline btn-error rounded" @click="deleteGig(gig.id)">
                  Ta bort
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 2. BAND MEMBERS & BIOS -->
    <div v-if="activeTab === 'band'" class="space-y-6">
      <div>
        <h2 class="font-heading text-2xl text-primary font-bold">Bandmedlemmar & profiler</h2>
        <p class="text-xs text-base-content/70">Uppdatera presentationstext, musikinstrument, favoritackord och kaffestats.</p>
      </div>

      <!-- Edit Member Modal -->
      <div v-if="editingMember" class="stage-card p-6 sm:p-8 rounded-2xl border border-primary/40 space-y-4 shadow-2xl">
        <h3 class="font-heading text-xl text-primary font-bold">
          Redigera profil för {{ memberForm.name }}
        </h3>
        <div class="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Namn *</label>
            <input v-model="memberForm.name" type="text" class="input input-bordered w-full bg-base-200 input-sm" />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Roll / instrument *</label>
            <input v-model="memberForm.role" type="text" class="input input-bordered w-full bg-base-200 input-sm" />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-xs font-bold text-secondary mb-1">Biografi (svenska)</label>
            <textarea v-model="memberForm.bioSv" rows="3" class="textarea textarea-bordered w-full bg-base-200 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Vapen / utrustning</label>
            <input v-model="memberForm.gearSv" type="text" class="input input-bordered w-full bg-base-200 input-sm" />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Favoritackord</label>
            <input v-model="memberForm.favoriteChord" type="text" class="input input-bordered w-full bg-base-200 input-sm" />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Svaghet</label>
            <input v-model="memberForm.weaknessSv" type="text" class="input input-bordered w-full bg-base-200 input-sm" />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Kaffekonsumtion</label>
            <input v-model="memberForm.coffeeConsumption" type="text" class="input input-bordered w-full bg-base-200 input-sm" />
          </div>
        </div>

        <div class="flex items-center gap-3 pt-3">
          <button type="button" class="btn btn-primary btn-sm rounded-full font-bold px-6" @click="saveMember">
            Spara profil
          </button>
          <button type="button" class="btn btn-ghost btn-sm rounded-full" @click="editingMember = null">
            Avbryt
          </button>
        </div>
      </div>

      <!-- Member Grid Cards -->
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div
          v-for="member in bandMembers || []"
          :key="member.id"
          class="stage-card p-5 rounded-2xl border border-primary/20 flex flex-col justify-between"
        >
          <div>
            <NuxtImg
              :src="member.photoUrl || '/media/brand/Logotyp_mini.webp'"
              :alt="member.name"
              class="w-full aspect-[4/5] object-cover rounded-lg mb-4"
              loading="lazy"
            />
            <h3 class="font-heading text-xl text-primary font-bold">{{ member.name }}</h3>
            <span class="text-xs font-bold uppercase text-secondary block mb-2">{{ member.role }}</span>
            <p class="text-xs text-base-content/75 line-clamp-3 mb-4">{{ member.bioSv }}</p>
          </div>

          <button
            type="button"
            class="btn btn-primary btn-sm w-full font-bold rounded-full"
            @click="openEditMember(member)"
          >
            Redigera profil
          </button>
        </div>
      </div>
    </div>

    <!-- 3. SONGS & JUKEBOX -->
    <div v-if="activeTab === 'songs'" class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="font-heading text-2xl text-primary font-bold">Hantera låtskatt & jukebox</h2>
          <p class="text-xs text-base-content/70">Lägg till egna låtar och covers från Spotify, Bandcamp eller YouTube.</p>
        </div>
        <button type="button" class="btn btn-primary btn-sm rounded-full font-bold px-5" @click="openAddSong">
          + Ny låt
        </button>
      </div>

      <!-- Add/Edit Song Modal Form -->
      <div v-if="editingSong" class="stage-card p-6 sm:p-8 rounded-2xl border border-primary/40 space-y-4 shadow-2xl">
        <h3 class="font-heading text-xl text-primary font-bold">
          {{ editingSong === 'new' ? 'Lägg till ny låt' : 'Redigera låt' }}
        </h3>
        <div class="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Låttitel *</label>
            <input v-model="songForm.title" type="text" placeholder="T.ex. Det 7:e Gunget" class="input input-bordered w-full bg-base-200 input-sm" />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Låttyp</label>
            <select v-model="songForm.isOriginal" class="select select-bordered w-full bg-base-200 select-sm">
              <option :value="true">Eget hantverk (originalkomposition)</option>
              <option :value="false">Klassiker (cover)</option>
            </select>
          </div>
          <div v-if="!songForm.isOriginal">
            <label class="block text-xs font-bold text-secondary mb-1">Originalartist</label>
            <input v-model="songForm.originalArtist" type="text" placeholder="T.ex. Muddy Waters" class="input input-bordered w-full bg-base-200 input-sm" />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Plattform / leverantör</label>
            <select v-model="songForm.embedProvider" class="select select-bordered w-full bg-base-200 select-sm">
              <option value="spotify">Spotify</option>
              <option value="bandcamp">Bandcamp</option>
              <option value="youtube">YouTube</option>
            </select>
          </div>
          <div class="sm:col-span-2">
            <label class="block text-xs font-bold text-secondary mb-1">Länk / Embed URL *</label>
            <input v-model="songForm.embedUrl" type="url" placeholder="https://open.spotify.com/track/..." class="input input-bordered w-full bg-base-200 input-sm font-mono text-xs" />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Direkt ljudspår / MP3-preview (valfritt)</label>
            <input v-model="songForm.audioUrl" type="text" placeholder="/media/audio/sample.mp3" class="input input-bordered w-full bg-base-200 input-sm font-mono text-xs" />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Längd (sekunder, valfritt)</label>
            <input v-model="songForm.duration" type="number" placeholder="215" class="input input-bordered w-full bg-base-200 input-sm font-mono text-xs" />
          </div>

          <!-- Social Media Cross-Posting Switch -->
          <div class="sm:col-span-2 p-3 bg-base-200/80 rounded-xl border border-primary/20 flex items-center justify-between gap-4">
            <div class="space-y-0.5">
              <span class="text-xs font-bold text-primary flex items-center gap-1.5">
                <span>📱</span> Posta automatiskt till Facebook & Instagram
              </span>
              <p class="text-[11px] text-base-content/60">
                Skapar automatiskt ett låttips på bandets sociala medier när låten publiceras.
              </p>
            </div>
            <input
              v-model="songForm.postToSocials"
              type="checkbox"
              class="toggle toggle-primary toggle-sm"
              title="Aktivera / inaktivera automatisk delning till FB & Instagram"
            />
          </div>
        </div>

        <div class="flex items-center gap-3 pt-3">
          <button type="button" class="btn btn-primary btn-sm rounded-full font-bold px-6" @click="saveSong">
            Spara låt
          </button>
          <button type="button" class="btn btn-ghost btn-sm rounded-full" @click="editingSong = null">
            Avbryt
          </button>
        </div>
      </div>

      <!-- Songs Table -->
      <div class="overflow-x-auto rounded-2xl border border-primary/20 stage-card">
        <table class="table table-zebra w-full text-xs">
          <thead>
            <tr class="text-secondary font-bold uppercase text-[10px] tracking-wider border-b border-primary/20">
              <th>Titel</th>
              <th>Typ</th>
              <th>Originalartist</th>
              <th>Plattform</th>
              <th class="text-right">Åtgärd</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="song in songsData || []" :key="song.id">
              <td class="font-bold text-primary">{{ song.title }}</td>
              <td>
                <span class="badge badge-xs font-bold uppercase text-[9px]" :class="song.isOriginal ? 'badge-primary' : 'badge-secondary'">
                  {{ song.isOriginal ? 'Original' : 'Cover' }}
                </span>
              </td>
              <td>{{ song.isOriginal ? '—' : song.originalArtist }}</td>
              <td class="font-mono capitalize text-[10px]">{{ song.embedProvider }}</td>
              <td class="text-right space-x-2">
                <button type="button" class="btn btn-xs btn-outline btn-primary rounded" @click="openEditSong(song)">
                  Redigera
                </button>
                <button type="button" class="btn btn-xs btn-outline btn-error rounded" @click="deleteSong(song.id)">
                  Ta bort
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 4. GALLERY & FAN CENTRAL -->
    <div v-if="activeTab === 'gallery'" class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="font-heading text-2xl text-primary font-bold">Hantera galleri & Fan Central</h2>
          <p class="text-xs text-base-content/70">Lägg till foton, välj ramstilar (Polaroid, tejp, träram) och kategorisera fans.</p>
        </div>
        <button type="button" class="btn btn-primary btn-sm rounded-full font-bold px-5" @click="openAddGal">
          + Ny bild
        </button>
      </div>

      <!-- Add/Edit Gallery Modal Form -->
      <div v-if="editingGal" class="stage-card p-6 sm:p-8 rounded-2xl border border-primary/40 space-y-4 shadow-2xl">
        <h3 class="font-heading text-xl text-primary font-bold">
          {{ editingGal === 'new' ? 'Lägg till ny bild' : 'Redigera bild' }}
        </h3>
        <div class="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Bildens URL / sökväg *</label>
            <input v-model="galForm.mediaUrl" type="text" placeholder="/media/band/bild.jpg" class="input input-bordered w-full bg-base-200 input-sm font-mono text-xs" />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Kategori</label>
            <select v-model="galForm.category" class="select select-bordered w-full bg-base-200 select-sm">
              <option value="photo">Vanligt galleri (live & rep)</option>
              <option value="fan_central">Fan Central (publik & bordsfläktar)</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Ramstil (visual frame)</label>
            <select v-model="galForm.frameStyle" class="select select-bordered w-full bg-base-200 select-sm">
              <option value="polaroid">Vintage Polaroid (med tejp)</option>
              <option value="taped">Scenprint (mörk med tejpade hörn)</option>
              <option value="grunge">Sliten mörkrumskant (grunge)</option>
              <option value="wood">Klassisk trä- & mässingsram</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Lutning / rotation (-3° till 3°)</label>
            <input v-model.number="galForm.rotation" type="number" min="-5" max="5" class="input input-bordered w-full bg-base-200 input-sm font-mono" />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-xs font-bold text-secondary mb-1">Bildtext (svenska)</label>
            <input v-model="galForm.captionSv" type="text" placeholder="Hela gänget samlat inför sommarsäsongen..." class="input input-bordered w-full bg-base-200 input-sm" />
          </div>
        </div>

        <div class="flex items-center gap-3 pt-3">
          <button type="button" class="btn btn-primary btn-sm rounded-full font-bold px-6" @click="saveGalleryItem">
            Spara bild
          </button>
          <button type="button" class="btn btn-ghost btn-sm rounded-full" @click="editingGal = null">
            Avbryt
          </button>
        </div>
      </div>

      <!-- Gallery Grid Preview in Admin -->
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="item in galleryItems || []"
          :key="item.id"
          class="stage-card p-4 rounded-2xl border border-primary/20 flex flex-col justify-between"
        >
          <div>
            <NuxtImg
              :src="item.mediaUrl"
              class="w-full aspect-[4/3] object-cover rounded mb-3"
              loading="lazy"
            />
            <div class="flex items-center justify-between gap-2 mb-2">
              <span class="badge badge-xs font-mono font-bold uppercase text-[9px]">
                {{ item.category }}
              </span>
              <span class="text-[10px] font-mono text-secondary">
                Ram: {{ item.frameStyle }}
              </span>
            </div>
            <p class="text-xs text-base-content/80 italic line-clamp-2">
              {{ item.captionSv || 'Ingen bildtext' }}
            </p>
          </div>

          <div class="pt-3 border-t border-base-content/10 flex items-center justify-end gap-2 mt-4">
            <button type="button" class="btn btn-xs btn-outline btn-primary rounded" @click="openEditGal(item)">
              Redigera
            </button>
            <button type="button" class="btn btn-xs btn-outline btn-error rounded" @click="deleteGalleryItem(item.id)">
              Ta bort
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 5. ADMINS & USER MANAGEMENT -->
    <div v-if="activeTab === 'admins'" class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="font-heading text-2xl text-primary font-bold">Hantera administratörer</h2>
          <p class="text-xs text-base-content/70">Alla bandmedlemmar och behöriga admins som kan logga in och redigera innehållet.</p>
        </div>
        <button type="button" class="btn btn-primary btn-sm rounded-full font-bold px-5" @click="openAddAdmin">
          + Ny administratör
        </button>
      </div>

      <!-- Add Admin Modal Form -->
      <div v-if="isAddAdminOpen" class="stage-card p-6 sm:p-8 rounded-2xl border border-primary/40 space-y-4 shadow-2xl">
        <h3 class="font-heading text-xl text-primary font-bold">
          Lägg till ny administratör
        </h3>
        <div class="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Namn *</label>
            <input v-model="newAdminForm.name" type="text" placeholder="T.ex. Janis Svensson" class="input input-bordered w-full bg-base-200 input-sm" />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">E-postadress *</label>
            <input v-model="newAdminForm.email" type="email" placeholder="namn@det7egunget.se" class="input input-bordered w-full bg-base-200 input-sm" />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Användarnamn (valfritt)</label>
            <input v-model="newAdminForm.username" type="text" placeholder="janis" class="input input-bordered w-full bg-base-200 input-sm font-mono text-xs" />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Roll / uppgift</label>
            <input v-model="newAdminForm.role" type="text" placeholder="T.ex. Sång & munspel / Admin" class="input input-bordered w-full bg-base-200 input-sm" />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-xs font-bold text-secondary mb-1">Lösenord (minst 6 tecken) *</label>
            <input v-model="newAdminForm.password" type="password" placeholder="••••••••" class="input input-bordered w-full bg-base-200 input-sm" />
          </div>
        </div>

        <div class="flex items-center gap-3 pt-3">
          <button type="button" class="btn btn-primary btn-sm rounded-full font-bold px-6" @click="saveNewAdmin">
            Skapa administratör
          </button>
          <button type="button" class="btn btn-ghost btn-sm rounded-full" @click="isAddAdminOpen = false">
            Avbryt
          </button>
        </div>
      </div>

      <!-- Admins List Table -->
      <div class="overflow-x-auto rounded-2xl border border-primary/20 stage-card">
        <table class="table table-zebra w-full text-xs">
          <thead>
            <tr class="text-secondary font-bold uppercase text-[10px] tracking-wider border-b border-primary/20">
              <th>Medlem / Admin</th>
              <th>E-post</th>
              <th>Användarnamn</th>
              <th>Roll</th>
              <th>Inloggningstyp</th>
              <th class="text-right">Åtgärd</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="admin in adminUsers || []" :key="admin.id" :class="admin.id === adminUser?.id ? 'bg-primary/10' : ''">
              <td class="flex items-center gap-3 py-3">
                <div class="avatar placeholder">
                  <div class="w-8 h-8 rounded-full bg-primary text-primary-content text-xs font-bold overflow-hidden">
                    <NuxtImg v-if="admin.avatarUrl" :src="admin.avatarUrl" :alt="admin.name" class="w-full h-full object-cover" />
                    <span v-else>{{ admin.name.charAt(0) }}</span>
                  </div>
                </div>
                <div>
                  <span class="font-bold text-primary block">{{ admin.name }}</span>
                  <span v-if="admin.id === adminUser?.id" class="badge badge-accent badge-xs font-bold text-[9px]">Du</span>
                </div>
              </td>
              <td class="font-mono text-[11px]">{{ admin.email }}</td>
              <td class="font-mono text-[11px]">{{ admin.username }}</td>
              <td><span class="badge badge-sm font-bold text-[10px]">{{ admin.role }}</span></td>
              <td class="font-mono capitalize text-[10px]">{{ admin.provider }}</td>
              <td class="text-right">
                <button
                  v-if="admin.id !== adminUser?.id"
                  type="button"
                  class="btn btn-xs btn-outline btn-error rounded"
                  @click="deleteAdminUser(admin)"
                >
                  Ta bort
                </button>
                <span v-else class="text-[10px] text-base-content/40 italic">Aktiv inloggning</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 6. MESSAGES & INQUIRIES -->
    <div v-if="activeTab === 'messages'" class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="font-heading text-2xl text-primary font-bold">Bokningsförfrågningar & meddelanden</h2>
          <p class="text-xs text-base-content/70">Inkomna förfrågningar från kontaktformuläret på webbplatsen.</p>
        </div>
        <button type="button" class="btn btn-outline btn-primary btn-sm rounded-full" @click="() => refreshMessages()">
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
                  class="btn btn-xs btn-outline btn-primary rounded"
                  @click="selectedMessage = msg"
                >
                  Visa
                </button>
                <button
                  type="button"
                  class="btn btn-xs btn-outline btn-error rounded"
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
            <button type="button" class="btn btn-sm btn-circle btn-ghost" @click="selectedMessage = null">✕</button>
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
                class="btn btn-sm btn-outline btn-success rounded-full"
                @click="markMessageStatus(selectedMessage, 'read')"
              >
                ✓ Markera som läst
              </button>
              <button
                v-else
                type="button"
                class="btn btn-sm btn-outline btn-ghost rounded-full"
                @click="markMessageStatus(selectedMessage, 'unread')"
              >
                Markera som oläst
              </button>
              <button
                type="button"
                class="btn btn-sm btn-outline btn-error rounded-full"
                @click="deleteMessage(selectedMessage.id)"
              >
                Radera
              </button>
            </div>

            <a
              :href="`mailto:${selectedMessage.email}?subject=Re: Bokningsförfrågan Det 7:e Gunget`"
              class="btn btn-sm btn-primary rounded-full font-bold px-5"
            >
              ✉️ Svara via e-post
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- 7. NEWSLETTER SUBSCRIBERS -->
    <div v-if="activeTab === 'subscribers'" class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="font-heading text-2xl text-primary font-bold">Nyhetsbrevsprenumeranter</h2>
          <p class="text-xs text-base-content/70">Fans som anmält sig för att få nyheter och speldatum.</p>
        </div>
        <div class="flex items-center gap-3">
          <button type="button" class="btn btn-outline btn-primary btn-sm rounded-full" @click="() => refreshSubscribers()">
            🔄 Uppdatera
          </button>
        </div>
      </div>

      <!-- Subscribers Table -->
      <div class="overflow-x-auto rounded-2xl border border-primary/20 stage-card">
        <table class="table table-zebra w-full text-xs">
          <thead>
            <tr class="text-secondary font-bold uppercase text-[10px] tracking-wider border-b border-primary/20">
              <th>E-postadress</th>
              <th>Status</th>
              <th>Anmäld datum</th>
              <th>Brevo-synk</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sub in subscribersData || []" :key="sub.id">
              <td class="font-bold text-primary font-mono text-[11px]">{{ sub.email }}</td>
              <td>
                <span
                  class="badge badge-xs font-bold uppercase text-[9px]"
                  :class="sub.status === 'subscribed' ? 'badge-success' : 'badge-ghost'"
                >
                  {{ sub.status === 'subscribed' ? 'Aktiv' : 'Avregistrerad' }}
                </span>
              </td>
              <td class="font-mono text-[11px]">
                {{ new Date(sub.subscribedAt).toLocaleDateString('sv-SE') }}
              </td>
              <td>
                <span class="badge badge-xs badge-outline font-mono text-[9px] text-emerald-400 border-emerald-500/40">
                  Synkad
                </span>
              </td>
            </tr>
            <tr v-if="!subscribersData || subscribersData.length === 0">
              <td colspan="4" class="text-center py-8 text-base-content/60 italic">
                Inga prenumeranter ännu.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
