<script setup lang="ts">
const { t } = useI18n()

useSeoMeta({
  title: 'Jukebox & musik | Det 7:e Gunget',
  description: 'Klappa i en slant och lyssna på Det 7:e Gungets egna alster och svettiga tolkningar i vår interaktiva jukebox.',
})

const { data: songsData } = await useFetch('/api/songs')

interface SetlistItem {
  id: string
  title: string
  artist: string | null
  isOriginal: boolean
  setName: string
  notes: string | null
  sortOrder: number
}
const { data: setlistData } = await useFetch<SetlistItem[]>('/api/setlist')

const groupedSetlist = computed(() => {
  const items = setlistData.value || []
  const groups: Record<string, SetlistItem[]> = {}
  for (const item of items) {
    const set = item.setName || 'Set 1'
    if (!groups[set]) groups[set] = []
    groups[set].push(item)
  }
  return groups
})

const songFilter = ref<'all' | 'original' | 'cover'>('all')
const playerDisplayMode = ref<'vinyl' | 'embed'>('vinyl')

// Assign letter-number jukebox codes (A1, A2, A3... for originals, B1, B2... for covers)
const songsWithCodes = computed(() => {
  const list = songsData.value || []
  let originalIndex = 1
  let coverIndex = 1

  return list.map((song: any) => {
    if (song.isOriginal) {
      const code = `A${originalIndex++}`
      return { ...song, code, side: 'A' }
    } else {
      const code = `B${coverIndex++}`
      return { ...song, code, side: 'B' }
    }
  })
})

const filteredSongs = computed(() => {
  const list = songsWithCodes.value
  if (songFilter.value === 'original') return list.filter((s: any) => s.isOriginal)
  if (songFilter.value === 'cover') return list.filter((s: any) => !s.isOriginal)
  return list
})

// Active song state
const activeSongId = ref<string | null>('song-det-sjunde-gunget')
const credits = ref(5)
const coinAnimation = ref(false)

const currentSong = computed(() => {
  return songsWithCodes.value.find((s: any) => s.id === activeSongId.value) || songsWithCodes.value[0] || null
})

// Initialize Jukebox Audio Engine
const {
  isAudioPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  audioSourceType,
  playTrack,
  pauseTrack,
  resumeTrack,
  playCoinChime,
  setAudioVolume,
  toggleMute,
  seek,
} = useJukeboxAudio()

const selectSong = (songId: string) => {
  activeSongId.value = songId
  const song = songsWithCodes.value.find((s: any) => s.id === songId)
  if (song) {
    playTrack(song)
  }
}

const togglePlay = (songId?: string) => {
  if (songId && activeSongId.value !== songId) {
    selectSong(songId)
    return
  }

  if (isAudioPlaying.value) {
    pauseTrack()
  } else if (currentSong.value) {
    resumeTrack(currentSong.value)
  }
}

const playByCode = (code: string) => {
  const target = songsWithCodes.value.find((s: any) => s.code.toLowerCase() === code.toLowerCase())
  if (target) {
    selectSong(target.id)
  }
}

const nextTrack = () => {
  const list = songsWithCodes.value
  if (!list.length) return
  const currentIndex = list.findIndex((s: any) => s.id === activeSongId.value)
  const nextIndex = (currentIndex + 1) % list.length
  const nextSong = list[nextIndex]
  if (nextSong) {
    selectSong(nextSong.id)
  }
}

const prevTrack = () => {
  const list = songsWithCodes.value
  if (!list.length) return
  const currentIndex = list.findIndex((s: any) => s.id === activeSongId.value)
  const prevIndex = (currentIndex - 1 + list.length) % list.length
  const prevSong = list[prevIndex]
  if (prevSong) {
    selectSong(prevSong.id)
  }
}

const insertCoin = () => {
  credits.value += 3
  coinAnimation.value = true
  playCoinChime()
  setTimeout(() => {
    coinAnimation.value = false
  }, 1000)
}

// Convert song embed URL into direct iframe player link
const formattedEmbedUrl = computed(() => {
  const song = currentSong.value
  if (!song?.embedUrl) return ''
  const url = song.embedUrl

  // Spotify embed conversion
  if (song.embedProvider === 'spotify' || url.includes('spotify.com')) {
    if (url.includes('/embed/')) return url
    const match = url.match(/track\/([a-zA-Z0-9]+)/)
    if (match) return `https://open.spotify.com/embed/track/${match[1]}?utm_source=generator&theme=0`
    return url
  }

  // YouTube embed conversion
  if (song.embedProvider === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be')) {
    if (url.includes('/embed/')) return url
    const vMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/) || url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/)
    if (vMatch) return `https://www.youtube.com/embed/${vMatch[1]}?autoplay=1`
    return url
  }

  return url
})

const formatTime = (secs: number) => {
  if (isNaN(secs) || secs < 0) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s < 10 ? '0' : ''}${s}`
}
</script>

<template>
  <div class="relative min-h-screen pb-24 overflow-hidden">
    <!-- Atmospheric Background with diner scene & ambient neon glow -->
    <div class="absolute inset-0 -z-10 pointer-events-none">
      <NuxtImg
        src="/media/brand/jukebox_diner_bg.webp"
        alt="Vintage jukebox diner bar"
        class="w-full h-full object-cover opacity-20 filter blur-sm scale-105"
        priority
      />
      <div class="absolute inset-0 bg-gradient-to-b from-base-100 via-base-100/90 to-base-100" />
      <div class="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-primary/10 rounded-full blur-[140px]" />
      <div class="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-secondary/15 rounded-full blur-[120px]" />
    </div>

    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 space-y-12">
      <!-- Breadcrumb & Top Page Header -->
      <div class="text-center space-y-3 max-w-2xl mx-auto mb-14">
        <div class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-secondary/15 border border-secondary/30 text-secondary text-xs font-bold uppercase tracking-widest">
          <span>🎶</span> {{ t('music.jukebox_model') }}
        </div>

        <h1 class="font-heading text-4xl sm:text-6xl lg:text-7xl text-primary text-gritty pb-2">
          {{ t('music.title') }}
        </h1>

        <p class="text-sm sm:text-base text-base-content/80 leading-relaxed">
          {{ t('music.desc') }}
        </p>
      </div>

      <!-- MAIN JUKEBOX MACHINE CABINET -->
      <div class="max-w-4xl mx-auto rounded-[40px] sm:rounded-[56px] p-4 sm:p-8 bg-gradient-to-b from-base-200/95 via-base-100 to-base-200/95 dark:from-[#2a1d17] dark:via-[#1a120e] dark:to-[#0d0907] border-4 border-primary/40 shadow-2xl dark:shadow-[0_0_80px_rgba(200,121,63,0.35)] relative">
        <!-- Outer Glowing Neon Arch Trim -->
        <div class="absolute -inset-1 rounded-[42px] sm:rounded-[58px] bg-gradient-to-r from-secondary/30 via-primary/40 to-secondary/30 blur-sm pointer-events-none -z-10" />

        <!-- Chrome Top Arch & Vintage Marquee -->
        <div class="text-center pb-6 border-b border-primary/20 relative">
          <!-- Wurlitzer-Style Top Marquee Badge -->
          <div class="inline-flex items-center justify-center gap-2 sm:gap-4 px-6 sm:px-10 py-2 rounded-full bg-gradient-to-r from-base-300 via-base-200 to-base-300 dark:from-[#201712] dark:via-[#4d321d] dark:to-[#201712] border-2 border-primary shadow-lg shadow-primary/20">
            <span class="text-secondary text-sm">✦</span>
            <span class="font-heading text-lg sm:text-2xl text-primary uppercase tracking-[0.2em] font-bold text-gritty">
              DET 7:E GUNGET JUKEBOX
            </span>
            <span class="text-secondary text-sm">✦</span>
          </div>

          <div class="flex items-center justify-between mt-3 px-2 sm:px-6 text-[11px] font-mono">
            <span class="text-secondary uppercase tracking-widest font-bold hidden sm:inline">
              Hi-Fi Stereophonic Sound • 45 R.P.M.
            </span>

            <!-- Mode Switcher: Black Vinyl vs Embed Player with Tooltips -->
            <div class="flex items-center gap-1.5 bg-base-300/90 dark:bg-black/75 p-1 rounded-full border border-primary/40 shadow-inner mx-auto sm:mx-0">
              <button
                type="button"
                class="px-3.5 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                :class="playerDisplayMode === 'vinyl' ? 'bg-primary text-neutral shadow-md shadow-primary/30 font-black' : 'text-base-content/75 hover:text-primary hover:bg-base-200'"
                :title="t('music.mode_vinyl_tooltip')"
                @click="playerDisplayMode = 'vinyl'"
              >
                <!-- Authentic Black Vinyl LP Icon -->
                <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="11" fill="#14110f" stroke="#3d332a" stroke-width="1.2"/>
                  <circle cx="12" cy="12" r="8.5" stroke="#2b231d" stroke-width="0.75" stroke-dasharray="2 1"/>
                  <circle cx="12" cy="12" r="6.5" stroke="#241d18" stroke-width="0.75"/>
                  <circle cx="12" cy="12" r="4.2" fill="#9e2325" stroke="#d97706" stroke-width="0.6"/>
                  <circle cx="12" cy="12" r="1.3" fill="#14110f"/>
                </svg>
                <span>{{ t('music.mode_vinyl') }}</span>
              </button>
              <button
                type="button"
                class="px-3.5 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                :class="playerDisplayMode === 'embed' ? 'bg-primary text-neutral shadow-md shadow-primary/30 font-black' : 'text-base-content/75 hover:text-primary hover:bg-base-200'"
                :title="t('music.mode_embed_tooltip')"
                @click="playerDisplayMode = 'embed'"
              >
                <svg class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                <span>{{ t('music.mode_embed') }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- UPPER GLASS DOME: TURNTABLE OR EMBED PLAYER -->
        <div class="mt-6 p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-base-300/80 via-base-200/90 to-base-300/80 dark:from-[#0a0705] dark:to-[#17100b] border-2 border-primary/30 relative overflow-hidden shadow-inner">
          <!-- Glass reflection highlights -->
          <div class="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-white/10 pointer-events-none" />

          <!-- VIEW A: VINTAGE VINYL TURNTABLE CONSOLE -->
          <div v-if="playerDisplayMode === 'vinyl'" class="grid md:grid-cols-[1.2fr_0.8fr] gap-8 items-center relative z-10">
            <!-- Left: Rotating Vinyl Record Player -->
            <div class="flex items-center justify-center relative py-4">
              <!-- Vacuum Tubes Behind Record -->
              <div class="absolute -top-2 left-6 flex items-center gap-3 opacity-90">
                <div
                  v-for="i in 3"
                  :key="i"
                  class="w-4 h-10 rounded-t-full bg-gradient-to-t from-amber-600 via-amber-400 to-transparent border border-amber-400/40 transition-all duration-300 shadow-[0_0_12px_rgba(245,158,11,0.6)]"
                  :class="isAudioPlaying ? 'animate-pulse' : 'opacity-40'"
                />
              </div>

              <!-- Turntable Platter Base -->
              <div class="relative w-52 h-52 sm:w-64 sm:h-64 rounded-full bg-[#110d0a] border-4 border-primary/40 shadow-2xl flex items-center justify-center">
                <!-- 45 RPM Vinyl Record -->
                <div
                  class="w-48 h-48 sm:w-60 sm:h-60 rounded-full bg-[#0a0a0a] border-2 border-neutral-700/60 shadow-xl flex items-center justify-center relative transition-transform"
                  :class="isAudioPlaying ? 'animate-spin' : ''"
                  :style="{ animationDuration: '3.5s' }"
                >
                  <!-- Vinyl Grooves Rings -->
                  <div class="absolute inset-2 rounded-full border border-white/5 pointer-events-none" />
                  <div class="absolute inset-5 rounded-full border border-white/10 pointer-events-none" />
                  <div class="absolute inset-9 rounded-full border border-white/5 pointer-events-none" />
                  <div class="absolute inset-14 rounded-full border border-white/10 pointer-events-none" />

                  <!-- Record Center Label -->
                  <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-secondary via-primary to-secondary text-neutral p-1 shadow-md flex flex-col items-center justify-center text-center">
                    <span class="text-[8px] font-mono font-bold tracking-tighter uppercase">DET 7:E GUNGET</span>
                    <span class="text-[10px] font-heading font-black truncate max-w-[70px] leading-none my-0.5">
                      {{ currentSong ? currentSong.title : '45 RPM' }}
                    </span>
                    <span class="text-[7px] font-mono font-bold text-neutral/80">
                      {{ currentSong?.code || 'A1' }} • SIDE {{ currentSong?.side || 'A' }}
                    </span>
                    <div class="w-2.5 h-2.5 rounded-full bg-neutral mt-0.5" />
                  </div>
                </div>

                <!-- Tone-Arm Mechanism -->
                <div
                  class="absolute top-2 right-2 w-12 sm:w-16 h-28 sm:h-36 origin-top-right transition-transform duration-700 pointer-events-none z-20"
                  :style="{ transform: isAudioPlaying ? 'rotate(28deg)' : 'rotate(0deg)' }"
                >
                  <div class="w-1.5 h-full bg-gradient-to-b from-stone-300 via-stone-400 to-stone-500 rounded shadow-md" />
                  <div class="w-4 h-6 bg-primary rounded-sm -bottom-1 -left-1.5 absolute shadow-md border border-black/40" />
                </div>
              </div>
            </div>

            <!-- Right: Digital / Analog Track Status & Equalizer Display -->
            <div class="space-y-5 bg-base-200/90 dark:bg-neutral/80 p-5 sm:p-7 pb-7 rounded-2xl border border-primary/30 shadow-xl">
              <!-- Digital Track Code Screen -->
              <div class="bg-base-300/90 dark:bg-black/90 p-4 rounded-xl border border-primary/40 font-mono text-center space-y-1 shadow-inner">
                <div class="flex items-center justify-between text-[11px] text-secondary font-bold">
                  <span>{{ isAudioPlaying ? '● ' + t('music.now_playing') : '○ STANDBY' }}</span>
                  <span class="text-accent font-black text-sm">{{ currentSong?.code || 'A1' }}</span>
                </div>
                <div class="text-primary font-bold text-base sm:text-lg truncate">
                  {{ currentSong ? currentSong.title : t('music.select_track') }}
                </div>
                <div class="text-xs text-base-content/60 truncate">
                  {{ currentSong?.isOriginal ? `Det 7:e Gunget (${t('music.original_track')})` : `${t('music.cover_of')} ${currentSong?.originalArtist}` }}
                </div>
              </div>

              <!-- Real-time Progress Bar & Scrubber -->
              <div class="space-y-1 px-1">
                <div class="flex items-center justify-between text-[10px] font-mono text-secondary">
                  <span>{{ formatTime(currentTime) }}</span>
                  <span class="text-[9px] uppercase tracking-wider text-base-content/60">
                    {{ audioSourceType === 'file' ? 'Direct Track' : 'Blues Preview Groove' }}
                  </span>
                  <span>{{ formatTime(duration) }}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  :max="duration || 30"
                  step="0.5"
                  :value="currentTime"
                  class="range range-xs range-primary w-full cursor-pointer"
                  @input="seek(parseFloat(($event.target as HTMLInputElement).value))"
                />
              </div>

              <!-- Animated Equalizer Bars -->
              <div class="flex items-end justify-center gap-1.5 h-7 px-2">
                <div
                  v-for="bar in 16"
                  :key="bar"
                  class="w-2 rounded-t transition-all duration-150"
                  :class="isAudioPlaying ? 'bg-gradient-to-t from-emerald-500 via-yellow-400 to-red-500' : 'bg-primary/20 h-1.5'"
                  :style="{
                    height: isAudioPlaying ? `${Math.max(15, (bar * 17) % 95 + 10)}%` : '6px',
                    animation: isAudioPlaying ? `pulse ${(bar % 4) * 0.2 + 0.3}s infinite alternate` : 'none',
                  }"
                />
              </div>

              <!-- Jukebox Transport Controls (Play / Pause / Next / Prev) -->
              <div class="flex items-center justify-between pt-2 px-1 gap-2 sm:gap-4">
                <!-- Volume & Mute Button -->
                <div class="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    class="btn btn-circle btn-xs btn-ghost text-secondary hover:bg-base-300 cursor-pointer"
                    :title="isMuted ? 'Slå på ljud' : 'Ljud av'"
                    @click="toggleMute"
                  >
                    <span>{{ isMuted ? '🔇' : volume > 0.5 ? '🔊' : '🔉' }}</span>
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    :value="isMuted ? 0 : volume"
                    class="range range-xs range-secondary w-12 sm:w-14 hidden sm:inline-block cursor-pointer"
                    @input="setAudioVolume(parseFloat(($event.target as HTMLInputElement).value))"
                  />
                </div>

                <!-- Center Playback Controls -->
                <div class="flex items-center gap-3 sm:gap-3.5 mx-auto">
                  <button
                    type="button"
                    class="btn btn-circle btn-sm btn-ghost border border-primary/40 text-primary hover:bg-primary/20 cursor-pointer"
                    :title="t('music.prev_song')"
                    @click="prevTrack"
                  >
                    ⏮
                  </button>

                  <button
                    type="button"
                    class="btn btn-circle btn-primary font-bold text-xl shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                    :title="isAudioPlaying ? t('music.pause') : t('music.play')"
                    @click="togglePlay()"
                  >
                    {{ isAudioPlaying ? '⏸' : '▶' }}
                  </button>

                  <button
                    type="button"
                    class="btn btn-circle btn-sm btn-ghost border border-primary/40 text-primary hover:bg-primary/20 cursor-pointer"
                    :title="t('music.next_song')"
                    @click="nextTrack"
                  >
                    ⏭
                  </button>
                </div>

                <!-- External Player Link -->
                <div class="flex-shrink-0">
                  <a
                    v-if="currentSong?.embedUrl"
                    :href="currentSong.embedUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn btn-xs btn-outline btn-secondary rounded-full font-bold px-2.5 py-0.5"
                    :title="`${t('music.open_in')} ${currentSong.embedProvider}`"
                  >
                    <span>{{ currentSong.embedProvider }} ↗</span>
                  </a>
                  <div v-else class="w-8" />
                </div>
              </div>
            </div>
          </div>

          <!-- VIEW B: EMBEDDED STREAMING PLAYER (SPOTIFY / YOUTUBE / BANDCAMP) -->
          <div v-else class="relative z-10 space-y-4">
            <div class="flex items-center justify-between border-b border-primary/20 pb-3">
              <div class="flex items-center gap-2">
                <span class="badge badge-primary font-mono font-bold">{{ currentSong?.code || 'A1' }}</span>
                <span class="font-heading font-bold text-primary text-lg">{{ currentSong?.title }}</span>
                <span class="text-xs text-base-content/60 capitalize hidden sm:inline">({{ currentSong?.embedProvider }})</span>
              </div>
              <button
                type="button"
                class="btn btn-xs btn-outline btn-secondary rounded-full cursor-pointer"
                @click="playerDisplayMode = 'vinyl'"
              >
                ← Tillbaka till skivtallrik
              </button>
            </div>

            <!-- Gated Iframe Container -->
            <MediaEmbedGated
              v-if="formattedEmbedUrl"
              :src="formattedEmbedUrl"
              :title="currentSong?.title"
              :provider="currentSong?.embedProvider"
              :direct-url="currentSong?.embedUrl"
            />
            <div v-else class="w-full rounded-2xl bg-base-300/80 dark:bg-black/80 border border-primary/30 shadow-2xl text-center py-12 text-base-content/60 text-xs">
              Ingen inbäddningslänk tillgänglig för denna låt.
            </div>
          </div>
        </div>

        <!-- JUKEBOX INTERACTIVE KEYPAD & COIN SLOT -->
        <div class="mt-6 p-4 sm:p-6 rounded-3xl bg-base-300/80 dark:bg-base-300/40 border border-primary/25 flex flex-col md:flex-row items-center justify-between gap-6">
          <!-- Left: Keypad Push Buttons (A1, A2, B1, B2...) -->
          <div class="space-y-2 w-full md:w-auto">
            <div class="text-[11px] font-mono font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
              <span>🎛️</span> {{ t('music.keypad') }}
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <button
                v-for="song in songsWithCodes"
                :key="song.id"
                type="button"
                class="px-3.5 py-2 rounded-xl font-mono font-bold text-xs sm:text-sm border-2 transition-all shadow active:scale-90 cursor-pointer"
                :class="
                  activeSongId === song.id
                    ? 'bg-primary text-neutral border-primary ring-2 ring-primary/50 shadow-primary/40 font-black'
                    : 'bg-base-200 text-base-content border-primary/30 hover:bg-primary hover:text-neutral hover:border-primary'
                "
                @click="playByCode(song.code)"
              >
                {{ song.code }}
              </button>
            </div>
          </div>

          <!-- Right: Interactive Coin Slot & Free Play status -->
          <div class="flex items-center gap-4 bg-base-200/95 dark:bg-neutral/90 px-4 py-3 rounded-2xl border border-primary/30 shadow-inner">
            <div class="flex flex-col text-right">
              <span class="text-[9px] font-mono uppercase tracking-widest text-secondary font-bold">{{ t('music.free_play') }}</span>
              <span class="text-xs font-mono font-bold text-primary">{{ t('music.credits') }}: {{ credits }}</span>
            </div>

            <button
              type="button"
              class="btn btn-secondary btn-sm rounded-full font-bold shadow hover:scale-105 active:scale-95 transition-transform flex items-center gap-1.5 cursor-pointer"
              :class="coinAnimation ? 'ring-4 ring-secondary animate-bounce' : ''"
              @click="insertCoin"
            >
              <span>🪙</span>
              <span>{{ t('music.insert_coin') }}</span>
            </button>
          </div>
        </div>

        <!-- JUKEBOX TITLE STRIPS (TITELREMSOR) -->
        <div class="mt-8 space-y-4">
          <!-- Section Title & Filter Tabs -->
          <div class="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-primary/20 pb-3">
            <div>
              <h2 class="font-heading text-xl sm:text-2xl text-primary font-bold">
                {{ t('music.title_strips') }}
              </h2>
              <span class="text-xs text-base-content/70">
                {{ t('music.select_track') }}
              </span>
            </div>

            <!-- Filter Tabs -->
            <div class="flex items-center gap-1.5 bg-base-200/90 dark:bg-neutral p-1 rounded-full border border-primary/20 text-xs font-bold">
              <button
                type="button"
                class="px-3.5 py-1 rounded-full transition-colors cursor-pointer"
                :class="songFilter === 'all' ? 'bg-primary text-neutral font-bold shadow' : 'text-base-content/70 hover:text-primary'"
                @click="songFilter = 'all'"
              >
                {{ t('music.all') }}
              </button>
              <button
                type="button"
                class="px-3.5 py-1 rounded-full transition-colors cursor-pointer"
                :class="songFilter === 'original' ? 'bg-primary text-neutral font-bold shadow' : 'text-base-content/70 hover:text-primary'"
                @click="songFilter = 'original'"
              >
                {{ t('music.side_a') }}
              </button>
              <button
                type="button"
                class="px-3.5 py-1 rounded-full transition-colors cursor-pointer"
                :class="songFilter === 'cover' ? 'bg-primary text-neutral font-bold shadow' : 'text-base-content/70 hover:text-primary'"
                @click="songFilter = 'cover'"
              >
                {{ t('music.side_b') }}
              </button>
            </div>
          </div>

          <!-- Authentic Retro Jukebox Title Strips Grid -->
          <div class="grid sm:grid-cols-2 gap-4">
            <div
              v-for="song in filteredSongs"
              :key="song.id"
              class="vintage-title-strip relative rounded-md p-3 sm:p-3.5 transition-all duration-200 cursor-pointer select-none group border"
              :class="
                activeSongId === song.id
                  ? 'vintage-strip-active ring-2 ring-primary/80 shadow-2xl scale-[1.01]'
                  : 'vintage-strip-inactive hover:brightness-105'
              "
              @click="selectSong(song.id)"
            >
              <!-- Perforation Edge Marks on Left & Right -->
              <div class="strip-perf-left"></div>
              <div class="strip-perf-right"></div>

              <!-- Weathered Header Band (Aged Red for Side A, Aged Navy for Side B) -->
              <div
                class="strip-header h-5 rounded-t-sm flex items-center justify-between px-3 text-[9px] font-mono font-black tracking-widest uppercase shadow-sm"
                :class="song.isOriginal ? 'strip-header-a' : 'strip-header-b'"
              >
                <span class="flex items-center gap-1.5">
                  <span class="opacity-70">★</span>
                  <span>DET 7:E GUNGET</span>
                  <span class="opacity-70">★</span>
                </span>
                <span class="opacity-90 font-mono tracking-wider">SIDE {{ song.side }} • 45 RPM</span>
              </div>

              <!-- Strip Content with Letterpress Paper Look -->
              <div class="pt-2.5 pb-1.5 px-2 flex items-center justify-between gap-3 text-neutral">
                <!-- Stamped Code Badge (A1, B1...) -->
                <div
                  class="w-8 h-8 rounded font-mono font-black text-sm flex items-center justify-center shadow-inner flex-shrink-0 border"
                  :class="song.isOriginal ? 'stamp-badge-a' : 'stamp-badge-b'"
                >
                  {{ song.code }}
                </div>

                <!-- Song Details (Vintage Typeset) -->
                <div class="flex-grow min-w-0">
                  <div class="font-heading font-black text-sm sm:text-base text-[#241a14] truncate group-hover:text-[#6e1e0a] leading-tight strip-title">
                    {{ song.title }}
                  </div>
                  <div class="text-[11px] font-mono font-semibold text-[#665243] truncate mt-0.5">
                    {{ song.isOriginal ? t('music.original_composition') : `${t('music.original_by')} ${song.originalArtist}` }}
                  </div>
                </div>

                <!-- Vintage Play Jewel Indicator -->
                <div class="flex-shrink-0 flex items-center gap-1.5">
                  <span
                    class="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow transition-transform border border-amber-900/30"
                    :class="
                      activeSongId === song.id
                        ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-[#1a1208] shadow-[0_0_10px_rgba(245,158,11,0.8)] animate-pulse'
                        : 'bg-[#d8caa8] text-[#4a3928] group-hover:bg-primary group-hover:text-neutral'
                    "
                  >
                    {{ activeSongId === song.id && isAudioPlaying ? '⏸' : '▶' }}
                  </span>
                </div>
              </div>

              <!-- Bottom Colored Stripe -->
              <div
                class="h-1 rounded-b-sm"
                :class="song.isOriginal ? 'strip-footer-a' : 'strip-footer-b'"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- AUTHENTIC GAFFER-TAPED STAGE SETLIST & REPERTOIRE -->
      <div class="space-y-6 max-w-4xl mx-auto">
        <div class="text-center sm:text-left space-y-2">
          <span class="text-xs font-bold uppercase tracking-widest text-secondary flex items-center justify-center sm:justify-start gap-2">
            <span>📋</span> {{ t('music.repertoire_tag') }}
          </span>
          <h2 class="font-heading text-3xl sm:text-4xl text-primary font-bold">
            {{ t('music.repertoire_title') }}
          </h2>
          <p class="text-sm text-base-content/80 max-w-2xl">
            {{ t('music.repertoire_desc') }}
          </p>
        </div>

        <!-- Stage Floor / Monitor Surface with Gaffer-Taped Paper Sheet -->
        <div class="stage-floor-board p-4 sm:p-10 rounded-3xl border border-primary/30 relative shadow-2xl">
          <!-- Worn Paper Setlist Sheet (With realistic angle & gaffer tape on corners) -->
          <div class="stage-setlist-sheet relative mx-auto max-w-2xl bg-[#faf6ed] text-[#1c1611] p-6 sm:p-10 rounded-sm shadow-[0_20px_45px_rgba(0,0,0,0.85)] border border-[#dfd2be] select-none">
            <!-- Silver Gaffer Tape Strips -->
            <div class="gaffer-tape gaffer-tape-tl" />
            <div class="gaffer-tape gaffer-tape-tr" />
            <div class="gaffer-tape gaffer-tape-bl" />
            <div class="gaffer-tape gaffer-tape-br" />

            <!-- Authentic Coffee Mug Ring Stains & Drips -->
            <div class="coffee-stain coffee-stain-main" aria-hidden="true">
              <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
                <!-- Outer dried dark coffee ring -->
                <circle cx="98" cy="98" r="82" stroke="#633716" stroke-width="4" stroke-dasharray="18 4 35 6 12 3 50 8" stroke-linecap="round" opacity="0.45" filter="blur(0.3px)" />
                <!-- Secondary inner coffee edge ring -->
                <circle cx="100" cy="100" r="78" stroke="#87532a" stroke-width="2.5" stroke-dasharray="30 8 40 5 15 6" opacity="0.35" />
                <!-- Watery coffee translucent center wash -->
                <circle cx="99" cy="99" r="80" fill="#a46838" opacity="0.10" />
                <!-- Coffee drip splatters -->
                <circle cx="184" cy="72" r="4.5" fill="#633716" opacity="0.40" />
                <circle cx="192" cy="86" r="2.5" fill="#87532a" opacity="0.35" />
                <circle cx="177" cy="115" r="3.2" fill="#633716" opacity="0.32" />
                <circle cx="16" cy="138" r="3.5" fill="#87532a" opacity="0.28" />
              </svg>
            </div>

            <!-- Second faint coffee ring near bottom-left -->
            <div class="coffee-stain coffee-stain-secondary" aria-hidden="true">
              <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
                <circle cx="80" cy="80" r="68" stroke="#7a461e" stroke-width="3.2" stroke-dasharray="25 6 45 4 10 5" opacity="0.24" filter="blur(0.2px)" />
                <circle cx="80" cy="80" r="65" fill="#8c5024" opacity="0.06" />
                <circle cx="148" cy="45" r="2.5" fill="#7a461e" opacity="0.25" />
              </svg>
            </div>

            <!-- Sharpie Band Header -->
            <div class="text-center pb-4 mb-6 border-b-2 border-dashed border-[#8c765c]/40 relative z-10">
              <div class="text-[10px] font-mono font-bold tracking-widest uppercase text-[#735e47]">
                LIVE PÅ SCEN • AKTUELL SETLISTA
              </div>
              <h3 class="font-heading font-black text-2xl sm:text-3xl text-[#1a1209] tracking-tight uppercase mt-0.5 setlist-handwritten">
                DET 7:E GUNGET
              </h3>
              <div class="text-[11px] font-mono text-[#8a725b] mt-1 italic">
                Blues, rock & sväng i lagom doser • 2x45 min + extranummer
              </div>
            </div>

            <!-- Grouped Sets (Set 1, Set 2, Encores...) -->
            <div class="space-y-6">
              <div
                v-for="(tracks, setName) in groupedSetlist"
                :key="setName"
                class="space-y-2.5"
              >
                <!-- Set Name Header with Sharpie underline -->
                <div class="flex items-center gap-2 border-b border-[#a8957e]/50 pb-1 pt-1">
                  <span class="text-xs sm:text-sm font-mono font-black uppercase tracking-wider text-[#912426]">
                    ▶ {{ setName }}
                  </span>
                  <span class="text-[10px] font-mono text-[#7d6852]">({{ tracks.length }} låtar)</span>
                </div>

                <!-- Song List in Set -->
                <div class="space-y-1.5 pl-1">
                  <div
                    v-for="(track, idx) in tracks"
                    :key="track.id"
                    class="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 py-1 border-b border-[#efe6d5]/80 hover:bg-[#ede3d1]/50 px-2 rounded transition-colors"
                  >
                    <div class="flex items-baseline gap-2.5 min-w-0">
                      <span class="font-mono font-bold text-xs text-[#8c745c] w-5 text-right flex-shrink-0">
                        {{ (idx + 1) < 10 ? `0${idx + 1}` : idx + 1 }}.
                      </span>
                      <span class="font-heading font-bold text-sm sm:text-base text-[#1c150e] tracking-tight truncate">
                        {{ track.title }}
                      </span>
                      <span
                        v-if="track.isOriginal"
                        class="text-[9px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-[#ebd1be] text-[#801b1c] border border-[#a8484a]/40 flex-shrink-0"
                      >
                        Egen
                      </span>
                      <span
                        v-else-if="track.artist"
                        class="text-xs font-mono text-[#6e5946] truncate hidden sm:inline"
                      >
                        ({{ track.artist }})
                      </span>
                    </div>

                    <!-- Live Performance Cue / Notes -->
                    <div v-if="track.notes" class="text-[11px] font-mono italic text-[#70563e] pl-7 sm:pl-0 sm:text-right flex-shrink-0">
                      ✎ {{ track.notes }}
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="!Object.keys(groupedSetlist).length" class="text-center py-6 font-mono text-xs text-[#735e47]">
                Laddar setlista...
              </div>
            </div>

            <!-- Footer Stamp / Stage Sound Note -->
            <div class="mt-8 pt-3 border-t border-dashed border-[#8c765c]/40 flex items-center justify-between text-[10px] font-mono text-[#8a725b]">
              <span>Gung-garanti: 100%</span>
              <span class="font-bold text-[#801b1c]">VOLYM: 11 ⚡</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Vintage Jukebox Title Strips */
.vintage-title-strip {
  background: radial-gradient(ellipse at 50% 30%, #f7eedb 0%, #ebe0c8 70%, #decbb0 100%);
  border-color: #9c7a52;
  box-shadow: inset 0 0 10px rgba(110, 80, 45, 0.22), 0 3px 8px rgba(0, 0, 0, 0.45);
  position: relative;
  overflow: hidden;
}

.vintage-strip-inactive {
  border-color: #8c6a40;
}

.vintage-strip-active {
  border-color: #d97706;
  background: radial-gradient(ellipse at 50% 30%, #fff6e0 0%, #f2e4c2 70%, #e6d3a8 100%);
  box-shadow: inset 0 0 12px rgba(180, 110, 30, 0.25), 0 0 20px rgba(245, 158, 11, 0.35);
}

.strip-perf-left,
.strip-perf-right {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 4px;
  background-image: radial-gradient(circle, rgba(60, 40, 20, 0.35) 1px, transparent 1.5px);
  background-size: 4px 6px;
  opacity: 0.6;
  pointer-events: none;
}
.strip-perf-left { left: 1px; }
.strip-perf-right { right: 1px; }

/* Side A (Originals) - Aged Crimson / Burgundy Litho */
.strip-header-a {
  background: linear-gradient(180deg, #9e2325 0%, #751517 100%);
  color: #fceddb;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  border-bottom: 1px solid #5a1012;
}
.strip-footer-a {
  background: linear-gradient(180deg, #9e2325 0%, #751517 100%);
}
.stamp-badge-a {
  background: #ecd5c2;
  color: #701618;
  border-color: #a8484a;
  box-shadow: inset 0 1px 3px rgba(112, 22, 24, 0.25);
}

/* Side B (Covers) - Aged Faded Deep Navy Litho */
.strip-header-b {
  background: linear-gradient(180deg, #1d4d7a 0%, #113454 100%);
  color: #e8f1fa;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  border-bottom: 1px solid #0d263d;
}
.strip-footer-b {
  background: linear-gradient(180deg, #1d4d7a 0%, #113454 100%);
}
.stamp-badge-b {
  background: #cedde8;
  color: #0f3252;
  border-color: #3b6b94;
  box-shadow: inset 0 1px 3px rgba(15, 50, 82, 0.25);
}

.strip-title {
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
}

/* Authentic Stage Setlist & Silver Gaffer Tape Styling */
.stage-floor-board {
  background: radial-gradient(ellipse at 50% 20%, #1e150f 0%, #120c08 60%, #0a0705 100%);
  background-image: 
    radial-gradient(ellipse at 50% 20%, #1e150f 0%, #120c08 60%, #0a0705 100%),
    repeating-linear-gradient(90deg, rgba(255,255,255,0.01) 0px, rgba(255,255,255,0.01) 2px, transparent 2px, transparent 40px);
  border-color: rgba(226, 189, 114, 0.3);
}

:global([data-theme='light']) .stage-floor-board {
  background: radial-gradient(ellipse at 50% 20%, #f8f1e6 0%, #efe4d3 60%, #e2d2bc 100%);
  background-image: 
    radial-gradient(ellipse at 50% 20%, #f8f1e6 0%, #efe4d3 60%, #e2d2bc 100%),
    repeating-linear-gradient(90deg, rgba(140, 90, 40, 0.05) 0px, rgba(140, 90, 40, 0.05) 2px, transparent 2px, transparent 40px);
  border: 4px solid rgba(184, 125, 59, 0.35);
  box-shadow: 0 20px 40px -10px rgba(90, 55, 20, 0.15);
}

.stage-setlist-sheet {
  background: radial-gradient(ellipse at 50% 10%, #fffdf8 0%, #faf4e8 70%, #ede3d1 100%);
  transform: rotate(-0.75deg);
  transition: transform 0.3s ease;
}

:global([data-theme='light']) .stage-setlist-sheet {
  box-shadow: 0 12px 30px rgba(80, 45, 15, 0.18);
  border: 1px solid #d8c7ad;
}

.stage-setlist-sheet:hover {
  transform: rotate(0deg);
}

/* Classic Silver Stage Gaffer Tape with realistic metallic cloth weave */
.gaffer-tape {
  position: absolute;
  width: 95px;
  height: 28px;
  background: linear-gradient(135deg, #e4e4e4 0%, #bebebe 40%, #a8a8a8 70%, #d2d2d2 100%);
  border: 1px solid #8e8e8e;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.85), inset 0 -1px 0 rgba(0, 0, 0, 0.25);
  z-index: 10;
  pointer-events: none;
}
.gaffer-tape::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: 
    repeating-linear-gradient(90deg, rgba(0,0,0,0.08) 0px, rgba(0,0,0,0.08) 1px, transparent 1px, transparent 2.5px),
    repeating-linear-gradient(0deg, rgba(255,255,255,0.12) 0px, rgba(255,255,255,0.12) 1px, transparent 1px, transparent 3px);
  opacity: 0.7;
}

.gaffer-tape-tl {
  top: -12px;
  left: -22px;
  transform: rotate(-38deg);
}

.gaffer-tape-tr {
  top: -12px;
  right: -22px;
  transform: rotate(36deg);
}

.gaffer-tape-bl {
  bottom: -12px;
  left: -22px;
  transform: rotate(40deg);
}

.gaffer-tape-br {
  bottom: -12px;
  right: -22px;
  transform: rotate(-35deg);
}

/* Authentic Rehearsal Coffee Mug Stains */
.coffee-stain {
  position: absolute;
  pointer-events: none;
  z-index: 5;
  mix-blend-mode: multiply;
}

.coffee-stain-main {
  width: 175px;
  height: 175px;
  top: 12px;
  right: 18px;
  transform: rotate(-15deg);
}

.coffee-stain-secondary {
  width: 135px;
  height: 135px;
  bottom: 20px;
  left: 15px;
  transform: rotate(25deg);
}
</style>
