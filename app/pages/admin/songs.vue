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

import type { Song } from '~/types'

interface AdminHashtag {
  id: string
  tag: string
  category?: string | null
  isActive?: boolean | number | null
}

interface SongStatEntry {
  songId?: string | null
  title?: string | null
  count?: number
  gigs?: Array<{ id: string; venue: string; city: string; date: string | number }>
}

const { data: songsData, refresh: refreshSongs } = await useFetch<Song[]>('/api/songs', {
  default: () => [],
  headers: { 'Cache-Control': 'no-cache' },
})
const { data: hashtagsData } = await useFetch<AdminHashtag[]>('/api/admin/hashtags', { default: () => [] })
const { data: songsStatsData } = await useFetch<{ stats: SongStatEntry[]; lookupById: Record<string, number>; lookupByTitle: Record<string, number> }>('/api/admin/songs/stats')
const { data: galleryItemsData } = await useFetch<Array<{ id: string; mediaUrl: string; captionSv?: string; category?: string; epkTitleSv?: string }>>('/api/gallery', {
  default: () => [],
})
const availableGalleryPhotos = computed(() => {
  return (galleryItemsData.value || []).filter((item) => (item.category === 'photo' || !item.category) && item.mediaUrl)
})

const { isUploading, uploadProgress, uploadAdminFile } = useAdminUpload()
const { translate, isFieldTranslating } = useTranslation()

const translateField = async (sourceText: string, targetSetter: (val: string) => void, fieldId: string) => {
  if (!sourceText || !sourceText.trim()) {
    showToast('⚠️ Fyll i den svenska texten först!')
    return
  }
  try {
    showToast('⏳ Översätter låttext till engelska med AI...')
    const res = await translate(sourceText, fieldId)
    targetSetter(res)
    showToast('✓ Översatt till engelska!')
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Kunde inte översätta'
    showToast(`⚠️ ${msg}`)
  }
}

const uploadFile = async (event: Event, targetCallback: (url: string) => void) => {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return
  const file = input.files[0]
  if (!file) return

  try {
    showToast(`⏳ Laddar upp ${file.name}...`)
    const url = await uploadAdminFile(file, {
      onProgress: (p) => {
        if (p > 0 && p < 100) {
          showToast(`⏳ Laddar upp ${file.name} (${p}%)...`)
        }
      },
    })
    targetCallback(url)
    showToast('✓ Filen har laddats upp!')
  } catch (err: unknown) {
    console.error('[Upload Failed]:', err)
    const msg = err instanceof Error ? err.message : 'Kunde inte ladda upp filen'
    showToast(`⚠️ Uppladdning misslyckades: ${msg}`)
  } finally {
    input.value = ''
  }
}

// ---------------- HASHTAG SELECTION FOR SONGS ----------------
const allHashtags = computed<AdminHashtag[]>(() => (Array.isArray(hashtagsData.value) ? hashtagsData.value : []))

const tagHasCategory = (tag: AdminHashtag, cat: string) => {
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
const editingSong = ref<string | null>(null)
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
  uploadedCoverPhoto.value = null
  aiCatalogNumber.value = ''
  songForm.duration = ''
  songForm.lyrics = ''
  songForm.lyricsEn = ''
  songForm.chords = ''
  songForm.postToSocials = false
  selectedSongTags.value = availableSongTags.value.map((t) => t.tag)
  editingSong.value = 'new'
  nextTick(() => {
    if (import.meta.client) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  })
}

const openEditSong = (s: Song) => {
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
  uploadedCoverPhoto.value = null
  aiCatalogNumber.value = ''
  songForm.duration = s.duration ? String(s.duration) : ''
  songForm.lyrics = s.lyrics || ''
  songForm.lyricsEn = s.lyricsEn || ''
  songForm.chords = s.chords || ''
  songForm.postToSocials = false
  selectedSongTags.value = availableSongTags.value.map((t) => t.tag)
  editingSong.value = s.id
  nextTick(() => {
    if (import.meta.client) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  })
}

const saveSong = async () => {
  if (!songForm.title) {
    showToast('⚠️ Vänligen ange en låttitel!')
    return
  }

  const res = await $fetch<{ success: boolean; social?: { success?: boolean; message?: string } }>('/api/admin/songs', {
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
const selectedShareSong = ref<Song | null>(null)

const openShareSong = (song: Song) => {
  selectedShareSong.value = song
  shareModalOpen.value = true
}

const onSocialPublished = (social: { message?: string }) => {
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

// ---------------- COVER STUDIO (7"-SINGEL ARTWORK) ----------------
const showAiCoverModal = ref(false)
const isGeneratingCover = ref(false)
const aiCoverProgressStep = ref(1)
const aiCoverSource = ref<'photo' | 'ai'>('photo')
const photoSubSource = ref<'band' | 'gallery' | 'upload'>('band')

const bandPhotosList = [
  { label: 'Bandfoto 1: Scenpose med instrument', path: '/media/band/21..7de Gunget photoshoot1 21-6 26-3.jpg' },
  { label: 'Bandfoto 2: Hela bandet leende', path: '/media/band/19..7de Gunget photoshoot1 21-6 26-5.jpg' },
  { label: 'Bandfoto 3: Rå live-attityd & mikrofon', path: '/media/band/17..7de Gunget photoshoot1 21-6 26-4.jpg' },
  { label: 'Bandfoto 4: Närbild instrument & groove', path: '/media/band/10..7de Gunget photoshoot1 21-6 26-16.jpg' },
  { label: 'Bandfoto 5: Klassisk 70-tals posering', path: '/media/band/6..7de Gunget photoshoot1 21-6 26-12.jpg' },
  { label: 'Bandfoto 6: Spelglädje i studion', path: '/media/band/2..7de Gunget photoshoot1 21-6 26-20.jpg' },
  { label: 'Bandfoto 7: Live-ögonblick & dynamik', path: '/media/band/1..7de Gunget photoshoot1 21-6 26-21.jpg' },
]

const selectedBandPhoto = ref(bandPhotosList[0]?.path || '/media/band/21..7de Gunget photoshoot1 21-6 26-3.jpg')
const selectedGalleryPhoto = ref<string>('')
const uploadedCoverPhoto = ref<string | null>(null)

const aiLayout = ref<'top_bottom' | 'diagonal_sash' | 'sidebar_modern' | 'poster_frame' | 'center_badge' | 'auto'>('top_bottom')
const aiStylePreset = ref<'auto' | 'sonet_gold' | 'chess_crimson' | 'stax_amber' | 'bluenote_navy' | 'vintage_cream' | 'harvest_green' | 'monochrome_accent'>('auto')
const aiAgingEffect = ref<'none' | 'ringwear' | 'worn_cardboard' | 'both'>('ringwear')
const aiPhotoFilter = ref<'natural' | 'vintage_warm' | 'bw' | 'punchy'>('vintage_warm')
const aiBadgeFormat = ref<'45_rpm' | 'stereo' | 'mono'>('45_rpm')
const aiCustomSubtitle = ref('')
const aiCatalogNumber = ref('')

const generateFunCatalogNumber = () => {
  const prefixes = ['D7G', 'GUNGET', 'BLUES', 'SEVENTH', 'GROOVE', 'SONET', 'CHESS', 'DELTA', 'MOJO', 'STAX', 'HARVEST', 'CHICAGO']
  const formats = ['45', 'SP', '7', 'EP']
  const randomNum = Math.floor(Math.random() * 899) + 100
  const p = prefixes[Math.floor(Math.random() * prefixes.length)] || 'D7G'
  const f = formats[Math.floor(Math.random() * formats.length)] || '45'
  return `${p}-${f}-${randomNum}`
}

const aiEra = ref<'60s' | '70s'>('70s')
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
  layout?: string
  agingEffect?: string
  title?: string
  prompt?: string
} | null>(null)
const aiGenerationError = ref<string | null>(null)
const showCoverZoomModal = ref(false)

const checkEngineHealth = async () => {
  isCheckingEngine.value = true
  try {
    const res = await $fetch<{ engine: string; available: boolean; message: string }>('/api/admin/songs/cover-engine-status')
    aiEngineHealth.value = res
  } catch (err: unknown) {
    const errorObj = err as { data?: { statusMessage?: string } }
    aiEngineHealth.value = {
      engine: 'gemini',
      available: false,
      message: errorObj?.data?.statusMessage || 'Kunde inte kontakta AI-motorn',
    }
  } finally {
    isCheckingEngine.value = false
  }
}

const openAiCoverGenerator = (explicitUploadUrl?: string) => {
  // If the user explicitly uploaded a new photo right now
  if (explicitUploadUrl) {
    uploadedCoverPhoto.value = explicitUploadUrl
    photoSubSource.value = 'upload'
    aiCoverSource.value = 'photo'
  } else {
    // Fresh opening for this song: check if current song uses a photoshoot or gallery image
    const isBand = bandPhotosList.some(b => b.path === songForm.coverImage)
    const isGal = availableGalleryPhotos.value.some(g => g.mediaUrl === songForm.coverImage)
    if (isBand) {
      selectedBandPhoto.value = songForm.coverImage
      uploadedCoverPhoto.value = null
      photoSubSource.value = 'band'
    } else if (isGal) {
      selectedGalleryPhoto.value = songForm.coverImage
      uploadedCoverPhoto.value = null
      photoSubSource.value = 'gallery'
    } else {
      // Default cleanly to band photoshoot and ensure no previous uploaded photo leaks!
      uploadedCoverPhoto.value = null
      photoSubSource.value = 'band'
    }
    aiCoverSource.value = 'photo'
  }

  // Ensure a fun, cool catalog number is assigned
  if (!aiCatalogNumber.value) {
    aiCatalogNumber.value = generateFunCatalogNumber()
  }

  generatedCoverResult.value = null
  aiGenerationError.value = null
  showAiCoverModal.value = true
  checkEngineHealth()

  // Generate a first preview immediately
  generateCoverWithAi()
}

const handleCoverPhotoUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return
  const file = input.files[0]
  if (!file) return

  try {
    showToast(`⏳ Laddar upp ${file.name} till Cover Studio...`)
    const url = await uploadAdminFile(file, {
      onProgress: (p) => {
        if (p > 0 && p < 100) {
          showToast(`⏳ Laddar upp ${file.name} (${p}%)...`)
        }
      },
    })
    uploadedCoverPhoto.value = url
    photoSubSource.value = 'upload'
    aiCoverSource.value = 'photo'
    if (!aiCatalogNumber.value) {
      aiCatalogNumber.value = generateFunCatalogNumber()
    }
    showAiCoverModal.value = true
    showToast('✓ Fotot laddades upp! Skapar nu omslag med bandnamn & låttitel...')
    await generateCoverWithAi()
  } catch (err: unknown) {
    console.error('[Cover Upload Failed]:', err)
    const msg = err instanceof Error ? err.message : 'Kunde inte ladda upp filen'
    showToast(`⚠️ Uppladdning misslyckades: ${msg}`)
  } finally {
    input.value = ''
  }
}

const randomizeCoverStyle = () => {
  const layouts = ['top_bottom', 'diagonal_sash', 'sidebar_modern', 'poster_frame', 'center_badge'] as const
  const styles = ['sonet_gold', 'chess_crimson', 'stax_amber', 'bluenote_navy', 'vintage_cream', 'harvest_green', 'monochrome_accent'] as const
  const agings = ['ringwear', 'both', 'worn_cardboard', 'none'] as const
  const filters = ['vintage_warm', 'natural', 'bw', 'punchy'] as const
  const badges = ['45_rpm', 'stereo', 'mono'] as const

  aiLayout.value = layouts[Math.floor(Math.random() * layouts.length)] || 'top_bottom'
  aiStylePreset.value = styles[Math.floor(Math.random() * styles.length)] || 'sonet_gold'
  aiAgingEffect.value = agings[Math.floor(Math.random() * agings.length)] || 'ringwear'
  aiPhotoFilter.value = filters[Math.floor(Math.random() * filters.length)] || 'vintage_warm'
  aiBadgeFormat.value = badges[Math.floor(Math.random() * badges.length)] || '45_rpm'
  aiCatalogNumber.value = generateFunCatalogNumber()

  // If using gallery photos, pick a random gallery photo
  if (aiCoverSource.value === 'photo' && photoSubSource.value === 'gallery' && availableGalleryPhotos.value.length > 0) {
    const randomGal = availableGalleryPhotos.value[Math.floor(Math.random() * availableGalleryPhotos.value.length)]
    if (randomGal?.mediaUrl) {
      selectedGalleryPhoto.value = randomGal.mediaUrl
    }
  } else if (aiCoverSource.value === 'photo' && photoSubSource.value === 'band') {
    // If using band photos, randomly select a band photoshoot photo
    const randomPhoto = bandPhotosList[Math.floor(Math.random() * bandPhotosList.length)]
    if (randomPhoto) {
      selectedBandPhoto.value = randomPhoto.path
    }
  }

  showToast(`🎲 Slumpade stil & katalognr ${aiCatalogNumber.value}!`)
  generateCoverWithAi()
}

let coverDebounceTimer: ReturnType<typeof setTimeout> | null = null

const debouncedGenerateCover = (delay = 750) => {
  if (coverDebounceTimer) {
    clearTimeout(coverDebounceTimer)
  }
  coverDebounceTimer = setTimeout(() => {
    generateCoverWithAi()
  }, delay)
}

const randomizeCatalogNumber = () => {
  if (coverDebounceTimer) {
    clearTimeout(coverDebounceTimer)
    coverDebounceTimer = null
  }
  aiCatalogNumber.value = generateFunCatalogNumber()
  generateCoverWithAi()
}

const currentCanvasBlob = ref<Blob | null>(null)
const isApplyingCover = ref(false)

const generateCoverWithAi = async () => {
  if (coverDebounceTimer) {
    clearTimeout(coverDebounceTimer)
    coverDebounceTimer = null
  }
  isGeneratingCover.value = true
  aiGenerationError.value = null
  aiCoverProgressStep.value = 1

  const stepTimer = setInterval(() => {
    if (aiCoverProgressStep.value < 4) {
      aiCoverProgressStep.value++
    }
  }, 400)

  try {
    let activePhoto = ''
    if (aiCoverSource.value === 'photo') {
      if (photoSubSource.value === 'upload' && uploadedCoverPhoto.value) {
        activePhoto = uploadedCoverPhoto.value
      } else if (photoSubSource.value === 'gallery' && selectedGalleryPhoto.value) {
        activePhoto = selectedGalleryPhoto.value
      } else if (photoSubSource.value === 'gallery' && availableGalleryPhotos.value[0]?.mediaUrl) {
        activePhoto = availableGalleryPhotos.value[0].mediaUrl
        selectedGalleryPhoto.value = activePhoto
      } else {
        activePhoto = selectedBandPhoto.value || bandPhotosList[0]?.path || '/media/band/21..7de Gunget photoshoot1 21-6 26-3.jpg'
      }

      // 1. Klient-canvas för 100% pålitlig typografi & omedelbar rendering
      try {
        const canvasResult = await renderCoverStudioCanvas({
          title: songForm.title || 'Det 7:e Gunget',
          bandName: 'DET 7:e GUNGET',
          subtitle: aiCustomSubtitle.value || undefined,
          catalogNumber: aiCatalogNumber.value || undefined,
          isOriginal: songForm.isOriginal,
          originalArtist: songForm.originalArtist || undefined,
          layout: aiLayout.value,
          stylePreset: aiStylePreset.value,
          agingEffect: aiAgingEffect.value,
          photoFilter: aiPhotoFilter.value,
          badgeFormat: aiBadgeFormat.value,
          sourceImageUrl: activePhoto,
        })

        clearInterval(stepTimer)
        currentCanvasBlob.value = canvasResult.blob
        generatedCoverResult.value = {
          success: true,
          url: canvasResult.dataUrl,
          coverUrl: canvasResult.dataUrl,
          engine: 'canvas',
          styleName: canvasResult.chosenStyle,
          layout: canvasResult.chosenLayout,
          agingEffect: canvasResult.chosenAging,
          title: songForm.title || 'Det 7:e Gunget',
        }
        showToast('✓ Singelomslag stämplat och klart!')
        return
      } catch (canvasErr) {
        console.warn('[CoverStudio] Client canvas render fallback to server:', canvasErr)
      }
    }

    // 2. Server-generering (vid Gemini AI-konst eller extern CORS-källbild)
    const res = await $fetch<{
      success: boolean
      coverUrl: string
      url: string
      source: string
      engine: string
      styleName: string
      layout?: string
      agingEffect?: string
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
        layout: aiLayout.value,
        agingEffect: aiAgingEffect.value,
        photoFilter: aiPhotoFilter.value,
        badgeFormat: aiBadgeFormat.value,
        subtitle: aiCustomSubtitle.value || undefined,
        catalogNumber: aiCatalogNumber.value || undefined,
        includeBand: aiIncludeBand.value,
        customPrompt: aiPromptMode.value === 'custom' ? aiCustomPrompt.value : undefined,
        textRenderer: aiTextRenderer.value,
        source: aiCoverSource.value,
        photoPath: activePhoto,
        photoUrl: activePhoto,
      },
    })

    clearInterval(stepTimer)
    const coverResultUrl = res.coverUrl || res.url
    if (res.success && coverResultUrl) {
      currentCanvasBlob.value = null
      generatedCoverResult.value = {
        ...res,
        url: coverResultUrl,
        coverUrl: coverResultUrl,
      }
      showToast('✓ Singelomslaget har skapats!')
    } else {
      aiGenerationError.value = 'Inget bildresultat returnerades från servern.'
    }
  } catch (err: unknown) {
    clearInterval(stepTimer)
    const errorObj = err as { data?: { statusMessage?: string; message?: string }; message?: string }
    const errMsg = errorObj?.data?.statusMessage || errorObj?.data?.message || errorObj?.message || 'Ett fel uppstod vid bildgenerering.'
    aiGenerationError.value = errMsg
    showToast(`⚠️ ${errMsg}`)
  } finally {
    isGeneratingCover.value = false
  }
}

const applyGeneratedCover = async () => {
  const chosenUrl = generatedCoverResult.value?.coverUrl || generatedCoverResult.value?.url
  if (!chosenUrl) return

  // Om bilden renderats av klient-canvas som data URL, ladda upp till Vercel Blob / molnet
  if (chosenUrl.startsWith('data:') && currentCanvasBlob.value) {
    try {
      isApplyingCover.value = true
      showToast('⏳ Sparar och laddar upp singelomslaget till molnet...')
      const safeTitle = (songForm.title || 'omslag').toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30)
      const fileName = `cover_${safeTitle}_${Date.now()}.jpg`
      const file = new File([currentCanvasBlob.value], fileName, { type: 'image/jpeg' })
      const uploadedUrl = await uploadAdminFile(file)
      songForm.coverImage = uploadedUrl
      showCoverZoomModal.value = false
      showAiCoverModal.value = false
      showToast('✓ Singelomslaget har sparats och tilldelats låten!')
      return
    } catch (uploadErr: unknown) {
      console.error('[ApplyGeneratedCover Upload Failed]:', uploadErr)
      const msg = uploadErr instanceof Error ? uploadErr.message : 'Kunde inte ladda upp omslaget'
      showToast(`⚠️ Uppladdning misslyckades: ${msg}`)
      return
    } finally {
      isApplyingCover.value = false
    }
  }

  songForm.coverImage = chosenUrl
  showCoverZoomModal.value = false
  showAiCoverModal.value = false
  showToast('✓ Omslaget har tilldelats låten! Kom ihåg att spara låten när du är klar.')
}

// ---------------- COVER PREVIEW MODAL ----------------
const previewCoverModal = ref<{ id?: string; title: string; coverImage: string; isOriginal: boolean; originalArtist?: string | null; audioUrl?: string | null } | null>(null)

const openCoverPreview = (song: Song) => {
  previewCoverModal.value = {
    id: song.id,
    title: song.title,
    coverImage: song.coverImage || '',
    isOriginal: !!song.isOriginal,
    originalArtist: song.originalArtist,
    audioUrl: song.audioUrl,
  }
}

const handleCoverClick = (song: Song) => {
  if (hasSongCover(song)) {
    openCoverPreview(song)
  } else {
    // Song lacks cover: open edit form for this song and directly launch Cover Studio!
    openEditSong(song)
    openAiCoverGenerator()
  }
}

const openCoverStudioForPreviewSong = () => {
  if (!previewCoverModal.value) return
  const list = songsData.value || []
  const s = list.find((x: Song) => x.id === previewCoverModal.value?.id || x.title === previewCoverModal.value?.title)
  previewCoverModal.value = null
  if (s) {
    openEditSong(s)
  }
  openAiCoverGenerator()
}

const hasSongCover = (song: Song): boolean => {
  return !!(song.coverImage && song.coverImage.trim().length > 0)
}

// ---------------- TAP-TO-SYNC LYRICS MODAL ----------------
const showTapToSyncModal = ref(false)
const isAiSyncingLyrics = ref(false)
const tapSyncAudioRef = ref<HTMLAudioElement | null>(null)
const tapSyncAudioCurrentTime = ref(0)
const tapSyncAudioDuration = ref(0)
const tapSyncIsPlaying = ref(false)

interface TapSyncLineItem {
  id: number
  text: string
  timestamp?: number
  isHeader?: boolean
  isSolo?: boolean
}

const tapSyncLines = ref<TapSyncLineItem[]>([])
const tapSyncCurrentIndex = ref(0)

const formatSeconds = (secs: number) => {
  if (isNaN(secs) || secs < 0) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  const ms = Math.floor((secs % 1) * 10)
  return `${m}:${s < 10 ? '0' : ''}${s}.${ms}`
}

const openTapToSync = () => {
  if (!songForm.lyrics || !songForm.lyrics.trim()) {
    showToast('⚠️ Fyll i eller klistra in låttexten först!')
    return
  }

  const parsed = parseLrc(songForm.lyrics)
  tapSyncLines.value = parsed.lines.map((l, i) => ({
    id: i,
    text: l.text,
    timestamp: l.time,
    isHeader: l.isHeader,
    isSolo: l.isSolo,
  })).filter(l => l.text.length > 0 || l.isHeader)

  const firstUnstamped = tapSyncLines.value.findIndex(l => !l.isHeader && l.timestamp === undefined)
  tapSyncCurrentIndex.value = firstUnstamped >= 0 ? firstUnstamped : 0

  tapSyncAudioCurrentTime.value = 0
  tapSyncIsPlaying.value = false
  showTapToSyncModal.value = true

  nextTick(() => {
    if (tapSyncAudioRef.value) {
      tapSyncAudioRef.value.currentTime = 0
    }
  })
}

const toggleTapSyncPlay = () => {
  if (!tapSyncAudioRef.value) return
  if (tapSyncAudioRef.value.paused) {
    tapSyncAudioRef.value.play().then(() => {
      tapSyncIsPlaying.value = true
    }).catch(err => {
      console.warn('Playback error:', err)
    })
  } else {
    tapSyncAudioRef.value.pause()
    tapSyncIsPlaying.value = false
  }
}

const onTapSyncAudioTimeUpdate = () => {
  if (tapSyncAudioRef.value) {
    tapSyncAudioCurrentTime.value = tapSyncAudioRef.value.currentTime
    tapSyncAudioDuration.value = tapSyncAudioRef.value.duration || 0
  }
}

const onTapSyncAudioEnded = () => {
  tapSyncIsPlaying.value = false
}

const stampCurrentLine = () => {
  if (tapSyncCurrentIndex.value >= tapSyncLines.value.length) return
  const line = tapSyncLines.value[tapSyncCurrentIndex.value]
  if (line) {
    line.timestamp = tapSyncAudioCurrentTime.value
    tapSyncCurrentIndex.value++
    while (
      tapSyncCurrentIndex.value < tapSyncLines.value.length &&
      tapSyncLines.value[tapSyncCurrentIndex.value]?.isHeader
    ) {
      tapSyncCurrentIndex.value++
    }
  }
}

const stampSoloBreak = () => {
  const insertIdx = tapSyncCurrentIndex.value
  tapSyncLines.value.splice(insertIdx, 0, {
    id: Date.now(),
    text: '(Solo / Paus)',
    timestamp: tapSyncAudioCurrentTime.value,
    isSolo: true,
  })
  tapSyncCurrentIndex.value++
}

const undoLastStamp = () => {
  if (tapSyncCurrentIndex.value <= 0) return
  tapSyncCurrentIndex.value--
  const line = tapSyncLines.value[tapSyncCurrentIndex.value]
  if (line) {
    line.timestamp = undefined
  }
}

const resetTapSync = () => {
  tapSyncLines.value.forEach(l => {
    l.timestamp = undefined
  })
  tapSyncCurrentIndex.value = 0
  if (tapSyncAudioRef.value) {
    tapSyncAudioRef.value.currentTime = 0
  }
}

const applyTapSync = () => {
  const outputLines = tapSyncLines.value.map(l => {
    if (l.isHeader) {
      return l.text.startsWith('[') ? l.text : `[${l.text}]`
    }
    if (l.timestamp !== undefined) {
      return `${formatLrcTimestamp(l.timestamp)} ${l.text}`
    }
    return l.text
  })

  songForm.lyrics = outputLines.join('\n')
  if (tapSyncAudioRef.value) {
    tapSyncAudioRef.value.pause()
  }
  showTapToSyncModal.value = false
  showToast('✓ Synkad text sparades till formuläret! Kom ihåg att klicka på Spara för låten.')
}

const previousLyricsBackup = ref<string>('')

const restoreOriginalLyrics = () => {
  if (previousLyricsBackup.value) {
    songForm.lyrics = previousLyricsBackup.value
    previousLyricsBackup.value = ''
    showToast('✓ Din klistrade originaltext har återställts!')
  }
}

const syncLyricsWithAi = async () => {
  if (!songForm.lyrics || !songForm.lyrics.trim()) {
    showToast('⚠️ Fyll i texten som ska synkas först!')
    return
  }
  // Spara alltid en säkerhetskopia av den klistrade texten innan AI-bearbetning
  previousLyricsBackup.value = songForm.lyrics
  isAiSyncingLyrics.value = true
  try {
    showToast('⏳ AI synkroniserar hela texten...')
    const res = await $fetch<{
      success: boolean
      syncedLyrics: string
      audioAnalyzed: boolean
      wasAppended?: boolean
      originalCount?: number
      syncedCount?: number
    }>('/api/admin/songs/sync-lyrics-ai', {
      method: 'POST',
      body: {
        title: songForm.title,
        audioUrl: songForm.audioUrl,
        lyrics: songForm.lyrics,
        duration: songForm.duration ? parseInt(songForm.duration, 10) : undefined,
      },
    })
    if (res.syncedLyrics) {
      songForm.lyrics = res.syncedLyrics
      if (res.wasAppended) {
        showToast('✓ AI synkade texten och säkerställde att 100% av dina rader bevarades!')
      } else if (res.audioAnalyzed) {
        showToast('✓ Hela texten synkades direkt mot ljudfilen med AI!')
      } else {
        showToast('✓ Hela texten strukturerades med AI-tidsstämplar!')
      }
    }
  } catch (err: unknown) {
    const errorObj = err as { data?: { message?: string }; message?: string }
    const msg = errorObj?.data?.message || errorObj?.message || 'AI-synkning misslyckades'
    showToast(`⚠️ ${msg}`)
  } finally {
    isAiSyncingLyrics.value = false
  }
}

const onSyncKeydown = (e: KeyboardEvent) => {
  if (!showTapToSyncModal.value) return
  const target = e.target as HTMLElement | null
  if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return
  if (e.code === 'Space') {
    e.preventDefault()
    stampCurrentLine()
  }
}

onMounted(() => {
  if (import.meta.client) {
    window.addEventListener('keydown', onSyncKeydown)
  }
})

onUnmounted(() => {
  if (import.meta.client) {
    window.removeEventListener('keydown', onSyncKeydown)
  }
})

// ---------------- STATS MODAL ----------------
interface SongHistoryGig {
  id?: string
  venue?: string
  city?: string
  date: string | number | Date
  setName?: string
}

const selectedSongStatsModal = ref<{ song: Song; totalPlays: number; history: SongHistoryGig[] } | null>(null)
const getSongPlayCount = (song: Song): number => {
  if (!song) return 0
  if (song.id && songsStatsData.value?.lookupById?.[song.id] !== undefined) {
    return songsStatsData.value.lookupById[song.id] ?? 0
  }
  const norm = (song.title || '').toLowerCase().trim()
  return songsStatsData.value?.lookupByTitle?.[norm] ?? 0
}

const openSongStats = (song: Song) => {
  const norm = (song.title || '').toLowerCase().trim()
  const statEntry = (songsStatsData.value?.stats || []).find(
    (st) => (st.songId && st.songId === song.id) || (st.title && st.title.toLowerCase().trim() === norm)
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
    <AdminNavBar :dirty="editingSong !== null" @discard="editingSong = null" />

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
      <div v-if="editingSong" class="stage-card p-4 sm:p-8 rounded-2xl border border-primary/40 space-y-4 shadow-2xl">
        <div class="flex items-center justify-between border-b border-primary/20 pb-3 gap-3 flex-wrap sm:flex-nowrap">
          <div class="flex items-center gap-2">
            <h3 class="font-heading text-xl text-primary font-bold">
              {{ editingSong === 'new' ? 'Lägg till ny låt' : 'Redigera låt' }}
            </h3>
            <span class="badge badge-warning badge-sm font-bold animate-pulse">
              ⚠️ Osparade ändringar
            </span>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              class="btn btn-ghost btn-sm rounded-full text-xs cursor-pointer"
              @click="editingSong = null"
            >
              Avbryt
            </button>
            <button
              type="button"
              class="btn btn-primary btn-sm rounded-full font-bold px-4 shadow-md hover:scale-105 transition-transform flex items-center gap-1.5 cursor-pointer"
              @click="saveSong"
            >
              <span>💾</span>
              <span>Spara låt</span>
            </button>
          </div>
        </div>

        <div class="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Låttitel *</label>
            <input v-model="songForm.title" type="text" placeholder="T.ex. Det 7:e Gunget" class="input input-bordered w-full bg-base-200 input-sm" >
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
            <input v-model="songForm.originalArtist" type="text" placeholder="T.ex. Muddy Waters" class="input input-bordered w-full bg-base-200 input-sm" >
          </div>

          <!-- Audio File Uploader & Direct Audio URL -->
          <div class="sm:col-span-2 p-4 bg-base-200/60 rounded-xl border border-primary/20 space-y-2">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-bold text-secondary">🎙️ Ljudfil / MP3 (Egen uppladdning)</label>
              <span class="text-[10px] text-base-content/60 font-mono">MP3, WAV, AAC, M4A</span>
            </div>
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                v-model="songForm.audioUrl"
                type="text"
                placeholder="/media/uploads/min-lat.mp3 eller klistra in URL"
                class="input input-bordered w-full flex-grow bg-base-200 input-sm font-mono text-xs"
              >
              <label class="btn btn-primary btn-sm rounded-lg cursor-pointer whitespace-nowrap justify-center w-full sm:w-auto" :class="isUploading ? 'loading' : ''">
                <span v-if="isUploading && uploadProgress > 0">⏳ Laddar upp ({{ uploadProgress }}%)...</span>
                <span v-else>📁 Ladda upp ljudfil</span>
                <input
                  type="file"
                  accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg"
                  class="hidden"
                  @change="uploadFile($event, url => songForm.audioUrl = url)"
                >
              </label>
            </div>
            <p class="text-[10px] text-base-content/60">
              Om du laddar upp en egen ljudfil spelas den direkt i webbläsarens jukebox med vinylknaster, helt utan Spotify.
            </p>
            <div v-if="songForm.audioUrl" class="pt-2">
              <audio :src="songForm.audioUrl" controls class="w-full h-8" />
            </div>
          </div>

          <!-- Cover Artwork Image Uploader & Cover Studio -->
          <div class="sm:col-span-2 p-4 bg-base-200/60 rounded-xl border border-primary/20 space-y-3">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-bold text-secondary">🎨 7"-singelomslag & Artwork</label>
              <span class="text-[10px] text-base-content/60 font-mono">Titel & Bandnamn stämplas automatiskt</span>
            </div>
            
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                v-model="songForm.coverImage"
                type="text"
                placeholder="/images/records/mitt-omslag.jpg eller klicka på Omslagsstudio"
                class="input input-bordered w-full flex-grow bg-base-200 input-sm font-mono text-xs"
              >

              <div class="grid grid-cols-2 sm:flex sm:items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                <!-- Cover Studio Trigger Button -->
                <button
                  type="button"
                  class="btn btn-primary btn-sm rounded-lg font-bold shadow-md hover:scale-105 transition-transform flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                  title="Öppna Cover Studio för att välja bandfoto, galleribilder, AI eller slumpa fram vinylstilar"
                  @click="openAiCoverGenerator()"
                >
                  <span>✨</span>
                  <span>Cover Studio</span>
                </button>

                <!-- Photo Upload with Automatic Title & Bandname Compositing -->
                <label class="btn btn-outline btn-secondary btn-sm rounded-lg cursor-pointer whitespace-nowrap justify-center" :class="isUploading ? 'loading' : ''" title="Ladda upp ett eget foto – bandnamn och låttitel stämplas automatiskt på omslaget!">
                  <span v-if="isUploading && uploadProgress > 0">⏳ ({{ uploadProgress }}%)</span>
                  <span v-else>📷 Ladda upp foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    class="hidden"
                    @change="handleCoverPhotoUpload"
                  >
                </label>
              </div>
            </div>

            <p class="text-[10px] text-base-content/60">
              Ladda upp ett foto eller klicka på <strong>"Cover Studio"</strong>. Motorn stämplar automatiskt <strong>"Det 7:e Gunget"</strong> och låtens titel med vinylring och 70-talstypografi.
            </p>

            <!-- Live Cover Preview in Edit Form -->
            <div v-if="songForm.coverImage" class="flex items-center gap-4 pt-2">
              <button
                type="button"
                class="w-16 h-16 object-cover rounded-lg border border-primary/40 shadow cursor-pointer overflow-hidden group relative flex-shrink-0"
                title="Klicka för att justera eller slumpa ny stil i studion"
                @click="openAiCoverGenerator(songForm.coverImage)"
              >
                <img
                  :src="songForm.coverImage"
                  alt="Förhandsgranskning"
                  class="w-full h-full object-cover group-hover:scale-110 transition-transform"
                >
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs text-white transition-opacity font-bold">
                  ✏️
                </div>
              </button>
              <div class="text-xs">
                <span class="text-emerald-400 font-bold block">✓ Omslag tilldelat</span>
                <span class="text-[10px] text-base-content/60 font-mono truncate max-w-xs block">{{ songForm.coverImage }}</span>
                <button
                  type="button"
                  class="text-[11px] text-primary hover:underline cursor-pointer font-semibold mt-0.5 inline-block"
                  @click="openAiCoverGenerator(songForm.coverImage)"
                >
                  Öppna i Omslagsstudion för att ändra stil →
                </button>
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
            <input v-model="songForm.duration" type="number" placeholder="245" class="input input-bordered w-full bg-base-200 input-sm font-mono text-xs" >
          </div>
          <div class="sm:col-span-2">
            <label class="block text-xs font-bold text-secondary mb-1">Låt-URL / Inbäddnings-ID</label>
            <input v-model="songForm.embedUrl" type="text" placeholder="https://open.spotify.com/track/..." class="input input-bordered w-full bg-base-200 input-sm font-mono text-xs" >
          </div>
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-xs font-bold text-secondary">Låttext (svenska)</label>
              <div class="flex items-center gap-1.5">
                <!-- AI Sync Button -->
                <button
                  type="button"
                  class="btn btn-ghost btn-xs text-primary hover:bg-primary/20 px-2 py-0.5 h-auto text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                  :disabled="isAiSyncingLyrics || !songForm.lyrics"
                  title="Låt AI lyssna på låten och sätta tidsstämplar på varje rad"
                  @click="syncLyricsWithAi"
                >
                  <span v-if="isAiSyncingLyrics" class="loading loading-spinner loading-xs" />
                  <span v-else>✨</span>
                  <span>AI-synka</span>
                </button>

                <!-- Undo AI Sync Button -->
                <button
                  v-if="previousLyricsBackup"
                  type="button"
                  class="btn btn-outline btn-warning btn-xs rounded-full font-bold px-2 py-0.5 h-auto text-[10px] flex items-center gap-1 cursor-pointer"
                  title="Återställ den klistrade originaltexten som den var innan AI-synkningen"
                  @click="restoreOriginalLyrics"
                >
                  <span>↩</span>
                  <span>Återställ originaltext</span>
                </button>

                <!-- Tap-To-Sync Studio Button -->
                <button
                  type="button"
                  class="btn btn-outline btn-secondary btn-xs rounded-full font-bold px-2.5 py-1 h-auto text-[10px] flex items-center gap-1 cursor-pointer shadow-xs"
                  :disabled="!songForm.lyrics"
                  title="Öppna Tap-to-sync verktyget för att klicka fram tiderna till musiken"
                  @click="openTapToSync"
                >
                  <span>⏱️</span>
                  <span>Synka (Tap-to-sync)</span>
                </button>
              </div>
            </div>
            <textarea
              v-model="songForm.lyrics"
              rows="4"
              placeholder="[00:18.50] Sjunger om regnet i Malmö..."
              class="textarea textarea-bordered w-full bg-base-200 text-xs font-mono leading-relaxed"
            />
            <div class="flex items-center justify-between text-[10px] text-base-content/60 pt-0.5">
              <span>Stödjer tidsstämplar som <code class="text-secondary font-bold font-mono">[00:24]</code> för synkad teleprompter i Jukeboxen.</span>
              <button
                v-if="hasLrcFormat(songForm.lyrics)"
                type="button"
                class="text-[10px] text-amber-400 hover:underline cursor-pointer font-bold ml-1"
                title="Ta bort alla tidsstämplar och återgå till ren råtext"
                @click="songForm.lyrics = stripLrcTimestamps(songForm.lyrics)"
              >
                ✕ Rensa tidsstämplar
              </button>
            </div>
          </div>
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-xs font-bold text-secondary">Lyrics (English)</label>
              <button
                type="button"
                class="btn btn-ghost btn-xs text-primary hover:bg-primary/20 p-1 h-auto text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                :disabled="isFieldTranslating('lyricsEn') || !songForm.lyrics"
                title="Översätt låttext från svenska med AI"
                @click="translateField(songForm.lyrics, (res) => songForm.lyricsEn = res, 'lyricsEn')"
              >
                <span v-if="isFieldTranslating('lyricsEn')" class="loading loading-spinner loading-xs" />
                <span v-else>✨</span>
                <span>Översätt från svenska</span>
              </button>
            </div>
            <textarea v-model="songForm.lyricsEn" rows="3" placeholder="English lyrics..." class="textarea textarea-bordered w-full bg-base-200 text-sm" />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-xs font-bold text-secondary mb-1">Ackord (t.ex. E7 - A7 - B7)</label>
            <input v-model="songForm.chords" type="text" placeholder="E7 - A7 - B7" class="input input-bordered w-full bg-base-200 input-sm font-mono text-xs" >
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
              <input v-model="songForm.postToSocials" type="checkbox" class="toggle toggle-primary toggle-sm" >
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

        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 pt-3">
          <button type="button" class="btn btn-primary btn-sm rounded-full font-bold px-6 cursor-pointer w-full sm:w-auto" @click="saveSong">
            Spara låt
          </button>
          <button type="button" class="btn btn-ghost btn-sm rounded-full cursor-pointer w-full sm:w-auto" @click="editingSong = null">
            Avbryt
          </button>
        </div>
      </div>

      <!-- Songs Mobile Cards View (md:hidden: inga avklippta kolumner eller horisontell scroll) -->
      <div class="block md:hidden space-y-3">
        <!-- Mobile Sorting & Count Bar -->
        <div class="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-base-200/90 border border-primary/20 text-xs font-semibold">
          <div class="flex items-center gap-1.5 text-primary">
            <span>🎶</span>
            <span class="font-bold">{{ sortedSongs.length }} låtar</span>
          </div>

          <div class="flex items-center gap-1.5">
            <span class="text-[10px] uppercase font-mono text-secondary font-bold">Sortera:</span>
            <select
              :value="songSortKey"
              class="select select-bordered select-xs bg-base-100 text-xs font-semibold rounded-lg"
              @change="toggleSongSort(($event.target as HTMLSelectElement).value as any)"
            >
              <option value="title">Titel</option>
              <option value="cover">Omslag</option>
              <option value="isOriginal">Typ</option>
              <option value="originalArtist">Artist</option>
              <option value="embedProvider">Plattform</option>
              <option value="playCount">Live</option>
            </select>
            <button
              type="button"
              class="btn btn-ghost btn-xs btn-square font-mono text-xs border border-primary/20"
              :title="songSortDir === 'asc' ? 'Stigande ordning' : 'Fallande ordning'"
              @click="songSortDir = songSortDir === 'asc' ? 'desc' : 'asc'"
            >
              {{ songSortDir === 'asc' ? '↑' : '↓' }}
            </button>
          </div>
        </div>

        <!-- Song Mobile Cards List -->
        <div
          v-for="song in sortedSongs"
          :key="song.id"
          class="stage-card p-4 rounded-2xl border border-primary/25 space-y-3 shadow-xs bg-base-100"
        >
          <!-- Top Row: Cover Thumbnail + Title + Type Badge -->
          <div class="flex items-start justify-between gap-2.5">
            <div class="flex items-center gap-3 min-w-0">
              <button
                type="button"
                class="w-11 h-11 rounded-xl overflow-hidden border border-primary/30 flex items-center justify-center flex-shrink-0 bg-base-200 cursor-pointer shadow-xs active:scale-95 transition-transform"
                :title="hasSongCover(song) ? 'Klicka för att förhandsgranska skivomslaget' : 'Saknar omslag - Klicka för att skapa i Cover Studio'"
                @click="handleCoverClick(song)"
              >
                <img
                  v-if="song.coverImage"
                  :src="song.coverImage"
                  :alt="song.title"
                  class="w-full h-full object-cover"
                >
                <span v-else-if="hasSongCover(song)" class="text-lg">💿</span>
                <span v-else class="text-rose-400 font-mono text-xs font-bold">⨉</span>
              </button>

              <div class="flex flex-col min-w-0">
                <button
                  type="button"
                  class="text-left font-heading text-base font-bold text-primary hover:text-secondary truncate cursor-pointer leading-tight"
                  title="Klicka för att redigera"
                  @click="openEditSong(song)"
                >
                  {{ song.title }}
                </button>
                <span v-if="!song.isOriginal && song.originalArtist" class="text-xs text-base-content/75 italic truncate mt-0.5">
                  av {{ song.originalArtist }}
                </span>
                <span v-else class="text-[11px] text-base-content/60 font-mono mt-0.5">
                  Eget hantverk
                </span>
              </div>
            </div>

            <span
              class="badge badge-sm font-mono uppercase text-[9px] font-bold flex-shrink-0"
              :class="song.isOriginal ? 'badge-primary' : 'badge-secondary'"
            >
              {{ song.isOriginal ? 'Original' : 'Cover' }}
            </span>
          </div>

          <!-- Metadata Chips Row -->
          <div class="flex flex-wrap items-center gap-2 pt-1 border-t border-primary/10 text-xs">
            <span v-if="song.embedProvider" class="badge badge-ghost badge-sm font-mono text-[10px] text-base-content/70">
              {{ song.embedProvider }}
            </span>
            <button
              type="button"
              class="badge badge-ghost badge-sm hover:badge-primary text-[10px] gap-1 cursor-pointer transition-colors"
              title="Klicka för att se vilka gig låten har spelats på"
              @click="openSongStats(song)"
            >
              <span>🎸</span>
              <span>{{ getSongPlayCount(song) }} gig</span>
            </button>
          </div>

          <!-- Action Buttons Row (Touch Friendly) -->
          <div class="grid grid-cols-3 gap-2 pt-1 border-t border-primary/10">
            <button
              type="button"
              class="btn btn-xs btn-outline btn-secondary rounded-xl font-bold flex items-center justify-center gap-1 py-1.5 h-auto cursor-pointer"
              title="Dela låten till sociala medier"
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
              class="btn btn-xs btn-outline btn-primary rounded-xl font-bold flex items-center justify-center gap-1 py-1.5 h-auto cursor-pointer"
              title="Redigera låt"
              @click="openEditSong(song)"
            >
              <span>✏️</span>
              <span>Redigera</span>
            </button>
            <button
              type="button"
              class="btn btn-xs btn-outline btn-error rounded-xl font-bold flex items-center justify-center gap-1 py-1.5 h-auto cursor-pointer"
              title="Ta bort låt"
              @click="deleteSong(song.id)"
            >
              <span>🗑️</span>
              <span>Ta bort</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Songs Table with Interactive Sorting (Desktop & Tablet: hidden md:block) -->
      <div class="hidden md:block overflow-x-auto rounded-2xl border border-primary/20 stage-card">
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
                  title="Klicka för att redigera låten"
                  @click="openEditSong(song)"
                >
                  {{ song.title }}
                </button>
              </td>
              <td class="text-center">
                <button
                  type="button"
                  class="btn btn-xs btn-ghost p-1 cursor-pointer transition-transform hover:scale-110"
                  :title="hasSongCover(song) ? 'Klicka för att förhandsgranska skivomslaget' : 'Saknar omslag - Klicka för att skapa i Cover Studio'"
                  @click="handleCoverClick(song)"
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

    <!-- VINTAGE VINYL & AI COVER STUDIO MODAL -->
    <div
      v-if="showAiCoverModal"
      class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-hidden"
    >
      <div class="stage-card max-w-5xl w-full max-h-[94vh] flex flex-col rounded-3xl border-2 border-primary/40 shadow-2xl bg-base-100 relative overflow-hidden">
        <!-- 1. Header -->
        <div class="flex items-center justify-between gap-3 border-b border-primary/20 p-3 sm:px-5 sm:py-3.5 flex-shrink-0 bg-base-100">
          <div class="space-y-0.5">
            <div class="flex items-center gap-2">
              <span class="text-xl animate-pulse">✨</span>
              <h3 class="font-heading text-base sm:text-lg text-primary font-black">
                Cover Studio (7"-singel)
              </h3>
            </div>
            <p class="text-[11px] text-base-content/70 hidden sm:block">
              Skapa autentiskt vinylsingelomslag för <strong class="text-primary font-bold">{{ songForm.title || 'låten' }}</strong>. Bandnamn & låttitel stämplas automatiskt.
            </p>
          </div>

          <div class="flex items-center gap-2">
            <!-- Save / Apply Cover directly in header -->
            <button
              v-if="generatedCoverResult"
              type="button"
              class="btn btn-xs btn-primary rounded-full font-bold px-3 py-1.5 h-auto flex items-center gap-1 cursor-pointer shadow-md hover:scale-105 transition-transform"
              title="Spara och tilldela detta omslag till låten"
              :disabled="isGeneratingCover || isApplyingCover"
              @click="applyGeneratedCover"
            >
              <span v-if="isApplyingCover" class="loading loading-spinner loading-xs" />
              <span v-else>✓</span>
              <span>{{ isApplyingCover ? 'Sparar...' : 'Använd omslag' }}</span>
            </button>

            <!-- Quick Randomize Button in Header -->
            <button
              type="button"
              class="btn btn-xs btn-outline btn-secondary rounded-full font-bold px-3 py-1.5 h-auto flex items-center gap-1 cursor-pointer"
              title="Slumpa fram en helt ny kombination av layout, färg och patina!"
              :disabled="isGeneratingCover"
              @click="randomizeCoverStyle"
            >
              <span>🎲</span>
              <span class="hidden sm:inline">Slumpa stil</span>
            </button>

            <!-- Engine Indicator -->
            <div
              v-if="aiEngineHealth"
              class="hidden sm:flex badge badge-sm gap-1.5 font-mono py-2 px-2.5 border shadow-sm"
              :class="aiEngineHealth.available ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'bg-amber-500/15 border-amber-500/40 text-amber-300'"
              :title="aiEngineHealth.message"
            >
              <span class="w-1.5 h-1.5 rounded-full" :class="aiEngineHealth.available ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'" />
              <span class="font-bold text-[9px]">{{ aiEngineHealth.available ? 'Gemini AI Aktiv' : 'Grafikmotor' }}</span>
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

        <!-- 2. Body (2-Column Grid: 6 cols left, 6 cols right) -->
        <div class="p-3 sm:p-4 overflow-y-auto flex-1">
          <div class="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-start">
            <!-- LEFT COLUMN: Låtinfo & Bildkälla -->
            <div class="md:col-span-6 space-y-2.5 text-xs">
              <!-- Song Info & Automatic Stamping -->
              <div class="p-2.5 bg-base-200/80 rounded-xl border border-primary/20 space-y-1.5">
                <div class="flex items-center justify-between">
                  <div class="truncate mr-2">
                    <span class="text-[9px] uppercase font-bold text-secondary tracking-wider block">Låt & Band</span>
                    <span class="font-heading font-black text-primary text-sm truncate">{{ songForm.title || 'Namnlös låt' }}</span>
                    <span class="text-base-content/80 ml-1.5 font-mono text-[10px] font-bold">
                      • DET 7:e GUNGET
                    </span>
                  </div>
                  <span class="badge badge-xs font-mono flex-shrink-0" :class="songForm.isOriginal ? 'badge-primary font-bold' : 'badge-outline border-secondary text-secondary'">
                    {{ songForm.isOriginal ? 'SIDA A (Original)' : 'SIDA B (Cover)' }}
                  </span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-primary/10 text-[11px]">
                  <div>
                    <label class="block text-[9px] text-base-content/60 font-mono mb-0.5">Undertitel (Valfritt):</label>
                    <input
                      v-model="aiCustomSubtitle"
                      type="text"
                      :placeholder="songForm.isOriginal ? 'ORIGINALKOMPOSITION' : `COVER AV ${(songForm.originalArtist || '').toUpperCase()}`"
                      class="input input-bordered input-xs w-full bg-base-100 font-mono text-[10px]"
                      @input="debouncedGenerateCover(750)"
                      @blur="generateCoverWithAi"
                      @keydown.enter.prevent="generateCoverWithAi"
                    >
                  </div>
                  <div>
                    <label class="block text-[9px] text-base-content/60 font-mono mb-0.5">Katalognummer:</label>
                    <div class="flex items-center gap-1">
                      <input
                        v-model="aiCatalogNumber"
                        type="text"
                        placeholder="T.ex. D7G-45-777"
                        class="input input-bordered input-xs flex-1 bg-base-100 font-mono text-[10px]"
                        @input="debouncedGenerateCover(750)"
                        @blur="generateCoverWithAi"
                        @keydown.enter.prevent="generateCoverWithAi"
                      >
                      <button
                        type="button"
                        class="btn btn-xs btn-outline btn-secondary font-mono text-[10px] px-2 h-6 min-h-0 cursor-pointer flex items-center gap-1 shadow-sm flex-shrink-0"
                        title="Slumpa ett nytt vintage katalognummer"
                        @click="randomizeCatalogNumber"
                      >
                        <span>🎲</span>
                        <span>Slumpa</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Bildkälla -->
              <div class="space-y-1.5">
                <span class="text-[11px] font-bold text-secondary flex items-center justify-between">
                  <span class="flex items-center gap-1.5">
                    <span>🖼️</span> Välj bildkälla:
                  </span>
                  <span v-if="aiCoverSource === 'photo' && photoSubSource === 'upload' && uploadedCoverPhoto" class="text-[10px] text-emerald-400 font-mono">
                    ✓ Eget foto aktivt
                  </span>
                  <span v-else-if="aiCoverSource === 'photo' && photoSubSource === 'gallery'" class="text-[10px] text-secondary font-mono">
                    ✓ Galleribild aktiv
                  </span>
                  <span v-else-if="aiCoverSource === 'photo' && photoSubSource === 'band'" class="text-[10px] text-primary font-mono">
                    ✓ Bandfoto aktivt
                  </span>
                </span>

                <!-- Top level: Fotografi vs Gemini AI-konst -->
                <div class="grid grid-cols-2 gap-1.5 bg-base-200 p-1 rounded-xl border border-white/5 font-bold font-mono text-xs">
                  <button
                    type="button"
                    class="py-1.5 px-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                    :class="aiCoverSource === 'photo' ? 'bg-primary text-neutral font-black shadow' : 'text-base-content/70 hover:text-primary'"
                    :disabled="isGeneratingCover"
                    @click="aiCoverSource = 'photo'; generateCoverWithAi()"
                  >
                    <span>📸</span>
                    <span>Fotografi</span>
                  </button>

                  <button
                    type="button"
                    class="py-1.5 px-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                    :class="aiCoverSource === 'ai' ? 'bg-primary text-neutral font-black shadow' : 'text-base-content/70 hover:text-primary'"
                    :disabled="isGeneratingCover"
                    @click="aiCoverSource = 'ai'; generateCoverWithAi()"
                  >
                    <span>🤖</span>
                    <span>Gemini AI-konst</span>
                  </button>
                </div>

                <!-- Sub-options for Photo source -->
                <div v-if="aiCoverSource === 'photo'" class="p-2.5 bg-base-200/60 rounded-xl border border-primary/20 space-y-2">
                  <!-- 3-way Subtabs: Bandfoton | Galleriet | Eget foto -->
                  <div class="grid grid-cols-3 gap-1 bg-base-300/80 p-0.5 rounded-lg text-[10px] font-mono font-bold">
                    <button
                      type="button"
                      class="py-1 px-1.5 rounded transition-all text-center cursor-pointer flex items-center justify-center gap-1"
                      :class="photoSubSource === 'band' ? 'bg-primary text-neutral font-black shadow-sm' : 'text-base-content/70 hover:text-primary'"
                      :disabled="isGeneratingCover"
                      @click="photoSubSource = 'band'; generateCoverWithAi()"
                    >
                      <span>🎸</span>
                      <span class="truncate">Bandfoton ({{ bandPhotosList.length }})</span>
                    </button>

                    <button
                      type="button"
                      class="py-1 px-1.5 rounded transition-all text-center cursor-pointer flex items-center justify-center gap-1"
                      :class="photoSubSource === 'gallery' ? 'bg-primary text-neutral font-black shadow-sm' : 'text-base-content/70 hover:text-primary'"
                      :disabled="isGeneratingCover"
                      @click="photoSubSource = 'gallery'; if (!selectedGalleryPhoto && availableGalleryPhotos[0]?.mediaUrl) selectedGalleryPhoto = availableGalleryPhotos[0].mediaUrl; generateCoverWithAi()"
                    >
                      <span>🖼️</span>
                      <span class="truncate">Galleriet ({{ availableGalleryPhotos.length }})</span>
                    </button>

                    <button
                      type="button"
                      class="py-1 px-1.5 rounded transition-all text-center cursor-pointer flex items-center justify-center gap-1"
                      :class="photoSubSource === 'upload' ? 'bg-primary text-neutral font-black shadow-sm' : 'text-base-content/70 hover:text-primary'"
                      :disabled="isGeneratingCover"
                      @click="photoSubSource = 'upload'; if (uploadedCoverPhoto) generateCoverWithAi()"
                    >
                      <span>📷</span>
                      <span class="truncate">Eget foto</span>
                    </button>
                  </div>

                  <!-- Tab 1: Bandfoton -->
                  <div v-if="photoSubSource === 'band'" class="space-y-1.5">
                    <!-- Clickable Thumbnail Row (all 7 fit nicely side by side) -->
                    <div class="grid grid-cols-7 gap-1.5">
                      <button
                        v-for="(bp, idx) in bandPhotosList"
                        :key="bp.path"
                        type="button"
                        class="relative rounded-lg overflow-hidden border-2 transition-all aspect-square cursor-pointer group"
                        :class="selectedBandPhoto === bp.path ? 'border-primary ring-2 ring-primary/50 shadow-md scale-105 z-10' : 'border-white/10 hover:border-primary/50 opacity-70 hover:opacity-100'"
                        :title="bp.label"
                        @click="selectedBandPhoto = bp.path; generateCoverWithAi()"
                      >
                        <img :src="bp.path" :alt="bp.label" class="w-full h-full object-cover">
                        <span class="absolute bottom-0 inset-x-0 bg-black/75 text-[8px] font-mono text-center py-0.5 text-white/90 truncate px-0.5">
                          #{{ idx + 1 }}
                        </span>
                      </button>
                    </div>

                    <select
                      v-model="selectedBandPhoto"
                      :disabled="isGeneratingCover"
                      class="select select-bordered w-full bg-base-100 select-xs text-[11px] font-semibold"
                      @change="generateCoverWithAi"
                    >
                      <option v-for="bp in bandPhotosList" :key="bp.path" :value="bp.path">
                        {{ bp.label }}
                      </option>
                    </select>
                  </div>

                  <!-- Tab 2: Galleribilder -->
                  <div v-else-if="photoSubSource === 'gallery'" class="space-y-1.5">
                    <div v-if="availableGalleryPhotos.length === 0" class="p-3 text-center text-base-content/60 bg-base-100/50 rounded-lg text-xs">
                      Inga foton hittades i galleriet.
                    </div>

                    <div v-else class="space-y-1.5">
                      <!-- Visual Gallery Grid -->
                      <div class="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-32 overflow-y-auto p-1 bg-base-100/60 rounded-lg border border-white/5">
                        <button
                          v-for="gp in availableGalleryPhotos"
                          :key="gp.id"
                          type="button"
                          class="relative rounded-lg overflow-hidden border-2 transition-all aspect-square cursor-pointer group"
                          :class="selectedGalleryPhoto === gp.mediaUrl ? 'border-primary ring-2 ring-primary/50 shadow-md scale-105 z-10' : 'border-white/10 hover:border-primary/50 opacity-75 hover:opacity-100'"
                          :title="gp.captionSv || gp.epkTitleSv || 'Galleribild'"
                          @click="selectedGalleryPhoto = gp.mediaUrl; generateCoverWithAi()"
                        >
                          <img :src="gp.mediaUrl" :alt="gp.captionSv || 'Galleribild'" class="w-full h-full object-cover">
                        </button>
                      </div>

                      <select
                        v-model="selectedGalleryPhoto"
                        :disabled="isGeneratingCover"
                        class="select select-bordered w-full bg-base-100 select-xs text-[11px] font-semibold"
                        @change="generateCoverWithAi"
                      >
                        <option v-for="(gp, i) in availableGalleryPhotos" :key="gp.id" :value="gp.mediaUrl">
                          {{ gp.captionSv || gp.epkTitleSv || `Galleribild #${i + 1}` }}
                        </option>
                      </select>
                    </div>
                  </div>

                  <!-- Tab 3: Eget foto -->
                  <div v-else-if="photoSubSource === 'upload'" class="space-y-2">
                    <div class="flex items-center justify-between gap-2">
                      <label class="btn btn-xs btn-outline btn-secondary rounded-lg cursor-pointer whitespace-nowrap" :class="isUploading ? 'loading' : ''">
                        <span>📷 Ladda upp foto från dator</span>
                        <input
                          type="file"
                          accept="image/*"
                          class="hidden"
                          @change="handleCoverPhotoUpload"
                        >
                      </label>

                      <button
                        v-if="uploadedCoverPhoto"
                        type="button"
                        class="btn btn-xs btn-ghost text-error text-[10px] cursor-pointer"
                        title="Ta bort uppladdat foto och återgå till bandfoto"
                        @click="uploadedCoverPhoto = null; photoSubSource = 'band'; generateCoverWithAi()"
                      >
                        ✕ Ta bort foto
                      </button>
                    </div>

                    <!-- Uploaded Photo Indicator if active -->
                    <div v-if="uploadedCoverPhoto" class="flex items-center gap-2 p-1.5 bg-base-300/80 rounded-lg border border-emerald-500/30">
                      <img :src="uploadedCoverPhoto" alt="Uppladdat foto" class="w-10 h-10 object-cover rounded-md border border-primary/40 shadow">
                      <div class="text-[10px] truncate flex-1">
                        <span class="font-bold text-emerald-400 block flex items-center gap-1">
                          <span>✓</span> Eget foto aktivt
                        </span>
                        <span class="text-base-content/60 font-mono text-[9px] truncate block">{{ uploadedCoverPhoto }}</span>
                      </div>
                    </div>

                    <div v-else class="p-2.5 border-2 border-dashed border-white/10 rounded-xl text-center space-y-0.5">
                      <p class="text-xs text-base-content/70">
                        Inget eget foto uppladdat för denna låt än.
                      </p>
                      <p class="text-[9px] text-base-content/50">
                        Klicka på knappen ovan för att ladda upp en bild.
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Sub-options for AI source -->
                <div v-else class="p-2.5 bg-base-200/60 rounded-xl border border-primary/20 space-y-1.5">
                  <div class="flex items-center justify-between">
                    <label class="text-[11px] font-bold text-secondary">Inkludera bandmedlemmarna:</label>
                    <input v-model="aiIncludeBand" type="checkbox" class="toggle toggle-primary toggle-xs" @change="generateCoverWithAi">
                  </div>
                  <p class="text-[10px] text-base-content/60">
                    När aktiverad använder AI referensfotot av Janis, Marcus, Bosse och Jonas på scen.
                  </p>
                </div>
              </div>
            </div>

            <!-- RIGHT COLUMN: Live Förhandsgranskning & Stylingfält -->
            <div class="md:col-span-6 space-y-2.5 text-xs">
              <!-- 1. Live Förhandsgranskning (Kompakt höjd) -->
              <div class="p-2.5 sm:p-3 bg-black/60 rounded-xl border border-primary/30 flex flex-col items-center justify-center relative overflow-hidden min-h-[180px]">
                <!-- STATE 1: Genererar -->
                <div v-if="isGeneratingCover" class="py-3 flex flex-col items-center justify-center text-center space-y-2.5">
                  <div class="relative w-16 h-16 flex items-center justify-center">
                    <div class="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-60 pointer-events-none" />
                    <div class="absolute inset-1 rounded-full border-2 border-primary/40 animate-spin opacity-80" style="animation-duration: 4s;" />
                    <div class="w-14 h-14 rounded-full bg-[#0d0b0a] border-2 border-amber-900/60 shadow-2xl flex items-center justify-center relative overflow-hidden animate-spin" style="animation-duration: 2.5s;">
                      <div class="w-5 h-5 rounded-full bg-gradient-to-tr from-secondary via-primary to-secondary flex flex-col items-center justify-center p-0.5 text-[5px] font-black text-neutral shadow-inner">
                        <span>45</span>
                      </div>
                    </div>
                  </div>

                  <div class="space-y-1 max-w-xs">
                    <h4 class="text-xs font-heading font-black text-primary animate-pulse">
                      {{
                        aiCoverProgressStep === 1
                          ? '1/4 Förbereder komposition...'
                          : aiCoverProgressStep === 2
                          ? '2/4 Applicerar färgton & vinylpatina...'
                          : aiCoverProgressStep === 3
                          ? '3/4 Stämplar bandnamn & låttitel...'
                          : '4/4 Färdigställer högupplöst singelfodral...'
                      }}
                    </h4>
                    <div class="w-44 bg-base-300 rounded-full h-1.5 overflow-hidden border border-primary/20 mt-1">
                      <div
                        class="bg-gradient-to-r from-secondary to-primary h-full transition-all duration-700 rounded-full"
                        :style="{ width: `${aiCoverProgressStep * 25}%` }"
                      />
                    </div>
                  </div>
                </div>

                <!-- STATE 2: Färdigt resultat (Horisontellt kompakt format med klickbar förstoring) -->
                <div v-else-if="generatedCoverResult" class="flex items-center justify-center gap-3.5 w-full py-0.5">
                  <!-- Vinyl cover image with disc peek (Klickbar för högupplöst vy) -->
                  <div
                    class="relative w-36 sm:w-40 aspect-square flex-shrink-0 group cursor-pointer"
                    title="🔍 Klicka för att granska omslaget i full storlek!"
                    @click="showCoverZoomModal = true"
                  >
                    <div class="absolute -top-2 -right-2 w-32 h-32 rounded-full bg-[#0d0b0a] border border-white/10 shadow-2xl flex items-center justify-center animate-spin pointer-events-none group-hover:scale-105 transition-transform" style="animation-duration: 16s;">
                      <div class="w-8 h-8 rounded-full bg-primary text-neutral text-[7px] font-black flex flex-col items-center justify-center shadow-inner">
                        <span>45</span>
                        <span>RPM</span>
                      </div>
                    </div>

                    <div class="relative z-10 w-full h-full rounded-lg overflow-hidden border-2 border-amber-900/60 shadow-2xl bg-[#140e0a] group-hover:border-primary group-hover:shadow-primary/40 transition-all">
                      <img
                        :src="generatedCoverResult.coverUrl || generatedCoverResult.url"
                        :alt="generatedCoverResult.title || 'Skivomslag'"
                        class="w-full h-full object-cover"
                      >
                      <!-- Hover Zoom Overlay Hint -->
                      <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-0.5 text-white text-[10px] font-bold backdrop-blur-[1px]">
                        <span class="text-base">🔍</span>
                        <span>Klicka för att förstora</span>
                      </div>
                    </div>
                  </div>

                  <!-- Details next to preview -->
                  <div class="space-y-1 text-left flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="inline-flex px-2 py-0.5 rounded bg-emerald-800 text-emerald-100 font-mono text-[9px] font-bold">
                        ✓ STÄMPLAT & KLART
                      </span>
                      <button
                        type="button"
                        class="text-[10px] text-primary hover:underline font-mono cursor-pointer flex items-center gap-0.5"
                        title="Förstora skivomslaget för att se alla detaljer"
                        @click="showCoverZoomModal = true"
                      >
                        <span>🔍</span>
                        <span>Förstora</span>
                      </button>
                    </div>
                    <p class="text-xs text-base-content font-heading font-black truncate">
                      {{ songForm.title || 'Det 7:e Gunget' }}
                    </p>
                    <p class="text-[10px] text-base-content/70 font-mono">
                      7"-singel • 45 RPM
                    </p>
                    <div class="text-[9px] text-base-content/60 font-mono space-y-0.5 pt-1 border-t border-white/10">
                      <div class="truncate">Stil: <span class="text-primary font-bold">{{ generatedCoverResult.styleName || aiStylePreset }}</span></div>
                      <div class="truncate">Layout: <span class="text-secondary font-bold">{{ generatedCoverResult.layout || aiLayout }}</span></div>
                    </div>
                  </div>
                </div>

                <!-- STATE 3: Initialt (Tomt) -->
                <div v-else class="py-3 flex flex-col items-center justify-center text-center space-y-1.5">
                  <div class="w-14 h-14 rounded-xl border-2 border-dashed border-primary/40 bg-base-200/50 flex flex-col items-center justify-center text-primary/60">
                    <span class="text-xl">💿</span>
                  </div>
                  <p class="text-[10px] text-base-content/60 max-w-xs">
                    Klicka på <strong class="text-primary">"Skapa från foto"</strong> eller <strong class="text-secondary">"Slumpa stil"</strong>.
                  </p>
                </div>

                <!-- Error Alert if any -->
                <div v-if="aiGenerationError" class="p-1.5 mt-1.5 bg-error/15 border border-error/40 rounded-lg text-center text-[10px] text-error font-bold w-full">
                  ⚠️ {{ aiGenerationError }}
                </div>
              </div>

              <!-- 2. Layout & Styling Settings Grid (Utnyttjar ytan under förhandsvisningen) -->
              <div class="p-2.5 bg-base-200/70 rounded-xl border border-primary/20 space-y-2 text-xs">
                <!-- Layout Templates -->
                <div>
                  <div class="flex items-center justify-between mb-0.5">
                    <label class="text-[10px] font-bold text-secondary">Layoutmall (Var hamnar texten?):</label>
                    <button
                      type="button"
                      class="text-[9px] text-primary hover:underline cursor-pointer font-mono"
                      @click="aiLayout = 'auto'; generateCoverWithAi()"
                    >
                      🎲 Auto
                    </button>
                  </div>
                  <select v-model="aiLayout" :disabled="isGeneratingCover" class="select select-bordered w-full bg-base-100 select-xs text-[11px]" @change="generateCoverWithAi">
                    <option value="top_bottom">Classic 70s (Topp- & Bottenbalk)</option>
                    <option value="diagonal_sash">Diagonal Retro Sash (Hörnbanderoll)</option>
                    <option value="sidebar_modern">Blue Note Kolumn (Modernistiskt Sidoband)</option>
                    <option value="poster_frame">Vintage Posterram (Minimalistisk Ram)</option>
                    <option value="center_badge">Vinyl Rondell (Cirkulär Skivetikett)</option>
                  </select>
                </div>

                <!-- Color Theme / Label & Vinylpatina in 2 cols -->
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="block text-[10px] font-bold text-secondary mb-0.5">Skivbolagstema & Färg:</label>
                    <select v-model="aiStylePreset" :disabled="isGeneratingCover" class="select select-bordered w-full bg-base-100 select-xs text-[10px]" @change="generateCoverWithAi">
                      <option value="auto">🎲 Auto (Baserat på låten)</option>
                      <option value="sonet_gold">🟡 Sonet (Guld & Svart)</option>
                      <option value="chess_crimson">🔴 Chess (Djupröd & Kräm)</option>
                      <option value="stax_amber">🟠 Stax (Bärnsten & Rost)</option>
                      <option value="bluenote_navy">🔵 Blue Note (Nattblå & Cyan)</option>
                      <option value="vintage_cream">⚪ Sepia (Krämvit & Läder)</option>
                      <option value="harvest_green">🟢 Harvest (Skogsgrön)</option>
                      <option value="monochrome_accent">⚫ Mono Deluxe (Svartvitt)</option>
                    </select>
                  </div>

                  <!-- Aging / Patina -->
                  <div>
                    <label class="block text-[10px] font-bold text-secondary mb-0.5">Vinylpatina & Slitage:</label>
                    <select v-model="aiAgingEffect" :disabled="isGeneratingCover" class="select select-bordered w-full bg-base-100 select-xs text-[10px]" @change="generateCoverWithAi">
                      <option value="ringwear">💿 Vinylring (Ringwear)</option>
                      <option value="both">📜 Ring + Kartongveck</option>
                      <option value="worn_cardboard">📦 Endast kartong</option>
                      <option value="none">✨ Nyskick / Rent</option>
                    </select>
                  </div>
                </div>

                <!-- Photo Filter & Speed Badge in 2 cols -->
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="block text-[10px] font-bold text-secondary mb-0.5">Fotofilter / Färgton:</label>
                    <select v-model="aiPhotoFilter" :disabled="isGeneratingCover" class="select select-bordered w-full bg-base-100 select-xs text-[10px]" @change="generateCoverWithAi">
                      <option value="vintage_warm">🎞️ Analog Ektachrome</option>
                      <option value="natural">📷 Naturliga färger</option>
                      <option value="bw">🖤 Rå svartvit / Duotone</option>
                      <option value="punchy">💥 Rikt mättat 70-tal</option>
                    </select>
                  </div>

                  <div>
                    <label class="block text-[10px] font-bold text-secondary mb-0.5">Format-badge:</label>
                    <select v-model="aiBadgeFormat" :disabled="isGeneratingCover" class="select select-bordered w-full bg-base-100 select-xs text-[10px]" @change="generateCoverWithAi">
                      <option value="45_rpm">45 R.P.M.</option>
                      <option value="stereo">FULL STEREO</option>
                      <option value="mono">HI-FI MONO</option>
                    </select>
                  </div>
                </div>
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
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="btn btn-outline btn-secondary btn-sm rounded-full font-bold gap-1 cursor-pointer"
                @click="randomizeCoverStyle"
              >
                <span>🎲 Slumpa stil</span>
              </button>
              <button
                type="button"
                class="btn btn-primary btn-sm rounded-full font-bold px-5 shadow-lg shadow-primary/30 flex items-center gap-2 cursor-pointer"
                @click="generateCoverWithAi"
              >
                <span>{{ aiCoverSource === 'photo' ? '📷' : '✨' }}</span>
                <span>{{ aiCoverSource === 'photo' ? 'Skapa från foto' : 'Generera med AI' }}</span>
              </button>
            </div>
          </template>

          <!-- Generating Mode -->
          <template v-else-if="isGeneratingCover">
            <span class="text-xs text-primary font-mono animate-pulse flex items-center gap-1.5">
              <span>⏳</span> Komponerar singelomslag med typografi...
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
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="btn btn-outline btn-secondary btn-sm rounded-full gap-1.5 font-bold text-xs cursor-pointer"
                :disabled="isGeneratingCover"
                title="Slumpa fram en helt ny kombination av layout, färg och patina!"
                @click="randomizeCoverStyle"
              >
                <span>🎲</span>
                <span>Slumpa ny stil</span>
              </button>
            </div>

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
                :disabled="isGeneratingCover || isApplyingCover"
                @click="applyGeneratedCover"
              >
                <span v-if="isApplyingCover" class="loading loading-spinner loading-xs" />
                <span v-else>✓</span>
                <span>{{ isApplyingCover ? 'Sparar omslag...' : 'Använd detta omslag' }}</span>
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- COVER STUDIO ZOOM MODAL (HIGH RES INSPECTION) -->
    <div
      v-if="showCoverZoomModal && generatedCoverResult"
      class="fixed inset-0 z-[70] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5"
      @click="showCoverZoomModal = false"
    >
      <div
        class="stage-card max-w-2xl w-full p-4 sm:p-6 rounded-3xl border-2 border-primary/50 shadow-2xl space-y-3.5 bg-base-100 flex flex-col items-center max-h-[96vh] overflow-y-auto"
        @click.stop
      >
        <!-- Zoom Modal Header -->
        <div class="flex items-center justify-between w-full border-b border-primary/20 pb-2.5">
          <div class="truncate mr-2">
            <span class="text-[10px] uppercase font-bold text-secondary font-mono block">Högupplöst Granskning</span>
            <h3 class="font-heading text-base sm:text-lg text-primary font-black truncate">
              {{ songForm.title || 'Det 7:e Gunget' }} • 7"-singelomslag
            </h3>
          </div>
          <button
            type="button"
            class="btn btn-sm btn-circle btn-ghost text-lg cursor-pointer"
            title="Stäng förstoringsvy"
            @click="showCoverZoomModal = false"
          >
            ✕
          </button>
        </div>

        <!-- High-res Large Image Container -->
        <div class="relative w-full max-w-[500px] aspect-square rounded-2xl overflow-hidden shadow-2xl border-2 border-amber-900/70 bg-[#140e0a]">
          <img
            :src="generatedCoverResult.coverUrl || generatedCoverResult.url"
            :alt="generatedCoverResult.title || 'Skivomslag i full storlek'"
            class="w-full h-full object-cover"
          >
        </div>

        <!-- Metadata & Details Row -->
        <div class="flex items-center justify-between w-full text-xs font-mono text-base-content/70 px-1 pt-1">
          <div>
            <span class="text-primary font-bold">{{ generatedCoverResult.styleName || aiStylePreset }}</span>
            <span class="mx-1">•</span>
            <span>{{ generatedCoverResult.layout || aiLayout }}</span>
            <span v-if="aiCatalogNumber" class="mx-1">•</span>
            <span v-if="aiCatalogNumber" class="text-secondary font-bold">{{ aiCatalogNumber }}</span>
          </div>
          <span class="badge badge-sm badge-outline border-secondary text-secondary font-mono">
            45 R.P.M.
          </span>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-end gap-2 w-full pt-2 border-t border-primary/10">
          <button
            type="button"
            class="btn btn-ghost btn-sm rounded-full text-xs cursor-pointer"
            @click="showCoverZoomModal = false"
          >
            Stäng
          </button>
          <button
            type="button"
            class="btn btn-primary btn-sm rounded-full font-bold px-5 shadow-lg shadow-primary/30 text-xs sm:text-sm cursor-pointer flex items-center gap-1.5"
            @click="applyGeneratedCover"
          >
            <span>✓</span>
            <span>Använd detta omslag</span>
          </button>
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
          <div v-else class="flex flex-col items-center justify-center h-full p-6 text-center space-y-3 bg-base-200/50">
            <span class="text-5xl animate-bounce">💿</span>
            <div class="space-y-1">
              <span class="text-sm font-bold text-primary block">Inget skivomslag tilldelat än</span>
              <p class="text-[11px] text-base-content/70 max-w-xs">Skapa ett autentiskt retro 7"-singelomslag med låtens titel och bandnamn!</p>
            </div>
            <button
              type="button"
              class="btn btn-sm btn-primary rounded-full font-bold gap-1.5 shadow-md hover:scale-105 transition-transform cursor-pointer"
              @click="openCoverStudioForPreviewSong"
            >
              <span>🎨</span>
              <span>Skapa i Cover Studio</span>
            </button>
          </div>
        </div>

        <div class="flex items-center justify-between text-xs text-base-content/70 pt-1">
          <span class="truncate">{{ previewCoverModal.isOriginal ? 'Originalkomposition av Det 7:e Gunget' : `Cover av ${previewCoverModal.originalArtist || 'Okänd'}` }}</span>
          <button
            v-if="previewCoverModal.coverImage"
            type="button"
            class="btn btn-xs btn-outline btn-secondary rounded-full font-bold gap-1 cursor-pointer flex-shrink-0 ml-2"
            title="Öppna och anpassa i Cover Studio"
            @click="openCoverStudioForPreviewSong"
          >
            <span>🎨</span>
            <span>Ändra i Cover Studio</span>
          </button>
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

    <!-- TAP-TO-SYNC LYRICS MODAL -->
    <div
      v-if="showTapToSyncModal"
      class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-hidden"
    >
      <div class="stage-card max-w-2xl w-full max-h-[94vh] flex flex-col rounded-3xl border-2 border-primary/40 shadow-2xl bg-base-100 relative overflow-hidden">
        <!-- 1. Modal Header -->
        <div class="flex items-center justify-between border-b border-primary/20 p-4 flex-shrink-0 bg-base-100">
          <div class="space-y-0.5">
            <div class="flex items-center gap-2">
              <span class="text-xl">⏱️</span>
              <h3 class="font-heading text-lg text-primary font-black">
                Text-synkare (Tap-to-sync)
              </h3>
            </div>
            <p class="text-xs text-base-content/70">
              Synka <strong class="text-primary">{{ songForm.title || 'låten' }}</strong> till musiken. Tryck <kbd class="kbd kbd-xs bg-base-300 font-mono text-primary font-bold">Mellanslag</kbd> eller klicka på knappen i takt med att raderna sjungs!
            </p>
          </div>

          <button
            type="button"
            class="btn btn-sm btn-circle btn-ghost text-lg cursor-pointer"
            @click="showTapToSyncModal = false; if (tapSyncAudioRef) tapSyncAudioRef.pause()"
          >
            ✕
          </button>
        </div>

        <!-- 2. Audio Player Bar -->
        <div class="bg-base-200/90 border-b border-primary/20 p-3 flex flex-col gap-2 flex-shrink-0">
          <audio
            ref="tapSyncAudioRef"
            :src="songForm.audioUrl || undefined"
            preload="metadata"
            @timeupdate="onTapSyncAudioTimeUpdate"
            @ended="onTapSyncAudioEnded"
          />

          <div class="flex items-center justify-between gap-3">
            <button
              type="button"
              class="btn btn-sm btn-primary rounded-full px-4 font-bold flex items-center gap-2 cursor-pointer shadow-md"
              :disabled="!songForm.audioUrl"
              @click="toggleTapSyncPlay"
            >
              <span>{{ tapSyncIsPlaying ? '⏸ Pausa' : '▶ Spela musik' }}</span>
            </button>

            <div class="flex items-center gap-2 font-mono text-xs">
              <span class="text-amber-300 font-black text-sm">{{ formatSeconds(tapSyncAudioCurrentTime) }}</span>
              <span class="text-base-content/40">/</span>
              <span class="text-base-content/70">{{ formatSeconds(tapSyncAudioDuration) }}</span>
            </div>

            <!-- Stamped count badge -->
            <div class="text-[11px] font-mono text-secondary font-bold">
              {{ tapSyncLines.filter(l => l.timestamp !== undefined).length }} / {{ tapSyncLines.filter(l => !l.isHeader).length }} rader synkade
            </div>
          </div>

          <!-- Timeline scrubber slider if audio is present -->
          <input
            v-if="songForm.audioUrl"
            type="range"
            min="0"
            :max="tapSyncAudioDuration || 180"
            step="0.1"
            :value="tapSyncAudioCurrentTime"
            class="range range-xs range-primary w-full cursor-pointer"
            @input="(e) => {
              const val = parseFloat((e.target as HTMLInputElement).value);
              tapSyncAudioCurrentTime = val;
              if (tapSyncAudioRef) tapSyncAudioRef.currentTime = val;
            }"
          >
          <div v-else class="text-[11px] text-amber-400/90 bg-amber-950/20 p-1.5 rounded-lg border border-amber-500/20 text-center">
            💡 Tips: Ladda upp låtens ljudfil (MP3/WAV) i formuläret för att höra musiken spelas medan du trycker.
          </div>
        </div>

        <!-- 3. Main Center Stage: Live Tap & Prompter Card -->
        <div class="p-4 overflow-y-auto flex-1 space-y-3.5">
          <!-- Live Interactive Stamping Box -->
          <div class="p-4 sm:p-5 rounded-2xl bg-base-200 border-2 border-primary/40 space-y-3 shadow-lg relative overflow-hidden">
            <!-- Progress indicator -->
            <div class="flex items-center justify-between text-xs font-mono">
              <span class="text-secondary font-bold">
                {{ tapSyncCurrentIndex >= tapSyncLines.length ? '✓ Alla rader har stämplats!' : `Rad ${tapSyncCurrentIndex + 1} av ${tapSyncLines.length}` }}
              </span>
              <span class="badge badge-xs font-mono" :class="tapSyncIsPlaying ? 'badge-primary animate-pulse' : 'badge-ghost'">
                {{ tapSyncIsPlaying ? '▶ MUSIKEN SPELAS' : '⏸ PAUSAD' }}
              </span>
            </div>

            <!-- Previous stamped line -->
            <div v-if="tapSyncCurrentIndex > 0 && tapSyncLines[tapSyncCurrentIndex - 1]" class="opacity-60 text-xs font-mono truncate flex items-center gap-2">
              <span class="badge badge-xs badge-outline text-emerald-400 font-mono">
                {{ formatLrcTimestamp(tapSyncLines[tapSyncCurrentIndex - 1]?.timestamp || 0) }}
              </span>
              <span class="truncate line-through text-base-content/70">{{ tapSyncLines[tapSyncCurrentIndex - 1]?.text }}</span>
            </div>

            <!-- TARGET CURRENT LINE TO STAMP -->
            <div class="p-3.5 rounded-xl bg-base-100 border-2 border-amber-400 shadow-inner min-h-[70px] flex flex-col justify-center text-center space-y-1">
              <span class="text-[10px] uppercase font-mono tracking-widest text-amber-400 font-bold">
                {{ tapSyncCurrentIndex >= tapSyncLines.length ? 'Klart!' : 'Klicka när sångaren börjar sjunga denna rad:' }}
              </span>
              <p v-if="tapSyncCurrentIndex < tapSyncLines.length" class="font-heading font-black text-lg sm:text-xl text-primary leading-tight">
                {{ tapSyncLines[tapSyncCurrentIndex]?.text || '—' }}
              </p>
              <p v-else class="text-emerald-400 font-bold text-base flex items-center justify-center gap-1.5">
                <span>🎉</span> <span>Alla rader har fått tidsstämplar! Klicka på "Använd synkad text" nedan.</span>
              </p>
            </div>

            <!-- Next Line Preview -->
            <div v-if="tapSyncCurrentIndex + 1 < tapSyncLines.length" class="opacity-50 text-xs font-mono truncate flex items-center gap-2">
              <span class="text-[10px] text-base-content/50 uppercase">Nästa:</span>
              <span class="truncate">{{ tapSyncLines[tapSyncCurrentIndex + 1]?.text }}</span>
            </div>

            <!-- Giant Stamping Button -->
            <button
              type="button"
              class="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-600 to-primary hover:from-amber-500 hover:to-primary-focus text-neutral font-black text-base sm:text-lg shadow-xl shadow-primary/30 active:scale-95 transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer disabled:opacity-40"
              :disabled="tapSyncCurrentIndex >= tapSyncLines.length"
              @click="stampCurrentLine"
            >
              <div class="flex items-center gap-2">
                <span>⏱️</span>
                <span>STÄMPLA DENNA RAD NU</span>
              </div>
              <span class="text-[11px] font-mono opacity-80 font-normal">
                (Tryck <kbd class="bg-black/30 px-1.5 py-0.5 rounded text-white font-bold">Mellanslag</kbd> eller klicka här vid <strong class="underline">{{ formatSeconds(tapSyncAudioCurrentTime) }}</strong>)
              </span>
            </button>

            <!-- Quick Utility Row: Solo break, Undo, Reset -->
            <div class="flex items-center justify-between gap-2 pt-1 flex-wrap">
              <button
                type="button"
                class="btn btn-xs btn-outline btn-secondary rounded-lg gap-1 text-[11px] font-bold cursor-pointer"
                title="Lägg till en markering för instrumental solo / paus vid aktuell tidpunkt"
                @click="stampSoloBreak"
              >
                <span>🎷</span>
                <span>Infoga solo/paus</span>
              </button>

              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="btn btn-xs btn-ghost text-xs rounded-lg gap-1 cursor-pointer"
                  :disabled="tapSyncCurrentIndex <= 0"
                  title="Gå tillbaka och ångra stämplingen för förra raden"
                  @click="undoLastStamp"
                >
                  <span>↩</span>
                  <span>Ångra rad</span>
                </button>

                <button
                  type="button"
                  class="btn btn-xs btn-ghost text-error text-xs rounded-lg gap-1 cursor-pointer"
                  title="Rensa alla tidsstämplar och börja om"
                  @click="resetTapSync"
                >
                  <span>🔄</span>
                  <span>Börja om</span>
                </button>
              </div>
            </div>
          </div>

          <!-- All Synced Lines Overview List -->
          <div class="space-y-1.5">
            <span class="text-xs font-bold text-secondary flex items-center justify-between">
              <span>📋 Översikt över alla rader:</span>
              <span class="text-[10px] text-base-content/60 font-mono">Klicka på en rad för att hoppa i synkningen</span>
            </span>

            <div class="max-h-44 overflow-y-auto bg-base-200/70 p-2 rounded-xl border border-primary/20 space-y-1 font-mono text-xs">
              <div
                v-for="(line, idx) in tapSyncLines"
                :key="line.id"
                class="p-1.5 rounded flex items-center justify-between gap-2 cursor-pointer transition-colors"
                :class="idx === tapSyncCurrentIndex
                  ? 'bg-primary text-primary-content font-bold shadow-xs'
                  : line.timestamp !== undefined
                    ? 'bg-base-300/80 text-emerald-400'
                    : 'text-base-content/60 hover:bg-base-300/40'"
                @click="tapSyncCurrentIndex = idx"
              >
                <div class="flex items-center gap-2 truncate">
                  <span class="text-[10px] font-mono opacity-60 w-5 text-right">{{ idx + 1 }}.</span>
                  <span class="truncate">{{ line.text || '[Tom rad]' }}</span>
                </div>
                <div class="flex items-center gap-1.5 flex-shrink-0">
                  <span v-if="line.timestamp !== undefined" class="badge badge-xs font-mono font-bold" :class="idx === tapSyncCurrentIndex ? 'badge-neutral text-primary' : 'badge-primary'">
                    {{ formatLrcTimestamp(line.timestamp) }}
                  </span>
                  <span v-else class="text-[10px] text-base-content/40 italic">Ostämpad</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. Modal Footer -->
        <div class="border-t border-primary/20 p-3.5 bg-base-200 flex items-center justify-between flex-shrink-0">
          <button
            type="button"
            class="btn btn-ghost btn-sm rounded-full cursor-pointer text-xs"
            @click="showTapToSyncModal = false; if (tapSyncAudioRef) tapSyncAudioRef.pause()"
          >
            Avbryt
          </button>

          <button
            type="button"
            class="btn btn-primary btn-sm rounded-full font-bold px-5 shadow-lg shadow-primary/30 flex items-center gap-2 cursor-pointer"
            @click="applyTapSync"
          >
            <span>✓</span>
            <span>Använd synkad text</span>
          </button>
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
