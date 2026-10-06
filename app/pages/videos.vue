<script setup lang="ts">
import type { VideoItem } from '~/types'

const { t, locale } = useI18n()
const localePath = useLocalePath()

useSeoMeta({
  title: computed(() => `${t('videos.title')} | Det 7:e Gunget`),
  description: computed(() => t('videos.desc')),
  ogTitle: computed(() => `${t('videos.title')} — Det 7:e Gunget`),
  ogDescription: computed(() => t('videos.desc')),
})

const { data: videosList, pending: isLoading } = await useFetch<VideoItem[]>('/api/videos', {
  default: () => [],
})

const selectedVideo = ref<VideoItem | null>(null)

const playVideo = (video: VideoItem) => {
  selectedVideo.value = video
}

const closePlayer = () => {
  selectedVideo.value = null
}

const searchQuery = ref('')
const filteredVideos = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return videosList.value || []
  return (videosList.value || []).filter(
    (v) =>
      v.title.toLowerCase().includes(query) ||
      (v.description && v.description.toLowerCase().includes(query)),
  )
})
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 sm:px-6 pt-4 sm:pt-6 pb-16 lg:px-10 space-y-8 sm:space-y-10">
    <!-- Header -->
    <PageHeader :title="t('videos.title')" :description="t('videos.desc')" />

    <!-- Search Bar if multiple videos exist -->
    <div v-if="videosList && videosList.length > 3" class="flex justify-end">
      <div class="relative w-full sm:w-72">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Sök bland videoklipp..."
          class="input input-bordered input-sm w-full bg-base-200/90 pl-9 text-xs rounded-full"
        >
        <span class="absolute left-3 top-2 text-xs opacity-50">🔍</span>
      </div>
    </div>

    <!-- Videos Grid -->
    <div v-if="filteredVideos.length > 0" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
      <div
        v-for="video in filteredVideos"
        :key="video.id"
        class="stage-card rounded-2xl border border-primary/25 overflow-hidden flex flex-col bg-base-100/95 hover:border-primary/60 transition-all shadow-lg hover:shadow-2xl group cursor-pointer"
        @click="playVideo(video)"
      >
        <!-- Video Thumbnail Container -->
        <div class="relative aspect-video bg-black/80 overflow-hidden">
          <img
            :src="video.thumbnailUrl || `https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`"
            :alt="video.title"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          >
          <!-- Play Overlay Button -->
          <div class="absolute inset-0 bg-black/30 group-hover:bg-black/15 flex items-center justify-center transition-all">
            <div class="w-14 h-14 rounded-full bg-red-600/90 group-hover:bg-red-600 text-white flex items-center justify-center shadow-2xl transform group-hover:scale-115 transition-transform">
              <span class="text-2xl ml-1">▶</span>
            </div>
          </div>

          <!-- Video Duration / YouTube Label -->
          <div class="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-sm font-mono text-[11px] text-white/95 font-semibold">
            YouTube
          </div>
        </div>

        <!-- Video Details -->
        <div class="p-5 flex flex-col flex-grow justify-between space-y-3">
          <div>
            <h3 class="font-heading text-lg font-bold text-primary group-hover:text-secondary transition-colors line-clamp-2 leading-snug">
              {{ video.title }}
            </h3>
            <p v-if="video.description" class="text-xs text-base-content/75 line-clamp-3 mt-2 leading-relaxed">
              {{ video.description }}
            </p>
          </div>

          <div class="pt-3 border-t border-primary/15 flex items-center justify-between text-xs">
            <span v-if="video.publishedAt" class="text-base-content/60 font-mono text-[11px]">
              📅 {{ new Date(video.publishedAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'sv-SE', { year: 'numeric', month: 'short', day: 'numeric' }) }}
            </span>
            <span class="text-secondary font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1">
              {{ t('videos.play_video') }} →
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!isLoading"
      class="p-12 sm:p-16 text-center rounded-3xl bg-base-200/50 border border-dashed border-primary/30 space-y-4 max-w-xl mx-auto"
    >
      <span class="text-5xl block">🎬</span>
      <h3 class="font-heading text-xl font-bold text-primary">{{ t('videos.empty') }}</h3>
      <p class="text-xs sm:text-sm text-base-content/70">
        Under tiden kan du kolla in hela vårt videobibliotek direkt på YouTube!
      </p>
      <div class="pt-2">
        <a
          href="https://youtube.com/@det7egunget"
          target="_blank"
          rel="noopener noreferrer"
          class="btn btn-primary btn-sm rounded-full font-bold px-6 shadow-lg shadow-primary/25"
        >
          {{ t('videos.watch_on_youtube') }}
        </a>
      </div>
    </div>

    <!-- YouTube Channel Callout Banner (Längst ner på sidan) -->
    <div class="stage-card p-6 sm:p-8 rounded-3xl border border-primary/30 flex flex-col sm:flex-row items-center justify-between gap-5 bg-base-100/90 shadow-xl">
      <div class="flex items-center gap-4 text-left">
        <div class="w-14 h-14 rounded-2xl bg-red-600/10 border border-red-500/30 flex items-center justify-center text-3xl shadow-inner flex-shrink-0">
          🎬
        </div>
        <div>
          <span class="badge badge-accent badge-xs font-mono font-bold uppercase tracking-wider mb-1">
            {{ t('videos.channel_sub_badge') }}
          </span>
          <h2 class="font-heading text-lg sm:text-xl text-primary font-bold">
            Det 7:e Gunget på YouTube
          </h2>
          <p class="text-xs text-base-content/70">
            Följ kanalen <code>@det7egunget</code> för de senaste klippen, låtutkasten och liveframträdandena.
          </p>
        </div>
      </div>
      <a
        href="https://youtube.com/@det7egunget"
        target="_blank"
        rel="noopener noreferrer"
        class="btn btn-outline btn-secondary btn-sm sm:btn-md rounded-full font-bold flex items-center gap-2 flex-shrink-0 shadow-md hover:scale-105 transition-all"
      >
        <span>{{ t('videos.subscribe_channel') }}</span>
      </a>
    </div>

    <!-- Lightbox Video Player Modal (GDPR & Cookie Consent Protected) -->
    <div
      v-if="selectedVideo"
      class="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in"
      @click.self="closePlayer"
    >
      <div class="stage-card rounded-3xl border border-primary/40 shadow-2xl max-w-4xl w-full bg-base-100 overflow-hidden flex flex-col space-y-4 p-4 sm:p-6 my-auto max-h-[92vh] overflow-y-auto">
        <!-- Modal Top Bar -->
        <div class="flex items-center justify-between border-b border-primary/20 pb-3">
          <div class="min-w-0 pr-4">
            <h2 class="font-heading text-lg sm:text-xl text-primary font-bold truncate">
              {{ selectedVideo.title }}
            </h2>
            <span v-if="selectedVideo.publishedAt" class="text-[11px] text-base-content/60 font-mono">
              {{ new Date(selectedVideo.publishedAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'sv-SE', { year: 'numeric', month: 'long', day: 'numeric' }) }}
            </span>
          </div>
          <button
            type="button"
            class="btn btn-ghost btn-sm btn-circle text-xl hover:bg-primary/20 flex-shrink-0"
            :title="t('videos.close_video')"
            @click="closePlayer"
          >
            ✕
          </button>
        </div>

        <!-- Consent-gated Responsive Video Embed -->
        <div class="w-full">
          <MediaEmbedGated
            :src="`https://www.youtube.com/embed/${selectedVideo.youtubeId}?autoplay=1&rel=0`"
            :title="selectedVideo.title"
            provider="youtube"
            :direct-url="selectedVideo.url"
            iframe-class="w-full aspect-video border-0 rounded-2xl"
            container-class="w-full aspect-video rounded-2xl overflow-hidden bg-black border border-primary/30 shadow-2xl flex items-center justify-center"
          />
        </div>

        <!-- Description & Links -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 text-xs text-base-content/80">
          <p v-if="selectedVideo.description" class="leading-relaxed text-xs sm:text-sm text-base-content/80 max-w-2xl whitespace-pre-line">
            {{ selectedVideo.description }}
          </p>
          <div class="flex items-center gap-3 flex-shrink-0 self-end sm:self-center">
            <a
              :href="selectedVideo.url"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-outline btn-secondary btn-xs sm:btn-sm rounded-full font-bold flex items-center gap-1.5"
            >
              <span>{{ t('videos.watch_on_youtube') }}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
