<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
})

useSeoMeta({
  title: 'Gig & Spelningar | Det 7:e Gunget Admin',
})

const toastMessage = ref('')

const showToast = (msg: string) => {
  toastMessage.value = msg
  setTimeout(() => {
    toastMessage.value = ''
  }, 4000)
}

const { data: gigsData, refresh: refreshGigs } = await useFetch<{ upcoming: any[]; past: any[]; all: any[] }>('/api/gigs')
const { data: songsData } = await useFetch<any[]>('/api/songs', { default: () => [] })
const { data: hashtagsData } = await useFetch<any[]>('/api/admin/hashtags', { default: () => [] })

const activeGigSetTab = ref<string>('Set 1')

// ---------------- GIGS CRUD ----------------
const editingGig = ref<any | null>(null)
const gigForm = reactive({
  id: '',
  venue: '',
  city: 'Ängelholm',
  date: '',
  time: '20:00',
  ticketUrl: '',
  status: 'upcoming',
  notesSv: '',
  notesEn: '',
  postToSocials: false,
  setlistTracks: [] as { title: string; artist?: string; isOriginal?: boolean; notes?: string; setName?: string }[],
})

const addGigSetlistTrack = (songOrTitle?: string | any, targetSet?: string) => {
  const sName = targetSet || activeGigSetTab.value || 'Set 1'
  if (typeof songOrTitle === 'object' && songOrTitle?.title) {
    gigForm.setlistTracks.push({
      title: songOrTitle.title,
      artist: songOrTitle.originalArtist || 'Det 7:e Gunget',
      isOriginal: !!songOrTitle.isOriginal,
      notes: '',
      setName: sName,
    })
  } else {
    gigForm.setlistTracks.push({
      title: typeof songOrTitle === 'string' ? songOrTitle : '',
      artist: '',
      isOriginal: false,
      notes: '',
      setName: sName,
    })
  }
}

const removeGigSetlistTrack = (index: number) => {
  gigForm.setlistTracks.splice(index, 1)
}

// ---------------- POST-LEVEL HASHTAG SELECTION ----------------
const allHashtags = computed<any[]>(() => (Array.isArray(hashtagsData.value) ? hashtagsData.value : []))

const tagHasCategory = (tag: any, cat: string) => {
  if (!tag || !tag.category) return false
  if (tag.category === 'all') return true
  return tag.category.split(',').map((s: string) => s.trim()).includes(cat)
}

const selectedGigTags = ref<string[]>([])

const availableGigTags = computed(() => {
  return allHashtags.value.filter((t) => t.isActive && tagHasCategory(t, 'gig'))
})

const toggleGigTag = (tag: string) => {
  if (selectedGigTags.value.includes(tag)) {
    selectedGigTags.value = selectedGigTags.value.filter((t) => t !== tag)
  } else {
    selectedGigTags.value.push(tag)
  }
}

const openAddGig = () => {
  if (editingGig.value !== null) {
    const ok = confirm('⚠️ Du har redan ett öppet gigformulär.\n\nVill du avbryta och skapa ett nytt gig istället?')
    if (!ok) return
  }
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
  gigForm.setlistTracks = []
  selectedGigTags.value = availableGigTags.value.map((t) => t.tag)
  editingGig.value = 'new'
}

const openEditGig = (gig: any) => {
  if (editingGig.value !== null && editingGig.value !== gig.id) {
    const ok = confirm('⚠️ Du har redan ett öppet gigformulär.\n\nVill du avbryta och redigera detta gig istället?')
    if (!ok) return
  }
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
  gigForm.postToSocials = false
  try {
    gigForm.setlistTracks = gig.setlist ? (typeof gig.setlist === 'string' ? JSON.parse(gig.setlist) : gig.setlist) : []
  } catch {
    gigForm.setlistTracks = []
  }
  selectedGigTags.value = availableGigTags.value.map((t) => t.tag)
  editingGig.value = gig.id
}

const gigSocialPreview = computed(() => {
  const dateStr = gigForm.date
    ? new Date(gigForm.date).toLocaleDateString('sv-SE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '[Datum]'

  const cityTag = gigForm.city ? `#${gigForm.city.replace(/\s+/g, '')}Blues` : ''
  const tagsStr = selectedGigTags.value.length > 0 ? selectedGigTags.value.join(' ') : '#DetSjundeGunget #BluesRock'

  return `🎸 NYTT GIG MED DET 7:E GUNGET! 🎸

📍 Spelplats: ${gigForm.venue || '[Spelplats]'}, ${gigForm.city || '[Stad]'}
📅 Datum: ${dateStr}${gigForm.notesSv ? `\n\n"${gigForm.notesSv}"` : ''}

${gigForm.ticketUrl ? `🎟️ Biljetter: ${gigForm.ticketUrl}` : '👉 Mer info: https://det7egunget.se/gigs'}

Kom och sväng med oss! 🎶
${tagsStr} ${cityTag}`.trim()
})

const saveGig = async () => {
  if (!gigForm.venue || !gigForm.city || !gigForm.date) {
    showToast('⚠️ Vänligen fyll i spelplats, stad och datum!')
    return
  }

  const dateTimeStr = `${gigForm.date}T${gigForm.time || '20:00'}:00`
  const res = await $fetch<{ success: boolean; social?: any }>('/api/admin/gigs', {
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
      setlist: gigForm.setlistTracks.length > 0 ? JSON.stringify(gigForm.setlistTracks) : null,
      postToSocials: gigForm.postToSocials,
      hashtags: selectedGigTags.value,
    },
  })

  editingGig.value = null
  await refreshGigs()
  if (res.social?.message) {
    showToast(`✓ Giget sparades! 📱 ${res.social.message}`)
  } else {
    showToast('✓ Giget har sparats!')
  }
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

// Gig Sorting
const gigSortKey = ref<'date' | 'venue' | 'city' | 'status'>('date')
const gigSortDir = ref<'asc' | 'desc'>('desc')

const toggleGigSort = (key: 'date' | 'venue' | 'city' | 'status') => {
  if (gigSortKey.value === key) {
    gigSortDir.value = gigSortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    gigSortKey.value = key
    gigSortDir.value = key === 'date' ? 'desc' : 'asc'
  }
}

const sortedGigs = computed(() => {
  const list = [...(gigsData.value?.all || [])]
  const dir = gigSortDir.value === 'asc' ? 1 : -1

  return list.sort((a, b) => {
    if (gigSortKey.value === 'date') {
      const timeA = new Date(a.date).getTime()
      const timeB = new Date(b.date).getTime()
      return (timeA - timeB) * dir
    }
    if (gigSortKey.value === 'venue') {
      return (a.venue || '').localeCompare(b.venue || '', 'sv') * dir
    }
    if (gigSortKey.value === 'city') {
      return (a.city || '').localeCompare(b.city || '', 'sv') * dir
    }
    if (gigSortKey.value === 'status') {
      return (a.status || '').localeCompare(b.status || '', 'sv') * dir
    }
    return 0
  })
})

onBeforeRouteLeave((to, from, next) => {
  if (editingGig.value !== null) {
    const answer = window.confirm('⚠️ Du har ett öppet gigformulär.\n\nVill du verkligen lämna sidan?')
    if (answer) next()
    else next(false)
  } else {
    next()
  }
})
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
    <AdminNavBar :dirty="editingGig !== null" />

    <!-- GIGS MANAGER -->
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="font-heading text-2xl text-primary font-bold">Hantera gig & spelningar</h2>
          <p class="text-xs text-base-content/70">Lägg till turnédatum, skapa spellista, uppdatera biljettlänkar och markera status.</p>
        </div>
        <button
          type="button"
          class="btn btn-primary btn-sm rounded-full font-bold px-5 cursor-pointer"
          title="Lägg till ett nytt gig med spelplats, datum, låtlista och biljettlänk"
          @click="openAddGig"
        >
          + Nytt gig
        </button>
      </div>

      <!-- Add/Edit Modal Form -->
      <div v-if="editingGig" class="stage-card p-6 sm:p-8 rounded-2xl border border-primary/40 space-y-4 shadow-2xl">
        <div class="flex items-center justify-between border-b border-primary/20 pb-3">
          <h3 class="font-heading text-xl text-primary font-bold">
            {{ editingGig === 'new' ? 'Lägg till nytt gig' : 'Redigera gig' }}
          </h3>
          <span class="badge badge-warning badge-sm font-bold animate-pulse">
            ⚠️ Osparade ändringar
          </span>
        </div>

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

          <!-- Per-Gig Setlist / Song List Manager -->
          <div class="sm:col-span-2 p-5 bg-base-200/90 rounded-2xl border border-primary/30 space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-primary/20 pb-3">
              <div>
                <span class="text-xs font-bold text-primary flex items-center gap-1.5 font-heading text-base">
                  <span>🎵</span> Låtlista för giget ({{ gigForm.setlistTracks.length }} låtar)
                </span>
                <p class="text-[11px] text-base-content/70">
                  Bygg setlistan för denna spelning. Visas för fansen på spelkortet och i arkivet.
                </p>
              </div>

              <!-- Quick Add From Existing Songs -->
              <div class="flex items-center gap-2 flex-wrap">
                <select
                  class="select select-bordered select-xs bg-base-300 font-mono text-xs"
                  @change="(e: any) => {
                    const targetId = e.target.value
                    if (targetId) {
                      const found = (songsData || []).find((s: any) => s.id === targetId)
                      if (found) addGigSetlistTrack(found, activeGigSetTab)
                      e.target.value = ''
                    }
                  }"
                >
                  <option value="">+ Välj från repertoar...</option>
                  <option v-for="s in songsData || []" :key="s.id" :value="s.id">
                    {{ s.title }} ({{ s.isOriginal ? 'Original' : s.originalArtist || 'Cover' }})
                  </option>
                </select>

                <button
                  type="button"
                  class="btn btn-xs btn-primary font-bold rounded-lg cursor-pointer"
                  @click="addGigSetlistTrack('', activeGigSetTab)"
                >
                  + Egen låttitel
                </button>
              </div>
            </div>

            <!-- Set Tabs -->
            <div class="flex gap-2 text-xs font-bold">
              <button
                v-for="sTab in ['Set 1', 'Set 2', 'Extranummer', 'Övrigt']"
                :key="sTab"
                type="button"
                class="px-3 py-1 rounded-full cursor-pointer transition-all"
                :class="activeGigSetTab === sTab ? 'bg-primary text-primary-content shadow' : 'bg-base-300 text-base-content/70'"
                @click="activeGigSetTab = sTab"
              >
                {{ sTab }} ({{ gigForm.setlistTracks.filter(t => (t.setName || 'Set 1') === sTab).length }})
              </button>
            </div>

            <!-- Setlist Track Items List -->
            <div class="space-y-2 max-h-64 overflow-y-auto pr-1">
              <div
                v-for="(track, idx) in gigForm.setlistTracks"
                v-show="(track.setName || 'Set 1') === activeGigSetTab"
                :key="idx"
                class="flex items-center gap-2 p-2 bg-base-100 rounded-xl border border-primary/20 text-xs"
              >
                <span class="font-mono text-secondary font-bold w-6 text-center">{{ idx + 1 }}.</span>
                <input
                  v-model="track.title"
                  type="text"
                  placeholder="Låttitel..."
                  class="input input-bordered input-xs flex-grow bg-base-200"
                />
                <input
                  v-model="track.artist"
                  type="text"
                  placeholder="Artist / Original..."
                  class="input input-bordered input-xs w-32 bg-base-200"
                />
                <input
                  v-model="track.notes"
                  type="text"
                  placeholder="Notering / Cue..."
                  class="input input-bordered input-xs w-28 bg-base-200"
                />
                <select
                  v-model="track.setName"
                  class="select select-bordered select-xs w-28 bg-base-200 text-[10px]"
                >
                  <option value="Set 1">Set 1</option>
                  <option value="Set 2">Set 2</option>
                  <option value="Extranummer">Extranummer</option>
                  <option value="Övrigt">Övrigt</option>
                </select>
                <button
                  type="button"
                  class="btn btn-ghost btn-xs text-error font-bold px-1.5 cursor-pointer"
                  title="Ta bort från låtlistan"
                  @click="removeGigSetlistTrack(idx)"
                >
                  ✕
                </button>
              </div>

              <div
                v-if="gigForm.setlistTracks.filter(t => (t.setName || 'Set 1') === activeGigSetTab).length === 0"
                class="text-center py-4 text-base-content/50 italic text-xs"
              >
                Inga låtar tillagda i {{ activeGigSetTab }}. Välj från dropdownen ovan eller klicka "+ Egen låttitel".
              </div>
            </div>
          </div>

          <!-- Social Sharing & Hashtags Toggle -->
          <div class="sm:col-span-2 p-4 bg-base-200/80 rounded-xl border border-primary/20 space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <span class="font-bold text-xs text-primary flex items-center gap-1">
                  <span>📱</span> Publicera automatiskt på Facebook & Instagram
                </span>
                <p class="text-[11px] text-base-content/60">
                  Skapar ett färdigt socialt inlägg i kön när du sparar giget.
                </p>
              </div>
              <input v-model="gigForm.postToSocials" type="checkbox" class="toggle toggle-primary toggle-sm" />
            </div>

            <!-- Hashtag Selector for this Gig Post -->
            <div v-if="gigForm.postToSocials" class="pt-2 border-t border-primary/10 space-y-2">
              <label class="block text-[11px] font-bold text-secondary">
                Välj hashtags för detta inlägg:
              </label>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="t in availableGigTags"
                  :key="t.id"
                  type="button"
                  class="btn btn-xs rounded-full cursor-pointer font-mono"
                  :class="selectedGigTags.includes(t.tag) ? 'btn-primary font-bold' : 'btn-ghost border border-base-content/20 text-base-content/70'"
                  @click="toggleGigTag(t.tag)"
                >
                  {{ t.tag }}
                </button>
              </div>

              <!-- Live Preview of Social Post -->
              <div class="mt-3 p-3 bg-base-300/80 rounded-lg text-xs space-y-1">
                <span class="text-[10px] font-mono uppercase text-secondary font-bold block">
                  Förhandsgranskning av inlägg:
                </span>
                <p class="text-base-content/90 font-mono text-[11px] whitespace-pre-wrap leading-relaxed">
                  {{ gigSocialPreview }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-3 pt-3">
          <button type="button" class="btn btn-primary btn-sm rounded-full font-bold px-6 cursor-pointer" @click="saveGig">
            Spara gig
          </button>
          <button type="button" class="btn btn-ghost btn-sm rounded-full cursor-pointer" @click="editingGig = null">
            Avbryt
          </button>
        </div>
      </div>

      <!-- Gigs List Table with Interactive Sorting -->
      <div class="overflow-x-auto rounded-2xl border border-primary/20 stage-card">
        <table class="table table-zebra w-full text-xs">
          <thead>
            <tr class="text-secondary font-bold uppercase text-[10px] tracking-wider border-b border-primary/20">
              <!-- DATUM -->
              <th>
                <button
                  type="button"
                  class="group inline-flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-wider transition-all cursor-pointer py-1 px-1.5 rounded"
                  :class="gigSortKey === 'date' ? 'text-primary font-black bg-primary/10 border-b-2 border-primary' : 'text-secondary hover:text-primary hover:bg-base-300/60'"
                  @click="toggleGigSort('date')"
                >
                  <span>Datum</span>
                  <span
                    class="tooltip tooltip-bottom inline-flex items-center"
                    :data-tip="gigSortKey === 'date' ? (gigSortDir === 'desc' ? 'Senaste datum först (Klicka för äldsta)' : 'Äldsta datum först (Klicka för senaste)') : 'Klicka för att sortera efter datum'"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      class="transition-transform duration-300"
                      :class="[
                        gigSortKey === 'date'
                          ? (gigSortDir === 'desc' ? 'rotate-180 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100' : 'rotate-0 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100')
                          : 'opacity-30 group-hover:opacity-80 rotate-0 text-base-content'
                      ]"
                    >
                      <path d="M12 2C6.5 2 3 5.5 3 10C3 16 10 21.5 12 22.5C14 21.5 21 16 21 10C21 5.5 17.5 2 12 2Z" fill="currentColor" />
                    </svg>
                  </span>
                </button>
              </th>

              <!-- SPELPLATS -->
              <th>
                <button
                  type="button"
                  class="group inline-flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-wider transition-all cursor-pointer py-1 px-1.5 rounded"
                  :class="gigSortKey === 'venue' ? 'text-primary font-black bg-primary/10 border-b-2 border-primary' : 'text-secondary hover:text-primary hover:bg-base-300/60'"
                  @click="toggleGigSort('venue')"
                >
                  <span>Spelplats</span>
                  <span
                    class="tooltip tooltip-bottom inline-flex items-center"
                    :data-tip="gigSortKey === 'venue' ? (gigSortDir === 'asc' ? 'Sorterat A till Ö' : 'Sorterat Ö till A') : 'Klicka för att sortera efter spelplats'"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      class="transition-transform duration-300"
                      :class="[
                        gigSortKey === 'venue'
                          ? (gigSortDir === 'asc' ? 'rotate-0 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100' : 'rotate-180 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100')
                          : 'opacity-30 group-hover:opacity-80 rotate-0 text-base-content'
                      ]"
                    >
                      <path d="M12 2C6.5 2 3 5.5 3 10C3 16 10 21.5 12 22.5C14 21.5 21 16 21 10C21 5.5 17.5 2 12 2Z" fill="currentColor" />
                    </svg>
                  </span>
                </button>
              </th>

              <!-- STAD -->
              <th>
                <button
                  type="button"
                  class="group inline-flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-wider transition-all cursor-pointer py-1 px-1.5 rounded"
                  :class="gigSortKey === 'city' ? 'text-primary font-black bg-primary/10 border-b-2 border-primary' : 'text-secondary hover:text-primary hover:bg-base-300/60'"
                  @click="toggleGigSort('city')"
                >
                  <span>Stad</span>
                  <span
                    class="tooltip tooltip-bottom inline-flex items-center"
                    :data-tip="gigSortKey === 'city' ? (gigSortDir === 'asc' ? 'Sorterat A till Ö' : 'Sorterat Ö till A') : 'Klicka för att sortera efter stad'"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      class="transition-transform duration-300"
                      :class="[
                        gigSortKey === 'city'
                          ? (gigSortDir === 'asc' ? 'rotate-0 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100' : 'rotate-180 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100')
                          : 'opacity-30 group-hover:opacity-80 rotate-0 text-base-content'
                      ]"
                    >
                      <path d="M12 2C6.5 2 3 5.5 3 10C3 16 10 21.5 12 22.5C14 21.5 21 16 21 10C21 5.5 17.5 2 12 2Z" fill="currentColor" />
                    </svg>
                  </span>
                </button>
              </th>

              <!-- STATUS -->
              <th>
                <button
                  type="button"
                  class="group inline-flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-wider transition-all cursor-pointer py-1 px-1.5 rounded"
                  :class="gigSortKey === 'status' ? 'text-primary font-black bg-primary/10 border-b-2 border-primary' : 'text-secondary hover:text-primary hover:bg-base-300/60'"
                  @click="toggleGigSort('status')"
                >
                  <span>Status</span>
                  <span
                    class="tooltip tooltip-bottom inline-flex items-center"
                    :data-tip="gigSortKey === 'status' ? (gigSortDir === 'asc' ? 'Sorterat A till Ö' : 'Sorterat Ö till A') : 'Klicka för att sortera efter status'"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      class="transition-transform duration-300"
                      :class="[
                        gigSortKey === 'status'
                          ? (gigSortDir === 'asc' ? 'rotate-0 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100' : 'rotate-180 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100')
                          : 'opacity-30 group-hover:opacity-80 rotate-0 text-base-content'
                      ]"
                    >
                      <path d="M12 2C6.5 2 3 5.5 3 10C3 16 10 21.5 12 22.5C14 21.5 21 16 21 10C21 5.5 17.5 2 12 2Z" fill="currentColor" />
                    </svg>
                  </span>
                </button>
              </th>

              <th>Biljettlänk</th>
              <th class="text-right">Åtgärder</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="gig in sortedGigs" :key="gig.id" :class="editingGig === gig.id ? 'bg-primary/10 border-l-4 border-primary' : ''">
              <td class="font-mono text-[11px] whitespace-nowrap">
                {{ new Date(gig.date).toLocaleDateString('sv-SE', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) }}
                <span class="text-base-content/60 ml-1">kl {{ new Date(gig.date).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }) }}</span>
              </td>
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
                <button type="button" class="btn btn-xs btn-outline btn-primary rounded cursor-pointer" @click="openEditGig(gig)">
                  Redigera
                </button>
                <button type="button" class="btn btn-xs btn-outline btn-error rounded cursor-pointer" @click="deleteGig(gig.id)">
                  Ta bort
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
