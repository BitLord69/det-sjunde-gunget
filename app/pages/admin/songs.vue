<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
})

useSeoMeta({
  title: 'Låtskatt & Jukebox | Det 7:e Gunget Admin',
})

const toastMessage = ref('')

const showToast = (msg: string) => {
  toastMessage.value = msg
  setTimeout(() => {
    toastMessage.value = ''
  }, 4000)
}

const { data: songsData, refresh: refreshSongs } = await useFetch<any[]>('/api/songs', {
  default: () => [],
})
const { data: hashtagsData } = await useFetch<any[]>('/api/admin/hashtags', { default: () => [] })
const { data: songsStatsData } = await useFetch<{ stats: any[]; lookupById: Record<string, number>; lookupByTitle: Record<string, number> }>('/api/admin/songs/stats')

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
      showToast('✓ Filen har laddats upp!')
    }
  } catch (err: any) {
    showToast(`⚠️ Uppladdning misslyckades: ${err?.data?.message || err?.message || 'Fel'}`)
  } finally {
    isUploading.value = false
    input.value = ''
  }
}

// ---------------- HASHTAG SELECTION FOR SONGS ----------------
const allHashtags = computed<any[]>(() => (Array.isArray(hashtagsData.value) ? hashtagsData.value : []))

const tagHasCategory = (tag: any, cat: string) => {
  if (!tag || !tag.category) return false
  if (tag.category === 'all') return true
  return tag.category.split(',').map((s: string) => s.trim()).includes(cat)
}

const selectedSongTags = ref<string[]>([])
const availableSongTags = computed(() => {
  return allHashtags.value.filter((t) => t.isActive && tagHasCategory(t, 'song'))
})

const toggleSongTag = (tag: string) => {
  if (selectedSongTags.value.includes(tag)) {
    selectedSongTags.value = selectedSongTags.value.filter((t) => t !== tag)
  } else {
    selectedSongTags.value.push(tag)
  }
}

const songSocialPreview = computed(() => {
  const title = songForm.title.trim() || 'Ny låt'
  const isOriginal = songForm.isOriginal
  const artist = isOriginal ? 'Originalkomposition av Det 7:e Gunget' : `Cover av ${songForm.originalArtist || 'Klassiker'}`
  const tags = selectedSongTags.value.join(' ')
  return `🎵 NY LÅT I JUKEBOXEN!\n\n"${title}" (${artist})\n\nLyssna direkt i retro-jukeboxen på webbplatsen! 🎸✨\n\nhttps://www.det7egunget.se/music\n\n${tags}`
})

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
  if (editingSong.value !== null) {
    const ok = confirm('⚠️ Du har redan ett öppet låtformulär med eventuellt osparade ändringar.\n\nVill du avbryta och skapa en ny låt istället?')
    if (!ok) return
  }
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
  if (editingSong.value !== null && editingSong.value !== s.id) {
    const ok = confirm('⚠️ Du har redan ett öppet låtformulär med eventuellt osparade ändringar.\n\nVill du avbryta och redigera denna låt istället?')
    if (!ok) return
  }
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

const saveSong = async () => {
  if (!songForm.title) {
    showToast('⚠️ Vänligen ange en låttitel!')
    return
  }

  const res = await $fetch<{ success: boolean; social?: any }>('/api/admin/songs', {
    method: 'POST',
    body: {
      id: songForm.id || undefined,
      title: songForm.title,
      isOriginal: songForm.isOriginal,
      originalArtist: songForm.isOriginal ? null : songForm.originalArtist,
      embedProvider: songForm.embedProvider,
      embedUrl: songForm.embedUrl,
      audioUrl: songForm.audioUrl,
      coverImage: songForm.coverImage,
      duration: songForm.duration ? parseInt(songForm.duration, 10) : null,
      lyrics: songForm.lyrics,
      lyricsEn: songForm.lyricsEn,
      chords: songForm.chords,
      postToSocials: songForm.postToSocials,
      hashtags: selectedSongTags.value,
    },
  })

  editingSong.value = null
  await refreshSongs()
  if (res.social) {
    if (res.social.success) {
      showToast(`✓ Låten sparades! 📱 ${res.social.message}`)
    } else {
      showToast(`⚠️ Låten sparades lokalt, men social publicering misslyckades: ${res.social.message}`)
    }
  } else {
    showToast('✓ Låten har sparats!')
  }
}

// ---------------- SOCIAL SHARE MODAL ----------------
const shareModalOpen = ref(false)
const selectedShareSong = ref<any | null>(null)

const openShareSong = (song: any) => {
  selectedShareSong.value = song
  shareModalOpen.value = true
}

const onSocialPublished = (social: any) => {
  showToast(`✓ ${social.message || 'Låten har publicerats på Facebook!'}`)
}

const deleteSong = async (id: string) => {
  if (!confirm('Är du säker på att du vill ta bort denna låt?')) return
  await $fetch('/api/admin/songs', {
    method: 'DELETE',
    body: { id },
  })
  await refreshSongs()
  showToast('✓ Låten togs bort.')
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
const aiEngineHealth = ref<{ engine: string; available: boolean; message: string } | null>(null)
const isCheckingEngine = ref(false)
const generatedCoverResult = ref<{
  success: boolean
  url: string
  coverUrl?: string
  engine?: string
  styleName?: string
  title?: string
  prompt?: string
} | null>(null)
const aiGenerationError = ref<string | null>(null)

const checkEngineHealth = async () => {
  isCheckingEngine.value = true
  try {
    const res = await $fetch<{ engine: string; available: boolean; message: string }>('/api/admin/songs/cover-engine-status')
    aiEngineHealth.value = res
  } catch (err: any) {
    aiEngineHealth.value = {
      engine: 'gemini',
      available: false,
      message: err?.data?.statusMessage || 'Kunde inte kontakta AI-motorn',
    }
  } finally {
    isCheckingEngine.value = false
  }
}

const openAiCoverGenerator = () => {
  generatedCoverResult.value = null
  aiGenerationError.value = null
  showAiCoverModal.value = true
  checkEngineHealth()
}

const generateCoverWithAi = async () => {
  isGeneratingCover.value = true
  aiGenerationError.value = null
  aiCoverProgressStep.value = 1

  const stepTimer = setInterval(() => {
    if (aiCoverProgressStep.value < 4) {
      aiCoverProgressStep.value++
    }
  }, 2200)

  try {
    const res = await $fetch<{
      success: boolean
      coverUrl: string
      url: string
      source: string
      engine: string
      styleName: string
      title?: string
      prompt?: string
    }>('/api/admin/songs/generate-cover', {
      method: 'POST',
      body: {
        title: songForm.title || 'Det 7:e Gunget Singel',
        isOriginal: songForm.isOriginal,
        originalArtist: songForm.originalArtist,
        lyrics: songForm.lyrics,
        era: aiEra.value,
        stylePreset: aiStylePreset.value,
        includeBand: aiIncludeBand.value,
        customPrompt: aiPromptMode.value === 'custom' ? aiCustomPrompt.value : undefined,
        textRenderer: aiTextRenderer.value,
        source: aiCoverSource.value,
      },
    })

    clearInterval(stepTimer)
    const coverResultUrl = res.coverUrl || res.url
    if (res.success && coverResultUrl) {
      generatedCoverResult.value = {
        ...res,
        url: coverResultUrl,
        coverUrl: coverResultUrl,
      }
      showToast('✓ Singelomslaget har skapats! Granska i förhandsvisningen till höger.')
    } else {
      aiGenerationError.value = 'Inget bildresultat returnerades från servern.'
    }
  } catch (err: any) {
    clearInterval(stepTimer)
    const errMsg = err?.data?.statusMessage || err?.data?.message || err?.message || 'Ett fel uppstod vid bildgenerering.'
    aiGenerationError.value = errMsg
    showToast(`⚠️ ${errMsg}`)
  } finally {
    isGeneratingCover.value = false
  }
}

const applyGeneratedCover = () => {
  const chosenUrl = generatedCoverResult.value?.coverUrl || generatedCoverResult.value?.url
  if (chosenUrl) {
    songForm.coverImage = chosenUrl
    showAiCoverModal.value = false
    showToast('✓ Omslaget har valts för låten! Kom ihåg att spara låten när du är klar.')
  }
}

// ---------------- COVER PREVIEW MODAL ----------------
const previewCoverModal = ref<{ title: string; coverImage: string; isOriginal: boolean; originalArtist?: string; audioUrl?: string } | null>(null)

const openCoverPreview = (song: any) => {
  previewCoverModal.value = {
    title: song.title,
    coverImage: song.coverImage || '',
    isOriginal: !!song.isOriginal,
    originalArtist: song.originalArtist,
    audioUrl: song.audioUrl,
  }
}

const hasSongCover = (song: any): boolean => {
  return !!(song.coverImage && song.coverImage.trim().length > 0)
}

// ---------------- STATS MODAL ----------------
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
  const norm = (song.title || '').toLowerCase().trim()
  const statEntry = (songsStatsData.value?.stats || []).find(
    (st: any) => (st.songId && st.songId === song.id) || (st.title && st.title.toLowerCase().trim() === norm)
  )
  selectedSongStatsModal.value = {
    song,
    totalPlays: getSongPlayCount(song),
    history: statEntry?.gigs || [],
  }
}

// ---------------- SORTING ----------------
const songSortKey = ref<'title' | 'cover' | 'isOriginal' | 'originalArtist' | 'embedProvider' | 'playCount'>('title')
const songSortDir = ref<'asc' | 'desc'>('asc')

const toggleSongSort = (key: 'title' | 'cover' | 'isOriginal' | 'originalArtist' | 'embedProvider' | 'playCount') => {
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
      return (a.title || '').localeCompare(b.title || '', 'sv') * dir
    }
    if (songSortKey.value === 'cover') {
      const covA = hasSongCover(a) ? 1 : 0
      const covB = hasSongCover(b) ? 1 : 0
      return (covA - covB) * dir
    }
    if (songSortKey.value === 'isOriginal') {
      const origA = a.isOriginal ? 1 : 0
      const origB = b.isOriginal ? 1 : 0
      return (origA - origB) * dir
    }
    if (songSortKey.value === 'originalArtist') {
      const artA = a.isOriginal ? '—' : (a.originalArtist || '')
      const artB = b.isOriginal ? '—' : (b.originalArtist || '')
      return artA.localeCompare(artB, 'sv') * dir
    }
    if (songSortKey.value === 'embedProvider') {
      return (a.embedProvider || '').localeCompare(b.embedProvider || '', 'sv') * dir
    }
    if (songSortKey.value === 'playCount') {
      const countA = getSongPlayCount(a)
      const countB = getSongPlayCount(b)
      return (countA - countB) * dir
    }
    return 0
  })
})

onBeforeRouteLeave((to, from, next) => {
  if (editingSong.value !== null) {
    const answer = window.confirm('⚠️ Du har ett öppet låtformulär.\n\nVill du verkligen lämna sidan?')
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
    <AdminNavBar :dirty="editingSong !== null" />

    <!-- SONGS & JUKEBOX -->
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="font-heading text-2xl text-primary font-bold">Hantera låtskatt & jukebox</h2>
          <p class="text-xs text-base-content/70">Lägg till egna låtar och covers från Spotify, Bandcamp eller YouTube.</p>
        </div>
        <button type="button" class="btn btn-primary btn-sm rounded-full font-bold px-5 cursor-pointer" @click="openAddSong">
          + Ny låt
        </button>
      </div>

      <!-- Add/Edit Song Modal Form -->
      <div v-if="editingSong" class="stage-card p-6 sm:p-8 rounded-2xl border border-primary/40 space-y-4 shadow-2xl">
        <div class="flex items-center justify-between border-b border-primary/20 pb-3">
          <h3 class="font-heading text-xl text-primary font-bold">
            {{ editingSong === 'new' ? 'Lägg till ny låt' : 'Redigera låt' }}
          </h3>
          <span class="badge badge-warning badge-sm font-bold animate-pulse">
            ⚠️ Osparade ändringar
          </span>
        </div>

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

            <!-- Live Cover Preview in Edit Form -->
            <div v-if="songForm.coverImage" class="flex items-center gap-4 pt-2">
              <img
                :src="songForm.coverImage"
                alt="Förhandsgranskning"
                class="w-16 h-16 object-cover rounded-lg border border-primary/40 shadow"
              />
              <div class="text-xs">
                <span class="text-emerald-400 font-bold block">✓ Omslag tilldelat</span>
                <span class="text-[10px] text-base-content/60 font-mono truncate max-w-xs block">{{ songForm.coverImage }}</span>
              </div>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Inbäddningsplattform</label>
            <select v-model="songForm.embedProvider" class="select select-bordered w-full bg-base-200 select-sm">
              <option value="spotify">Spotify</option>
              <option value="bandcamp">Bandcamp</option>
              <option value="youtube">YouTube</option>
              <option value="soundcloud">SoundCloud</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Låtlängd i sekunder (valfritt)</label>
            <input v-model="songForm.duration" type="number" placeholder="245" class="input input-bordered w-full bg-base-200 input-sm font-mono text-xs" />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-xs font-bold text-secondary mb-1">Låt-URL / Inbäddnings-ID</label>
            <input v-model="songForm.embedUrl" type="text" placeholder="https://open.spotify.com/track/..." class="input input-bordered w-full bg-base-200 input-sm font-mono text-xs" />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Låttext (svenska)</label>
            <textarea v-model="songForm.lyrics" rows="3" placeholder="Sjunger om regnet i Malmö..." class="textarea textarea-bordered w-full bg-base-200 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Lyrics (English)</label>
            <textarea v-model="songForm.lyricsEn" rows="3" placeholder="English lyrics..." class="textarea textarea-bordered w-full bg-base-200 text-sm" />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-xs font-bold text-secondary mb-1">Ackord (t.ex. E7 - A7 - B7)</label>
            <input v-model="songForm.chords" type="text" placeholder="E7 - A7 - B7" class="input input-bordered w-full bg-base-200 input-sm font-mono text-xs" />
          </div>
          <!-- Social Sharing & Hashtags Toggle -->
          <div class="sm:col-span-2 p-4 bg-base-200/80 rounded-xl border border-primary/20 space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <span class="font-bold text-xs text-primary flex items-center gap-1">
                  <span>📱</span> Publicera automatiskt på Facebook & Instagram
                </span>
                <p class="text-[11px] text-base-content/60">
                  Skapar ett färdigt socialt inlägg i kön när du sparar låten.
                </p>
              </div>
              <input v-model="songForm.postToSocials" type="checkbox" class="toggle toggle-primary toggle-sm" />
            </div>

            <!-- Hashtag Selector for this Song Post -->
            <div v-if="songForm.postToSocials" class="pt-2 border-t border-primary/10 space-y-2">
              <label class="block text-[11px] font-bold text-secondary">
                Välj hashtags för detta inlägg:
              </label>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="t in availableSongTags"
                  :key="t.id"
                  type="button"
                  class="btn btn-xs rounded-full cursor-pointer font-mono"
                  :class="selectedSongTags.includes(t.tag) ? 'btn-primary font-bold' : 'btn-ghost border border-base-content/20 text-base-content/70'"
                  @click="toggleSongTag(t.tag)"
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
                  {{ songSocialPreview }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-3 pt-3">
          <button type="button" class="btn btn-primary btn-sm rounded-full font-bold px-6 cursor-pointer" @click="saveSong">
            Spara låt
          </button>
          <button type="button" class="btn btn-ghost btn-sm rounded-full cursor-pointer" @click="editingSong = null">
            Avbryt
          </button>
        </div>
      </div>

      <!-- Songs Table with Interactive Sorting -->
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
                    :data-tip="songSortKey === 'title' ? (songSortDir === 'asc' ? 'Sorterat A till Ö' : 'Sorterat Ö till A') : 'Klicka för att sortera efter låttitel'"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="transition-transform duration-300" :class="[songSortKey === 'title' ? (songSortDir === 'asc' ? 'rotate-0 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100' : 'rotate-180 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100') : 'opacity-30 group-hover:opacity-80 rotate-0 text-base-content']">
                      <path d="M12 2C6.5 2 3 5.5 3 10C3 16 10 21.5 12 22.5C14 21.5 21 16 21 10C21 5.5 17.5 2 12 2Z" fill="currentColor" />
                    </svg>
                  </span>
                </button>
              </th>

              <!-- OMSLAG -->
              <th class="text-center">
                <button
                  type="button"
                  class="group inline-flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-wider transition-all cursor-pointer py-1 px-1.5 rounded mx-auto"
                  :class="songSortKey === 'cover' ? 'text-primary font-black bg-primary/10 border-b-2 border-primary' : 'text-secondary hover:text-primary hover:bg-base-300/60'"
                  @click="toggleSongSort('cover')"
                >
                  <span>Omslag</span>
                  <span
                    class="tooltip tooltip-bottom inline-flex items-center"
                    :data-tip="songSortKey === 'cover' ? (songSortDir === 'asc' ? 'Sorterat: Har omslag först' : 'Sorterat: Saknar omslag först') : 'Klicka för att sortera efter omslag'"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="transition-transform duration-300" :class="[songSortKey === 'cover' ? (songSortDir === 'asc' ? 'rotate-0 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100' : 'rotate-180 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100') : 'opacity-30 group-hover:opacity-80 rotate-0 text-base-content']">
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
                    :data-tip="songSortKey === 'isOriginal' ? (songSortDir === 'asc' ? 'Sorterat: Original först' : 'Sorterat: Covers först') : 'Klicka för att sortera efter låttyp'"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="transition-transform duration-300" :class="[songSortKey === 'isOriginal' ? (songSortDir === 'asc' ? 'rotate-0 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100' : 'rotate-180 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100') : 'opacity-30 group-hover:opacity-80 rotate-0 text-base-content']">
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
                    :data-tip="songSortKey === 'originalArtist' ? (songSortDir === 'asc' ? 'Sorterat A till Ö' : 'Sorterat Ö till A') : 'Klicka för att sortera efter artist'"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="transition-transform duration-300" :class="[songSortKey === 'originalArtist' ? (songSortDir === 'asc' ? 'rotate-0 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100' : 'rotate-180 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100') : 'opacity-30 group-hover:opacity-80 rotate-0 text-base-content']">
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
                    :data-tip="songSortKey === 'embedProvider' ? (songSortDir === 'asc' ? 'Sorterat A till Ö' : 'Sorterat Ö till A') : 'Klicka för att sortera efter plattform'"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="transition-transform duration-300" :class="[songSortKey === 'embedProvider' ? (songSortDir === 'asc' ? 'rotate-0 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100' : 'rotate-180 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100') : 'opacity-30 group-hover:opacity-80 rotate-0 text-base-content']">
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
                    :data-tip="songSortKey === 'playCount' ? (songSortDir === 'asc' ? 'Sorterat: Minst spelade först' : 'Sorterat: Mest spelade först') : 'Klicka för att sortera efter antal live-spelningar'"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="transition-transform duration-300" :class="[songSortKey === 'playCount' ? (songSortDir === 'asc' ? 'rotate-0 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100' : 'rotate-180 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100') : 'opacity-30 group-hover:opacity-80 rotate-0 text-base-content']">
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
                  <span v-if="hasSongCover(song)" class="text-base">💿</span>
                  <span v-else class="text-rose-400 font-mono text-[10px] font-bold">⨉</span>
                </button>
              </td>
              <td>
                <span class="badge badge-xs font-mono uppercase text-[9px]" :class="song.isOriginal ? 'badge-primary' : 'badge-secondary'">
                  {{ song.isOriginal ? 'Original' : 'Cover' }}
                </span>
              </td>
              <td class="text-base-content/70 italic">{{ song.originalArtist || '—' }}</td>
              <td class="font-mono text-[10px] text-base-content/60">{{ song.embedProvider || '—' }}</td>
              <td class="text-center">
                <button
                  type="button"
                  class="btn btn-xs btn-ghost font-mono text-[11px] gap-1 px-2 hover:bg-primary/20 hover:text-primary transition-colors cursor-pointer"
                  title="Klicka för att se vilka gig låten har spelats på"
                  @click="openSongStats(song)"
                >
                  <span>🎸</span>
                  <span>{{ getSongPlayCount(song) }} ggr</span>
                </button>
              </td>
              <td class="text-right whitespace-nowrap">
                <div class="inline-flex items-center justify-end gap-2">
                  <button
                    type="button"
                    class="btn btn-xs btn-outline btn-secondary rounded cursor-pointer inline-flex items-center justify-center gap-1.5 font-sans"
                    title="Dela låten till Facebook & Sociala medier"
                    @click="openShareSong(song)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="6" r="3" />
                      <circle cx="18" cy="18" r="3" />
                      <line x1="8.7" y1="10.7" x2="15.3" y2="7.3" />
                      <line x1="8.7" y1="13.3" x2="15.3" y2="16.7" />
                    </svg>
                    <span>Dela</span>
                  </button>
                  <button
                    type="button"
                    class="btn btn-xs btn-outline btn-primary rounded cursor-pointer inline-flex items-center justify-center font-sans"
                    @click="openEditSong(song)"
                  >
                    Redigera
                  </button>
                  <button
                    type="button"
                    class="btn btn-xs btn-outline btn-error rounded cursor-pointer inline-flex items-center justify-center font-sans"
                    @click="deleteSong(song.id)"
                  >
                    Ta bort
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- AI SINGLE COVER GENERATOR MODAL -->
    <div
      v-if="showAiCoverModal"
      class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-hidden"
    >
      <div class="stage-card max-w-4xl w-full max-h-[92vh] flex flex-col rounded-3xl border-2 border-primary/40 shadow-2xl bg-base-100 relative overflow-hidden">
        <!-- 1. Header -->
        <div class="flex items-start justify-between gap-4 border-b border-primary/20 p-4 sm:p-5 flex-shrink-0 bg-base-100">
          <div class="space-y-0.5">
            <div class="flex items-center gap-2">
              <span class="text-2xl animate-pulse">✨</span>
              <h3 class="font-heading text-lg sm:text-xl text-primary font-black">
                Singelomslag-Studio (7"-singel)
              </h3>
            </div>
            <p class="text-[11px] text-base-content/70">
              Skapa autentiskt vinylsingelomslag för <strong class="text-primary font-bold">{{ songForm.title || 'låten' }}</strong>.
            </p>
          </div>

          <div class="flex items-center gap-2">
            <!-- Engine Indicator -->
            <div
              v-if="aiEngineHealth"
              class="badge badge-sm gap-1.5 font-mono py-2.5 px-3 border shadow-sm"
              :class="aiEngineHealth.available ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'bg-amber-500/15 border-amber-500/40 text-amber-300'"
              :title="aiEngineHealth.message"
            >
              <span class="w-2 h-2 rounded-full" :class="aiEngineHealth.available ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'" />
              <span class="font-bold text-[10px]">{{ aiEngineHealth.available ? 'Google Gemini AI' : 'Lokal Grafikmotor' }}</span>
            </div>

            <button
              type="button"
              class="btn btn-sm btn-circle btn-ghost text-lg cursor-pointer"
              :disabled="isGeneratingCover"
              @click="showAiCoverModal = false"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- 2. Body (2-Column Grid) -->
        <div class="p-4 sm:p-6 overflow-y-auto flex-1">
          <div class="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            <!-- LEFT COLUMN: Inställningar -->
            <div class="md:col-span-7 space-y-4 text-xs">
              <!-- Song Info -->
              <div class="p-3 bg-base-200/80 rounded-xl border border-primary/20 flex items-center justify-between">
                <div>
                  <span class="text-[10px] uppercase font-bold text-secondary tracking-wider block">Låt som illustreras</span>
                  <span class="font-heading font-black text-primary text-sm sm:text-base">{{ songForm.title || 'Namnlös låt' }}</span>
                  <span v-if="!songForm.isOriginal && songForm.originalArtist" class="text-base-content/70 ml-1.5 font-mono text-[11px]">
                    (Original av {{ songForm.originalArtist }})
                  </span>
                </div>
                <span class="badge badge-sm font-mono" :class="songForm.isOriginal ? 'badge-primary font-bold' : 'badge-outline border-secondary text-secondary'">
                  {{ songForm.isOriginal ? 'A-sida (Egen låt)' : 'B-sida (Cover)' }}
                </span>
              </div>

              <!-- Välj omslagstyp -->
              <div class="space-y-1.5">
                <span class="text-[11px] font-bold text-secondary flex items-center gap-1.5">
                  <span>🎨</span> Välj bildkälla:
                </span>
                <div class="grid grid-cols-2 gap-2 bg-base-200 p-1 rounded-2xl border border-white/5 font-bold font-mono">
                  <button
                    type="button"
                    class="py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                    :class="aiCoverSource === 'photo' ? 'bg-primary text-neutral font-black shadow' : 'text-base-content/70 hover:text-primary'"
                    :disabled="isGeneratingCover"
                    @click="aiCoverSource = 'photo'"
                  >
                    <span>📸</span>
                    <span>Vårt bandfoto</span>
                  </button>

                  <button
                    type="button"
                    class="py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                    :class="aiCoverSource === 'ai' ? 'bg-primary text-neutral font-black shadow' : 'text-base-content/70 hover:text-primary'"
                    :disabled="isGeneratingCover"
                    @click="aiCoverSource = 'ai'"
                  >
                    <span>🤖</span>
                    <span>Google Gemini AI</span>
                  </button>
                </div>
              </div>

              <!-- Era & Style Presets -->
              <div class="grid sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-bold text-secondary mb-1">Tidsperiod & känsla:</label>
                  <select v-model="aiEra" :disabled="isGeneratingCover" class="select select-bordered w-full bg-base-200 select-sm text-xs">
                    <option value="70s">Autentiskt 70-tal (Skandinavisk Bluesrock)</option>
                    <option value="60s">Rått 60-tal (Chicago Blues Sound)</option>
                  </select>
                </div>

                <div>
                  <label class="block text-xs font-bold text-secondary mb-1">Skivbolagsstil & Färg:</label>
                  <select v-model="aiStylePreset" :disabled="isGeneratingCover" class="select select-bordered w-full bg-base-200 select-sm text-xs">
                    <option value="auto">🎲 Auto (Baserat på låten)</option>
                    <option value="sonet_gold">🟡 Sonet Grammofon (Guld & Svart)</option>
                    <option value="chess_crimson">🔴 Chess Records (Djupröd & Kräm)</option>
                    <option value="stax_amber">🟠 Stax / Volt (Bärnsten & Rost)</option>
                    <option value="bluenote_navy">🔵 Blue Note (Nattblå & Guld)</option>
                    <option value="vintage_cream">⚪ Minimalistisk Vintage (Kräm & Brunt)</option>
                  </select>
                </div>
              </div>

              <!-- Engine Status Notice -->
              <div v-if="aiEngineHealth" class="p-2.5 bg-base-200/90 rounded-xl border border-primary/20 flex items-center justify-between text-[11px]">
                <span class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full" :class="aiEngineHealth.available ? 'bg-emerald-400' : 'bg-amber-400'" />
                  <span>{{ aiEngineHealth.message }}</span>
                </span>
                <span class="font-mono text-[10px] text-base-content/60 uppercase">Motor: {{ aiEngineHealth.engine }}</span>
              </div>
            </div>

            <!-- RIGHT COLUMN: Live Förhandsgranskning -->
            <div class="md:col-span-5 flex flex-col items-center justify-center p-4 bg-black/50 rounded-2xl border border-primary/30 min-h-[300px] relative overflow-hidden">
              <!-- STATE 1: Genererar -->
              <div v-if="isGeneratingCover" class="py-6 flex flex-col items-center justify-center text-center space-y-4">
                <div class="relative w-28 h-28 flex items-center justify-center">
                  <div class="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-60 pointer-events-none" />
                  <div class="absolute inset-1 rounded-full border-2 border-primary/40 animate-spin opacity-80" style="animation-duration: 4s;" />
                  <div class="w-24 h-24 rounded-full bg-[#0d0b0a] border-2 border-amber-900/60 shadow-2xl flex items-center justify-center relative overflow-hidden animate-spin" style="animation-duration: 2.5s;">
                    <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-secondary via-primary to-secondary flex flex-col items-center justify-center p-0.5 text-[6px] font-black text-neutral shadow-inner">
                      <span>7:e GUNGET</span>
                      <span>45 RPM</span>
                    </div>
                  </div>
                </div>

                <div class="space-y-1.5 max-w-xs">
                  <h4 class="text-xs font-heading font-black text-primary animate-pulse">
                    {{
                      aiCoverProgressStep === 1
                        ? '1/4 Förbereder komposition...'
                        : aiCoverProgressStep === 2
                        ? '2/4 Applicerar analog färgton & korn...'
                        : aiCoverProgressStep === 3
                        ? '3/4 Målar vintage vinyltypografi...'
                        : '4/4 Färdigställer högupplöst singelfodral...'
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

              <!-- STATE 2: Färdigt resultat -->
              <div v-else-if="generatedCoverResult" class="space-y-3 w-full flex flex-col items-center">
                <div class="relative w-48 sm:w-52 aspect-square flex-shrink-0 group">
                  <!-- Vinyl Disc Peek -->
                  <div class="absolute -top-2 -right-2 w-44 h-44 rounded-full bg-[#0d0b0a] border border-white/10 shadow-xl flex items-center justify-center animate-spin" style="animation-duration: 12s;">
                    <div class="w-10 h-10 rounded-full bg-primary text-neutral text-[7px] font-black flex items-center justify-center">
                      45 RPM
                    </div>
                  </div>

                  <!-- Main Cover Image -->
                  <div class="relative z-10 w-full h-full rounded-lg overflow-hidden border-2 border-amber-900/50 shadow-2xl bg-[#140e0a]">
                    <img
                      :src="generatedCoverResult.coverUrl || generatedCoverResult.url"
                      :alt="generatedCoverResult.title || 'Skivomslag'"
                      class="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <div class="text-center space-y-1">
                  <span class="px-2.5 py-0.5 rounded bg-emerald-800 text-emerald-100 font-mono text-[10px] font-bold">
                    ✓ OMSLAG KLART
                  </span>
                  <p class="text-[11px] text-base-content/80 font-semibold">
                    7"-singelfodral för <strong>{{ songForm.title }}</strong>
                  </p>
                </div>
              </div>

              <!-- STATE 3: Initialt (Tomt) -->
              <div v-else class="py-6 flex flex-col items-center justify-center text-center space-y-3">
                <div class="w-32 h-32 rounded-2xl border-2 border-dashed border-primary/40 bg-base-200/50 flex flex-col items-center justify-center text-primary/60 space-y-1">
                  <span class="text-3xl">💿</span>
                  <span class="text-[10px] font-mono text-base-content/60">Förhandsgranskning</span>
                </div>
                <p class="text-[11px] text-base-content/60 max-w-xs">
                  Klicka på <strong class="text-primary">"Generera singelomslag"</strong> nedan för att skapa och granska omslaget här.
                </p>
              </div>

              <!-- Error Alert if any -->
              <div v-if="aiGenerationError" class="p-2.5 mt-2 bg-error/15 border border-error/40 rounded-xl text-center text-xs text-error font-bold w-full">
                ⚠️ {{ aiGenerationError }}
              </div>
            </div>
          </div>
        </div>

        <!-- 3. Action Footer -->
        <div class="border-t border-primary/20 p-3.5 sm:p-4 bg-base-200/95 backdrop-blur-md flex-shrink-0 flex items-center justify-between gap-2">
          <!-- Initial Mode -->
          <template v-if="!isGeneratingCover && !generatedCoverResult">
            <button
              type="button"
              class="btn btn-ghost btn-sm rounded-full cursor-pointer"
              @click="showAiCoverModal = false"
            >
              Avbryt
            </button>
            <button
              type="button"
              class="btn btn-primary btn-sm rounded-full font-bold px-6 shadow-lg shadow-primary/30 flex items-center gap-2 cursor-pointer"
              @click="generateCoverWithAi"
            >
              <span>{{ aiCoverSource === 'photo' ? '📷' : '✨' }}</span>
              <span>{{ aiCoverSource === 'photo' ? 'Skapa från bandfoto' : 'Generera med AI' }}</span>
            </button>
          </template>

          <!-- Generating Mode -->
          <template v-else-if="isGeneratingCover">
            <span class="text-xs text-primary font-mono animate-pulse flex items-center gap-1.5">
              <span>⏳</span> Skapar singelomslag...
            </span>
            <button
              type="button"
              class="btn btn-ghost btn-sm rounded-full text-xs cursor-pointer"
              @click="showAiCoverModal = false"
            >
              Avbryt
            </button>
          </template>

          <!-- Finished Result Mode: User can preview, re-generate or accept -->
          <template v-else-if="generatedCoverResult">
            <button
              type="button"
              class="btn btn-outline btn-sm rounded-full gap-1.5 font-bold text-xs cursor-pointer"
              :disabled="isGeneratingCover"
              @click="generateCoverWithAi"
            >
              <span>🔄</span>
              <span>Generera om / Ny variant</span>
            </button>

            <div class="flex items-center gap-2">
              <button
                type="button"
                class="btn btn-ghost btn-sm rounded-full text-xs cursor-pointer"
                @click="showAiCoverModal = false"
              >
                Avbryt
              </button>
              <button
                type="button"
                class="btn btn-primary btn-sm rounded-full font-bold px-5 shadow-lg shadow-primary/30 text-xs sm:text-sm cursor-pointer"
                @click="applyGeneratedCover"
              >
                ✓ Använd detta omslag
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- COVER PREVIEW MODAL -->
    <div
      v-if="previewCoverModal"
      class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
      @click="previewCoverModal = null"
    >
      <div
        class="stage-card max-w-md w-full p-6 rounded-3xl border border-primary/50 shadow-2xl space-y-4 text-center bg-base-100"
        @click.stop
      >
        <div class="flex items-center justify-between border-b border-primary/20 pb-3">
          <h3 class="font-heading text-lg text-primary font-bold truncate">{{ previewCoverModal.title }}</h3>
          <button type="button" class="btn btn-xs btn-circle btn-ghost cursor-pointer" @click="previewCoverModal = null">✕</button>
        </div>

        <div class="aspect-square bg-base-300 rounded-2xl overflow-hidden shadow-2xl border border-primary/30 relative">
          <NuxtImg
            v-if="previewCoverModal.coverImage"
            :src="previewCoverModal.coverImage"
            :alt="previewCoverModal.title"
            class="w-full h-full object-cover"
          />
          <div v-else class="flex flex-col items-center justify-center h-full p-6 text-base-content/50 space-y-2">
            <span class="text-4xl">🎵</span>
            <span class="text-xs">Inget skivomslag tilldelat</span>
          </div>
        </div>

        <div class="text-xs text-base-content/70">
          <span>{{ previewCoverModal.isOriginal ? 'Originalkomposition av Det 7:e Gunget' : `Cover av ${previewCoverModal.originalArtist || 'Okänd'}` }}</span>
        </div>
      </div>
    </div>

    <!-- SONG LIVE PLAY STATISTICS MODAL -->
    <div
      v-if="selectedSongStatsModal"
      class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
      @click="selectedSongStatsModal = null"
    >
      <div
        class="stage-card max-w-xl w-full p-6 sm:p-8 rounded-3xl border border-primary/40 shadow-2xl space-y-5 bg-base-100 max-h-[90vh] overflow-y-auto"
        @click.stop
      >
        <div class="flex items-start justify-between gap-4 border-b border-primary/20 pb-4">
          <div>
            <span class="text-xs font-mono uppercase text-secondary font-bold">Live-statistik</span>
            <h3 class="font-heading text-2xl text-primary font-bold">{{ selectedSongStatsModal.song?.title }}</h3>
            <span class="text-xs text-base-content/70">
              Spelad totalt <strong class="text-amber-300 font-bold font-mono">{{ selectedSongStatsModal.totalPlays }} gånger</strong> live.
            </span>
          </div>
          <button type="button" class="btn btn-sm btn-circle btn-ghost cursor-pointer" @click="selectedSongStatsModal = null">✕</button>
        </div>

        <div class="space-y-3">
          <h4 class="font-heading text-sm text-primary font-bold">Spelhistorik:</h4>
          <div v-if="selectedSongStatsModal.history?.length > 0" class="space-y-2">
            <div
              v-for="(gig, gIdx) in selectedSongStatsModal.history"
              :key="gIdx"
              class="p-3 bg-base-200/80 rounded-xl border border-primary/20 flex items-center justify-between text-xs"
            >
              <div>
                <span class="font-bold text-primary block">{{ gig.venue }}, {{ gig.city }}</span>
                <span class="text-[11px] text-base-content/60 font-mono">{{ new Date(gig.date).toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' }) }}</span>
              </div>
              <span class="badge badge-sm badge-primary font-mono text-[10px]">{{ gig.setName || 'Set 1' }}</span>
            </div>
          </div>
          <div v-else class="text-center py-6 text-base-content/60 italic text-xs">
            Låten finns ännu inte inlagd i något genomfört eller planerat gig.
          </div>
        </div>
      </div>
    </div>

    <!-- SOCIAL SHARE MODAL -->
    <AdminSocialShareModal
      v-model="shareModalOpen"
      type="song"
      :item="selectedShareSong"
      @published="onSocialPublished"
    />
  </div>
</template>
