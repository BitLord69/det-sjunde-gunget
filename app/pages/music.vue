<script setup lang="ts">
useSeoMeta({
  title: 'Musik & låtar | Det 7:e Gunget',
  description: 'Lyssna på Det 7:e Gungets egna låtar och svängiga blues/rock-covers. Spotify, Bandcamp och YouTube-inspelningar.',
})

const { data: songsData } = await useFetch('/api/songs')

const songFilter = ref<'all' | 'original' | 'cover'>('all')
const filteredSongs = computed(() => {
  const songs = songsData.value || []
  if (songFilter.value === 'original') return songs.filter((s) => s.isOriginal)
  if (songFilter.value === 'cover') return songs.filter((s) => !s.isOriginal)
  return songs
})

// Simulated player active state
const activeSongId = ref<string | null>(null)
const togglePlay = (id: string) => {
  if (activeSongId.value === id) {
    activeSongId.value = null
  } else {
    activeSongId.value = id
  }
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-6 py-12 lg:px-10 space-y-16">
    <!-- Header -->
    <div class="space-y-4 max-w-3xl">
      <NuxtLink to="/" class="text-xs font-bold uppercase tracking-widest text-secondary hover:text-primary transition-colors inline-flex items-center gap-1">
        <span>←</span> Hem
      </NuxtLink>
      <h1 class="font-heading text-4xl sm:text-6xl text-primary text-gritty">
        Musik & låtskatt
      </h1>
      <p class="text-base sm:text-lg text-base-content/80 leading-relaxed font-normal">
        En blandning av eget hantverk och klassiker vi lånat med stolthet. Rått, ärligt och inspelat med rörstärkare som pressats till max.
      </p>
    </div>

    <!-- Filter Bar -->
    <div class="flex flex-wrap items-center justify-between gap-4 border-b border-primary/20 pb-4">
      <div class="flex items-center gap-2 bg-base-200 p-1 rounded-full border border-primary/20 text-xs font-bold">
        <button
          type="button"
          class="px-4 py-2 rounded-full transition-all"
          :class="songFilter === 'all' ? 'bg-primary text-primary-content shadow' : 'text-base-content/70 hover:text-primary'"
          @click="songFilter = 'all'"
        >
          Alla låtar ({{ songsData?.length || 0 }})
        </button>
        <button
          type="button"
          class="px-4 py-2 rounded-full transition-all"
          :class="songFilter === 'original' ? 'bg-primary text-primary-content shadow' : 'text-base-content/70 hover:text-primary'"
          @click="songFilter = 'original'"
        >
          🔥 Eget hantverk
        </button>
        <button
          type="button"
          class="px-4 py-2 rounded-full transition-all"
          :class="songFilter === 'cover' ? 'bg-primary text-primary-content shadow' : 'text-base-content/70 hover:text-primary'"
          @click="songFilter = 'cover'"
        >
          🎸 Klassiker vi stulit
        </button>
      </div>

      <span class="text-xs font-mono text-base-content/60">
        Klicka på ▶ för att provlyssna
      </span>
    </div>

    <!-- Tracklist Grid -->
    <div class="grid gap-6 md:grid-cols-2">
      <div
        v-for="song in filteredSongs"
        :key="song.id"
        class="stage-card p-6 rounded-2xl flex flex-col justify-between border transition-all duration-300 hover:border-primary/50 shadow-xl"
        :class="activeSongId === song.id ? 'ring-2 ring-primary bg-base-200/90' : ''"
      >
        <div>
          <div class="flex items-start justify-between gap-4 mb-4">
            <div class="flex items-center gap-4">
              <button
                type="button"
                class="w-12 h-12 rounded-full bg-primary text-primary-content flex items-center justify-center font-bold text-lg shadow-md hover:scale-105 active:scale-95 transition-transform flex-shrink-0"
                :title="activeSongId === song.id ? 'Pausa' : 'Spela'"
                @click="togglePlay(song.id)"
              >
                {{ activeSongId === song.id ? '⏸' : '▶' }}
              </button>
              <div>
                <h2 class="font-heading text-xl text-primary font-bold">{{ song.title }}</h2>
                <span class="text-xs text-base-content/70 font-medium block mt-0.5">
                  {{ song.isOriginal ? 'Det 7:e Gunget (originalkomposition)' : `Original av ${song.originalArtist}` }}
                </span>
              </div>
            </div>

            <span
              class="badge badge-sm font-bold text-[10px] uppercase font-sans flex-shrink-0"
              :class="song.isOriginal ? 'badge-primary text-primary-content' : 'badge-secondary text-secondary-content'"
            >
              {{ song.isOriginal ? 'Original' : 'Cover' }}
            </span>
          </div>

          <!-- Cassette player animation bar -->
          <div v-if="activeSongId === song.id" class="my-4 p-3 bg-neutral text-primary rounded-xl border border-primary/40 flex items-center justify-between text-xs font-mono animate-pulse shadow-inner">
            <span>📼 Kassettdeck aktivt: {{ song.title }}</span>
            <span class="text-accent font-bold">128 BPM • Sväng</span>
          </div>
        </div>

        <div class="pt-4 border-t border-base-content/10 flex items-center justify-between text-xs">
          <span class="text-base-content/50 uppercase font-mono text-[10px]">
            Format: {{ song.embedProvider }}
          </span>
          <a
            :href="song.embedUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="font-bold text-secondary hover:text-primary flex items-center gap-1 transition-colors"
          >
            <span>Öppna i {{ song.embedProvider }}</span>
            <span>↗</span>
          </a>
        </div>
      </div>
    </div>

    <!-- Typical Live Setlist Teaser -->
    <div class="stage-card p-8 sm:p-12 rounded-3xl border border-primary/20 space-y-6">
      <div class="space-y-2">
        <span class="text-xs font-bold uppercase tracking-widest text-secondary">Från replokalen</span>
        <h2 class="font-heading text-2xl sm:text-4xl text-primary font-bold">
          Hur låter en kväll med Det 7:e Gunget?
        </h2>
        <p class="text-sm text-base-content/80 max-w-2xl">
          Vi kör två eller tre set med en blandning av svettig chicagoblues, tung träskrock och melodiska solon. Ett axplock ur setlistan:
        </p>
      </div>

      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-mono">
        <div class="p-3 bg-base-200 rounded-xl border border-base-content/10">✦ Det 7:e Gunget (eget alster)</div>
        <div class="p-3 bg-base-200 rounded-xl border border-base-content/10">✦ Hoochie Coochie Man (Muddy Waters)</div>
        <div class="p-3 bg-base-200 rounded-xl border border-base-content/10">✦ Born Under a Bad Sign (Albert King)</div>
        <div class="p-3 bg-base-200 rounded-xl border border-base-content/10">✦ The Thrill is Gone (B.B. King)</div>
        <div class="p-3 bg-base-200 rounded-xl border border-base-content/10">✦ Sväng i källaren (eget alster)</div>
        <div class="p-3 bg-base-200 rounded-xl border border-base-content/10">✦ Sweet Home Chicago (Robert Johnson)</div>
      </div>
    </div>
  </div>
</template>
