<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()

const { data: songsData, refresh: refreshSongs } = await useFetch<any[]>('/api/songs', {
  default: () => [],
})

const { data: settingsData, refresh: refreshSettings } = await useFetch<{ newsletterEnabled: boolean; landingSongCount: number }>('/api/settings', {
  default: () => ({ newsletterEnabled: false, landingSongCount: 4 }),
})

onMounted(() => {
  refreshSettings()
  refreshSongs()
})

const songFilter = ref<'all' | 'original' | 'cover'>('all')

const maxLandingSongs = computed(() => {
  return Number(settingsData.value?.landingSongCount) || 4
})

const filteredSongs = computed(() => {
  const songs = songsData.value || []
  let matching = songs
  if (songFilter.value === 'original') matching = songs.filter((s) => s.isOriginal)
  else if (songFilter.value === 'cover') matching = songs.filter((s) => !s.isOriginal)
  return matching.slice(0, maxLandingSongs.value)
})

// In-place Jukebox Audio playback
const {
  isAudioPlaying,
  playTrack,
  pauseTrack,
  resumeTrack,
} = useJukeboxAudio()

const activeSongId = ref<string | null>(null)

const togglePlay = (song: any) => {
  if (activeSongId.value === song.id && isAudioPlaying.value) {
    pauseTrack()
  } else if (activeSongId.value === song.id && !isAudioPlaying.value) {
    resumeTrack(song)
  } else {
    activeSongId.value = song.id
    playTrack({
      id: song.id,
      title: song.title,
      audioUrl: song.audioUrl,
    })
  }
}

onUnmounted(() => {
  pauseTrack()
})
</script>

<template>
  <section id="music" class="mx-auto max-w-7xl px-6 lg:px-10 scroll-mt-24">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between mb-14 pb-4 border-b border-primary/20 gap-4">
      <div>
        <span class="text-xs font-bold uppercase tracking-[0.25em] text-secondary">{{ t('music.section_tag') }}</span>
        <h2 class="text-3xl sm:text-5xl font-heading text-primary mt-1 text-gritty pb-2">
          {{ t('music.title') }}
        </h2>
      </div>

      <div class="flex flex-col sm:flex-row sm:items-center gap-4">
        <!-- Filter tabs -->
        <div class="flex items-center gap-2 bg-base-200 p-1 rounded-full border border-primary/20 text-xs font-bold">
          <button
            type="button"
            class="px-4 py-1.5 rounded-full transition-colors"
            :class="songFilter === 'all' ? 'bg-primary text-primary-content font-bold' : 'text-base-content/70 hover:text-primary'"
            @click="songFilter = 'all'"
          >
            {{ t('music.all') }}
          </button>
          <button
            type="button"
            class="px-4 py-1.5 rounded-full transition-colors"
            :class="songFilter === 'original' ? 'bg-primary text-primary-content font-bold' : 'text-base-content/70 hover:text-primary'"
            @click="songFilter = 'original'"
          >
            {{ t('music.original') }}
          </button>
          <button
            type="button"
            class="px-4 py-1.5 rounded-full transition-colors"
            :class="songFilter === 'cover' ? 'bg-primary text-primary-content font-bold' : 'text-base-content/70 hover:text-primary'"
            @click="songFilter = 'cover'"
          >
            {{ t('music.cover') }}
          </button>
        </div>

        <NuxtLink :to="localePath('/music')" class="btn btn-outline btn-primary btn-sm rounded-full font-bold flex-shrink-0">
          {{ t('music.all_music') }} →
        </NuxtLink>
      </div>
    </div>

    <!-- Authentic Square 7-Inch Vinyl Single Sleeves Showcase Grid (Strictly Single-Row on Desktop/Tablet) -->
    <div class="grid grid-cols-2 sm:grid-flow-col sm:auto-cols-fr gap-4 lg:gap-6 pt-12 w-full">
      <VinylSingleCard
        v-for="song in filteredSongs"
        :key="song.id"
        :song="song"
        :is-playing="activeSongId === song.id && isAudioPlaying"
        @toggle-play="togglePlay"
      />
    </div>
  </section>
</template>
