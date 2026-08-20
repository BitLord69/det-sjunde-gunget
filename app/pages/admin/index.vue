<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
})

useSeoMeta({
  title: 'Band Admin CMS | Det 7:e Gunget',
})

const { adminUser } = useAdminAuth()

const activeTab = ref<'gigs' | 'band' | 'songs' | 'setlist' | 'gallery' | 'merch' | 'admins' | 'messages' | 'subscribers' | 'hashtags'>('gigs')
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
const { data: setlistData, refresh: refreshSetlist } = await useFetch<any[]>('/api/setlist', {
  default: () => [],
})
const { data: merchData, refresh: refreshMerch } = await useFetch<any[]>('/api/merch', {
  default: () => [],
})
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
const { data: hashtagsData, refresh: refreshHashtags } = await useFetch<any[]>('/api/admin/hashtags', {
  default: () => [],
  ignoreResponseError: true,
})

const { data: adminSettings, refresh: refreshSettings } = await useFetch<{ newsletterEnabled: boolean; landingSongCount?: number; landingMerchCount?: number; lastMerchSync?: number; settings: Record<string, string> }>('/api/admin/settings', {
  default: () => ({ newsletterEnabled: false, settings: {} }),
  ignoreResponseError: true,
})

const { data: songsStatsData, refresh: refreshSongsStats } = await useFetch<{
  stats: any[]
  lookupByTitle: Record<string, number>
  lookupById: Record<string, number>
  totalPerformances: number
  uniqueSongsCount: number
}>('/api/admin/songs/stats', {
  default: () => ({ stats: [], lookupByTitle: {}, lookupById: {}, totalPerformances: 0, uniqueSongsCount: 0 }),
  ignoreResponseError: true,
})

const selectedSongStatsModal = ref<any | null>(null)
const getSongPlayCount = (song: any) => {
  if (!song) return 0
  if (song.id && songsStatsData.value?.lookupById?.[song.id] !== undefined) {
    return songsStatsData.value.lookupById[song.id]
  }
  const norm = (song.title || '').toLowerCase().trim()
  return songsStatsData.value?.lookupByTitle?.[norm] || 0
}

const openSongStats = (song: any) => {
  const normTitle = (song.title || '').toLowerCase().trim()
  const found = (songsStatsData.value?.stats || []).find((s: any) =>
    (s.id && song.id && s.id === song.id) ||
    (s.title && s.title.toLowerCase().trim() === normTitle)
  )

  if (found) {
    selectedSongStatsModal.value = found
  } else {
    selectedSongStatsModal.value = {
      title: song.title,
      artist: song.originalArtist || song.artist,
      isOriginal: song.isOriginal,
      playCount: 0,
      gigs: [],
    }
  }
}

// 🎵 Song Sorting State & Computed
type SongSortKey = 'title' | 'isOriginal' | 'originalArtist' | 'embedProvider' | 'playCount'
const songSortKey = ref<SongSortKey>('title')
const songSortDir = ref<'asc' | 'desc'>('asc')

const toggleSongSort = (key: SongSortKey) => {
  if (songSortKey.value === key) {
    songSortDir.value = songSortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    songSortKey.value = key
    songSortDir.value = key === 'playCount' ? 'desc' : 'asc'
  }
}

const sortedSongs = computed(() => {
  const list = [...(songsData.value || [])]
  const dir = songSortDir.value === 'asc' ? 1 : -1

  return list.sort((a, b) => {
    if (songSortKey.value === 'title') {
      return dir * (a.title || '').localeCompare(b.title || '', 'sv')
    }
    if (songSortKey.value === 'isOriginal') {
      const aVal = a.isOriginal ? 1 : 0
      const bVal = b.isOriginal ? 1 : 0
      return dir * (bVal - aVal)
    }
    if (songSortKey.value === 'originalArtist') {
      const aArt = a.isOriginal ? '' : (a.originalArtist || '')
      const bArt = b.isOriginal ? '' : (b.originalArtist || '')
      return dir * aArt.localeCompare(bArt, 'sv')
    }
    if (songSortKey.value === 'embedProvider') {
      return dir * (a.embedProvider || '').localeCompare(b.embedProvider || '', 'sv')
    }
    if (songSortKey.value === 'playCount') {
      const aCount = getSongPlayCount(a)
      const bCount = getSongPlayCount(b)
      return dir * (aCount - bCount)
    }
    return 0
  })
})

// 📋 Setlist Sorting State & Computed
type SetlistSortKey = 'sortOrder' | 'title' | 'setName' | 'isOriginal' | 'playCount'
const setlistSortKey = ref<SetlistSortKey>('sortOrder')
const setlistSortDir = ref<'asc' | 'desc'>('asc')

const toggleSetlistSort = (key: SetlistSortKey) => {
  if (setlistSortKey.value === key) {
    setlistSortDir.value = setlistSortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    setlistSortKey.value = key
    setlistSortDir.value = key === 'playCount' ? 'desc' : 'asc'
  }
}

const sortedSetlist = computed(() => {
  const list = [...(setlistData.value || [])]
  const dir = setlistSortDir.value === 'asc' ? 1 : -1

  return list.sort((a, b) => {
    if (setlistSortKey.value === 'sortOrder') {
      return dir * ((a.sortOrder || 0) - (b.sortOrder || 0))
    }
    if (setlistSortKey.value === 'title') {
      return dir * (a.title || '').localeCompare(b.title || '', 'sv')
    }
    if (setlistSortKey.value === 'setName') {
      return dir * (a.setName || '').localeCompare(b.setName || '', 'sv')
    }
    if (setlistSortKey.value === 'isOriginal') {
      const aVal = a.isOriginal ? 1 : 0
      const bVal = b.isOriginal ? 1 : 0
      return dir * (bVal - aVal)
    }
    if (setlistSortKey.value === 'playCount') {
      const aCount = getSongPlayCount(a)
      const bCount = getSongPlayCount(b)
      return dir * (aCount - bCount)
    }
    return 0
  })
})

// 📅 Gigs Sorting State & Computed
type GigSortKey = 'date' | 'venue' | 'city' | 'status'
const gigSortKey = ref<GigSortKey>('date')
const gigSortDir = ref<'asc' | 'desc'>('asc')

const toggleGigSort = (key: GigSortKey) => {
  if (gigSortKey.value === key) {
    gigSortDir.value = gigSortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    gigSortKey.value = key
    gigSortDir.value = 'asc'
  }
}

const sortedGigs = computed(() => {
  const list = [...(gigsData.value?.all || [])]
  const dir = gigSortDir.value === 'asc' ? 1 : -1

  return list.sort((a, b) => {
    if (gigSortKey.value === 'date') {
      return dir * (new Date(a.date).getTime() - new Date(b.date).getTime())
    }
    if (gigSortKey.value === 'venue') {
      return dir * (a.venue || '').localeCompare(b.venue || '', 'sv')
    }
    if (gigSortKey.value === 'city') {
      return dir * (a.city || '').localeCompare(b.city || '', 'sv')
    }
    if (gigSortKey.value === 'status') {
      return dir * (a.status || '').localeCompare(b.status || '', 'sv')
    }
    return 0
  })
})

const newsletterEnabledSetting = ref(false)
watch(
  () => adminSettings.value?.newsletterEnabled,
  (val) => {
    newsletterEnabledSetting.value = Boolean(val)
  },
  { immediate: true },
)

const landingSongCountSetting = ref(4)
watch(
  () => (adminSettings.value as any)?.landingSongCount,
  (val) => {
    if (val !== undefined && val !== null) {
      landingSongCountSetting.value = Number(val)
    }
  },
  { immediate: true },
)

const songSliderPercent = computed(() => {
  const min = 2, max = 10
  const val = Math.max(min, Math.min(max, Number(landingSongCountSetting.value) || 4))
  return ((val - min) / (max - min)) * 100
})

const isSlidingSongs = ref(false)
let songSlideTimeout: any = null
const showSongTooltipTemporarily = () => {
  isSlidingSongs.value = true
  if (songSlideTimeout) clearTimeout(songSlideTimeout)
  songSlideTimeout = setTimeout(() => {
    isSlidingSongs.value = false
  }, 1200)
}

let saveSongDebounceTimer: any = null
const saveLandingSongCountSetting = (newVal?: number) => {
  const count = newVal !== undefined ? Math.max(2, Math.min(10, Number(newVal))) : Math.max(2, Math.min(10, Number(landingSongCountSetting.value) || 4))
  // 1. Instant 0ms optimistic local update
  landingSongCountSetting.value = count
  if (adminSettings.value) {
    (adminSettings.value as any).landingSongCount = count
  }
  showSongTooltipTemporarily()

  // 2. Debounced single atomic network update (250ms)
  if (saveSongDebounceTimer) clearTimeout(saveSongDebounceTimer)
  saveSongDebounceTimer = setTimeout(async () => {
    try {
      await $fetch('/api/admin/settings', {
        method: 'POST',
        body: { landingSongCount: count },
      })
      showToast(`✓ Antal låtar på landningssidan ändrades till ${count} st!`)
    } catch (err: any) {
      showToast('⚠️ Fel vid sparande av inställning: ' + (err?.data?.message || err?.message || ''))
    }
  }, 250)
}

const landingMerchCountSetting = ref(4)
watch(
  () => (adminSettings.value as any)?.landingMerchCount,
  (val) => {
    if (val !== undefined && val !== null) {
      landingMerchCountSetting.value = Number(val)
    }
  },
  { immediate: true },
)

const merchSliderPercent = computed(() => {
  const min = 2, max = 8
  const val = Math.max(min, Math.min(max, Number(landingMerchCountSetting.value) || 4))
  return ((val - min) / (max - min)) * 100
})

const isSlidingMerch = ref(false)
let merchSlideTimeout: any = null
const showMerchTooltipTemporarily = () => {
  isSlidingMerch.value = true
  if (merchSlideTimeout) clearTimeout(merchSlideTimeout)
  merchSlideTimeout = setTimeout(() => {
    isSlidingMerch.value = false
  }, 1200)
}

let saveMerchDebounceTimer: any = null
const saveLandingMerchCountSetting = (newVal?: number) => {
  const count = newVal !== undefined ? Math.max(2, Math.min(8, Number(newVal))) : Math.max(2, Math.min(8, Number(landingMerchCountSetting.value) || 4))
  // 1. Instant 0ms optimistic local update
  landingMerchCountSetting.value = count
  if (adminSettings.value) {
    (adminSettings.value as any).landingMerchCount = count
  }
  showMerchTooltipTemporarily()

  // 2. Debounced single atomic network update (250ms)
  if (saveMerchDebounceTimer) clearTimeout(saveMerchDebounceTimer)
  saveMerchDebounceTimer = setTimeout(async () => {
    try {
      await $fetch('/api/admin/settings', {
        method: 'POST',
        body: { landingMerchCount: count },
      })
      showToast(`✓ Antal merch-artiklar på landningssidan ändrades till ${count} st!`)
    } catch (err: any) {
      showToast('⚠️ Fel vid sparande av inställning: ' + (err?.data?.message || err?.message || ''))
    }
  }, 250)
}

onMounted(() => {
  refreshSettings()
  refreshSongs()
  refreshGigs()
  refreshGallery()
})

const isSyncingMerch = ref(false)

const triggerMerchSync = async () => {
  isSyncingMerch.value = true
  try {
    const res: any = await $fetch('/api/admin/merch/sync', {
      method: 'POST',
    })
    await refreshMerch()
    await refreshSettings()
    if (res?.success) {
      showToast(`✓ ${res.totalItems} produkter synkades från Spreadshop till databasen!`)
    } else {
      showToast(`⚠️ Synkfel: ${res?.error || 'Kunde inte synka från Spreadshop'}`)
    }
  } catch (err: any) {
    showToast('⚠️ Fel vid synkning: ' + (err?.data?.message || err?.message || ''))
  } finally {
    isSyncingMerch.value = false
  }
}

const formatSyncTimestamp = (ts?: number | null) => {
  if (!ts) return 'Aldrig synkad'
  return new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ts))
}

const toggleNewsletterSetting = async () => {
  newsletterEnabledSetting.value = !newsletterEnabledSetting.value
  isSavingSettings.value = true
  try {
    await $fetch('/api/admin/settings', {
      method: 'POST',
      body: { newsletterEnabled: newsletterEnabledSetting.value },
    })
    await refreshSettings()
    showToast(newsletterEnabledSetting.value ? '✓ Nyhetsbrev och prenumerationer är nu AKTIVERADE på sajten!' : '✓ Nyhetsbrev och prenumerationer är nu PAUSADE på sajten.')
  } catch (err: any) {
    newsletterEnabledSetting.value = !newsletterEnabledSetting.value
    showToast('⚠️ Fel vid sparande av inställning: ' + (err?.data?.message || err?.message || ''))
  } finally {
    isSavingSettings.value = false
  }
}

const unreadMessagesCount = computed(() => {
  return (Array.isArray(messagesData.value) ? messagesData.value : []).filter((m) => m?.status === 'unread').length
})

// ---------------- GIGS CRUD ----------------
const editingGig = ref<any | null>(null)
const activeGigSetTab = ref<'Set 1' | 'Set 2' | 'Set 3' | 'Extranummer'>('Set 1')
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
const selectedSongTags = ref<string[]>([])

const availableGigTags = computed(() => {
  return allHashtags.value.filter((t) => t.isActive && tagHasCategory(t, 'gig'))
})

const availableSongTags = computed(() => {
  return allHashtags.value.filter((t) => t.isActive && tagHasCategory(t, 'song'))
})

const toggleGigTag = (tag: string) => {
  if (selectedGigTags.value.includes(tag)) {
    selectedGigTags.value = selectedGigTags.value.filter((t) => t !== tag)
  } else {
    selectedGigTags.value.push(tag)
  }
}

const toggleSongTag = (tag: string) => {
  if (selectedSongTags.value.includes(tag)) {
    selectedSongTags.value = selectedSongTags.value.filter((t) => t !== tag)
  } else {
    selectedSongTags.value.push(tag)
  }
}

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
  gigForm.setlistTracks = []
  selectedGigTags.value = availableGigTags.value.map((t) => t.tag)
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

// ---------------- UPLOAD HELPER ----------------
const isUploading = ref(false)

const uploadFile = async (event: Event, targetCallback: (url: string) => void) => {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return
  const file = input.files[0]
  if (!file) return

  const formData = new FormData()
  formData.append('file', file)
  isUploading.value = true

  try {
    const res = await $fetch<{ success: boolean; url: string }>('/api/admin/upload', {
      method: 'POST',
      body: formData,
    })
    if (res.success && res.url) {
      targetCallback(res.url)
      showToast('✓ Bilden har laddats upp!')
    }
  } catch (err: any) {
    showToast(`⚠️ Uppladdning misslyckades: ${err?.data?.message || err?.message || 'Fel'}`)
  } finally {
    isUploading.value = false
    input.value = ''
  }
}

// ---------------- BAND MEMBER LORE ----------------
const editingMember = ref<any | null>(null)
const memberForm = reactive({
  id: '',
  name: '',
  role: '',
  bioSv: '',
  bioEn: '',
  photoUrl: '',
  gearSv: '',
  gearEn: '',
  favoriteChord: '',
  weaknessSv: '',
  coffeeConsumption: '',
})

const openEditMember = (m: any) => {
  memberForm.id = m.id
  memberForm.name = m.name
  memberForm.role = m.role
  memberForm.bioSv = m.bioSv || ''
  memberForm.bioEn = m.bioEn || ''
  memberForm.photoUrl = m.photoUrl || ''
  memberForm.gearSv = m.gearSv || ''
  memberForm.gearEn = m.gearEn || ''
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
  coverImage: '',
  duration: '',
  lyrics: '',
  lyricsEn: '',
  chords: '',
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
  songForm.coverImage = ''
  songForm.duration = ''
  songForm.lyrics = ''
  songForm.lyricsEn = ''
  songForm.chords = ''
  songForm.postToSocials = false
  selectedSongTags.value = availableSongTags.value.map((t) => t.tag)
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
  songForm.coverImage = s.coverImage || ''
  songForm.duration = s.duration ? String(s.duration) : ''
  songForm.lyrics = s.lyrics || ''
  songForm.lyricsEn = s.lyricsEn || ''
  songForm.chords = s.chords || ''
  songForm.postToSocials = false
  selectedSongTags.value = availableSongTags.value.map((t) => t.tag)
  editingSong.value = s.id
}

const songSocialPreview = computed(() => {
  const tagsStr = selectedSongTags.value.length > 0 ? selectedSongTags.value.join(' ') : '#DetSjundeGunget #BluesRock #NyMusik'
  return `🎵 NY LÅT I JUKEBOXEN! 🎵

"${songForm.title || '[Låttitel]'}" ${songForm.isOriginal ? '(Originalkomposition)' : `(Cover av ${songForm.originalArtist || 'Okänd'})`} finns nu att lyssna på i vår retro jukebox på webben!

${songForm.embedUrl ? `👉 Lyssna direkt: ${songForm.embedUrl}` : '👉 Lyssna här: https://det7egunget.se/music'}

Släpp i en slant och höj volymen till 11! ⚡
${tagsStr}`
})

const saveSong = async () => {
  if (!songForm.title || (!songForm.embedUrl && !songForm.audioUrl)) {
    showToast('⚠️ Ange låttitel och antingen en ljudfil eller en länk!')
    return
  }
  const res = await $fetch<{ success: boolean; social?: any }>('/api/admin/songs', {
    method: 'POST',
    body: {
      ...songForm,
      hashtags: selectedSongTags.value,
    },
  })
  editingSong.value = null
  await refreshSongs()
  if (res.social?.message) {
    showToast(`✓ Låten sparades! 📱 ${res.social.message}`)
  } else {
    showToast(songForm.postToSocials ? '✓ Låten har sparats & schemalagts för FB & Insta!' : '✓ Låten har sparats i jukeboxen!')
  }
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

// ---------------- HASHTAGS MANAGEMENT & MULTI-CATEGORY ----------------
const activeTagTabFilter = ref<'all' | 'gig' | 'song' | 'news' | 'photo'>('all')

const filteredHashtags = computed(() => {
  if (activeTagTabFilter.value === 'all') return allHashtags.value
  return allHashtags.value.filter((t) => tagHasCategory(t, activeTagTabFilter.value))
})

const getCategoryBadges = (categoryStr: string) => {
  if (!categoryStr || categoryStr === 'all') {
    return [{ key: 'all', label: '🌐 Allmänt (Alla)', class: 'badge-neutral' }]
  }
  const cats = categoryStr.split(',').map((s) => s.trim())
  const list: { key: string; label: string; class: string }[] = []
  if (cats.includes('gig')) list.push({ key: 'gig', label: '📅 Spelningar', class: 'badge-primary' })
  if (cats.includes('song')) list.push({ key: 'song', label: '🎵 Låtar', class: 'badge-secondary' })
  if (cats.includes('news')) list.push({ key: 'news', label: '📢 Nyheter', class: 'badge-accent' })
  if (cats.includes('photo')) list.push({ key: 'photo', label: '📷 Foton', class: 'badge-info' })
  return list
}

const editingHashtagId = ref<string | null>(null)
const hashtagForm = reactive({
  id: '',
  tag: '',
  categories: ['gig'] as string[],
  isAll: false,
})

const resetHashtagForm = () => {
  editingHashtagId.value = null
  hashtagForm.id = ''
  hashtagForm.tag = ''
  hashtagForm.categories = ['gig']
  hashtagForm.isAll = false
}

const openEditHashtag = (tag: any) => {
  editingHashtagId.value = tag.id
  hashtagForm.id = tag.id
  hashtagForm.tag = tag.tag
  hashtagForm.isAll = tag.category === 'all'
  if (tag.category === 'all') {
    hashtagForm.categories = ['gig', 'song', 'news', 'photo']
  } else {
    hashtagForm.categories = tag.category.split(',').map((s: string) => s.trim())
  }
  // Scroll smoothly to the hashtag editor form
  const el = document.getElementById('hashtag-editor')
  if (el) el.scrollIntoView({ behavior: 'smooth' })
}

const toggleFormCategory = (cat: string) => {
  if (cat === 'all') {
    hashtagForm.isAll = !hashtagForm.isAll
    if (hashtagForm.isAll) {
      hashtagForm.categories = ['gig', 'song', 'news', 'photo']
    }
    return
  }
  hashtagForm.isAll = false
  if (hashtagForm.categories.includes(cat)) {
    hashtagForm.categories = hashtagForm.categories.filter((c) => c !== cat)
  } else {
    hashtagForm.categories.push(cat)
  }
}

const saveHashtag = async () => {
  if (!hashtagForm.tag.trim()) {
    showToast('⚠️ Ange en hashtag, t.ex. #BluesRock')
    return
  }
  if (!hashtagForm.isAll && hashtagForm.categories.length === 0) {
    showToast('⚠️ Välj minst en kategori för taggen!')
    return
  }

  const isEdit = !!hashtagForm.id
  await $fetch('/api/admin/hashtags', {
    method: 'POST',
    body: {
      id: hashtagForm.id || undefined,
      tag: hashtagForm.tag,
      categories: hashtagForm.isAll ? ['all'] : hashtagForm.categories,
    },
  })

  resetHashtagForm()
  await refreshHashtags()
  showToast(isEdit ? '✓ Taggen och dess kategorier har uppdaterats!' : '✓ Ny tagg sparades!')
}

const toggleHashtagActive = async (tag: any) => {
  await $fetch('/api/admin/hashtags', {
    method: 'POST',
    body: {
      id: tag.id,
      tag: tag.tag,
      category: tag.category,
      isActive: !tag.isActive,
      sortOrder: tag.sortOrder,
    },
  })
  await refreshHashtags()
}

const deleteHashtag = async (id: string) => {
  if (!confirm('Är du säker på att du vill ta bort denna tagg?')) return
  await $fetch(`/api/admin/hashtags?id=${id}`, {
    method: 'DELETE',
  })
  if (editingHashtagId.value === id) {
    resetHashtagForm()
  }
  await refreshHashtags()
  showToast('✓ Taggen togs bort.')
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
  captionEn: '',
  altTextSv: '',
  altTextEn: '',
})

const openAddGal = () => {
  galForm.id = ''
  galForm.category = 'photo'
  galForm.mediaUrl = ''
  galForm.frameStyle = 'polaroid'
  galForm.rotation = 0
  galForm.captionSv = ''
  galForm.captionEn = ''
  galForm.altTextSv = ''
  galForm.altTextEn = ''
  editingGal.value = 'new'
}

const openEditGal = (g: any) => {
  galForm.id = g.id
  galForm.category = g.category || 'photo'
  galForm.mediaUrl = g.mediaUrl || ''
  galForm.frameStyle = g.frameStyle || 'polaroid'
  galForm.rotation = g.rotation || 0
  galForm.captionSv = g.captionSv || ''
  galForm.captionEn = g.captionEn || ''
  galForm.altTextSv = g.altTextSv || ''
  galForm.altTextEn = g.altTextEn || ''
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

const quickChangeFrameStyle = async (item: any, newStyle: string) => {
  try {
    await $fetch('/api/admin/gallery', {
      method: 'POST',
      body: {
        ...item,
        frameStyle: newStyle,
      },
    })
    item.frameStyle = newStyle
    await refreshGallery()
    const labelMap: Record<string, string> = {
      random: '🎲 Slumpad',
      pinned: '📌 Nålat',
      polaroid: '📷 Polaroid',
      taped: '🏷️ Tejpat',
      grunge: '🎞️ Grunge',
      wood: '🖼️ Träram',
    }
    showToast(`✓ Fastsättning ändrad till ${labelMap[newStyle] || newStyle}!`)
  } catch (err: any) {
    showToast('⚠️ Kunde inte uppdatera fastsättning: ' + (err?.data?.message || err?.message || ''))
  }
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

// ---------------- SETLIST & REPERTOIRE CRUD ----------------
const editingSetlist = ref<string | null>(null)
const setlistForm = reactive({
  id: '',
  title: '',
  artist: '',
  isOriginal: false,
  setName: 'Set 1: Klubbstart',
  notes: '',
  sortOrder: 0,
})

const openAddSetlist = () => {
  setlistForm.id = ''
  setlistForm.title = ''
  setlistForm.artist = ''
  setlistForm.isOriginal = false
  setlistForm.setName = 'Set 1: Klubbstart'
  setlistForm.notes = ''
  setlistForm.sortOrder = (setlistData.value?.length || 0) + 1
  editingSetlist.value = 'new'
}

const openEditSetlist = (item: any) => {
  setlistForm.id = item.id
  setlistForm.title = item.title
  setlistForm.artist = item.artist || ''
  setlistForm.isOriginal = !!item.isOriginal
  setlistForm.setName = item.setName || 'Set 1: Klubbstart'
  setlistForm.notes = item.notes || ''
  setlistForm.sortOrder = item.sortOrder || 0
  editingSetlist.value = item.id
}

const saveSetlistItem = async () => {
  if (!setlistForm.title) {
    showToast('⚠️ Ange låttitel!')
    return
  }
  try {
    await $fetch('/api/admin/setlist', {
      method: 'POST',
      body: setlistForm,
    })
    editingSetlist.value = null
    await refreshSetlist()
    showToast('✓ Setlistan har uppdaterats!')
  } catch (err: any) {
    showToast(`⚠️ ${err?.data?.message || 'Kunde inte spara låten'}`)
  }
}

const deleteSetlistItem = async (id: string) => {
  if (!confirm('Vill du ta bort låten från setlistan?')) return
  try {
    await $fetch('/api/admin/setlist', {
      method: 'DELETE',
      body: { id },
    })
    await refreshSetlist()
    showToast('✓ Låten togs bort från setlistan!')
  } catch (err: any) {
    showToast(`⚠️ ${err?.data?.message || 'Kunde inte ta bort låten'}`)
  }
}

// ---------------- ADMIN USERS CRUD ----------------
const isAddAdminOpen = ref(false)
const newAdminForm = reactive({
  name: '',
  email: '',
  username: '',
  role: 'Administratör',
  password: '',
  avatarUrl: '',
})

const openAddAdmin = () => {
  newAdminForm.name = ''
  newAdminForm.email = ''
  newAdminForm.username = ''
  newAdminForm.role = 'Administratör'
  newAdminForm.password = ''
  newAdminForm.avatarUrl = ''
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
        title="Hantera turnédatum, skapa spellista för spelningar, uppdatera biljettlänkar och status"
        @click="activeTab = 'gigs'"
      >
        <span>📅</span> Gig & spelningar ({{ gigsData?.all?.length || 0 }})
      </button>
      <button
        type="button"
        class="px-5 py-2.5 rounded-full transition-all flex items-center gap-1.5"
        :class="activeTab === 'band' ? 'bg-primary text-primary-content shadow' : 'bg-base-200 text-base-content/70 hover:text-primary'"
        title="Hantera bandmedlemmarnas profiler, instrument och biografier"
        @click="activeTab = 'band'"
      >
        <span>🎸</span> Bandet & medlemmar ({{ bandMembers?.length || 4 }})
      </button>
      <button
        type="button"
        class="px-5 py-2.5 rounded-full transition-all flex items-center gap-1.5"
        :class="activeTab === 'songs' ? 'bg-primary text-primary-content shadow' : 'bg-base-200 text-base-content/70 hover:text-primary'"
        title="Hantera bandets låtskatt och ljudfiler som spelas i jukeboxen på musiksidan"
        @click="activeTab = 'songs'"
      >
        <span>🎵</span> Låtar & jukebox ({{ songsData?.length || 0 }})
      </button>
      <button
        type="button"
        class="px-5 py-2.5 rounded-full transition-all flex items-center gap-1.5"
        :class="activeTab === 'setlist' ? 'bg-primary text-primary-content shadow' : 'bg-base-200 text-base-content/70 hover:text-primary'"
        title="Organisera bandets aktiva liverepertoar och setlist som visas för fansen på musiksidan"
        @click="activeTab = 'setlist'"
      >
        <span>📋</span> Setlist & repertoar ({{ setlistData?.length || 0 }})
      </button>
      <button
        type="button"
        class="px-5 py-2.5 rounded-full transition-all flex items-center gap-1.5"
        :class="activeTab === 'gallery' ? 'bg-primary text-primary-content shadow' : 'bg-base-200 text-base-content/70 hover:text-primary'"
        title="Hantera fotogalleri, Fan Central och välj ramstilar / fastsättning"
        @click="activeTab = 'gallery'"
      >
        <span>📷</span> Galleri & Fan Central ({{ galleryItems?.length || 0 }})
      </button>
      <button
        type="button"
        class="px-5 py-2.5 rounded-full transition-all flex items-center gap-1.5"
        :class="activeTab === 'merch' ? 'bg-primary text-primary-content shadow' : 'bg-base-200 text-base-content/70 hover:text-primary'"
        title="Hantera merch, priser och synkronisering med Spreadshop-butiken"
        @click="activeTab = 'merch'"
      >
        <span>👕</span> Merch & webbshop ({{ merchData?.length || 0 }})
      </button>
      <button
        type="button"
        class="px-5 py-2.5 rounded-full transition-all flex items-center gap-1.5"
        :class="activeTab === 'messages' ? 'bg-primary text-primary-content shadow' : 'bg-base-200 text-base-content/70 hover:text-primary'"
        title="Hantera inkomna bokningsförfrågningar och meddelanden"
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
        title="Visa och hantera e-postprenumeranter till nyhetsbrevet"
        @click="activeTab = 'subscribers'"
      >
        <span>📬</span> Nyhetsbrev ({{ subscribersData?.length || 0 }})
      </button>
      <button
        type="button"
        class="px-5 py-2.5 rounded-full transition-all flex items-center gap-1.5"
        :class="activeTab === 'admins' ? 'bg-primary text-primary-content shadow' : 'bg-base-200 text-base-content/70 hover:text-primary'"
        title="Hantera administratörskonton och behörigheter"
        @click="activeTab = 'admins'"
      >
        <span>👥</span> Administratörer ({{ adminUsers?.length || 4 }})
      </button>
      <button
        type="button"
        class="px-5 py-2.5 rounded-full transition-all flex items-center gap-1.5"
        :class="activeTab === 'hashtags' ? 'bg-primary text-primary-content shadow' : 'bg-base-200 text-base-content/70 hover:text-primary'"
        title="Hantera förvalda hashtags för sociala medier-delning"
        @click="activeTab = 'hashtags'"
      >
        <span>🏷️</span> Sociala taggar ({{ hashtagsData?.length || 0 }})
      </button>
    </div>

    <!-- 1. GIGS MANAGER -->
    <div v-if="activeTab === 'gigs'" class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="font-heading text-2xl text-primary font-bold">Hantera gig & spelningar</h2>
          <p class="text-xs text-base-content/70">Lägg till turnédatum, skapa spellista, uppdatera biljettlänkar och markera status.</p>
        </div>
        <button
          type="button"
          class="btn btn-primary btn-sm rounded-full font-bold px-5"
          title="Lägg till ett nytt gig med spelplats, datum, låtlista och biljettlänk"
          @click="openAddGig"
        >
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
                    {{ s.title }} ({{ s.isOriginal ? 'Egen' : s.originalArtist || 'Cover' }})
                  </option>
                </select>

                <button
                  type="button"
                  class="btn btn-xs btn-outline btn-primary rounded-full font-bold"
                  @click="addGigSetlistTrack('', activeGigSetTab)"
                >
                  + Egen låt i {{ activeGigSetTab }}
                </button>
              </div>
            </div>

            <!-- Set Selector Filter Tabs (Set 1, Set 2, Set 3, Extranummer) -->
            <div class="flex items-center gap-2 border-b border-primary/10 pb-2">
              <span class="text-[11px] font-bold text-secondary mr-1">Aktivt set:</span>
              <button
                v-for="sTab in ['Set 1', 'Set 2', 'Set 3', 'Extranummer'] as const"
                :key="sTab"
                type="button"
                class="badge badge-sm font-mono cursor-pointer transition-all border"
                :class="
                  activeGigSetTab === sTab
                    ? 'badge-primary font-bold shadow'
                    : 'badge-ghost opacity-70 hover:opacity-100'
                "
                @click="activeGigSetTab = sTab"
              >
                {{ sTab }} ({{ gigForm.setlistTracks.filter(t => (t.setName || 'Set 1') === sTab).length }})
              </button>
            </div>

            <!-- Setlist Track Items -->
            <div class="space-y-2 max-h-72 overflow-y-auto pr-1">
              <div
                v-for="(track, idx) in gigForm.setlistTracks"
                :key="idx"
                class="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-2.5 bg-base-300/80 rounded-xl border border-primary/15 text-xs font-mono"
              >
                <span class="font-bold text-primary w-5 text-center flex-shrink-0">{{ idx + 1 }}.</span>

                <!-- Set selector dropdown per track -->
                <select
                  v-model="track.setName"
                  class="select select-bordered select-xs bg-base-200 text-[11px] w-24 font-bold text-secondary flex-shrink-0"
                >
                  <option value="Set 1">Set 1</option>
                  <option value="Set 2">Set 2</option>
                  <option value="Set 3">Set 3</option>
                  <option value="Extranummer">Extranummer</option>
                </select>

                <input
                  v-model="track.title"
                  type="text"
                  placeholder="Låttitel *"
                  class="input input-bordered input-xs flex-grow bg-base-200"
                />
                <input
                  v-model="track.artist"
                  type="text"
                  placeholder="Artist / Kompositör"
                  class="input input-bordered input-xs w-32 bg-base-200"
                />
                <input
                  v-model="track.notes"
                  type="text"
                  placeholder="Mellansnack / Cue"
                  class="input input-bordered input-xs w-32 bg-base-200"
                />
                <label class="flex items-center gap-1 cursor-pointer flex-shrink-0 text-[10px]">
                  <input v-model="track.isOriginal" type="checkbox" class="checkbox checkbox-xs checkbox-primary" />
                  <span>Egen text</span>
                </label>
                <button
                  type="button"
                  class="btn btn-ghost btn-xs text-error flex-shrink-0"
                  title="Ta bort låt från setlistan"
                  @click="removeGigSetlistTrack(idx)"
                >
                  ✕
                </button>
              </div>

              <div v-if="gigForm.setlistTracks.length === 0" class="text-center py-4 text-xs text-base-content/50 italic bg-base-300/30 rounded-xl border border-dashed border-primary/10">
                Inga låtar tillagda ännu. Välj från repertoaren ovan eller klicka "+ Egen låt"!
              </div>
            </div>
          </div>

          <!-- Social Media Cross-Posting Switch -->
          <div class="sm:col-span-2 p-4 bg-base-200/80 rounded-2xl border border-primary/20 space-y-3">
            <div class="flex items-center justify-between gap-4">
              <div class="space-y-0.5">
                <span class="text-xs font-bold text-primary flex items-center gap-1.5">
                  <span>📱</span> Posta automatiskt till Facebook & Instagram
                </span>
                <p class="text-[11px] text-base-content/60">
                  Skapar automatiskt ett inlägg på bandets sociala medier när giget sparas.
                </p>
              </div>
              <input
                v-model="gigForm.postToSocials"
                type="checkbox"
                class="toggle toggle-primary toggle-sm"
                title="Aktivera / inaktivera automatisk delning till FB & Instagram"
              />
            </div>

            <!-- Live Social Post Preview Box -->
            <div v-if="gigForm.postToSocials" class="p-3.5 bg-black/80 rounded-xl border border-primary/30 space-y-3 mt-2">
              <div class="flex items-center justify-between text-[11px] font-bold text-secondary">
                <span>👁️ Live Förhandsgranskning (Facebook & Instagram)</span>
                <span class="badge badge-xs badge-primary font-mono">Auto-genererat</span>
              </div>

              <!-- Clickable Hashtag Selector Chips -->
              <div class="space-y-1.5 pt-1 border-t border-primary/15">
                <div class="flex items-center justify-between text-[10px] text-base-content/70">
                  <span class="font-bold text-secondary">Välj taggar för detta inlägg:</span>
                  <span>Klicka för att välja/avmarkera</span>
                </div>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="t in availableGigTags"
                    :key="t.id"
                    type="button"
                    class="badge badge-xs sm:badge-sm font-mono cursor-pointer transition-all border"
                    :class="selectedGigTags.includes(t.tag) ? 'badge-primary font-bold shadow' : 'badge-ghost opacity-60 hover:opacity-100'"
                    @click="toggleGigTag(t.tag)"
                  >
                    {{ t.tag }} {{ selectedGigTags.includes(t.tag) ? '✓' : '+' }}
                  </button>
                  <span v-if="availableGigTags.length === 0" class="text-xs text-base-content/50 italic">
                    Inga aktiva gig-taggar. Lägg till i fliken "Sociala taggar".
                  </span>
                </div>
              </div>

              <div class="font-mono text-xs text-base-content/90 whitespace-pre-line leading-relaxed border-l-2 border-primary/40 pl-3">
                {{ gigSocialPreview }}
              </div>
            </div>
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
              <!-- DATUM -->
              <th>
                <button
                  type="button"
                  class="group inline-flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-wider transition-all cursor-pointer py-1 px-1.5 rounded"
                  :class="gigSortKey === 'date' ? 'text-primary font-black bg-primary/10 border-b-2 border-primary' : 'text-secondary hover:text-primary hover:bg-base-300/60'"
                  @click="toggleGigSort('date')"
                >
                  <span>Datum & Tid</span>
                  <span
                    class="tooltip tooltip-bottom inline-flex items-center"
                    :data-tip="gigSortKey === 'date' ? (gigSortDir === 'asc' ? 'Kronologisk: Äldst först (Klicka för nyast)' : 'Omvänd: Nyast först (Klicka för äldst)') : 'Klicka för att sortera efter datum'"
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
                          ? (gigSortDir === 'asc' ? 'rotate-0 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100' : 'rotate-180 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100')
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
                    :data-tip="gigSortKey === 'venue' ? (gigSortDir === 'asc' ? 'Sorterat A till Ö (Klicka för Ö till A)' : 'Sorterat Ö till A (Klicka för A till Ö)') : 'Klicka för att sortera efter spelplats'"
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
                    :data-tip="gigSortKey === 'city' ? (gigSortDir === 'asc' ? 'Sorterat A till Ö (Klicka för Ö till A)' : 'Sorterat Ö till A (Klicka för A till Ö)') : 'Klicka för att sortera efter stad'"
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
                    :data-tip="gigSortKey === 'status' ? (gigSortDir === 'asc' ? 'Sorterat efter status (Klicka för omvänd)' : 'Sorterat omvänt (Klicka för stigande)') : 'Klicka för att sortera efter status'"
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
              <th class="text-right">Åtgärd</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="gig in sortedGigs" :key="gig.id" class="hover:bg-base-200/50">
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
      <div v-if="editingMember" class="stage-card p-6 sm:p-8 rounded-2xl border border-primary/40 space-y-5 shadow-2xl">
        <div class="flex items-center justify-between border-b border-primary/20 pb-3">
          <h3 class="font-heading text-xl text-primary font-bold">
            Redigera profil för {{ memberForm.name }}
          </h3>
          <span class="badge badge-primary font-mono text-xs font-bold">{{ memberForm.role }}</span>
        </div>

        <div class="grid sm:grid-cols-2 gap-4 text-sm">
          <!-- Profile Photo with Direct Uploader -->
          <div class="sm:col-span-2 flex flex-col sm:flex-row items-center gap-4 p-4 bg-base-200/60 rounded-xl border border-primary/20">
            <NuxtImg
              :src="memberForm.photoUrl || '/media/brand/Logotyp_mini.webp'"
              :alt="memberForm.name"
              class="w-20 h-24 object-cover rounded-lg border border-primary/40 shadow-md flex-shrink-0"
            />
            <div class="flex-grow space-y-2 w-full">
              <label class="block text-xs font-bold text-secondary">Profilfoto</label>
              <div class="flex items-center gap-2">
                <input v-model="memberForm.photoUrl" type="text" placeholder="/media/band/namn.jpg" class="input input-bordered flex-grow bg-base-200 input-sm font-mono text-xs" />
                <label class="btn btn-outline btn-primary btn-sm rounded-lg cursor-pointer whitespace-nowrap" :class="isUploading ? 'loading' : ''">
                  <span>📁 Ladda upp</span>
                  <input type="file" accept="image/*" class="hidden" @change="uploadFile($event, url => memberForm.photoUrl = url)" />
                </label>
              </div>
              <p class="text-[10px] text-base-content/60">Ladda upp från datorn eller ange sökväg.</p>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Namn *</label>
            <input v-model="memberForm.name" type="text" class="input input-bordered w-full bg-base-200 input-sm" />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Roll / instrument *</label>
            <input v-model="memberForm.role" type="text" class="input input-bordered w-full bg-base-200 input-sm" />
          </div>

          <!-- Bilingual Bios -->
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Biografi (svenska)</label>
            <textarea v-model="memberForm.bioSv" rows="3" class="textarea textarea-bordered w-full bg-base-200 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Biography (English)</label>
            <textarea v-model="memberForm.bioEn" rows="3" placeholder="English presentation..." class="textarea textarea-bordered w-full bg-base-200 text-sm" />
          </div>

          <!-- Bilingual Gear -->
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Vapen / utrustning (svenska)</label>
            <input v-model="memberForm.gearSv" type="text" placeholder="Fender Stratocaster, Marshall..." class="input input-bordered w-full bg-base-200 input-sm" />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Gear / instruments (English)</label>
            <input v-model="memberForm.gearEn" type="text" placeholder="Fender Stratocaster, Marshall..." class="input input-bordered w-full bg-base-200 input-sm" />
          </div>

          <!-- Quirks & Lore -->
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Favoritackord</label>
            <input v-model="memberForm.favoriteChord" type="text" placeholder="E7#9 (Hendrix-ackordet)" class="input input-bordered w-full bg-base-200 input-sm" />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Svaghet</label>
            <input v-model="memberForm.weaknessSv" type="text" placeholder="Spelar för snabbt, kanelbullar..." class="input input-bordered w-full bg-base-200 input-sm" />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-xs font-bold text-secondary mb-1">Kaffekonsumtion</label>
            <input v-model="memberForm.coffeeConsumption" type="text" placeholder="6 koppar svart / rep" class="input input-bordered w-full bg-base-200 input-sm" />
          </div>
        </div>

        <div class="flex items-center gap-3 pt-3 border-t border-primary/20">
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

      <!-- Landing Page Song Count Slider Setting -->
      <div class="stage-card p-5 sm:p-6 rounded-2xl border border-primary/30 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6 bg-base-200/60">
        <div class="space-y-1.5 max-w-xl">
          <div class="flex items-center gap-2">
            <span class="text-xl">🎛️</span>
            <h3 class="font-heading text-lg text-primary font-bold">
              Antal låtar som visas på landningssidan
            </h3>
            <span class="badge badge-primary font-mono font-black text-xs px-2.5 py-1">
              {{ landingSongCountSetting }} st
            </span>
          </div>
          <p class="text-xs text-base-content/75 leading-relaxed">
            Ställ in hur många slumpade singlar som ska visas i låtskatten på startsidan (2 till 10 låtar). Ändringen sparas direkt.
          </p>
        </div>

        <div class="flex flex-col gap-1 w-full md:w-80 flex-shrink-0 pt-3">
          <!-- Floating Live Tooltip Bubble above slider thumb (Only visible when sliding) -->
          <div class="relative w-full h-6 px-10 pointer-events-none">
            <div
              class="absolute bottom-0 -translate-x-1/2 transition-all duration-200 ease-out"
              :class="isSlidingSongs ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-75 translate-y-2'"
              :style="{ left: `calc(2.5rem + ${songSliderPercent} * (100% - 5rem) / 100)` }"
            >
              <div class="bg-primary text-primary-content text-[11px] font-mono font-black px-2.5 py-0.5 rounded-full shadow-2xl flex items-center gap-1 border border-amber-300/60 relative">
                <span>🎵</span>
                <span>{{ landingSongCountSetting }} st</span>
                <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary rotate-45" />
              </div>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <button
              type="button"
              class="btn btn-xs btn-circle btn-primary font-bold shadow"
              :disabled="landingSongCountSetting <= 2"
              title="Minska antal"
              @click="saveLandingSongCountSetting(landingSongCountSetting - 1)"
            >
              −
            </button>
            <span class="text-xs font-mono font-bold text-secondary">2</span>
            <input
              v-model.number="landingSongCountSetting"
              type="range"
              min="2"
              max="10"
              step="1"
              class="range range-primary range-sm flex-grow cursor-pointer"
              @input="isSlidingSongs = true"
              @mousedown="isSlidingSongs = true"
              @touchstart="isSlidingSongs = true"
              @mouseup="showSongTooltipTemporarily()"
              @touchend="showSongTooltipTemporarily()"
              @change="saveLandingSongCountSetting()"
            />
            <span class="text-xs font-mono font-bold text-secondary">10</span>
            <button
              type="button"
              class="btn btn-xs btn-circle btn-primary font-bold shadow"
              :disabled="landingSongCountSetting >= 10"
              title="Öka antal"
              @click="saveLandingSongCountSetting(landingSongCountSetting + 1)"
            >
              +
            </button>
          </div>
        </div>
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
          <!-- Audio File Uploader & Direct Audio URL -->
          <div class="sm:col-span-2 p-4 bg-base-200/60 rounded-xl border border-primary/20 space-y-2">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-bold text-secondary">🎙️ Ljudfil / MP3 (Egen uppladdning)</label>
              <span class="text-[10px] text-base-content/60 font-mono">MP3, WAV, AAC, M4A</span>
            </div>
            <div class="flex items-center gap-2">
              <input
                v-model="songForm.audioUrl"
                type="text"
                placeholder="/media/uploads/min-lat.mp3 eller klistra in URL"
                class="input input-bordered flex-grow bg-base-200 input-sm font-mono text-xs"
              />
              <label class="btn btn-primary btn-sm rounded-lg cursor-pointer whitespace-nowrap" :class="isUploading ? 'loading' : ''">
                <span>📁 Ladda upp ljudfil</span>
                <input
                  type="file"
                  accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg"
                  class="hidden"
                  @change="uploadFile($event, url => songForm.audioUrl = url)"
                />
              </label>
            </div>
            <p class="text-[10px] text-base-content/60">
              Om du laddar upp en egen ljudfil spelas den direkt i webbläsarens jukebox med vinylknaster, helt utan Spotify.
            </p>
            <div v-if="songForm.audioUrl" class="pt-2">
              <audio :src="songForm.audioUrl" controls class="w-full h-8" />
            </div>
          </div>

          <!-- Cover Artwork Image Uploader (Optional) -->
          <div class="sm:col-span-2 p-4 bg-base-200/60 rounded-xl border border-primary/20 space-y-2">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-bold text-secondary">🎨 Eget Skivomslag / Artwork (Valfritt)</label>
              <span class="text-[10px] text-base-content/60 font-mono">PNG, JPG, WebP</span>
            </div>
            <div class="flex items-center gap-2">
              <input
                v-model="songForm.coverImage"
                type="text"
                placeholder="/images/records/mitt-omslag.jpg eller lämna tomt för automatisk vintage-design"
                class="input input-bordered flex-grow bg-base-200 input-sm font-mono text-xs"
              />
              <label class="btn btn-secondary btn-sm rounded-lg cursor-pointer whitespace-nowrap" :class="isUploading ? 'loading' : ''">
                <span>📷 Ladda upp omslag</span>
                <input
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="uploadFile($event, url => songForm.coverImage = url)"
                />
              </label>
            </div>
            <p class="text-[10px] text-base-content/60">
              Lämnas detta tomt skapas automatiskt ett autentiskt 7"-singelomslag med låtens titel & artist i klassisk vinylstil.
            </p>
            <div v-if="songForm.coverImage" class="pt-2 flex items-center gap-3">
              <img :src="songForm.coverImage" alt="Preview" class="w-16 h-16 object-cover rounded-md border border-primary/40 shadow" />
              <button type="button" class="btn btn-ghost btn-xs text-error" @click="songForm.coverImage = ''">Ta bort bild ✕</button>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Plattform / leverantör</label>
            <select v-model="songForm.embedProvider" class="select select-bordered w-full bg-base-200 select-sm">
              <option value="spotify">Spotify</option>
              <option value="bandcamp">Bandcamp</option>
              <option value="youtube">YouTube</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Extern länk / Embed URL (valfritt om ljudfil finns)</label>
            <input v-model="songForm.embedUrl" type="url" placeholder="https://open.spotify.com/track/..." class="input input-bordered w-full bg-base-200 input-sm font-mono text-xs" />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-xs font-bold text-secondary mb-1">Längd (sekunder, valfritt)</label>
            <input v-model="songForm.duration" type="number" placeholder="215" class="input input-bordered w-full bg-base-200 input-sm font-mono text-xs" />
          </div>

          <!-- Låttext (Svenska) -->
          <div class="sm:col-span-2">
            <div class="flex items-center justify-between mb-1">
              <label class="block text-xs font-bold text-secondary">📜 Låttext (svenska)</label>
              <span class="text-[10px] text-base-content/60 font-mono">Använd t.ex. [Vers 1], [Refräng], [Stick]</span>
            </div>
            <textarea
              v-model="songForm.lyrics"
              rows="6"
              placeholder="[Vers 1]&#10;Klockan slår i natten...&#10;&#10;[Refräng]&#10;Det är det sjunde gunget..."
              class="textarea textarea-bordered w-full bg-base-200 text-xs font-mono leading-relaxed"
            />
          </div>

          <!-- Engelsk översättning & Ackord -->
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">🇬🇧 Engelsk låttext / översättning (valfritt)</label>
            <textarea
              v-model="songForm.lyricsEn"
              rows="4"
              placeholder="[Verse 1]&#10;Midnight strikes again...&#10;&#10;[Chorus]&#10;It's the seventh groove..."
              class="textarea textarea-bordered w-full bg-base-200 text-xs font-mono leading-relaxed"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">🎸 Ackord & struktur / tonart (valfritt)</label>
            <textarea
              v-model="songForm.chords"
              rows="4"
              placeholder="Tonart: A-blues (12-takt)&#10;Vers: A7 | D7 | A7 | E7 - D7 - A7&#10;Solo: 24 takter bluesrock"
              class="textarea textarea-bordered w-full bg-base-200 text-xs font-mono leading-relaxed"
            />
          </div>

          <!-- Social Media Cross-Posting Switch -->
          <div class="sm:col-span-2 p-4 bg-base-200/80 rounded-2xl border border-primary/20 space-y-3">
            <div class="flex items-center justify-between gap-4">
              <div class="space-y-0.5">
                <span class="text-xs font-bold text-primary flex items-center gap-1.5">
                  <span>📱</span> Posta automatiskt till Facebook & Instagram
                </span>
                <p class="text-[11px] text-base-content/60">
                  Skapar automatiskt ett låttips på bandets sociala medier när låten sparas.
                </p>
              </div>
              <input
                v-model="songForm.postToSocials"
                type="checkbox"
                class="toggle toggle-primary toggle-sm"
                title="Aktivera / inaktivera automatisk delning till FB & Instagram"
              />
            </div>

            <!-- Live Song Social Preview -->
            <div v-if="songForm.postToSocials" class="p-3.5 bg-black/80 rounded-xl border border-primary/30 space-y-3 mt-2">
              <div class="flex items-center justify-between text-[11px] font-bold text-secondary">
                <span>👁️ Live Förhandsgranskning (Facebook & Instagram)</span>
                <span class="badge badge-xs badge-primary font-mono">Auto-genererat</span>
              </div>

              <!-- Clickable Hashtag Selector Chips -->
              <div class="space-y-1.5 pt-1 border-t border-primary/15">
                <div class="flex items-center justify-between text-[10px] text-base-content/70">
                  <span class="font-bold text-secondary">Välj taggar för detta inlägg:</span>
                  <span>Klicka för att välja/avmarkera</span>
                </div>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="t in availableSongTags"
                    :key="t.id"
                    type="button"
                    class="badge badge-xs sm:badge-sm font-mono cursor-pointer transition-all border"
                    :class="selectedSongTags.includes(t.tag) ? 'badge-primary font-bold shadow' : 'badge-ghost opacity-60 hover:opacity-100'"
                    @click="toggleSongTag(t.tag)"
                  >
                    {{ t.tag }} {{ selectedSongTags.includes(t.tag) ? '✓' : '+' }}
                  </button>
                  <span v-if="availableSongTags.length === 0" class="text-xs text-base-content/50 italic">
                    Inga aktiva låt-taggar. Lägg till i fliken "Sociala taggar".
                  </span>
                </div>
              </div>

              <div class="font-mono text-xs text-base-content/90 whitespace-pre-line leading-relaxed border-l-2 border-primary/40 pl-3">
                {{ songSocialPreview }}
              </div>
            </div>
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
              <!-- TITEL -->
              <th>
                <button
                  type="button"
                  class="group inline-flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-wider transition-all cursor-pointer py-1 px-1.5 rounded"
                  :class="songSortKey === 'title' ? 'text-primary font-black bg-primary/10 border-b-2 border-primary' : 'text-secondary hover:text-primary hover:bg-base-300/60'"
                  @click="toggleSongSort('title')"
                >
                  <span>Titel</span>
                  <span
                    class="tooltip tooltip-bottom inline-flex items-center"
                    :data-tip="songSortKey === 'title' ? (songSortDir === 'asc' ? 'Sorterat A till Ö (Klicka för Ö till A)' : 'Sorterat Ö till A (Klicka för A till Ö)') : 'Klicka för att sortera efter titel'"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      class="transition-transform duration-300"
                      :class="[
                        songSortKey === 'title'
                          ? (songSortDir === 'asc' ? 'rotate-0 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100' : 'rotate-180 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100')
                          : 'opacity-30 group-hover:opacity-80 rotate-0 text-base-content'
                      ]"
                    >
                      <path d="M12 2C6.5 2 3 5.5 3 10C3 16 10 21.5 12 22.5C14 21.5 21 16 21 10C21 5.5 17.5 2 12 2Z" fill="currentColor" />
                    </svg>
                  </span>
                </button>
              </th>

              <!-- TYP -->
              <th>
                <button
                  type="button"
                  class="group inline-flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-wider transition-all cursor-pointer py-1 px-1.5 rounded"
                  :class="songSortKey === 'isOriginal' ? 'text-primary font-black bg-primary/10 border-b-2 border-primary' : 'text-secondary hover:text-primary hover:bg-base-300/60'"
                  @click="toggleSongSort('isOriginal')"
                >
                  <span>Typ</span>
                  <span
                    class="tooltip tooltip-bottom inline-flex items-center"
                    :data-tip="songSortKey === 'isOriginal' ? (songSortDir === 'asc' ? 'Original först (Klicka för Covers först)' : 'Covers först (Klicka för Original först)') : 'Klicka för att sortera efter låttyp'"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      class="transition-transform duration-300"
                      :class="[
                        songSortKey === 'isOriginal'
                          ? (songSortDir === 'asc' ? 'rotate-0 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100' : 'rotate-180 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100')
                          : 'opacity-30 group-hover:opacity-80 rotate-0 text-base-content'
                      ]"
                    >
                      <path d="M12 2C6.5 2 3 5.5 3 10C3 16 10 21.5 12 22.5C14 21.5 21 16 21 10C21 5.5 17.5 2 12 2Z" fill="currentColor" />
                    </svg>
                  </span>
                </button>
              </th>

              <!-- ORIGINALARTIST -->
              <th>
                <button
                  type="button"
                  class="group inline-flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-wider transition-all cursor-pointer py-1 px-1.5 rounded"
                  :class="songSortKey === 'originalArtist' ? 'text-primary font-black bg-primary/10 border-b-2 border-primary' : 'text-secondary hover:text-primary hover:bg-base-300/60'"
                  @click="toggleSongSort('originalArtist')"
                >
                  <span>Originalartist</span>
                  <span
                    class="tooltip tooltip-bottom inline-flex items-center"
                    :data-tip="songSortKey === 'originalArtist' ? (songSortDir === 'asc' ? 'Sorterat A till Ö (Klicka för Ö till A)' : 'Sorterat Ö till A (Klicka för A till Ö)') : 'Klicka för att sortera efter originalartist'"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      class="transition-transform duration-300"
                      :class="[
                        songSortKey === 'originalArtist'
                          ? (songSortDir === 'asc' ? 'rotate-0 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100' : 'rotate-180 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100')
                          : 'opacity-30 group-hover:opacity-80 rotate-0 text-base-content'
                      ]"
                    >
                      <path d="M12 2C6.5 2 3 5.5 3 10C3 16 10 21.5 12 22.5C14 21.5 21 16 21 10C21 5.5 17.5 2 12 2Z" fill="currentColor" />
                    </svg>
                  </span>
                </button>
              </th>

              <!-- PLATTFORM -->
              <th>
                <button
                  type="button"
                  class="group inline-flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-wider transition-all cursor-pointer py-1 px-1.5 rounded"
                  :class="songSortKey === 'embedProvider' ? 'text-primary font-black bg-primary/10 border-b-2 border-primary' : 'text-secondary hover:text-primary hover:bg-base-300/60'"
                  @click="toggleSongSort('embedProvider')"
                >
                  <span>Plattform</span>
                  <span
                    class="tooltip tooltip-bottom inline-flex items-center"
                    :data-tip="songSortKey === 'embedProvider' ? (songSortDir === 'asc' ? 'Sorterat A till Ö (Klicka för Ö till A)' : 'Sorterat Ö till A (Klicka för A till Ö)') : 'Klicka för att sortera efter plattform'"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      class="transition-transform duration-300"
                      :class="[
                        songSortKey === 'embedProvider'
                          ? (songSortDir === 'asc' ? 'rotate-0 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100' : 'rotate-180 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100')
                          : 'opacity-30 group-hover:opacity-80 rotate-0 text-base-content'
                      ]"
                    >
                      <path d="M12 2C6.5 2 3 5.5 3 10C3 16 10 21.5 12 22.5C14 21.5 21 16 21 10C21 5.5 17.5 2 12 2Z" fill="currentColor" />
                    </svg>
                  </span>
                </button>
              </th>

              <!-- LIVE-SPELNINGAR -->
              <th class="text-center">
                <button
                  type="button"
                  class="group inline-flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-wider transition-all cursor-pointer py-1 px-1.5 rounded mx-auto"
                  :class="songSortKey === 'playCount' ? 'text-primary font-black bg-primary/10 border-b-2 border-primary' : 'text-secondary hover:text-primary hover:bg-base-300/60'"
                  @click="toggleSongSort('playCount')"
                >
                  <span>Live-spelningar</span>
                  <span
                    class="tooltip tooltip-bottom inline-flex items-center"
                    :data-tip="songSortKey === 'playCount' ? (songSortDir === 'desc' ? 'Flest spelningar först ⚡ (Klicka för minst)' : 'Minst spelningar först (Klicka för flest)') : 'Klicka för att sortera efter antal live-spelningar'"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      class="transition-transform duration-300"
                      :class="[
                        songSortKey === 'playCount'
                          ? (songSortDir === 'desc' ? 'rotate-180 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100' : 'rotate-0 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100')
                          : 'opacity-30 group-hover:opacity-80 rotate-0 text-base-content'
                      ]"
                    >
                      <path d="M12 2C6.5 2 3 5.5 3 10C3 16 10 21.5 12 22.5C14 21.5 21 16 21 10C21 5.5 17.5 2 12 2Z" fill="currentColor" />
                    </svg>
                  </span>
                </button>
              </th>

              <th class="text-right">Åtgärd</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="song in sortedSongs" :key="song.id">
              <td class="font-bold text-primary">{{ song.title }}</td>
              <td>
                <span class="badge badge-xs font-bold uppercase text-[9px]" :class="song.isOriginal ? 'badge-primary' : 'badge-secondary'">
                  {{ song.isOriginal ? 'Original' : 'Cover' }}
                </span>
              </td>
              <td>{{ song.isOriginal ? '—' : song.originalArtist }}</td>
              <td class="font-mono capitalize text-[10px]">{{ song.embedProvider }}</td>
              <td class="text-center">
                <button
                  type="button"
                  class="btn btn-xs rounded-full font-mono text-[10px] gap-1 transition-all cursor-pointer"
                  :class="getSongPlayCount(song) > 0 ? 'btn-primary font-bold shadow' : 'btn-ghost opacity-60 hover:opacity-100'"
                  title="Klicka för att se vilka gig låten har spelats på"
                  @click="openSongStats(song)"
                >
                  <span>🎸</span>
                  <span>{{ getSongPlayCount(song) }} ggr</span>
                </button>
              </td>
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

    <!-- 3.5. SETLIST & REPERTOIRE MANAGER -->
    <div v-if="activeTab === 'setlist'" class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="font-heading text-2xl text-primary font-bold">Hantera live setlist & repertoar (på musiksidan)</h2>
          <p class="text-xs text-base-content/70">Organisera bandets aktiva liverepertoar uppdelad i set och extranummer som visas för fansen på musiksidan (<NuxtLink to="/music" target="_blank" class="text-secondary underline hover:text-primary font-mono">/music</NuxtLink>).</p>
        </div>
        <button type="button" class="btn btn-primary btn-sm rounded-full font-bold px-5" @click="openAddSetlist">
          + Ny låt i setlistan
        </button>
      </div>

      <!-- Add/Edit Setlist Item Modal Form -->
      <div v-if="editingSetlist" class="stage-card p-6 sm:p-8 rounded-2xl border border-primary/40 space-y-4 shadow-2xl">
        <h3 class="font-heading text-xl text-primary font-bold">
          {{ editingSetlist === 'new' ? 'Lägg till låt i setlistan' : 'Redigera låt i setlistan' }}
        </h3>
        <div class="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Låttitel *</label>
            <input v-model="setlistForm.title" type="text" placeholder="T.ex. Hoochie Coochie Man" class="input input-bordered w-full bg-base-200 input-sm" />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Set / Avdelning *</label>
            <select v-model="setlistForm.setName" class="select select-bordered w-full bg-base-200 select-sm">
              <option value="Set 1: Klubbstart">Set 1: Klubbstart</option>
              <option value="Set 2: Svettigt ös">Set 2: Svettigt ös</option>
              <option value="Extranummer / Encores">Extranummer / Encores</option>
              <option value="Reservlåtar / Akustiskt">Reservlåtar / Akustiskt</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Låttyp</label>
            <select v-model="setlistForm.isOriginal" class="select select-bordered w-full bg-base-200 select-sm">
              <option :value="false">Cover / Tolkning</option>
              <option :value="true">Egen låt (Det 7:e Gunget)</option>
            </select>
          </div>
          <div v-if="!setlistForm.isOriginal">
            <label class="block text-xs font-bold text-secondary mb-1">Originalartist</label>
            <input v-model="setlistForm.artist" type="text" placeholder="T.ex. Muddy Waters" class="input input-bordered w-full bg-base-200 input-sm" />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-xs font-bold text-secondary mb-1">Live-notering / Cue (valfritt)</label>
            <input v-model="setlistForm.notes" type="text" placeholder="T.ex. Munspelssolo i D, publikallsång, tempoökning" class="input input-bordered w-full bg-base-200 input-sm" />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Sorteringsordning</label>
            <input v-model="setlistForm.sortOrder" type="number" class="input input-bordered w-full bg-base-200 input-sm font-mono text-xs" />
          </div>
        </div>

        <div class="flex items-center gap-3 pt-3">
          <button type="button" class="btn btn-primary btn-sm rounded-full font-bold px-6" @click="saveSetlistItem">
            Spara i setlistan
          </button>
          <button type="button" class="btn btn-ghost btn-sm rounded-full" @click="editingSetlist = null">
            Avbryt
          </button>
        </div>
      </div>

      <!-- Setlist Table -->
      <div class="overflow-x-auto rounded-2xl border border-primary/20 stage-card">
        <table class="table table-zebra w-full text-xs">
          <thead>
            <tr class="text-secondary font-bold uppercase text-[10px] tracking-wider border-b border-primary/20">
              <!-- ORDNING -->
              <th>
                <button
                  type="button"
                  class="group inline-flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-wider transition-all cursor-pointer py-1 px-1.5 rounded"
                  :class="setlistSortKey === 'sortOrder' ? 'text-primary font-black bg-primary/10 border-b-2 border-primary' : 'text-secondary hover:text-primary hover:bg-base-300/60'"
                  @click="toggleSetlistSort('sortOrder')"
                >
                  <span>Ordning</span>
                  <span
                    class="tooltip tooltip-bottom inline-flex items-center"
                    :data-tip="setlistSortKey === 'sortOrder' ? (setlistSortDir === 'asc' ? 'Sorterat 1 till N (Klicka för fallande)' : 'Sorterat N till 1 (Klicka för stigande)') : 'Klicka för att sortera efter spelordning'"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      class="transition-transform duration-300"
                      :class="[
                        setlistSortKey === 'sortOrder'
                          ? (setlistSortDir === 'asc' ? 'rotate-0 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100' : 'rotate-180 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100')
                          : 'opacity-30 group-hover:opacity-80 rotate-0 text-base-content'
                      ]"
                    >
                      <path d="M12 2C6.5 2 3 5.5 3 10C3 16 10 21.5 12 22.5C14 21.5 21 16 21 10C21 5.5 17.5 2 12 2Z" fill="currentColor" />
                    </svg>
                  </span>
                </button>
              </th>

              <!-- TITEL -->
              <th>
                <button
                  type="button"
                  class="group inline-flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-wider transition-all cursor-pointer py-1 px-1.5 rounded"
                  :class="setlistSortKey === 'title' ? 'text-primary font-black bg-primary/10 border-b-2 border-primary' : 'text-secondary hover:text-primary hover:bg-base-300/60'"
                  @click="toggleSetlistSort('title')"
                >
                  <span>Titel</span>
                  <span
                    class="tooltip tooltip-bottom inline-flex items-center"
                    :data-tip="setlistSortKey === 'title' ? (setlistSortDir === 'asc' ? 'Sorterat A till Ö (Klicka för Ö till A)' : 'Sorterat Ö till A (Klicka för A till Ö)') : 'Klicka för att sortera efter låttitel'"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      class="transition-transform duration-300"
                      :class="[
                        setlistSortKey === 'title'
                          ? (setlistSortDir === 'asc' ? 'rotate-0 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100' : 'rotate-180 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100')
                          : 'opacity-30 group-hover:opacity-80 rotate-0 text-base-content'
                      ]"
                    >
                      <path d="M12 2C6.5 2 3 5.5 3 10C3 16 10 21.5 12 22.5C14 21.5 21 16 21 10C21 5.5 17.5 2 12 2Z" fill="currentColor" />
                    </svg>
                  </span>
                </button>
              </th>

              <!-- SET / AVDELNING -->
              <th>
                <button
                  type="button"
                  class="group inline-flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-wider transition-all cursor-pointer py-1 px-1.5 rounded"
                  :class="setlistSortKey === 'setName' ? 'text-primary font-black bg-primary/10 border-b-2 border-primary' : 'text-secondary hover:text-primary hover:bg-base-300/60'"
                  @click="toggleSetlistSort('setName')"
                >
                  <span>Set / Avdelning</span>
                  <span
                    class="tooltip tooltip-bottom inline-flex items-center"
                    :data-tip="setlistSortKey === 'setName' ? (setlistSortDir === 'asc' ? 'Sorterat Set 1 till Extranummer (Klicka för omvänd)' : 'Sorterat Extranummer till Set 1 (Klicka för omvänd)') : 'Klicka för att sortera efter set'"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      class="transition-transform duration-300"
                      :class="[
                        setlistSortKey === 'setName'
                          ? (setlistSortDir === 'asc' ? 'rotate-0 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100' : 'rotate-180 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100')
                          : 'opacity-30 group-hover:opacity-80 rotate-0 text-base-content'
                      ]"
                    >
                      <path d="M12 2C6.5 2 3 5.5 3 10C3 16 10 21.5 12 22.5C14 21.5 21 16 21 10C21 5.5 17.5 2 12 2Z" fill="currentColor" />
                    </svg>
                  </span>
                </button>
              </th>

              <!-- ARTIST / TYP -->
              <th>
                <button
                  type="button"
                  class="group inline-flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-wider transition-all cursor-pointer py-1 px-1.5 rounded"
                  :class="setlistSortKey === 'isOriginal' ? 'text-primary font-black bg-primary/10 border-b-2 border-primary' : 'text-secondary hover:text-primary hover:bg-base-300/60'"
                  @click="toggleSetlistSort('isOriginal')"
                >
                  <span>Artist / Typ</span>
                  <span
                    class="tooltip tooltip-bottom inline-flex items-center"
                    :data-tip="setlistSortKey === 'isOriginal' ? (setlistSortDir === 'asc' ? 'Egna låtar först (Klicka för Covers först)' : 'Covers först (Klicka för Egna låtar först)') : 'Klicka för att sortera efter låttyp'"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      class="transition-transform duration-300"
                      :class="[
                        setlistSortKey === 'isOriginal'
                          ? (setlistSortDir === 'asc' ? 'rotate-0 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100' : 'rotate-180 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100')
                          : 'opacity-30 group-hover:opacity-80 rotate-0 text-base-content'
                      ]"
                    >
                      <path d="M12 2C6.5 2 3 5.5 3 10C3 16 10 21.5 12 22.5C14 21.5 21 16 21 10C21 5.5 17.5 2 12 2Z" fill="currentColor" />
                    </svg>
                  </span>
                </button>
              </th>

              <!-- LIVE-SPELNINGAR -->
              <th class="text-center">
                <button
                  type="button"
                  class="group inline-flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-wider transition-all cursor-pointer py-1 px-1.5 rounded mx-auto"
                  :class="setlistSortKey === 'playCount' ? 'text-primary font-black bg-primary/10 border-b-2 border-primary' : 'text-secondary hover:text-primary hover:bg-base-300/60'"
                  @click="toggleSetlistSort('playCount')"
                >
                  <span>Live-spelningar</span>
                  <span
                    class="tooltip tooltip-bottom inline-flex items-center"
                    :data-tip="setlistSortKey === 'playCount' ? (setlistSortDir === 'desc' ? 'Flest spelningar först ⚡ (Klicka för minst)' : 'Minst spelningar först (Klicka för flest)') : 'Klicka för att sortera efter live-spelningar'"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      class="transition-transform duration-300"
                      :class="[
                        setlistSortKey === 'playCount'
                          ? (setlistSortDir === 'desc' ? 'rotate-180 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100' : 'rotate-0 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100')
                          : 'opacity-30 group-hover:opacity-80 rotate-0 text-base-content'
                      ]"
                    >
                      <path d="M12 2C6.5 2 3 5.5 3 10C3 16 10 21.5 12 22.5C14 21.5 21 16 21 10C21 5.5 17.5 2 12 2Z" fill="currentColor" />
                    </svg>
                  </span>
                </button>
              </th>

              <th>Live-notering</th>
              <th class="text-right">Åtgärd</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in sortedSetlist" :key="item.id">
              <td class="font-mono text-center font-bold text-secondary w-12">{{ item.sortOrder }}</td>
              <td class="font-bold text-primary">{{ item.title }}</td>
              <td>
                <span class="badge badge-sm font-mono font-bold text-[10px]" :class="item.setName.includes('Extranummer') ? 'badge-accent' : 'badge-ghost'">
                  {{ item.setName }}
                </span>
              </td>
              <td>
                <span v-if="item.isOriginal" class="badge badge-xs badge-primary font-bold">Egen</span>
                <span v-else class="text-base-content/80">{{ item.artist || 'Cover' }}</span>
              </td>
              <td class="text-center">
                <button
                  type="button"
                  class="btn btn-xs rounded-full font-mono text-[10px] gap-1 transition-all cursor-pointer"
                  :class="getSongPlayCount(item) > 0 ? 'btn-primary font-bold shadow' : 'btn-ghost opacity-60 hover:opacity-100'"
                  title="Klicka för att se vilka gig låten har spelats på"
                  @click="openSongStats(item)"
                >
                  <span>🎸</span>
                  <span>{{ getSongPlayCount(item) }} ggr</span>
                </button>
              </td>
              <td class="italic text-base-content/60">{{ item.notes || '—' }}</td>
              <td class="text-right space-x-2">
                <button type="button" class="btn btn-xs btn-outline btn-primary rounded" @click="openEditSetlist(item)">
                  Redigera
                </button>
                <button type="button" class="btn btn-xs btn-outline btn-error rounded" @click="deleteSetlistItem(item.id)">
                  Ta bort
                </button>
              </td>
            </tr>
            <tr v-if="!setlistData || setlistData.length === 0">
              <td colspan="7" class="text-center py-6 text-base-content/50">
                Inga låtar i setlistan ännu. Klicka på "+ Ny låt i setlistan" ovan för att lägga till!
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
      <div v-if="editingGal" class="stage-card p-6 sm:p-8 rounded-2xl border border-primary/40 space-y-5 shadow-2xl">
        <h3 class="font-heading text-xl text-primary font-bold">
          {{ editingGal === 'new' ? 'Lägg till ny bild' : 'Redigera bild' }}
        </h3>
        <div class="grid sm:grid-cols-2 gap-4 text-sm">
          <!-- Image File Uploader & URL Input -->
          <div class="sm:col-span-2 flex flex-col sm:flex-row items-center gap-6 p-4 bg-base-200/60 rounded-xl border border-primary/20">
            <div
              v-if="galForm.mediaUrl"
              class="w-32 flex-shrink-0"
            >
              <FramedPhoto
                :media-url="galForm.mediaUrl"
                :frame-style="galForm.frameStyle || 'random'"
                :rotation="galForm.rotation || 0"
                pin-color="gold"
              />
            </div>
            <div class="flex-grow space-y-2 w-full">
              <label class="block text-xs font-bold text-secondary">Bildfil / Media URL *</label>
              <div class="flex items-center gap-2">
                <input v-model="galForm.mediaUrl" type="text" placeholder="/media/band/bild.jpg" class="input input-bordered flex-grow bg-base-200 input-sm font-mono text-xs" />
                <label class="btn btn-outline btn-primary btn-sm rounded-lg cursor-pointer whitespace-nowrap" :class="isUploading ? 'loading' : ''">
                  <span>📁 Ladda upp</span>
                  <input type="file" accept="image/*" class="hidden" @change="uploadFile($event, url => galForm.mediaUrl = url)" />
                </label>
              </div>
              <p class="text-[10px] text-base-content/60">Välj en bildfil från datorn eller klistra in en bildlänk.</p>
            </div>
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
              <option value="random">🎲 Slumpad ramstil (Auto-variation)</option>
              <option value="pinned">📌 Nålat (3D Kartnål / Pushpin)</option>
              <option value="polaroid">📷 Vintage Polaroid (med tejp)</option>
              <option value="taped">🏷️ Scenprint (mörk med tejpade hörn)</option>
              <option value="grunge">🎞️ Sliten mörkrumskant (grunge)</option>
              <option value="wood">🖼️ Klassisk trä- & mässingsram</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Lutning / rotation (-3° till 3°)</label>
            <input v-model.number="galForm.rotation" type="number" min="-5" max="5" class="input input-bordered w-full bg-base-200 input-sm font-mono" />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Bildtext (svenska)</label>
            <input v-model="galForm.captionSv" type="text" placeholder="Hela gänget samlat inför sommarsäsongen..." class="input input-bordered w-full bg-base-200 input-sm" />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Bildtext (engelska / English)</label>
            <input v-model="galForm.captionEn" type="text" placeholder="The whole band gathered before the summer season..." class="input input-bordered w-full bg-base-200 input-sm" />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Alt-text (svenska / tillgänglighet)</label>
            <input v-model="galForm.altTextSv" type="text" placeholder="Det 7:e Gunget live på scen" class="input input-bordered w-full bg-base-200 input-sm" />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Alt-text (engelska / accessibility)</label>
            <input v-model="galForm.altTextEn" type="text" placeholder="Det 7:e Gunget performing live on stage" class="input input-bordered w-full bg-base-200 input-sm" />
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
            <div class="pt-2 pb-1">
              <FramedPhoto
                :media-url="item.mediaUrl"
                :caption-sv="item.captionSv"
                :caption-en="item.captionEn"
                :frame-style="item.frameStyle || 'random'"
                :rotation="item.rotation || 0"
                pin-color="random"
                class="mb-3"
              />
            </div>
            <div class="flex items-center justify-between gap-2 mb-2">
              <span class="badge badge-xs font-mono font-bold uppercase text-[9px]">
                {{ item.category }}
              </span>
              <span class="text-[10px] font-mono text-secondary">
                Ram: {{ item.frameStyle || 'random' }}
              </span>
            </div>
            <p class="text-xs text-base-content/80 italic line-clamp-2">
              {{ item.captionSv || 'Ingen bildtext' }}
            </p>
          </div>

          <div class="pt-3 border-t border-base-content/10 flex items-center justify-between gap-2 mt-4">
            <!-- Quick Frame Style Selector Dropdown (Left side) -->
            <div class="flex items-center gap-1.5 flex-grow max-w-[150px]">
              <select
                :value="item.frameStyle || 'random'"
                class="select select-bordered select-xs w-full bg-base-200 text-[11px] font-sans border-primary/40 focus:border-primary rounded-lg cursor-pointer font-bold"
                title="Ändra fastsättning / ramstil direkt"
                @change="quickChangeFrameStyle(item, ($event.target as HTMLSelectElement).value)"
              >
                <option value="random">🎲 Slumpad</option>
                <option value="pinned">📌 Nålat</option>
                <option value="polaroid">📷 Polaroid</option>
                <option value="taped">🏷️ Tejpat</option>
                <option value="grunge">🎞️ Grunge</option>
                <option value="wood">🖼️ Träram</option>
              </select>
            </div>

            <!-- Action buttons (Right side) -->
            <div class="flex items-center gap-2 flex-shrink-0">
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
    </div>

    <!-- 4.5. MERCH & SPREADSHOP MANAGER -->
    <div v-if="activeTab === 'merch'" class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="font-heading text-2xl text-primary font-bold">Band-merch & Spreadshop-synk</h2>
          <p class="text-xs text-base-content/70">
            Artiklar cachas säkert i databasen för blixtsnabb visning och synkas automatiskt 2 ggr/dygn via Vercel Cron.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <a
            href="https://det-7e-gunget.myspreadshop.se/"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-outline btn-primary btn-sm rounded-full font-bold flex items-center gap-1.5"
          >
            <span>Öppna Spreadshop</span>
            <span>↗</span>
          </a>
        </div>
      </div>

      <!-- 1. Landing Page Merch Count Slider Setting -->
      <div class="stage-card p-5 sm:p-6 rounded-2xl border border-primary/30 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6 bg-base-200/60">
        <div class="space-y-1.5 max-w-xl">
          <div class="flex items-center gap-2">
            <span class="text-xl">🎛️</span>
            <h3 class="font-heading text-lg text-primary font-bold">
              Antal merch-artiklar som visas på landningssidan
            </h3>
            <span class="badge badge-primary font-mono font-black text-xs px-2.5 py-1">
              {{ landingMerchCountSetting }} st
            </span>
          </div>
          <p class="text-xs text-base-content/75 leading-relaxed">
            Ställ in hur många slumpade artiklar ur sortimentet som ska visas i merch-sektionen på förstasidan (2 till 8 artiklar). Ändringen sparas direkt.
          </p>
        </div>

        <div class="flex flex-col gap-1 w-full md:w-80 flex-shrink-0 pt-3">
          <!-- Floating Live Tooltip Bubble above slider thumb (Only visible when sliding) -->
          <div class="relative w-full h-6 px-10 pointer-events-none">
            <div
              class="absolute bottom-0 -translate-x-1/2 transition-all duration-200 ease-out"
              :class="isSlidingMerch ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-75 translate-y-2'"
              :style="{ left: `calc(2.5rem + ${merchSliderPercent} * (100% - 5rem) / 100)` }"
            >
              <div class="bg-primary text-primary-content text-[11px] font-mono font-black px-2.5 py-0.5 rounded-full shadow-2xl flex items-center gap-1 border border-amber-300/60 relative">
                <span>👕</span>
                <span>{{ landingMerchCountSetting }} st</span>
                <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary rotate-45" />
              </div>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <button
              type="button"
              class="btn btn-xs btn-circle btn-primary font-bold shadow"
              :disabled="landingMerchCountSetting <= 2"
              title="Minska antal"
              @click="saveLandingMerchCountSetting(landingMerchCountSetting - 1)"
            >
              −
            </button>
            <span class="text-xs font-mono font-bold text-secondary">2</span>
            <input
              v-model.number="landingMerchCountSetting"
              type="range"
              min="2"
              max="8"
              step="1"
              class="range range-primary range-sm flex-grow cursor-pointer"
              @input="isSlidingMerch = true"
              @mousedown="isSlidingMerch = true"
              @touchstart="isSlidingMerch = true"
              @mouseup="showMerchTooltipTemporarily()"
              @touchend="showMerchTooltipTemporarily()"
              @change="saveLandingMerchCountSetting()"
            />
            <span class="text-xs font-mono font-bold text-secondary">8</span>
            <button
              type="button"
              class="btn btn-xs btn-circle btn-primary font-bold shadow"
              :disabled="landingMerchCountSetting >= 8"
              title="Öka antal"
              @click="saveLandingMerchCountSetting(landingMerchCountSetting + 1)"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <!-- 2. Sync Card with Status and Manual Trigger -->
      <div class="stage-card p-5 sm:p-6 rounded-2xl border border-primary/30 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6 bg-base-200/60">
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <span class="text-xl">🔄</span>
            <h3 class="font-heading text-lg text-primary font-bold">
              Spreadshop Databassynkronisering
            </h3>
          </div>
          <p class="text-xs text-base-content/75 leading-relaxed max-w-xl">
            Hämtar alla artiklar och deras namn på svenska och engelska direkt från Spreadshops katalog till databasen.
          </p>
          <div class="flex flex-wrap items-center gap-3 text-xs font-mono pt-1">
            <span class="badge badge-sm badge-neutral border border-primary/30">
              🕒 Senast synkad: {{ formatSyncTimestamp((adminSettings as any)?.lastMerchSync) }}
            </span>
            <span class="badge badge-sm badge-neutral border border-primary/30">
              📦 Totalt i databasen: {{ merchData?.length || 0 }} st
            </span>
            <span class="badge badge-sm badge-primary/20 text-primary font-bold">
              ⚡ Schemalagd: 2 ggr/dygn (Vercel Cron)
            </span>
          </div>
        </div>

        <button
          type="button"
          class="btn btn-primary rounded-full font-bold px-6 flex items-center gap-2 shadow-md hover:scale-105 transition-transform flex-shrink-0"
          :class="isSyncingMerch ? 'loading' : ''"
          :disabled="isSyncingMerch"
          @click="triggerMerchSync"
        >
          <span v-if="!isSyncingMerch">🔄</span>
          <span>{{ isSyncingMerch ? 'Synkar från butiken...' : 'Synka Merch Nu' }}</span>
        </button>
      </div>

      <!-- 3. Merch Products Catalog Grid in Database -->
      <div>
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-heading text-lg text-primary font-bold">
            Synkade artiklar i databasen ({{ merchData?.length || 0 }})
          </h3>
          <span class="text-xs text-base-content/60 font-mono">
            Klick öppnar produkten i Spreadshop
          </span>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div
            v-for="item in merchData || []"
            :key="item.id"
            class="stage-card p-3 rounded-xl border border-primary/20 flex flex-col justify-between group hover:border-primary/50 transition-all shadow"
          >
            <div>
              <div class="aspect-square bg-black/40 rounded-lg overflow-hidden flex items-center justify-center p-2 mb-2">
                <NuxtImg
                  :src="item.image"
                  :alt="item.typeSv"
                  class="w-full h-full object-contain group-hover:scale-105 transition-transform"
                  loading="lazy"
                />
              </div>
              <div class="space-y-1.5 mt-1">
                <!-- Category badge -->
                <div v-if="item.categorySv" class="flex items-center gap-1">
                  <span class="badge badge-xs badge-outline border-secondary/40 text-secondary font-mono text-[9px] font-bold px-1.5 py-0.5">
                    📁 {{ item.categorySv }}
                  </span>
                </div>

                <div class="flex items-start gap-1.5">
                  <span class="badge badge-xs badge-primary font-mono text-[9px] font-black px-1.5 py-0.5 mt-0.5 flex-shrink-0">SV</span>
                  <span class="font-heading text-xs text-primary font-bold line-clamp-2 leading-snug" :title="item.typeSv">
                    {{ item.typeSv }}
                  </span>
                </div>
                <div class="flex items-start gap-1.5">
                  <span class="badge badge-xs badge-neutral border border-primary/30 font-mono text-[9px] font-bold px-1.5 py-0.5 mt-0.5 flex-shrink-0 text-secondary">EN</span>
                  <span class="text-[10px] text-base-content/75 line-clamp-2 leading-snug" :title="item.typeEn">
                    {{ item.typeEn }}
                  </span>
                </div>
              </div>
            </div>

            <div class="pt-2 mt-2 border-t border-primary/10 flex items-center justify-between gap-1">
              <span class="font-mono text-xs font-bold text-amber-300">{{ item.price }}</span>
              <a
                :href="item.url"
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-ghost btn-xs text-primary hover:text-amber-300 px-1.5 font-mono text-[10px]"
                title="Öppna produkt i Spreadshop"
              >
                Öppna ↗
              </a>
            </div>
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
          <div class="sm:col-span-2">
            <label class="block text-xs font-bold text-secondary mb-1">Avatar / Profilbild (valfritt)</label>
            <div class="flex items-center gap-2">
              <input v-model="newAdminForm.avatarUrl" type="text" placeholder="/media/band/avatar.jpg" class="input input-bordered flex-grow bg-base-200 input-sm font-mono text-xs" />
              <label class="btn btn-outline btn-primary btn-sm rounded-lg cursor-pointer whitespace-nowrap" :class="isUploading ? 'loading' : ''">
                <span>📁 Ladda upp</span>
                <input type="file" accept="image/*" class="hidden" @change="uploadFile($event, url => newAdminForm.avatarUrl = url)" />
              </label>
            </div>
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

    <!-- 7. NEWSLETTER SUBSCRIBERS & SETTING -->
    <div v-if="activeTab === 'subscribers'" class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="font-heading text-2xl text-primary font-bold">Nyhetsbrev & Prenumerationer</h2>
          <p class="text-xs text-base-content/70">Hantera prenumeranter och kontrollera om nyhetsbrevet ska visas för besökare.</p>
        </div>
        <div class="flex items-center gap-3">
          <button type="button" class="btn btn-outline btn-primary btn-sm rounded-full" @click="() => refreshSubscribers()">
            🔄 Uppdatera
          </button>
        </div>
      </div>

      <!-- MASTER SETTING: Enable/Pause Newsletter on Site -->
      <div class="p-6 rounded-2xl border stage-card shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
        :class="newsletterEnabledSetting ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-amber-500/40 bg-amber-950/20'"
      >
        <div class="space-y-1.5 max-w-2xl">
          <div class="flex items-center gap-2">
            <span class="text-lg">{{ newsletterEnabledSetting ? '🟢' : '⏸️' }}</span>
            <span class="font-heading text-lg font-bold text-primary">
              {{ newsletterEnabledSetting ? 'Nyhetsbrev & prenumerationer: AKTIVERAD' : 'Nyhetsbrev & prenumerationer: PAUSAD' }}
            </span>
            <span
              class="badge badge-xs font-mono font-bold uppercase"
              :class="newsletterEnabledSetting ? 'badge-success' : 'badge-warning'"
            >
              {{ newsletterEnabledSetting ? 'Synlig på sajten' : 'Dold på sajten' }}
            </span>
          </div>
          <p class="text-xs text-base-content/80 leading-relaxed">
            {{
              newsletterEnabledSetting
                ? 'Prenumerationsformuläret är synligt i sidfoten och fans kan anmäla sin e-postadress.'
                : 'Formuläret är dolt i sidfoten (visar istället bandets liveinfo och snabblänkar). Befintliga prenumeranter och all funktionalitet finns säkert sparad i systemet och kan aktiveras när som helst med ett klick.'
            }}
          </p>
        </div>

        <button
          type="button"
          class="btn btn-sm rounded-full font-bold px-6 shadow-md transition-all flex items-center gap-2 cursor-pointer flex-shrink-0"
          :class="newsletterEnabledSetting ? 'btn-warning' : 'btn-success'"
          :disabled="isSavingSettings"
          @click="toggleNewsletterSetting"
        >
          <span>{{ newsletterEnabledSetting ? '⏸ Pausa formulär på sajten' : '▶ Aktivera formulär på sajten' }}</span>
        </button>
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

    <!-- 8. SOCIAL HASHTAGS MANAGER -->
    <div v-if="activeTab === 'hashtags'" class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="font-heading text-2xl text-primary font-bold">Sociala taggar & hashtags</h2>
          <p class="text-xs text-base-content/70">
            Hantera standardtaggar för automatiska inlägg på Facebook och Instagram. En tagg kan tillhöra flera kategorier samtidigt!
          </p>
        </div>
        <div class="flex items-center gap-3">
          <button type="button" class="btn btn-outline btn-primary btn-sm rounded-full" @click="() => refreshHashtags()">
            🔄 Uppdatera
          </button>
        </div>
      </div>

      <!-- Add / Edit Tag Form Card -->
      <div id="hashtag-editor" class="stage-card p-6 rounded-2xl border border-primary/30 shadow-xl space-y-4">
        <div class="flex items-center justify-between border-b border-primary/20 pb-3">
          <h3 class="font-heading text-lg text-primary font-bold flex items-center gap-2">
            <span>{{ editingHashtagId ? '✏️ Redigera hashtag' : '+ Lägg till ny hashtag' }}</span>
            <span v-if="editingHashtagId" class="badge badge-sm badge-secondary font-mono">Redigerar</span>
          </h3>
          <button
            v-if="editingHashtagId"
            type="button"
            class="btn btn-ghost btn-xs text-base-content/70 hover:text-primary rounded-full"
            @click="resetHashtagForm"
          >
            Avbryt redigering ✕
          </button>
        </div>

        <form class="space-y-4" @submit.prevent="saveHashtag">
          <div class="grid sm:grid-cols-12 gap-4 items-start">
            <!-- Tag Name Input -->
            <div class="sm:col-span-5 space-y-1.5">
              <label class="label-text text-xs font-bold text-secondary">Hashtag / Taggnamn</label>
              <input
                v-model="hashtagForm.tag"
                type="text"
                required
                placeholder="#BluesRock, #LiveIkväll..."
                class="input input-bordered input-sm w-full bg-base-200 text-xs font-mono font-bold"
              />
              <span class="text-[10px] text-base-content/60 block">Prefixet # läggs till automatiskt om det saknas.</span>
            </div>

            <!-- Multi-Category Selector -->
            <div class="sm:col-span-7 space-y-1.5">
              <label class="label-text text-xs font-bold text-secondary">
                Tilldela kategorier (välj en eller flera):
              </label>
              <div class="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  class="badge badge-sm font-mono cursor-pointer transition-all border py-3 px-3.5"
                  :class="hashtagForm.isAll ? 'badge-primary font-bold shadow' : 'badge-ghost opacity-70 hover:opacity-100'"
                  @click="toggleFormCategory('all')"
                >
                  🌐 Alla inlägg (Allmänt) {{ hashtagForm.isAll ? '✓' : '+' }}
                </button>
                <button
                  type="button"
                  class="badge badge-sm font-mono cursor-pointer transition-all border py-3 px-3"
                  :class="hashtagForm.categories.includes('gig') ? 'badge-primary font-bold shadow' : 'badge-ghost opacity-70 hover:opacity-100'"
                  @click="toggleFormCategory('gig')"
                >
                  📅 Spelningar {{ hashtagForm.categories.includes('gig') ? '✓' : '+' }}
                </button>
                <button
                  type="button"
                  class="badge badge-sm font-mono cursor-pointer transition-all border py-3 px-3"
                  :class="hashtagForm.categories.includes('song') ? 'badge-secondary font-bold shadow' : 'badge-ghost opacity-70 hover:opacity-100'"
                  @click="toggleFormCategory('song')"
                >
                  🎵 Låtar {{ hashtagForm.categories.includes('song') ? '✓' : '+' }}
                </button>
                <button
                  type="button"
                  class="badge badge-sm font-mono cursor-pointer transition-all border py-3 px-3"
                  :class="hashtagForm.categories.includes('news') ? 'badge-accent font-bold shadow' : 'badge-ghost opacity-70 hover:opacity-100'"
                  @click="toggleFormCategory('news')"
                >
                  📢 Nyheter {{ hashtagForm.categories.includes('news') ? '✓' : '+' }}
                </button>
                <button
                  type="button"
                  class="badge badge-sm font-mono cursor-pointer transition-all border py-3 px-3"
                  :class="hashtagForm.categories.includes('photo') ? 'badge-info font-bold shadow' : 'badge-ghost opacity-70 hover:opacity-100'"
                  @click="toggleFormCategory('photo')"
                >
                  📷 Foton {{ hashtagForm.categories.includes('photo') ? '✓' : '+' }}
                </button>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-3 pt-2">
            <button type="submit" class="btn btn-primary btn-sm rounded-xl font-bold px-6 shadow">
              {{ editingHashtagId ? 'Spara ändringar' : '+ Lägg till tagg' }}
            </button>
            <button
              v-if="editingHashtagId"
              type="button"
              class="btn btn-ghost btn-sm rounded-xl"
              @click="resetHashtagForm"
            >
              Avbryt
            </button>
          </div>
        </form>
      </div>

      <!-- Category Filter Pills -->
      <div class="flex flex-wrap gap-2 text-xs font-bold">
        <button
          type="button"
          class="px-4 py-1.5 rounded-full transition-all"
          :class="activeTagTabFilter === 'all' ? 'bg-secondary text-secondary-content font-black shadow' : 'bg-base-200 text-base-content/70 hover:text-primary'"
          @click="activeTagTabFilter = 'all'"
        >
          Alla taggar ({{ allHashtags.length }})
        </button>
        <button
          type="button"
          class="px-4 py-1.5 rounded-full transition-all"
          :class="activeTagTabFilter === 'gig' ? 'bg-secondary text-secondary-content font-black shadow' : 'bg-base-200 text-base-content/70 hover:text-primary'"
          @click="activeTagTabFilter = 'gig'"
        >
          📅 Spelningar ({{ allHashtags.filter(t => tagHasCategory(t, 'gig')).length }})
        </button>
        <button
          type="button"
          class="px-4 py-1.5 rounded-full transition-all"
          :class="activeTagTabFilter === 'song' ? 'bg-secondary text-secondary-content font-black shadow' : 'bg-base-200 text-base-content/70 hover:text-primary'"
          @click="activeTagTabFilter = 'song'"
        >
          🎵 Låtar ({{ allHashtags.filter(t => tagHasCategory(t, 'song')).length }})
        </button>
        <button
          type="button"
          class="px-4 py-1.5 rounded-full transition-all"
          :class="activeTagTabFilter === 'news' ? 'bg-secondary text-secondary-content font-black shadow' : 'bg-base-200 text-base-content/70 hover:text-primary'"
          @click="activeTagTabFilter = 'news'"
        >
          📢 Nyheter ({{ allHashtags.filter(t => tagHasCategory(t, 'news')).length }})
        </button>
        <button
          type="button"
          class="px-4 py-1.5 rounded-full transition-all"
          :class="activeTagTabFilter === 'photo' ? 'bg-secondary text-secondary-content font-black shadow' : 'bg-base-200 text-base-content/70 hover:text-primary'"
          @click="activeTagTabFilter = 'photo'"
        >
          📷 Foton & Fan Central ({{ allHashtags.filter(t => tagHasCategory(t, 'photo')).length }})
        </button>
      </div>

      <!-- Hashtags Grid / Table -->
      <div class="overflow-x-auto rounded-2xl border border-primary/20 stage-card">
        <table class="table table-zebra w-full text-xs">
          <thead>
            <tr class="text-secondary font-bold uppercase text-[10px] tracking-wider border-b border-primary/20">
              <th>Hashtag</th>
              <th>Kategorier</th>
              <th>Status</th>
              <th class="text-right">Åtgärder</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="tag in filteredHashtags"
              :key="tag.id"
              class="hover:bg-base-200/50 transition-colors"
              :class="editingHashtagId === tag.id ? 'bg-primary/10 border-l-4 border-primary' : ''"
            >
              <td class="font-bold text-primary font-mono text-sm">
                {{ tag.tag }}
              </td>
              <td>
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="badge in getCategoryBadges(tag.category)"
                    :key="badge.key"
                    class="badge badge-xs font-bold uppercase text-[9px]"
                    :class="badge.class"
                  >
                    {{ badge.label }}
                  </span>
                </div>
              </td>
              <td>
                <label class="cursor-pointer inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    :checked="tag.isActive"
                    class="toggle toggle-success toggle-xs"
                    @change="toggleHashtagActive(tag)"
                  />
                  <span class="text-[11px] font-bold" :class="tag.isActive ? 'text-emerald-400' : 'text-base-content/40'">
                    {{ tag.isActive ? 'Aktiv' : 'Inaktiv' }}
                  </span>
                </label>
              </td>
              <td class="text-right space-x-1">
                <button
                  type="button"
                  class="btn btn-ghost btn-xs text-secondary font-bold hover:bg-secondary/20 rounded-full"
                  @click="openEditHashtag(tag)"
                >
                  ✏️ Redigera
                </button>
                <button
                  type="button"
                  class="btn btn-ghost btn-xs text-error font-bold hover:bg-error/20 rounded-full"
                  @click="deleteHashtag(tag.id)"
                >
                  🗑️ Ta bort
                </button>
              </td>
            </tr>
            <tr v-if="filteredHashtags.length === 0">
              <td colspan="4" class="text-center py-8 text-base-content/60 italic">
                Inga taggar hittades i denna kategori.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- SONG LIVE PLAY STATISTICS MODAL -->
    <div
      v-if="selectedSongStatsModal"
      class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
      @click="selectedSongStatsModal = null"
    >
      <div class="stage-card max-w-lg w-full p-6 sm:p-8 rounded-3xl border-2 border-primary/40 shadow-2xl space-y-5 bg-base-100" @click.stop>
        <div class="flex items-start justify-between gap-4 border-b border-primary/20 pb-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-2xl">🎸</span>
              <h3 class="font-heading text-xl text-primary font-bold">
                {{ selectedSongStatsModal.title }}
              </h3>
            </div>
            <p class="text-xs text-base-content/70 mt-1">
              {{ selectedSongStatsModal.isOriginal ? 'Originalkomposition' : `Cover (${selectedSongStatsModal.artist || 'Okänd'})` }}
            </p>
          </div>

          <button type="button" class="btn btn-sm btn-circle btn-ghost text-lg" @click="selectedSongStatsModal = null">✕</button>
        </div>

        <!-- Stats Summary Pill -->
        <div class="p-4 bg-base-200/90 rounded-2xl border border-primary/20 flex items-center justify-between">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-secondary block">Totalt framförd live</span>
            <span class="text-2xl font-heading font-black text-primary">{{ selectedSongStatsModal.playCount }} gånger</span>
          </div>
          <div v-if="selectedSongStatsModal.firstPlayed" class="text-right text-[11px] font-mono text-base-content/75">
            <div>Första: {{ new Date(selectedSongStatsModal.firstPlayed).toLocaleDateString('sv-SE') }}</div>
            <div>Senaste: {{ new Date(selectedSongStatsModal.lastPlayed).toLocaleDateString('sv-SE') }}</div>
          </div>
        </div>

        <!-- List of Gigs -->
        <div class="space-y-2">
          <h4 class="text-xs font-bold uppercase tracking-wider text-secondary">
            Spelad på följande gig ({{ selectedSongStatsModal.gigs?.length || 0 }} st):
          </h4>
          <div v-if="selectedSongStatsModal.gigs && selectedSongStatsModal.gigs.length > 0" class="max-h-60 overflow-y-auto space-y-2 pr-1">
            <div
              v-for="(g, i) in selectedSongStatsModal.gigs"
              :key="i"
              class="p-3 bg-base-200/60 rounded-xl border border-white/5 flex items-center justify-between text-xs font-mono"
            >
              <div>
                <span class="font-bold text-primary block">{{ g.venue }}, {{ g.city }}</span>
                <span class="text-[10px] text-base-content/60">{{ new Date(g.date).toLocaleDateString('sv-SE', { year: 'numeric', month: 'short', day: 'numeric' }) }}</span>
              </div>
              <span class="badge badge-sm badge-outline border-secondary/40 text-secondary text-[10px]">
                {{ g.setName }}
              </span>
            </div>
          </div>
          <div v-else class="text-xs text-base-content/50 italic py-4 text-center">
            Låten har ännu inte registrerats i någon spelad gig-setlist.
          </div>
        </div>

        <div class="pt-2 flex justify-end">
          <button type="button" class="btn btn-primary btn-sm rounded-full font-bold px-6" @click="selectedSongStatsModal = null">
            Stäng
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
