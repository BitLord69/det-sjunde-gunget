<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()

useSeoMeta({
  title: () => `${t('seo.lyrics_title')}`,
  description: () => t('seo.lyrics_desc'),
  ogTitle: () => `${t('seo.lyrics_og_title')}`,
  ogDescription: () => t('seo.lyrics_og_desc'),
  ogImage: '/media/og/og-share.jpg',
})

interface Song {
  id: string
  title: string
  isOriginal: boolean
  originalArtist: string | null
  embedProvider: string
  embedUrl: string
  audioUrl: string | null
  duration: number | null
  lyrics: string | null
  lyricsEn: string | null
  chords: string | null
  sortOrder: number
}

const { data: songsData } = await useFetch<Song[]>('/api/songs', {
  default: () => [],
})

const songsWithLyrics = computed(() => {
  const list = songsData.value || []
  return list.filter((s) => s.lyrics && s.lyrics.trim().length > 0)
})

const activeSongId = ref<string>('')
const showChords = ref(true)
const showEnglish = ref(false)
const searchQuery = ref('')

// Initialize active song from route hash or first song with lyrics
onMounted(() => {
  const hash = route.hash ? route.hash.replace('#', '') : ''
  if (hash && songsWithLyrics.value.some((s) => s.id === hash)) {
    activeSongId.value = hash
    scrollToSong(hash)
  } else if (songsWithLyrics.value.length > 0) {
    activeSongId.value = songsWithLyrics.value[0]?.id || ''
  }
})

watch(
  () => route.hash,
  (newHash) => {
    if (newHash) {
      const id = newHash.replace('#', '')
      if (songsWithLyrics.value.some((s) => s.id === id)) {
        activeSongId.value = id
        scrollToSong(id)
      }
    }
  },
)

const scrollToSong = (id: string) => {
  setTimeout(() => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, 100)
}

const selectSong = (id: string) => {
  activeSongId.value = id
  window.history.replaceState(null, '', `#${id}`)
  scrollToSong(id)
}

const filteredSongs = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return songsWithLyrics.value
  return songsWithLyrics.value.filter(
    (s) =>
      s.title.toLowerCase().includes(q) ||
      (s.lyrics && s.lyrics.toLowerCase().includes(q)) ||
      (s.originalArtist && s.originalArtist.toLowerCase().includes(q)),
  )
})

const activeSong = computed(() => {
  return songsWithLyrics.value.find((s) => s.id === activeSongId.value) || songsWithLyrics.value[0] || null
})

// Audio Player Engine for in-place playback
const {
  isAudioPlaying,
  currentSongId,
  currentTime,
  duration,
  playTrack,
  pauseTrack,
  resumeTrack,
} = useJukeboxAudio()

const isPlayingActiveSong = computed(() => {
  return isAudioPlaying.value && currentSongId.value === activeSong.value?.id
})

const togglePlayActiveSong = () => {
  if (!activeSong.value) return
  if (isPlayingActiveSong.value) {
    pauseTrack()
  } else if (currentSongId.value === activeSong.value.id && !isAudioPlaying.value) {
    resumeTrack(activeSong.value)
  } else {
    playTrack({
      id: activeSong.value.id,
      title: activeSong.value.title,
      audioUrl: activeSong.value.audioUrl,
    })
  }
}

const formatTime = (seconds: number) => {
  if (isNaN(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

interface LyricBlock {
  type: 'verse' | 'chorus' | 'bridge' | 'other'
  label?: string
  lines: string[]
}

const parseLyricsBlocks = (text: string | null): LyricBlock[] => {
  if (!text) return []
  const rawBlocks = text.split(/\n\s*\n/)
  const blocks: LyricBlock[] = []

  for (const raw of rawBlocks) {
    const lines = raw.split('\n').map((l) => l.trimEnd())
    if (lines.length === 0 || (lines.length === 1 && !lines[0])) continue

    const firstLine = lines[0] || ''
    let type: LyricBlock['type'] = 'verse'
    let label: string | undefined

    if (firstLine.startsWith('[') && firstLine.endsWith(']')) {
      label = firstLine.slice(1, -1).trim()
      lines.shift()
      const lower = label.toLowerCase()
      if (lower.includes('refräng') || lower.includes('chorus')) type = 'chorus'
      else if (lower.includes('stick') || lower.includes('bridge')) type = 'bridge'
      else type = 'verse'
    } else {
      const lower = firstLine.toLowerCase()
      if (lower.includes('refräng:') || lower.includes('chorus:')) {
        type = 'chorus'
        label = firstLine.replace(':', '').trim()
        lines.shift()
      } else if (lower.includes('stick:') || lower.includes('bridge:')) {
        type = 'bridge'
        label = firstLine.replace(':', '').trim()
        lines.shift()
      }
    }

    blocks.push({
      type,
      label,
      lines: lines.filter((l) => l.length > 0),
    })
  }

  return blocks
}
</script>

<template>
  <div class="relative min-h-screen pb-16">
    <!-- Atmospheric subtle stage glow & background -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden -z-10">
      <NuxtImg
        src="/media/textures/stipple-mask.png"
        alt=""
        class="w-full h-full object-cover opacity-15 mix-blend-overlay"
        priority
      />
      <div class="absolute inset-0 bg-gradient-to-b from-base-100 via-base-100/90 to-base-100" />
      <div class="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/10 rounded-full blur-[140px]" />
    </div>

    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-6 sm:space-y-8">
      <!-- HEADER: Centered with Eyebrow -->
      <PageHeader
        :title="t('lyrics.title')"
        :description="t('lyrics.desc')"
      />

      <!-- Quick Filter / Search Bar -->
      <div class="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6 sm:mb-8">
        <div class="relative w-full max-w-md">
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="t('lyrics.search_placeholder')"
            class="input input-bordered input-sm sm:input-md w-full rounded-full pl-10 pr-4 bg-base-200/90 text-xs sm:text-sm border-primary/30 focus:border-primary"
          >
          <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-base-content/50 pointer-events-none">🔍</span>
        </div>

        <div class="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            class="btn btn-sm rounded-full text-xs font-bold border transition-colors cursor-pointer"
            :class="showChords ? 'btn-primary shadow-sm' : 'btn-outline border-primary/30 text-base-content/70'"
            @click="showChords = !showChords"
          >
            🎸 {{ showChords ? t('lyrics.hide_chords') : t('lyrics.show_chords') }}
          </button>

          <button
            type="button"
            class="btn btn-sm rounded-full text-xs font-bold border transition-colors cursor-pointer"
            :class="showEnglish ? 'btn-secondary shadow-sm' : 'btn-outline border-secondary/30 text-base-content/70'"
            @click="showEnglish = !showEnglish"
          >
            🇬🇧 {{ showEnglish ? t('lyrics.view_swedish') : t('lyrics.view_english') }}
          </button>
        </div>
      </div>

      <!-- MAIN SONGBOOK LAYOUT (Index on left, Song Sheet on right) -->
      <div class="grid lg:grid-cols-[300px_1fr] gap-8 items-start">
        <!-- LEFT: Spiral Song Index Sidebar -->
        <div class="stage-card p-5 rounded-3xl border border-primary/30 space-y-4 shadow-xl lg:sticky lg:top-24">
          <div class="flex items-center justify-between border-b border-primary/20 pb-3">
            <span class="font-heading text-lg text-primary font-bold">{{ t('lyrics.index_title') }}</span>
            <span class="badge badge-primary font-mono text-xs font-bold">{{ t('lyrics.songs_count', { count: filteredSongs.length }) }}</span>
          </div>

          <div class="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
            <button
              v-for="(song, idx) in filteredSongs"
              :key="song.id"
              type="button"
              class="w-full text-left p-3 rounded-xl font-medium text-xs sm:text-sm transition-all flex items-center justify-between gap-2 cursor-pointer"
              :class="
                activeSongId === song.id
                  ? 'bg-primary text-primary-content font-bold shadow-md shadow-primary/20 scale-[1.02]'
                  : 'bg-base-200/70 hover:bg-base-200 text-base-content/80 hover:text-primary'
              "
              @click="selectSong(song.id)"
            >
              <div class="flex items-center gap-2.5 truncate">
                <span class="font-mono text-xs opacity-70 w-4 text-right flex-shrink-0">{{ idx + 1 }}.</span>
                <span class="truncate">{{ song.title }}</span>
                <span v-if="currentSongId === song.id && isAudioPlaying" class="text-xs animate-bounce flex-shrink-0">🎵</span>
              </div>
              <span
                v-if="song.isOriginal"
                class="badge badge-xs font-mono font-bold uppercase flex-shrink-0"
                :class="activeSongId === song.id ? 'badge-neutral text-primary' : 'badge-primary badge-outline'"
              >
                {{ t('lyrics.original_badge') }}
              </span>
            </button>
          </div>

          <!-- Jukebox Direct Link -->
          <div class="pt-4 border-t border-primary/20 text-center">
            <NuxtLink :to="localePath('/music')" class="btn btn-outline btn-secondary btn-sm w-full rounded-full font-bold">
              {{ t('lyrics.listen_jukebox') }}
            </NuxtLink>
          </div>
        </div>

        <!-- RIGHT: Authentic Weathered Stage Binder Sheet -->
        <div v-if="activeSong" :id="activeSong.id" class="songbook-sheet relative bg-[#faf6ed] text-[#1c1611] p-6 sm:p-10 lg:p-12 rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-[#dfd2be] space-y-8 select-text">
          <!-- Spiral binder hole punch marks on top left -->
          <div class="hidden sm:flex items-center gap-6 absolute top-3 left-8 pointer-events-none opacity-60">
            <div v-for="h in 6" :key="h" class="w-3.5 h-3.5 rounded-full bg-[#1a120b] shadow-inner border border-[#4d3824]" />
          </div>

          <!-- Song Header Title & Info -->
          <div class="border-b-2 border-dashed border-[#8c765c]/40 pb-6 pt-2">
            <div class="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
              <div>
                <div class="text-[10px] sm:text-xs font-mono font-black uppercase tracking-widest text-[#801b1c] flex items-center gap-2">
                  <span>★ DET 7<span class="lowercase">:e</span> GUNGET ★</span>
                  <span v-if="activeSong.isOriginal" class="bg-[#ecd5c3] px-2 py-0.5 rounded text-[#731a1b] font-bold">{{ t('lyrics.original_composition') }}</span>
                  <span v-else class="text-[#634e3b]">{{ t('lyrics.cover_of', { artist: activeSong.originalArtist }) }}</span>
                </div>

                <h2 class="font-heading font-black text-3xl sm:text-4xl lg:text-5xl text-[#1a1209] tracking-tight uppercase mt-1">
                  {{ activeSong.title }}
                </h2>
              </div>

              <!-- Action buttons: Play Here & Jukebox Jump Button -->
              <div class="flex flex-wrap items-center gap-2 flex-shrink-0 pt-2 sm:pt-0">
                <!-- Spela här / Pausa button -->
                <button
                  type="button"
                  class="btn btn-sm rounded-full font-bold shadow px-4 text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  :class="
                    isPlayingActiveSong
                      ? 'bg-[#1b432a] hover:bg-[#143320] text-[#faf6ed] border-none ring-2 ring-emerald-500/50'
                      : 'bg-[#2b2118] hover:bg-[#1a130e] text-[#faf6ed] border-none'
                  "
                  :title="isPlayingActiveSong ? t('lyrics.pause_here') : t('lyrics.play_here')"
                  @click="togglePlayActiveSong"
                >
                  <span class="text-sm">{{ isPlayingActiveSong ? '⏸' : '▶' }}</span>
                  <span>{{ isPlayingActiveSong ? t('lyrics.pause_here') : t('lyrics.play_here') }}</span>
                </button>

                <!-- Spela i Jukeboxen button -->
                <NuxtLink
                  :to="localePath({ path: '/music', query: { song: activeSong.id } })"
                  class="btn btn-sm bg-[#912426] hover:bg-[#731a1b] text-[#faf6ed] border-none rounded-full font-bold shadow px-4 text-xs flex items-center gap-1.5"
                  :title="t('lyrics.play_jukebox')"
                >
                  <span>📻</span>
                  <span>{{ t('lyrics.play_jukebox') }}</span>
                </NuxtLink>
              </div>
            </div>

            <!-- In-place Mini Audio Player bar when this song is active in player -->
            <div
              v-if="currentSongId === activeSong.id"
              class="mt-4 p-3 rounded-2xl bg-[#231a14] text-[#faf6ed] flex items-center justify-between gap-3 text-xs font-mono shadow-lg border border-amber-600/30 transition-all"
            >
              <div class="flex items-center gap-2.5 truncate">
                <span
                  class="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                  :class="isAudioPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400/70'"
                />
                <span class="text-amber-300 font-bold truncate">🎵 {{ activeSong.title }}</span>
                <span class="text-[#a89b88] hidden sm:inline">• {{ isAudioPlaying ? t('lyrics.now_playing') : t('lyrics.paused') }}</span>
              </div>
              <div class="flex items-center gap-3 flex-shrink-0">
                <span class="text-[#c5b59e] text-[11px] font-bold">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
                <button
                  type="button"
                  class="btn btn-xs rounded-full px-2.5 text-xs font-bold transition-all cursor-pointer"
                  :class="isAudioPlaying ? 'bg-[#912426] text-white hover:bg-[#731a1b]' : 'bg-emerald-600 text-white hover:bg-emerald-700'"
                  @click="togglePlayActiveSong"
                >
                  {{ isAudioPlaying ? '⏸' : '▶' }}
                </button>
              </div>
            </div>

            <!-- Chords / Key Sheet Info -->
            <div v-if="showChords && activeSong.chords" class="mt-4 p-3.5 rounded-xl bg-[#ede3d1] border border-[#d6c5aa] font-mono text-xs text-[#422e1b] space-y-1 shadow-inner">
              <div class="font-bold text-[#801b1c] flex items-center gap-1.5">
                <span>🎸</span> {{ t('lyrics.chords_and_structure') }}
              </div>
              <pre class="font-mono text-xs whitespace-pre-wrap leading-relaxed">{{ activeSong.chords }}</pre>
            </div>
          </div>

          <!-- Lyrics Body -->
          <div class="space-y-6 text-sm sm:text-base leading-relaxed">
            <template v-if="!showEnglish || !activeSong.lyricsEn">
              <div
                v-for="(block, bIdx) in parseLyricsBlocks(activeSong.lyrics)"
                :key="bIdx"
                class="rounded-xl p-4 sm:p-5 transition-colors"
                :class="
                  block.type === 'chorus'
                    ? 'bg-[#ede0c8] border-l-4 border-[#912426] shadow-sm'
                    : block.type === 'bridge'
                      ? 'bg-[#e8dec6]/70 border-l-4 border-[#b45309] italic'
                      : 'bg-transparent'
                "
              >
                <div
v-if="block.label" class="text-[11px] font-mono font-black uppercase tracking-wider mb-2"
                  :class="block.type === 'chorus' ? 'text-[#912426]' : 'text-[#6e5845]'"
                >
                  {{ block.label }}
                </div>

                <div class="font-medium text-[#1c150f] space-y-1 whitespace-pre-line text-sm sm:text-base">
                  <div v-for="(line, lIdx) in block.lines" :key="lIdx" class="leading-relaxed">
                    {{ line }}
                  </div>
                </div>
              </div>
            </template>

            <!-- English Translation View -->
            <template v-else>
              <div class="p-3 rounded-lg bg-secondary/15 text-secondary text-xs font-mono font-bold mb-4">
                🇬🇧 {{ t('lyrics.english_interpretation') }}
              </div>
              <div
                v-for="(block, bIdx) in parseLyricsBlocks(activeSong.lyricsEn)"
                :key="'en-' + bIdx"
                class="rounded-xl p-4 sm:p-5"
                :class="
                  block.type === 'chorus'
                    ? 'bg-[#ede0c8] border-l-4 border-[#912426]'
                    : 'bg-transparent'
                "
              >
                <div v-if="block.label" class="text-[11px] font-mono font-black uppercase tracking-wider mb-2 text-[#912426]">
                  {{ block.label }}
                </div>
                <div class="font-medium text-[#1c150f] space-y-1 whitespace-pre-line">
                  <div v-for="(line, lIdx) in block.lines" :key="lIdx">
                    {{ line }}
                  </div>
                </div>
              </div>
            </template>
          </div>

          <!-- Sheet Footer Band Stamp -->
          <div class="pt-6 border-t-2 border-dashed border-[#8c765c]/40 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-[#735e47] gap-3">
            <div class="flex items-center gap-2">
              <span v-if="activeSong.isOriginal">✍️ {{ t('lyrics.lyrics_and_music') }}</span>
            </div>
            <div class="font-bold text-[#801b1c]">
              {{ t('lyrics.volume_stamp') }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.songbook-sheet {
  background: radial-gradient(ellipse at 50% 20%, #faf6ed 0%, #f3ebdb 80%, #ebdcc5 100%);
}
</style>
