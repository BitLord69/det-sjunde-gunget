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

const { data: adminSettings, refresh: refreshSettings } = await useFetch<{
  newsletterEnabled: boolean
  landingSongCount?: number
  landingMerchCount?: number
  lastMerchSync?: number
  geminiApiKey?: string
  customCoverPrompt?: string
  settings: Record<string, string>
}>('/api/admin/settings', {
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

const isSavingSettings = ref(false)

const selectedSongStatsModal = ref<any | null>(null)
const getSongPlayCount = (song: any): number => {
  if (!song) return 0
  if (song.id && songsStatsData.value?.lookupById?.[song.id] !== undefined) {
    return songsStatsData.value.lookupById[song.id] ?? 0
  }
  const norm = (song.title || '').toLowerCase().trim()
  return songsStatsData.value?.lookupByTitle?.[norm] ?? 0
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
type SongSortKey = 'title' | 'hasCover' | 'isOriginal' | 'originalArtist' | 'embedProvider' | 'playCount'
const songSortKey = ref<SongSortKey>('title')
const songSortDir = ref<'asc' | 'desc'>('asc')

const toggleSongSort = (key: SongSortKey) => {
  if (songSortKey.value === key) {
    songSortDir.value = songSortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    songSortKey.value = key
    songSortDir.value = (key === 'playCount' || key === 'hasCover') ? 'desc' : 'asc'
  }
}

const sortedSongs = computed(() => {
  const list = [...(songsData.value || [])]
  const dir = songSortDir.value === 'asc' ? 1 : -1

  return list.sort((a, b) => {
    if (songSortKey.value === 'title') {
      return dir * (a.title || '').localeCompare(b.title || '', 'sv')
    }
    if (songSortKey.value === 'hasCover') {
      const aVal = hasSongCover(a) ? 1 : 0
      const bVal = hasSongCover(b) ? 1 : 0
      return dir * (aVal - bVal)
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

// ---------------- AI COVER GENERATOR ----------------
const showAiCoverModal = ref(false)
const isGeneratingCover = ref(false)
const aiCoverProgressStep = ref(1)
const aiCoverSource = ref<'photo' | 'ai'>('photo')
const aiEra = ref<'60s' | '70s'>('70s')
const aiStylePreset = ref<'auto' | 'sonet_gold' | 'chess_crimson' | 'stax_amber' | 'bluenote_navy' | 'vintage_cream'>('auto')
const aiTextRenderer = ref<'theme' | 'ai_native'>('theme')
const aiIncludeBand = ref(false)
const aiPromptMode = ref<'standard' | 'custom'>('standard')
const aiCustomPrompt = ref('')
const generatedCoverResult = ref<{ url: string; title: string; prompt: string } | null>(null)
const aiGenerationError = ref<string | null>(null)

const hasSongCover = (song: any) => {
  if (song?.coverImage === 'NONE') return false
  if (song?.coverImage && song.coverImage.trim()) return true
  const slug = (song?.title || '').toLowerCase()
  const knownSlugs = ['sjunde', '7:e', 'sväng', 'källaren', 'hoochie', 'bad sign', 'born', 'thrill', 'chicago', 'sweet', 'pride', 'joy', 'kaffe', 'rör', 'himlen', 'gråter']
  return knownSlugs.some(k => slug.includes(k))
}

const bandPhotos = [
  { path: '/media/band/21..7de Gunget photoshoot1 21-6 26-3.jpg', label: 'Gruppbild 1 (Stående)' },
  { path: '/media/band/17..7de Gunget photoshoot1 21-6 26-4.jpg', label: 'Gruppbild 2 (Trädgård)' },
  { path: '/media/band/19..7de Gunget photoshoot1 21-6 26-5.jpg', label: 'Gruppbild 3 (Posering)' },
  { path: '/media/band/6..7de Gunget photoshoot1 21-6 26-12.jpg', label: 'Bandet (Närbild)' },
  { path: '/media/band/10..7de Gunget photoshoot1 21-6 26-16.jpg', label: 'Bandet (Profil)' },
  { path: '/media/band/2..7de Gunget photoshoot1 21-6 26-20.jpg', label: 'Bandet (Utomhus 1)' },
  { path: '/media/band/1..7de Gunget photoshoot1 21-6 26-21.jpg', label: 'Bandet (Utomhus 2)' },
]
const selectedBandPhoto = ref<string>(bandPhotos[0]?.path || '')

const activeStandardPromptPreview = computed(() => {
  let subject = ''
  if (aiIncludeBand.value) {
    subject = 'Award-winning 35mm film photograph of EXACTLY FOUR (4) Swedish blues rock musicians from the reference photo: Janis (front left) singing & cupping blues harmonica to vintage mic, Marcus (center-left) on sunburst electric guitar, Bosse (center-right) with sunglasses on bass, Jonas (background) on vintage Ludwig drums. STRICT REQUIREMENT: Total count of people is EXACTLY 4. No 5th guitarist, no extras.'
  } else {
    subject = `Moody cinematic 1970s analog still life blues album artwork for the song '${songForm.title || '[Låttitel]'}'. A vintage glowing Fender tube guitar amplifier with warm amber vacuum tubes, a vintage sunburst electric guitar, and a classic Hohner Marine Band harmonica on wooden floorboards, atmospheric smoky reflections and analog film grain.`
  }

  const eraStyle = aiEra.value === '60s'
    ? '1960s raw Chicago blues club aesthetic (Chess Records), high contrast moody duotone with deep shadows and analog grain.'
    : '1970s Scandinavian blues-rock record sleeve aesthetic (Sonet / Gazell Records) in warm analog Kodak film tones (amber ochre, deep navy, slate gray).'

  const textNote = aiTextRenderer.value === 'ai_native'
    ? ` Typography: Authentic 1970s vintage vinyl single cover typography featuring band name 'DET 7:E GUNGET' and song title '${(songForm.title || '').toUpperCase()}'. Position and design the typography artistically wherever it naturally fits the visual composition.`
    : ` CRITICAL: Do not render text/logos in the artwork.`

  return `Square format 1970s vintage album cover photo artwork. ${subject} Style: ${eraStyle}${textNote} Lighting: Warm tungsten spotlights, atmospheric haze, authentic 35mm film grain, analog color grading, masterpiece quality.`
})

const openAiCoverGenerator = () => {
  if (!songForm.title && aiPromptMode.value === 'standard') {
    showToast('⚠️ Fyll i låttiteln först så att AI:n vet vad den ska skapa omslag för!')
    return
  }
  if (!aiCustomPrompt.value && adminSettings.value?.customCoverPrompt) {
    aiCustomPrompt.value = adminSettings.value.customCoverPrompt
  }
  generatedCoverResult.value = null
  aiGenerationError.value = null
  showAiCoverModal.value = true
  checkEngineStatus()
}

const engineStatus = ref<{
  activeEngine: string
  engineName: string
  tier: string
  isPaidGemini: boolean
  message?: string
} | null>(null)
const isCheckingEngine = ref(false)

const checkEngineStatus = async () => {
  isCheckingEngine.value = true
  try {
    const res = await $fetch<any>('/api/admin/songs/cover-engine-status')
    engineStatus.value = res
    if (res?.isPaidGemini) {
      // Default to native AI text for highest organic integration when using paid Gemini
      aiTextRenderer.value = 'ai_native'
    } else {
      aiTextRenderer.value = 'theme'
    }
  } catch (_) {
    engineStatus.value = {
      activeEngine: 'fallback',
      engineName: 'Gratis Fallback',
      tier: 'free',
      isPaidGemini: false,
    }
  } finally {
    isCheckingEngine.value = false
  }
}

const generateSongCover = async () => {
  isGeneratingCover.value = true
  aiGenerationError.value = null
  aiCoverProgressStep.value = 1

  const stepTimer1 = setTimeout(() => { aiCoverProgressStep.value = 2 }, 1800)
  const stepTimer2 = setTimeout(() => { aiCoverProgressStep.value = 3 }, 4200)
  const stepTimer3 = setTimeout(() => { aiCoverProgressStep.value = 4 }, 7500)

  try {
    const res = await $fetch<{ success: boolean; url: string; title: string; prompt: string }>('/api/admin/songs/generate-cover', {
      method: 'POST',
      body: {
        title: songForm.title,
        originalArtist: songForm.originalArtist,
        isOriginal: songForm.isOriginal,
        source: aiCoverSource.value,
        photoPath: selectedBandPhoto.value,
        stylePreset: aiStylePreset.value,
        textRenderer: aiTextRenderer.value,
        era: aiEra.value,
        includeBand: aiIncludeBand.value,
        promptMode: aiPromptMode.value,
        customPrompt: aiCustomPrompt.value,
      },
    })

    if (res.success && res.url) {
      generatedCoverResult.value = res
      await refreshSettings()
      showToast('✓ Singelomslaget har skapats och sparats!')
    }
  } catch (err: any) {
    aiGenerationError.value = err?.data?.message || err?.message || 'Kunde inte skapa omslag.'
    showToast(`⚠️ ${aiGenerationError.value}`)
  } finally {
    clearTimeout(stepTimer1)
    clearTimeout(stepTimer2)
    clearTimeout(stepTimer3)
    isGeneratingCover.value = false
  }
}

const applyGeneratedCover = () => {
  if (generatedCoverResult.value?.url) {
    songForm.coverImage = generatedCoverResult.value.url
    showAiCoverModal.value = false
    showToast('✓ Omslaget har valts för låten!')
  }
}

const songSocialPreview = computed(() => {
  const tagsStr = selectedSongTags.value.length > 0 ? selectedSongTags.value.join(' ') : '#DetSjundeGunget #BluesRock #NyMusik'
  return `🎵 NY LÅT I JUKEBOXEN! 🎵

"${songForm.title || '[Låttitel]'}" ${songForm.isOriginal ? '(Originalkomposition)' : `(Cover av ${songForm.originalArtist || 'Okänd'})`} finns nu att lyssna på i vår retro jukebox på webben!

${songForm.embedUrl ? `👉 Lyssna direkt: ${songForm.embedUrl}` : '👉 Lyssna här: https://det7egunget.se/music'}

Släpp i en slant och höj volymen till 11! ⚡
${tagsStr}`
})

const getSongCoverUrl = (song: any): string | null => {
  if (song?.coverImage === 'NONE') return null
  if (song?.coverImage && song.coverImage.trim()) return song.coverImage
  const slug = (song?.title || '').toLowerCase()
  if (slug.includes('sjunde') || slug.includes('7:e')) return '/images/records/det-sjunde-gunget.jpg'
  if (slug.includes('sväng') || slug.includes('källaren')) return '/images/records/svang-i-kallaren.jpg'
  if (slug.includes('hoochie') || slug.includes('coochie')) return '/images/records/hoochie-coochie-man.jpg'
  if (slug.includes('bad sign') || slug.includes('born')) return '/images/records/born-under-a-bad-sign.jpg'
  if (slug.includes('thrill') || slug.includes('gone')) return '/images/records/the-thrill-is-gone.jpg'
  if (slug.includes('chicago') || slug.includes('sweet')) return '/images/records/sweet-home-chicago.jpg'
  if (slug.includes('pride') || slug.includes('joy')) return '/images/records/pride-and-joy.jpg'
  if (slug.includes('kaffe') || slug.includes('rör')) return '/images/records/kaffe-och-ror.jpg'
  if (slug.includes('himlen') || slug.includes('gråter')) return '/images/records/himlen-grater.jpg'
  return null
}

const previewCoverSong = ref<any | null>(null)
const showCoverPreviewModal = ref(false)
const isRemovingCover = ref(false)

const openCoverPreview = (song: any) => {
  previewCoverSong.value = song
  showCoverPreviewModal.value = true
}

const createCoverForPreviewSong = (song: any) => {
  showCoverPreviewModal.value = false
  openEditSong(song)
  openAiCoverGenerator()
}

const removeCoverFromSong = async (song: any) => {
  if (!song) return
  if (!confirm(`Vill du ta bort skivomslaget för "${song.title}"?`)) return

  isRemovingCover.value = true
  try {
    await $fetch('/api/admin/songs', {
      method: 'POST',
      body: {
        id: song.id,
        title: song.title,
        isOriginal: song.isOriginal,
        originalArtist: song.originalArtist,
        embedProvider: song.embedProvider,
        embedUrl: song.embedUrl,
        audioUrl: song.audioUrl,
        duration: song.duration,
        lyrics: song.lyrics,
        lyricsEn: song.lyricsEn,
        chords: song.chords,
        coverImage: 'NONE',
      },
    })

    if (previewCoverSong.value && previewCoverSong.value.id === song.id) {
      previewCoverSong.value.coverImage = 'NONE'
    }
    await refreshSongs()
    showToast(`✓ Omslaget togs bort för "${song.title}".`)
    showCoverPreviewModal.value = false
  } catch (err: any) {
    showToast(`⚠️ Kunde inte ta bort omslag: ${err?.data?.message || err?.message || 'Fel'}`)
  } finally {
    isRemovingCover.value = false
  }
}

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

    <!-- CMS Tab Navigation (Reordered 1-10) -->
    <div class="flex flex-wrap gap-2 border-b border-primary/20 pb-4 text-sm font-bold">
      <!-- 1. Låtar & jukebox -->
      <button
        type="button"
        class="px-5 py-2.5 rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
        :class="activeTab === 'songs' ? 'bg-primary text-primary-content shadow' : 'bg-base-200 text-base-content/70 hover:text-primary'"
        title="Hantera bandets låtskatt och ljudfiler som spelas i jukeboxen på musiksidan"
        @click="activeTab = 'songs'"
      >
        <span>🎵</span> Låtar & jukebox ({{ songsData?.length || 0 }})
      </button>

      <!-- 2. Gig & spelningar -->
      <button
        type="button"
        class="px-5 py-2.5 rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
        :class="activeTab === 'gigs' ? 'bg-primary text-primary-content shadow' : 'bg-base-200 text-base-content/70 hover:text-primary'"
        title="Hantera turnédatum, skapa spellista för spelningar, uppdatera biljettlänkar och status"
        @click="activeTab = 'gigs'"
      >
        <span>📅</span> Gig & spelningar ({{ gigsData?.all?.length || 0 }})
      </button>

      <!-- 3. Bandet & medlemmar -->
      <button
        type="button"
        class="px-5 py-2.5 rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
        :class="activeTab === 'band' ? 'bg-primary text-primary-content shadow' : 'bg-base-200 text-base-content/70 hover:text-primary'"
        title="Hantera bandmedlemmarnas profiler, instrument och biografier"
        @click="activeTab = 'band'"
      >
        <span>🎸</span> Bandet & medlemmar ({{ bandMembers?.length || 4 }})
      </button>

      <!-- 4. Setlist & repertoar -->
      <button
        type="button"
        class="px-5 py-2.5 rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
        :class="activeTab === 'setlist' ? 'bg-primary text-primary-content shadow' : 'bg-base-200 text-base-content/70 hover:text-primary'"
        title="Organisera bandets aktiva liverepertoar och setlist som visas för fansen på musiksidan"
        @click="activeTab = 'setlist'"
      >
        <span>📋</span> Setlist & repertoar ({{ setlistData?.length || 0 }})
      </button>

      <!-- 5. Galleri & Fan Central -->
      <button
        type="button"
        class="px-5 py-2.5 rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
        :class="activeTab === 'gallery' ? 'bg-primary text-primary-content shadow' : 'bg-base-200 text-base-content/70 hover:text-primary'"
        title="Hantera fotogalleri, Fan Central och välj ramstilar / fastsättning"
        @click="activeTab = 'gallery'"
      >
        <span>📷</span> Galleri & Fan Central ({{ galleryItems?.length || 0 }})
      </button>

      <!-- 6. Sociala taggar -->
      <button
        type="button"
        class="px-5 py-2.5 rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
        :class="activeTab === 'hashtags' ? 'bg-primary text-primary-content shadow' : 'bg-base-200 text-base-content/70 hover:text-primary'"
        title="Hantera förvalda hashtags för sociala medier-delning"
        @click="activeTab = 'hashtags'"
      >
        <span>🏷️</span> Sociala taggar ({{ hashtagsData?.length || 0 }})
      </button>

      <!-- 7. Bokningar & förfrågningar -->
      <button
        type="button"
        class="px-5 py-2.5 rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
        :class="[
          activeTab === 'messages'
            ? ((messagesData?.length || 0) > 0
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-neutral font-black shadow-lg shadow-orange-500/40 border border-amber-300 ring-2 ring-amber-400/40 scale-[1.02]'
                : 'bg-primary text-primary-content shadow')
            : ((messagesData?.length || 0) > 0
                ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 hover:text-amber-200 border-2 border-amber-500/60 hover:border-amber-400 font-black shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:scale-[1.03]'
                : 'bg-base-200 text-base-content/70 hover:text-primary')
        ]"
        title="Hantera inkomna bokningsförfrågningar och meddelanden"
        @click="activeTab = 'messages'"
      >
        <span :class="{'animate-bounce': (unreadMessagesCount > 0)}">✉️</span>
        <span :class="{'font-black tracking-wide': (messagesData?.length || 0) > 0}">Bokningar & förfrågningar</span>
        <span class="font-mono">({{ messagesData?.length || 0 }})</span>
        <span
          v-if="unreadMessagesCount > 0"
          class="badge badge-xs bg-amber-400 text-neutral font-mono font-black animate-pulse px-2 py-0.5 shadow-md ml-1"
        >
          ⚡ {{ unreadMessagesCount }} nya
        </span>
      </button>

      <!-- 8. Administratörer -->
      <button
        type="button"
        class="px-5 py-2.5 rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
        :class="activeTab === 'admins' ? 'bg-primary text-primary-content shadow' : 'bg-base-200 text-base-content/70 hover:text-primary'"
        title="Hantera administratörskonton och behörigheter"
        @click="activeTab = 'admins'"
      >
        <span>👥</span> Administratörer ({{ adminUsers?.length || 4 }})
      </button>

      <!-- 9. Nyhetsbrev -->
      <button
        type="button"
        class="px-5 py-2.5 rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
        :class="activeTab === 'subscribers' ? 'bg-primary text-primary-content shadow' : 'bg-base-200 text-base-content/70 hover:text-primary'"
        title="Visa och hantera e-postprenumeranter till nyhetsbrevet"
        @click="activeTab = 'subscribers'"
      >
        <span>📬</span> Nyhetsbrev ({{ subscribersData?.length || 0 }})
      </button>

      <!-- 10. Merch & webbshop -->
      <button
        type="button"
        class="px-5 py-2.5 rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
        :class="activeTab === 'merch' ? 'bg-primary text-primary-content shadow' : 'bg-base-200 text-base-content/70 hover:text-primary'"
        title="Hantera merch, priser och synkronisering med Spreadshop-butiken"
        @click="activeTab = 'merch'"
      >
        <span>👕</span> Merch & webbshop ({{ merchData?.length || 0 }})
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

          <!-- Cover Artwork Image Uploader & AI Generator -->
          <div class="sm:col-span-2 p-4 bg-base-200/60 rounded-xl border border-primary/20 space-y-3">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-bold text-secondary">🎨 Skivomslag / 7"-singel Artwork (Valfritt)</label>
              <span class="text-[10px] text-base-content/60 font-mono">PNG, JPG, WebP</span>
            </div>
            
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                v-model="songForm.coverImage"
                type="text"
                placeholder="/images/records/mitt-omslag.jpg eller klicka på Skapa med AI"
                class="input input-bordered flex-grow bg-base-200 input-sm font-mono text-xs"
              />

              <div class="flex items-center gap-2 flex-shrink-0">
                <!-- AI Generator Trigger Button -->
                <button
                  type="button"
                  class="btn btn-primary btn-sm rounded-lg font-bold shadow-md hover:scale-105 transition-transform flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  title="Skapa ett autentiskt 70-tals vinylsingelomslag med Det 7:e Gunget-typografi"
                  @click="openAiCoverGenerator"
                >
                  <span>✨</span>
                  <span>Skapa med AI</span>
                </button>

                <!-- Manual File Upload -->
                <label class="btn btn-outline btn-secondary btn-sm rounded-lg cursor-pointer whitespace-nowrap" :class="isUploading ? 'loading' : ''">
                  <span>📷 Ladda upp</span>
                  <input
                    type="file"
                    accept="image/*"
                    class="hidden"
                    @change="uploadFile($event, url => songForm.coverImage = url)"
                  />
                </label>
              </div>
            </div>

            <p class="text-[10px] text-base-content/60">
              Klicka på <strong>"Skapa med AI"</strong> för att generera ett unikt vintage-singelfodral, eller lämna tomt för ett stiliserat kartongfodral.
            </p>

            <div v-if="songForm.coverImage" class="pt-1 flex items-center gap-3 bg-base-300/40 p-2.5 rounded-xl border border-primary/20">
              <img :src="songForm.coverImage" alt="Preview" class="w-16 h-16 object-cover rounded-md border border-primary/40 shadow" />
              <div class="space-y-1">
                <span class="text-xs font-bold text-primary block">Aktivt skivomslag</span>
                <button type="button" class="btn btn-ghost btn-xs text-error font-bold" @click="songForm.coverImage = ''">Ta bort bild ✕</button>
              </div>
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

              <!-- OMSLAG (Checkmark / Red X) -->
              <th class="text-center">
                <button
                  type="button"
                  class="group inline-flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-wider transition-all cursor-pointer py-1 px-1.5 rounded mx-auto"
                  :class="songSortKey === 'hasCover' ? 'text-primary font-black bg-primary/10 border-b-2 border-primary' : 'text-secondary hover:text-primary hover:bg-base-300/60'"
                  @click="toggleSongSort('hasCover')"
                >
                  <span>Omslag</span>
                  <span
                    class="tooltip tooltip-bottom inline-flex items-center"
                    :data-tip="songSortKey === 'hasCover' ? (songSortDir === 'desc' ? 'Med omslag först (Klicka för utan)' : 'Utan omslag först (Klicka för med)') : 'Klicka för att sortera efter omslag'"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      class="transition-transform duration-300"
                      :class="[
                        songSortKey === 'hasCover'
                          ? (songSortDir === 'desc' ? 'rotate-180 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100' : 'rotate-0 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100')
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
              <td class="font-bold text-primary">
                <button
                  type="button"
                  class="text-left font-bold text-primary hover:text-secondary hover:underline cursor-pointer transition-colors"
                  title="Klicka för att förhandsgranska omslaget"
                  @click="openCoverPreview(song)"
                >
                  {{ song.title }}
                </button>
              </td>
              <td class="text-center">
                <button
                  type="button"
                  class="btn btn-xs btn-ghost p-1 cursor-pointer transition-transform hover:scale-110"
                  :title="hasSongCover(song) ? 'Klicka för att förhandsgranska skivomslaget' : 'Saknar omslag - Klicka för att skapa'"
                  @click="openCoverPreview(song)"
                >
                  <span
                    v-if="hasSongCover(song)"
                    class="badge badge-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono font-bold px-1.5 py-0.5 shadow-sm inline-flex items-center"
                  >
                    ✓
                  </span>
                  <span
                    v-else
                    class="badge badge-xs bg-rose-500/20 text-rose-400 border border-rose-500/40 font-mono font-bold px-1.5 py-0.5 shadow-sm inline-flex items-center"
                  >
                    ✕
                  </span>
                </button>
              </td>
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
            Artiklar cachas säkert i databasen för blixtsnabb visning och synkas automatiskt 1 gång/dygn via Vercel Cron.
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
              ⚡ Schemalagd: 1 gång/dygn (Vercel Cron)
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

    <!-- AI COVER GENERATOR INTERACTIVE MODAL -->
    <div
      v-if="showAiCoverModal"
      class="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-hidden"
    >
      <div class="stage-card max-w-4xl w-full max-h-[92vh] flex flex-col rounded-3xl border-2 border-primary/40 shadow-2xl bg-base-100 relative overflow-hidden">
        <!-- 1. Fixed Header -->
        <div class="flex items-start justify-between gap-4 border-b border-primary/20 p-4 sm:p-5 flex-shrink-0 bg-base-100">
          <div class="space-y-0.5">
            <div class="flex items-center gap-2">
              <span class="text-2xl animate-pulse">✨</span>
              <h3 class="font-heading text-lg sm:text-xl text-primary font-black">
                Singelomslag-Studio (7"-singel)
              </h3>
            </div>
            <p class="text-[11px] text-base-content/70">
              Skapa ett autentiskt 1970-tals bluesrock-fodral med <strong>Det 7:e Gunget</strong>-typografi och vinylslitage.
            </p>
          </div>

          <div class="flex items-center gap-2">
            <!-- Live Engine Indicator -->
            <div
              v-if="engineStatus"
              class="badge badge-sm gap-1.5 font-mono py-2.5 px-3 border shadow-sm"
              :class="engineStatus.isPaidGemini ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'bg-amber-500/15 border-amber-500/40 text-amber-300'"
              :title="engineStatus.message"
            >
              <span class="w-2 h-2 rounded-full" :class="engineStatus.isPaidGemini ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'"></span>
              <span class="font-bold text-[10px]">{{ engineStatus.engineName }}</span>
              <span v-if="engineStatus.isPaidGemini" class="text-[9px] opacity-80">(Flaggskepp)</span>
            </div>
            <div v-else-if="isCheckingEngine" class="badge badge-sm badge-ghost gap-1.5 text-[10px] font-mono animate-pulse">
              <span>🔍</span>
              <span>Kollar AI-status...</span>
            </div>

            <button
              type="button"
              class="btn btn-sm btn-circle btn-ghost text-lg"
              :disabled="isGeneratingCover"
              @click="showAiCoverModal = false"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- 2. Scrollable 2-Column Body -->
        <div class="p-4 sm:p-6 overflow-y-auto flex-1">
          <div class="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            <!-- LEFT COLUMN (Settings & Source Selection) -->
            <div class="md:col-span-7 space-y-4">
              <!-- Song Target Info -->
              <div class="p-3 bg-base-200/80 rounded-xl border border-primary/20 flex items-center justify-between text-xs">
                <div>
                  <span class="text-[10px] uppercase font-bold text-secondary tracking-wider block">Låt som illustreras</span>
                  <span class="font-heading font-black text-primary text-sm sm:text-base">{{ songForm.title }}</span>
                  <span v-if="!songForm.isOriginal && songForm.originalArtist" class="text-base-content/70 ml-1.5 font-mono text-[11px]">
                    (Original av {{ songForm.originalArtist }})
                  </span>
                </div>
                <span class="badge badge-sm font-mono" :class="songForm.isOriginal ? 'badge-primary font-bold' : 'badge-outline border-secondary text-secondary'">
                  {{ songForm.isOriginal ? 'A-sida (Egen låt)' : 'B-sida (Cover)' }}
                </span>
              </div>

              <!-- Main Source Tabs (Vårt Bandfoto vs Skapa med AI) -->
              <div class="space-y-1.5">
                <span class="text-[11px] font-bold text-secondary flex items-center gap-1.5">
                  <span>🎨</span> Välj bildkälla:
                </span>
                <div class="grid grid-cols-2 gap-2 bg-base-200 p-1 rounded-2xl border border-white/5 text-xs font-bold font-mono">
                  <button
                    type="button"
                    class="py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    :class="aiCoverSource === 'photo' ? 'bg-primary text-neutral font-black shadow' : 'text-base-content/70 hover:text-primary'"
                    :disabled="isGeneratingCover"
                    @click="aiCoverSource = 'photo'"
                  >
                    <span>📷</span>
                    <span>Vårt bandfoto</span>
                  </button>

                  <button
                    type="button"
                    class="py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    :class="aiCoverSource === 'ai' ? 'bg-secondary text-secondary-content font-black shadow' : 'text-base-content/70 hover:text-primary'"
                    :disabled="isGeneratingCover"
                    @click="aiCoverSource = 'ai'"
                  >
                    <span>✨</span>
                    <span>Skapa med AI</span>
                  </button>
                </div>
              </div>

              <!-- Typography & Sleeve Design Mode -->
              <div class="space-y-2 p-3.5 bg-base-300/40 rounded-2xl border border-primary/20 text-xs">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-secondary flex items-center gap-1.5">
                    <span>🔤</span> Textmetod på omslaget:
                  </span>
                  <span class="text-[10px] text-base-content/60 font-mono">Välj stil</span>
                </div>

                <!-- Toggle: Letterpress Theme vs 100% AI Målad -->
                <div class="grid grid-cols-2 gap-2 font-mono text-xs">
                  <button
                    type="button"
                    class="py-2 px-2.5 rounded-xl border transition-all text-center cursor-pointer flex items-center justify-center gap-1.5"
                    :class="aiTextRenderer === 'theme' ? 'bg-primary/20 border-primary text-primary font-bold shadow' : 'bg-base-200 border-white/5 text-base-content/70 hover:border-primary/40'"
                    @click="aiTextRenderer = 'theme'"
                  >
                    <span>🎨</span>
                    <span>Letterpress-tema</span>
                  </button>

                  <button
                    type="button"
                    class="py-2 px-2.5 rounded-xl border transition-all text-center cursor-pointer flex items-center justify-center gap-1.5"
                    :class="aiTextRenderer === 'ai_native' ? 'bg-secondary/20 border-secondary text-secondary font-bold shadow' : 'bg-base-200 border-white/5 text-base-content/70 hover:border-secondary/40'"
                    @click="aiTextRenderer = 'ai_native'"
                  >
                    <span>🤖</span>
                    <span>100% Målad av AI</span>
                  </button>
                </div>

                <!-- Sub-options: If Letterpress Theme is selected, show the 6 rich presets -->
                <div v-if="aiTextRenderer === 'theme'" class="space-y-1.5 pt-1.5 border-t border-white/5">
                  <div class="flex items-center justify-between text-[10px] text-base-content/70">
                    <span class="font-bold">Välj tema för etikett & typografi:</span>
                    <span class="text-[9px] font-mono text-success">✓ 100% rätt stavning</span>
                  </div>
                  <div class="grid grid-cols-3 gap-1.5 font-mono text-[10px]">
                    <button
                      type="button"
                      class="py-1 px-2 rounded-lg border transition-all text-center cursor-pointer"
                      :class="aiStylePreset === 'auto' ? 'bg-primary/20 border-primary text-primary font-bold' : 'bg-base-200 border-white/5 text-base-content/70 hover:border-primary/40'"
                      @click="aiStylePreset = 'auto'"
                    >
                      🎲 Varierande
                    </button>
                    <button
                      type="button"
                      class="py-1 px-2 rounded-lg border transition-all text-center cursor-pointer"
                      :class="aiStylePreset === 'sonet_gold' ? 'bg-amber-500/20 border-amber-500 text-amber-400 font-bold' : 'bg-base-200 border-white/5 text-base-content/70 hover:border-amber-400/40'"
                      @click="aiStylePreset = 'sonet_gold'"
                    >
                      🥇 Sonet Guld
                    </button>
                    <button
                      type="button"
                      class="py-1 px-2 rounded-lg border transition-all text-center cursor-pointer"
                      :class="aiStylePreset === 'chess_crimson' ? 'bg-red-500/20 border-red-500 text-red-400 font-bold' : 'bg-base-200 border-white/5 text-base-content/70 hover:border-red-400/40'"
                      @click="aiStylePreset = 'chess_crimson'"
                    >
                      🔴 Chess Röd
                    </button>
                    <button
                      type="button"
                      class="py-1 px-2 rounded-lg border transition-all text-center cursor-pointer"
                      :class="aiStylePreset === 'stax_amber' ? 'bg-orange-500/20 border-orange-500 text-orange-400 font-bold' : 'bg-base-200 border-white/5 text-base-content/70 hover:border-orange-400/40'"
                      @click="aiStylePreset = 'stax_amber'"
                    >
                      🍊 Stax Orange
                    </button>
                    <button
                      type="button"
                      class="py-1 px-2 rounded-lg border transition-all text-center cursor-pointer"
                      :class="aiStylePreset === 'bluenote_navy' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 font-bold' : 'bg-base-200 border-white/5 text-base-content/70 hover:border-cyan-400/40'"
                      @click="aiStylePreset = 'bluenote_navy'"
                    >
                      🔵 Blue Note
                    </button>
                    <button
                      type="button"
                      class="py-1 px-2 rounded-lg border transition-all text-center cursor-pointer"
                      :class="aiStylePreset === 'vintage_cream' ? 'bg-amber-200/20 border-amber-200 text-amber-200 font-bold' : 'bg-base-200 border-white/5 text-base-content/70 hover:border-amber-200/40'"
                      @click="aiStylePreset = 'vintage_cream'"
                    >
                      📜 Sepia Deluxe
                    </button>
                  </div>
                </div>
                <p v-else class="text-[10px] text-base-content/60 pt-0.5 font-mono">
                  AI:n målar in band- och låtnamn organiskt i själva scenbilden.
                </p>
              </div>

              <!-- SECTION A: REAL BAND PHOTO GALLERY SELECTOR -->
              <div v-if="aiCoverSource === 'photo'" class="space-y-2 p-3.5 bg-base-300/40 rounded-2xl border border-primary/20 text-xs">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-primary flex items-center gap-1.5">
                    <span>👥</span> Välj bild från er photoshoot:
                  </span>
                  <span class="text-[10px] text-base-content/60 font-mono">100% Ni & Skarpt</span>
                </div>

                <div class="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                  <div
                    v-for="(photo, pIdx) in bandPhotos"
                    :key="pIdx"
                    class="relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all group"
                    :class="selectedBandPhoto === photo.path ? 'border-primary ring-2 ring-primary/40 scale-[1.02] shadow-lg' : 'border-white/10 hover:border-primary/50 opacity-70 hover:opacity-100'"
                    @click="selectedBandPhoto = photo.path"
                  >
                    <img
                      :src="photo.path"
                      :alt="photo.label"
                      class="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div
                      v-if="selectedBandPhoto === photo.path"
                      class="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary text-neutral flex items-center justify-center text-[10px] font-black shadow"
                    >
                      ✓
                    </div>
                  </div>
                </div>
                <p class="text-[10px] text-base-content/60">
                  Valt foto får automatiskt vintage 1970-tals analog färgton, letterpress-typografi och klassisk vinylinramning.
                </p>
              </div>

              <!-- SECTION B: AI GENERATION CONTROLS -->
              <div v-else class="space-y-3">
                <!-- Era / Style Selector Pill (60-tal vs 70-tal) -->
                <div class="flex items-center justify-between p-3 bg-base-300/40 rounded-xl border border-primary/20 text-xs">
                  <span class="font-bold text-secondary flex items-center gap-1.5">
                    <span>🕰️</span> Tidsperiod / Look:
                  </span>
                  <div class="flex items-center gap-1 bg-base-200 p-1 rounded-xl border border-white/5 font-mono text-[11px]">
                    <button
                      type="button"
                      class="px-3 py-1 rounded-lg transition-all font-bold cursor-pointer"
                      :class="aiEra === '60s' ? 'bg-secondary text-secondary-content shadow' : 'text-base-content/70 hover:text-primary'"
                      :disabled="isGeneratingCover"
                      @click="aiEra = '60s'"
                    >
                      60-tal (Chicago Blues)
                    </button>
                    <button
                      type="button"
                      class="px-3 py-1 rounded-lg transition-all font-bold cursor-pointer"
                      :class="aiEra === '70s' ? 'bg-primary text-neutral font-black shadow' : 'text-base-content/70 hover:text-primary'"
                      :disabled="isGeneratingCover"
                      @click="aiEra = '70s'"
                    >
                      70-tal (Sonet / Gazell)
                    </button>
                  </div>
                </div>

                <!-- Band Members Toggle Switch -->
                <label class="flex items-center justify-between p-3 bg-base-300/40 rounded-xl border border-primary/20 text-xs cursor-pointer select-none hover:bg-base-300/60 transition-colors">
                  <span class="font-bold text-primary flex items-center gap-2">
                    <span>👥</span> Illustrera bandets 4 musiker
                  </span>
                  <input
                    v-model="aiIncludeBand"
                    type="checkbox"
                    class="toggle toggle-primary toggle-sm"
                    :disabled="isGeneratingCover"
                  />
                </label>

                <!-- Prompt Mode Selection: Standard vs Egen Prompt -->
                <div class="space-y-2.5 p-3.5 bg-base-300/40 rounded-2xl border border-primary/20 text-xs">
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-secondary text-xs flex items-center gap-1.5">
                      <span>⚙️</span> Prompt-inställning:
                    </span>
                    <span class="text-[10px] text-base-content/60 font-mono">Välj hur omslaget styrs</span>
                  </div>

                  <div class="grid grid-cols-2 gap-2">
                    <!-- Option 1: Standardprompt -->
                    <label
                      class="p-2 rounded-xl border transition-all cursor-pointer flex items-start gap-2 select-none"
                      :class="aiPromptMode === 'standard' ? 'bg-primary/10 border-primary shadow-sm' : 'bg-base-200/60 border-white/5 hover:border-primary/30'"
                    >
                      <input
                        v-model="aiPromptMode"
                        type="radio"
                        value="standard"
                        class="radio radio-primary radio-xs mt-0.5"
                        :disabled="isGeneratingCover"
                      />
                      <div class="space-y-0.5">
                        <span class="font-bold text-primary block text-xs leading-tight">Standard</span>
                        <p class="text-[9px] text-base-content/70 leading-tight">
                          Optimerad för Det 7:e Gunget.
                        </p>
                      </div>
                    </label>

                    <!-- Option 2: Egen prompt -->
                    <label
                      class="p-2 rounded-xl border transition-all cursor-pointer flex items-start gap-2 select-none"
                      :class="aiPromptMode === 'custom' ? 'bg-secondary/10 border-secondary shadow-sm' : 'bg-base-200/60 border-white/5 hover:border-secondary/30'"
                    >
                      <input
                        v-model="aiPromptMode"
                        type="radio"
                        value="custom"
                        class="radio radio-secondary radio-xs mt-0.5"
                        :disabled="isGeneratingCover"
                      />
                      <div class="space-y-0.5">
                        <span class="font-bold text-secondary block text-xs leading-tight">Egen prompt</span>
                        <p class="text-[9px] text-base-content/70 leading-tight">
                          Fri text (sparas automatiskt).
                        </p>
                      </div>
                    </label>
                  </div>

                  <!-- If Standard Mode: Show rendered standard prompt -->
                  <div v-if="aiPromptMode === 'standard'" class="space-y-1 pt-1">
                    <div class="flex items-center justify-between text-[11px] font-bold text-primary">
                      <span>Standardprompt:</span>
                      <span class="text-[9px] text-base-content/50 font-mono">Optimerad för Gemini</span>
                    </div>
                    <div class="p-2.5 bg-black/60 rounded-xl border border-white/10 font-mono text-[10px] text-base-content/80 leading-relaxed max-h-24 overflow-y-auto select-text">
                      {{ activeStandardPromptPreview }}
                    </div>
                  </div>

                  <!-- If Custom Mode: Show editable & saved textarea -->
                  <div v-else class="space-y-1 pt-1">
                    <div class="flex items-center justify-between text-[11px] font-bold text-secondary">
                      <span>Din anpassade prompt:</span>
                      <span class="text-[9px] text-success font-mono">✓ Sparas automatiskt</span>
                    </div>
                    <textarea
                      v-model="aiCustomPrompt"
                      rows="3"
                      placeholder="Skriv din helt egna prompt här... T.ex: Moody vintage 1970s blues guitar in the woods, smoky bar neon glow, weathered retro cardboard..."
                      class="textarea textarea-bordered textarea-xs w-full bg-base-200 text-xs font-mono leading-relaxed"
                      :disabled="isGeneratingCover"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- RIGHT COLUMN (Dynamic Preview & Live Status) -->
            <div class="md:col-span-5 flex flex-col items-center justify-center p-3 bg-black/40 rounded-2xl border border-primary/20 min-h-[260px]">
              <!-- State 1: Generating Animation -->
              <div v-if="isGeneratingCover" class="py-4 flex flex-col items-center justify-center text-center space-y-4">
                <div class="relative w-28 h-28 flex items-center justify-center">
                  <div class="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-60 pointer-events-none" />
                  <div class="absolute inset-2 rounded-full border-2 border-primary/40 animate-spin opacity-80" style="animation-duration: 4s;" />
                  
                  <div class="w-24 h-24 rounded-full bg-[#0d0b0a] border-2 border-amber-900/60 shadow-2xl flex items-center justify-center relative overflow-hidden animate-spin" style="animation-duration: 2.5s;">
                    <div class="absolute inset-0 opacity-40" style="background: conic-gradient(from 45deg, transparent 0deg, rgba(255,255,255,0.15) 45deg, transparent 90deg, transparent 180deg, rgba(255,255,255,0.15) 225deg, transparent 270deg);" />
                    <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-secondary via-primary to-secondary flex flex-col items-center justify-center p-0.5 text-[6px] font-black text-neutral shadow-inner">
                      <span>7:E GUNGET</span>
                      <span>45 RPM</span>
                    </div>
                  </div>
                </div>

                <div class="space-y-1 max-w-xs">
                  <h4 class="text-xs font-heading font-black text-primary animate-pulse">
                    {{
                      aiCoverProgressStep === 1
                        ? 'Förbereder skivomslag...'
                        : aiCoverProgressStep === 2
                        ? 'Applicerar 70-tals färgton & korn...'
                        : aiCoverProgressStep === 3
                        ? 'Målar vintage vinyltypografi...'
                        : 'Färdigställer högupplöst omslag...'
                    }}
                  </h4>
                  <div class="w-full bg-base-300 rounded-full h-1.5 overflow-hidden border border-primary/20 mt-1">
                    <div
                      class="bg-gradient-to-r from-secondary to-primary h-full transition-all duration-700 rounded-full"
                      :style="{ width: `${aiCoverProgressStep * 25}%` }"
                    />
                  </div>
                </div>
              </div>

              <!-- State 2: Finished Artwork Preview -->
              <div v-else-if="generatedCoverResult" class="space-y-3 w-full flex flex-col items-center">
                <div class="relative w-44 sm:w-48 aspect-square flex-shrink-0 group">
                  <!-- Vinyl Disc Peek -->
                  <div class="absolute -top-2 -right-2 w-40 h-40 rounded-full bg-[#0d0b0a] border border-white/10 shadow-xl flex items-center justify-center animate-spin" style="animation-duration: 12s;">
                    <div class="w-10 h-10 rounded-full bg-primary text-neutral text-[6px] font-black flex items-center justify-center">
                      45 RPM
                    </div>
                  </div>

                  <!-- Main Cover Image -->
                  <div class="relative z-10 w-full h-full rounded-lg overflow-hidden border-2 border-amber-900/50 shadow-2xl bg-[#140e0a]">
                    <img
                      :src="generatedCoverResult.url"
                      :alt="generatedCoverResult.title"
                      class="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <div class="text-center space-y-1">
                  <span class="px-2 py-0.5 rounded bg-emerald-800 text-emerald-100 font-mono text-[10px] font-bold">
                    ✓ OMSLAG KLART
                  </span>
                  <p class="text-[11px] text-base-content/70">
                    7"-singelfodral för <strong>Det 7:e Gunget</strong>
                  </p>
                </div>
              </div>

              <!-- State 3: Initial Empty State (Show Selected Photo or Vinyl Placeholder) -->
              <div v-else class="py-4 flex flex-col items-center justify-center text-center space-y-3">
                <div class="relative w-36 h-36 rounded-xl overflow-hidden border-2 border-primary/30 shadow-lg bg-base-300/60 flex items-center justify-center">
                  <img
                    v-if="aiCoverSource === 'photo'"
                    :src="selectedBandPhoto"
                    alt="Valt bandfoto"
                    class="w-full h-full object-cover opacity-90"
                  />
                  <div v-else class="text-3xl text-primary/60 animate-pulse">
                    ✨
                  </div>
                </div>
                <span class="text-[11px] text-base-content/60 font-mono">
                  {{ aiCoverSource === 'photo' ? 'Valt foto för vinylomslag' : 'Klicka på Skapa för att generera' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Error Alert if any -->
          <div v-if="aiGenerationError" class="p-3 mt-4 bg-error/10 border border-error/30 rounded-xl text-center space-y-1">
            <h4 class="font-bold text-error text-xs">Kunde inte skapa skivomslag</h4>
            <p class="text-[11px] text-base-content/80 font-mono">{{ aiGenerationError }}</p>
          </div>
        </div>

        <!-- 3. Sticky Action Footer -->
        <div class="border-t border-primary/20 p-3.5 sm:p-4 bg-base-200/95 backdrop-blur-md flex-shrink-0 flex items-center justify-between gap-2">
          <!-- Initial Mode -->
          <template v-if="!isGeneratingCover && !generatedCoverResult && !aiGenerationError">
            <button
              type="button"
              class="btn btn-ghost btn-sm rounded-full"
              @click="showAiCoverModal = false"
            >
              Avbryt
            </button>
            <button
              type="button"
              class="btn btn-primary btn-sm rounded-full font-bold px-6 shadow-lg shadow-primary/30 flex items-center gap-2 hover:scale-105 transition-transform cursor-pointer"
              @click="generateSongCover"
            >
              <span>{{ aiCoverSource === 'photo' ? '📷' : '✨' }}</span>
              <span>{{ aiCoverSource === 'photo' ? 'Skapa omslag från foto' : 'Generera med AI' }}</span>
            </button>
          </template>

          <!-- Generating Mode -->
          <template v-else-if="isGeneratingCover">
            <span class="text-xs text-primary font-mono animate-pulse flex items-center gap-1.5">
              <span>⏳</span> Skapar singelomslag...
            </span>
            <button
              type="button"
              class="btn btn-ghost btn-sm rounded-full text-xs"
              @click="showAiCoverModal = false"
            >
              Avbryt
            </button>
          </template>

          <!-- Finished Result Mode -->
          <template v-else-if="generatedCoverResult">
            <button
              type="button"
              class="btn btn-outline btn-sm rounded-full gap-1.5 font-bold text-xs"
              :disabled="isGeneratingCover"
              @click="generateSongCover"
            >
              <span>🔄</span>
              <span>Skapa ny variant</span>
            </button>

            <div class="flex items-center gap-2">
              <button
                type="button"
                class="btn btn-ghost btn-sm rounded-full text-xs"
                @click="showAiCoverModal = false"
              >
                Avbryt
              </button>
              <button
                type="button"
                class="btn btn-primary btn-sm rounded-full font-bold px-5 shadow-lg shadow-primary/30 text-xs sm:text-sm"
                @click="applyGeneratedCover"
              >
                ✓ Använd detta omslag
              </button>
            </div>
          </template>

          <!-- Error Mode -->
          <template v-else-if="aiGenerationError">
            <button type="button" class="btn btn-ghost btn-sm rounded-full" @click="showAiCoverModal = false">
              Stäng
            </button>
            <button type="button" class="btn btn-primary btn-sm font-bold rounded-full px-5" @click="generateSongCover">
              Försök igen 🔄
            </button>
          </template>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- COVER IMAGE PREVIEW POPUP MODAL            -->
    <!-- ========================================== -->
    <div
      v-if="showCoverPreviewModal && previewCoverSong"
      class="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-hidden"
      @click.self="showCoverPreviewModal = false"
    >
      <div class="stage-card max-w-lg w-full flex flex-col rounded-3xl border-2 border-primary/40 shadow-2xl bg-base-100 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <!-- Header -->
        <div class="flex items-start justify-between gap-3 border-b border-primary/20 p-4 sm:p-5 flex-shrink-0 bg-base-100">
          <div>
            <span class="text-[10px] uppercase font-bold text-secondary tracking-wider block">Skivomslag (7"-singel)</span>
            <h3 class="font-heading text-lg sm:text-xl text-primary font-black">
              {{ previewCoverSong.title }}
            </h3>
            <p v-if="!previewCoverSong.isOriginal && previewCoverSong.originalArtist" class="text-xs text-base-content/70 font-mono">
              Original av {{ previewCoverSong.originalArtist }}
            </p>
          </div>
          <button
            type="button"
            class="btn btn-sm btn-circle btn-ghost text-lg"
            @click="showCoverPreviewModal = false"
          >
            ✕
          </button>
        </div>

        <!-- Cover Image Body -->
        <div class="p-5 sm:p-6 flex flex-col items-center justify-center bg-base-300/30">
          <div v-if="getSongCoverUrl(previewCoverSong)" class="relative w-72 h-72 sm:w-80 sm:h-80 rounded-2xl overflow-hidden shadow-2xl border-4 border-amber-950/40 group">
            <img
              :src="getSongCoverUrl(previewCoverSong)!"
              :alt="previewCoverSong.title"
              class="w-full h-full object-cover"
            />
            <!-- Vinyl Sheen Overlay -->
            <div class="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none"></div>
          </div>

          <div v-else class="w-72 h-72 sm:w-80 sm:h-80 rounded-2xl border-2 border-dashed border-primary/30 flex flex-col items-center justify-center p-6 text-center bg-base-200/50">
            <span class="text-4xl mb-2 opacity-60">🖼️</span>
            <h4 class="font-bold text-primary text-sm mb-1">Inget omslag kopplat</h4>
            <p class="text-xs text-base-content/70 mb-4">
              Den här låten saknar skivomslag. Du kan generera ett med AI eller använda ett foto från er photoshoot!
            </p>
            <button
              type="button"
              class="btn btn-primary btn-sm rounded-full font-bold shadow-lg shadow-primary/30 gap-2 cursor-pointer"
              @click="createCoverForPreviewSong(previewCoverSong)"
            >
              <span>✨</span>
              <span>Skapa omslag nu</span>
            </button>
          </div>
        </div>

        <!-- Footer -->
        <div class="border-t border-primary/20 p-4 bg-base-200/90 flex items-center justify-between gap-2 flex-wrap">
          <div class="flex items-center gap-2">
            <button
              v-if="getSongCoverUrl(previewCoverSong)"
              type="button"
              class="btn btn-outline btn-primary btn-sm rounded-full font-bold text-xs gap-1.5 cursor-pointer"
              @click="createCoverForPreviewSong(previewCoverSong)"
            >
              <span>🎨</span>
              <span>Byt / Skapa nytt</span>
            </button>

            <button
              v-if="getSongCoverUrl(previewCoverSong)"
              type="button"
              class="btn btn-outline btn-error btn-sm rounded-full font-bold text-xs gap-1 cursor-pointer hover:bg-error/20"
              :disabled="isRemovingCover"
              @click="removeCoverFromSong(previewCoverSong)"
            >
              <span>🗑️</span>
              <span>Ta bort omslag</span>
            </button>
          </div>

          <div class="flex items-center gap-2">
            <a
              v-if="getSongCoverUrl(previewCoverSong)"
              :href="getSongCoverUrl(previewCoverSong)!"
              target="_blank"
              download
              class="btn btn-ghost btn-sm rounded-full text-xs font-mono gap-1"
            >
              <span>⬇️</span>
              <span>Ladda ner</span>
            </a>
            <button
              type="button"
              class="btn btn-ghost btn-sm rounded-full text-xs cursor-pointer"
              @click="showCoverPreviewModal = false"
            >
              Stäng
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
