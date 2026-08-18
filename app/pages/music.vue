<script setup lang="ts">
const { t } = useI18n()

useSeoMeta({
  title: 'Jukebox & musik | Det 7:e Gunget',
  description: 'Klappa i en slant och lyssna på Det 7:e Gungets egna alster och svettiga tolkningar i vår interaktiva jukebox.',
})

const { data: songsData } = await useFetch('/api/songs')

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
      <div class="max-w-4xl mx-auto rounded-[40px] sm:rounded-[56px] p-4 sm:p-8 bg-gradient-to-b from-[#2a1d17] via-[#1a120e] to-[#0d0907] border-4 border-[#b87d3b]/40 shadow-[0_0_80px_rgba(200,121,63,0.35)] relative">
        <!-- Outer Glowing Neon Arch Trim -->
        <div class="absolute -inset-1 rounded-[42px] sm:rounded-[58px] bg-gradient-to-r from-secondary/30 via-primary/40 to-secondary/30 blur-sm pointer-events-none -z-10" />

        <!-- Chrome Top Arch & Vintage Marquee -->
        <div class="text-center pb-6 border-b border-primary/20 relative">
          <!-- Wurlitzer-Style Top Marquee Badge -->
          <div class="inline-flex items-center justify-center gap-2 sm:gap-4 px-6 sm:px-10 py-2 rounded-full bg-gradient-to-r from-[#201712] via-[#4d321d] to-[#201712] border-2 border-primary shadow-lg shadow-primary/20">
            <span class="text-secondary text-sm">✦</span>
            <span class="font-heading text-lg sm:text-2xl text-primary uppercase tracking-[0.2em] font-bold text-gritty">
              DET 7:E GUNGET JUKEBOX
            </span>
            <span class="text-secondary text-sm">✦</span>
          </div>

          <div class="flex items-center justify-between mt-3 px-2 sm:px-6 text-[11px] font-mono">
            <span class="text-secondary/80 uppercase tracking-widest hidden sm:inline">
              Hi-Fi Stereophonic Sound • 45 R.P.M.
            </span>

            <!-- Mode Switcher: Vinyl vs Embed Player -->
            <div class="flex items-center gap-1 bg-black/60 p-1 rounded-full border border-primary/30 mx-auto sm:mx-0">
              <button
                type="button"
                class="px-3 py-0.5 rounded-full text-xs font-bold transition-all"
                :class="playerDisplayMode === 'vinyl' ? 'bg-primary text-neutral shadow' : 'text-base-content/70 hover:text-primary'"
                @click="playerDisplayMode = 'vinyl'"
              >
                🎛️ Skivtallrik (Hi-Fi)
              </button>
              <button
                type="button"
                class="px-3 py-0.5 rounded-full text-xs font-bold transition-all"
                :class="playerDisplayMode === 'embed' ? 'bg-primary text-neutral shadow' : 'text-base-content/70 hover:text-primary'"
                @click="playerDisplayMode = 'embed'"
              >
                ▶️ Inbäddad spelare
              </button>
            </div>
          </div>
        </div>

        <!-- UPPER GLASS DOME: TURNTABLE OR EMBED PLAYER -->
        <div class="mt-6 p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#0a0705] to-[#17100b] border-2 border-primary/30 relative overflow-hidden shadow-inner">
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
            <div class="space-y-4 bg-neutral/80 p-5 sm:p-6 rounded-2xl border border-primary/30 shadow-xl">
              <!-- Digital Track Code Screen -->
              <div class="bg-black/90 p-4 rounded-xl border border-primary/40 font-mono text-center space-y-1 shadow-inner">
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
              <div class="flex items-end justify-center gap-1.5 h-8 px-2">
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
              <div class="flex items-center justify-between pt-1">
                <!-- Volume & Mute Button -->
                <div class="flex items-center gap-1.5">
                  <button
                    type="button"
                    class="btn btn-circle btn-xs btn-ghost text-secondary"
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
                    class="range range-xs range-secondary w-16 hidden sm:inline-block cursor-pointer"
                    @input="setAudioVolume(parseFloat(($event.target as HTMLInputElement).value))"
                  />
                </div>

                <!-- Center Controls -->
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="btn btn-circle btn-sm btn-ghost border border-primary/30 text-primary hover:bg-primary/20"
                    :title="t('music.prev_song')"
                    @click="prevTrack"
                  >
                    ⏮
                  </button>

                  <button
                    type="button"
                    class="btn btn-circle btn-primary font-bold text-xl shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-transform"
                    :title="isAudioPlaying ? t('music.pause') : t('music.play')"
                    @click="togglePlay()"
                  >
                    {{ isAudioPlaying ? '⏸' : '▶' }}
                  </button>

                  <button
                    type="button"
                    class="btn btn-circle btn-sm btn-ghost border border-primary/30 text-primary hover:bg-primary/20"
                    :title="t('music.next_song')"
                    @click="nextTrack"
                  >
                    ⏭
                  </button>
                </div>

                <!-- External Player Link -->
                <a
                  v-if="currentSong?.embedUrl"
                  :href="currentSong.embedUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn btn-xs btn-outline btn-secondary rounded-full font-bold"
                  :title="`${t('music.open_in')} ${currentSong.embedProvider}`"
                >
                  <span>{{ currentSong.embedProvider }} ↗</span>
                </a>
                <div v-else class="w-10" />
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
                class="btn btn-xs btn-outline btn-secondary rounded-full"
                @click="playerDisplayMode = 'vinyl'"
              >
                ← Tillbaka till skivtallrik
              </button>
            </div>

            <!-- Iframe Container -->
            <div class="w-full rounded-2xl overflow-hidden bg-black/80 border border-primary/30 shadow-2xl flex items-center justify-center min-h-[160px] sm:min-h-[220px]">
              <iframe
                v-if="formattedEmbedUrl"
                :src="formattedEmbedUrl"
                class="w-full h-[180px] sm:h-[260px] border-0 rounded-2xl"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
              />
              <div v-else class="text-center py-12 text-base-content/60 text-xs">
                Ingen inbäddningslänk tillgänglig för denna låt.
              </div>
            </div>
          </div>
        </div>

        <!-- JUKEBOX INTERACTIVE KEYPAD & COIN SLOT -->
        <div class="mt-6 p-4 sm:p-6 rounded-3xl bg-base-300/80 border border-primary/25 flex flex-col md:flex-row items-center justify-between gap-6">
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
                class="px-3.5 py-2 rounded-xl font-mono font-bold text-xs sm:text-sm border-2 transition-all shadow active:scale-90"
                :class="
                  activeSongId === song.id
                    ? 'bg-primary text-neutral border-primary ring-2 ring-primary/50 shadow-primary/40 font-black'
                    : 'bg-neutral text-primary border-primary/30 hover:bg-primary/20 hover:border-primary'
                "
                @click="playByCode(song.code)"
              >
                {{ song.code }}
              </button>
            </div>
          </div>

          <!-- Right: Interactive Coin Slot & Free Play status -->
          <div class="flex items-center gap-4 bg-neutral/90 px-4 py-3 rounded-2xl border border-primary/30 shadow-inner">
            <div class="flex flex-col text-right">
              <span class="text-[9px] font-mono uppercase tracking-widest text-secondary font-bold">{{ t('music.free_play') }}</span>
              <span class="text-xs font-mono font-bold text-primary">{{ t('music.credits') }}: {{ credits }}</span>
            </div>

            <button
              type="button"
              class="btn btn-secondary btn-sm rounded-full font-bold shadow hover:scale-105 active:scale-95 transition-transform flex items-center gap-1.5"
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
            <div class="flex items-center gap-1.5 bg-neutral p-1 rounded-full border border-primary/20 text-xs font-bold">
              <button
                type="button"
                class="px-3.5 py-1 rounded-full transition-colors"
                :class="songFilter === 'all' ? 'bg-primary text-neutral font-bold shadow' : 'text-base-content/70 hover:text-primary'"
                @click="songFilter = 'all'"
              >
                {{ t('music.all') }}
              </button>
              <button
                type="button"
                class="px-3.5 py-1 rounded-full transition-colors"
                :class="songFilter === 'original' ? 'bg-primary text-neutral font-bold shadow' : 'text-base-content/70 hover:text-primary'"
                @click="songFilter = 'original'"
              >
                {{ t('music.side_a') }}
              </button>
              <button
                type="button"
                class="px-3.5 py-1 rounded-full transition-colors"
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
              class="relative rounded-lg p-3 sm:p-4 border-2 transition-all duration-200 cursor-pointer shadow-md select-none group"
              :class="
                activeSongId === song.id
                  ? 'bg-[#fff9e6] border-[#d97706] ring-4 ring-primary/40 shadow-xl scale-[1.02]'
                  : 'bg-[#fefce8] border-[#b45309]/30 hover:border-primary hover:shadow-lg'
              "
              @click="selectSong(song.id)"
            >
              <!-- Colored Header Band (Red for Side A, Blue/Teal for Side B) -->
              <div
                class="absolute top-0 left-0 right-0 h-4 rounded-t-sm flex items-center justify-between px-3 text-[8px] font-mono font-bold tracking-widest text-white uppercase shadow-sm"
                :class="song.isOriginal ? 'bg-red-700' : 'bg-sky-800'"
              >
                <span>★ DET 7:E GUNGET ★</span>
                <span>SIDE {{ song.side }}</span>
              </div>

              <!-- Strip Content inside classic border -->
              <div class="pt-3 pb-1 px-1 flex items-center justify-between gap-3 text-neutral">
                <!-- Code Badge (e.g. A1, B2) -->
                <div
                  class="w-9 h-9 rounded-lg font-mono font-black text-sm flex items-center justify-center border shadow-inner flex-shrink-0"
                  :class="song.isOriginal ? 'bg-red-100 text-red-900 border-red-300' : 'bg-sky-100 text-sky-900 border-sky-300'"
                >
                  {{ song.code }}
                </div>

                <!-- Song Details (Bold typewriter style) -->
                <div class="flex-grow min-w-0">
                  <div class="font-heading font-black text-sm sm:text-base text-stone-900 truncate group-hover:text-amber-900 leading-snug">
                    {{ song.title }}
                  </div>
                  <div class="text-[11px] font-sans font-medium text-stone-600 truncate mt-0.5">
                    {{ song.isOriginal ? t('music.original_composition') : `${t('music.original_by')} ${song.originalArtist}` }}
                  </div>
                </div>

                <!-- Play Indicator Icon -->
                <div class="flex-shrink-0 flex items-center gap-1.5">
                  <span
                    class="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-sm transition-transform"
                    :class="
                      activeSongId === song.id
                        ? 'bg-amber-500 text-white animate-pulse scale-110'
                        : 'bg-stone-200 text-stone-700 group-hover:bg-primary group-hover:text-neutral'
                    "
                  >
                    {{ activeSongId === song.id && isAudioPlaying ? '⏸' : '▶' }}
                  </span>
                </div>
              </div>

              <!-- Bottom Red/Blue stripe ornament -->
              <div
                class="absolute bottom-0 left-0 right-0 h-1.5 rounded-b-sm"
                :class="song.isOriginal ? 'bg-red-700' : 'bg-sky-800'"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- VINTAGE CHALKBOARD REPERTOIRE & LIVE SETLIST -->
      <div class="stage-card p-8 sm:p-12 rounded-3xl border border-primary/20 space-y-6 max-w-4xl mx-auto">
        <div class="space-y-2">
          <span class="text-xs font-bold uppercase tracking-widest text-secondary">{{ t('music.repertoire_tag') }}</span>
          <h2 class="font-heading text-2xl sm:text-4xl text-primary font-bold">
            {{ t('music.repertoire_title') }}
          </h2>
          <p class="text-sm text-base-content/80 max-w-2xl">
            {{ t('music.repertoire_desc') }}
          </p>
        </div>

        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-mono">
          <div class="p-3 bg-base-200/90 rounded-xl border border-primary/20">✦ Det 7:e Gunget ({{ t('music.original_track') }})</div>
          <div class="p-3 bg-base-200/90 rounded-xl border border-primary/20">✦ Hoochie Coochie Man (Muddy Waters)</div>
          <div class="p-3 bg-base-200/90 rounded-xl border border-primary/20">✦ Born Under a Bad Sign (Albert King)</div>
          <div class="p-3 bg-base-200/90 rounded-xl border border-primary/20">✦ The Thrill is Gone (B.B. King)</div>
          <div class="p-3 bg-base-200/90 rounded-xl border border-primary/20">✦ Sväng i källaren ({{ t('music.original_track') }})</div>
          <div class="p-3 bg-base-200/90 rounded-xl border border-primary/20">✦ Sweet Home Chicago (Robert Johnson)</div>
        </div>
      </div>
    </div>
  </div>
</template>
