<script setup lang="ts">
import type { VideoItem } from '~/types'

definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
})

useSeoMeta({
  title: 'Videohantering & YouTube | Det 7:e Gunget Admin',
})

const toastMessage = ref('')
const showToast = (msg: string) => {
  toastMessage.value = msg
  setTimeout(() => {
    toastMessage.value = ''
  }, 4500)
}

// Fetch videos and settings
const { data: videosList, refresh: refreshVideos, pending: isLoadingVideos } = await useFetch<VideoItem[]>('/api/admin/videos', {
  default: () => [],
})
const { data: adminSettings, refresh: refreshSettings } = await useFetch<any>('/api/admin/settings')

// Social Share Modal State
const isSocialModalOpen = ref(false)
const selectedVideoForShare = ref<VideoItem | null>(null)

const openSocialShare = (video: VideoItem) => {
  selectedVideoForShare.value = video
  isSocialModalOpen.value = true
}

// Syncing State
const isSyncing = ref(false)
const syncYouTube = async () => {
  isSyncing.value = true
  try {
    const res = await $fetch<{ success: boolean; addedCount: number; totalFound: number; skipped?: boolean }>('/api/admin/youtube/sync', {
      method: 'POST',
    })
    await Promise.all([refreshVideos(), refreshSettings()])
    if (res.addedCount > 0) {
      showToast(`🎬 ${res.addedCount} nya videor har importerats från YouTube!`)
    } else {
      showToast(`✓ YouTube är redan uppdaterad (${res.totalFound || 0} videor hittades på kanalen).`)
    }
  } catch (err: any) {
    const msg = err?.data?.message || err?.message || 'Ett fel uppstod vid YouTube-synk'
    showToast(`⚠️ ${msg}`)
  } finally {
    isSyncing.value = false
  }
}

// Modal State: Create / Edit
const isModalOpen = ref(false)
const isSaving = ref(false)
const isFetchingOEmbed = ref(false)
const editingVideo = ref<VideoItem | null>(null)

const form = reactive({
  id: '',
  url: '',
  youtubeId: '',
  title: '',
  description: '',
  thumbnailUrl: '',
  publishedAt: '',
  isActive: true,
  sortOrder: 0,
  postToSocials: false,
})

const isFormDirty = computed(() => {
  if (!isModalOpen.value) return false
  if (!editingVideo.value) {
    return Boolean(form.url.trim() || form.title.trim() || form.description.trim())
  }
  const orig = editingVideo.value
  return (
    form.title !== orig.title ||
    form.description !== (orig.description || '') ||
    form.url !== orig.url ||
    form.isActive !== orig.isActive ||
    form.sortOrder !== orig.sortOrder
  )
})

const openAddModal = () => {
  editingVideo.value = null
  form.id = ''
  form.url = ''
  form.youtubeId = ''
  form.title = ''
  form.description = ''
  form.thumbnailUrl = ''
  form.publishedAt = new Date().toISOString()
  form.isActive = true
  form.sortOrder = 0
  form.postToSocials = false
  isModalOpen.value = true
}

const openEditModal = (video: VideoItem) => {
  editingVideo.value = video
  form.id = video.id
  form.url = video.url
  form.youtubeId = video.youtubeId
  form.title = video.title
  form.description = video.description || ''
  form.thumbnailUrl = video.thumbnailUrl || ''
  form.publishedAt = video.publishedAt ? new Date(video.publishedAt).toISOString() : new Date().toISOString()
  form.isActive = Boolean(video.isActive)
  form.sortOrder = video.sortOrder || 0
  form.postToSocials = false
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
  editingVideo.value = null
}

// Auto-fetch oEmbed from YouTube when URL is pasted
const handleUrlChange = async () => {
  const url = form.url.trim()
  if (!url || !url.includes('youtu')) return

  isFetchingOEmbed.value = true
  try {
    const res = await $fetch<{ success: boolean; data: any }>(`/api/admin/youtube/oembed?url=${encodeURIComponent(url)}`)
    if (res.data) {
      if (!form.title) form.title = res.data.title
      form.youtubeId = res.data.videoId
      if (!form.thumbnailUrl) form.thumbnailUrl = res.data.thumbnailUrl
      showToast('✓ Videoinformation hämtad från YouTube!')
    }
  } catch (err: any) {
    console.warn('oEmbed lookup error:', err)
  } finally {
    isFetchingOEmbed.value = false
  }
}

// Toggle Video Active Status
const toggleActive = async (video: VideoItem) => {
  try {
    await $fetch('/api/admin/videos', {
      method: 'POST',
      body: {
        id: video.id,
        title: video.title,
        url: video.url,
        isActive: !video.isActive,
      },
    })
    await refreshVideos()
    showToast(video.isActive ? '👁️ Video dold från hemsidan' : '✓ Video aktiverad på hemsidan!')
  } catch {
    showToast('⚠️ Kunde inte ändra status.')
  }
}

// Save Video (Create or Update)
const saveVideo = async () => {
  if (!form.title.trim() || !form.url.trim()) {
    showToast('⚠️ Vänligen fyll i både titel och YouTube-URL.')
    return
  }

  isSaving.value = true
  try {
    await $fetch('/api/admin/videos', {
      method: 'POST',
      body: {
        ...form,
      },
    })
    await refreshVideos()
    closeModal()
    showToast(editingVideo.value ? '✓ Videon har uppdaterats!' : '🎬 Ny YouTube-video sparad!')
  } catch (err: any) {
    showToast(`⚠️ Kunde inte spara: ${err?.data?.message || err?.message || 'Fel'}`)
  } finally {
    isSaving.value = false
  }
}

// Delete Video
const isDeletingId = ref<string | null>(null)
const deleteVideo = async (video: VideoItem) => {
  if (!confirm(`Är du säker på att du vill ta bort "${video.title}" från hemsidans videolista?`)) {
    return
  }

  isDeletingId.value = video.id
  try {
    await $fetch('/api/admin/videos', {
      method: 'DELETE',
      body: { id: video.id },
    })
    await refreshVideos()
    showToast('🗑️ Videon togs bort.')
  } catch {
    showToast('⚠️ Kunde inte ta bort videon.')
  } finally {
    isDeletingId.value = null
  }
}

// Search and filter
const searchQuery = ref('')
const filteredVideos = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return videosList.value || []
  return (videosList.value || []).filter(
    (v) =>
      v.title.toLowerCase().includes(query) ||
      (v.description && v.description.toLowerCase().includes(query)) ||
      v.youtubeId.toLowerCase().includes(query),
  )
})
</script>

<template>
  <div class="mx-auto max-w-7xl px-3 sm:px-6 pt-3 pb-12 lg:px-10 space-y-6 font-sans">
    <!-- Toast Feedback -->
    <div
      v-if="toastMessage"
      class="fixed bottom-6 right-6 z-50 bg-secondary text-secondary-content px-6 py-3.5 rounded-2xl font-bold shadow-2xl animate-bounce flex items-center gap-2 border border-secondary/40"
    >
      <span>{{ toastMessage }}</span>
    </div>

    <!-- Admin Navigation Bar -->
    <AdminNavBar :dirty="isFormDirty" @discard="closeModal" />

    <!-- Header Section -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-3">
          <h1 class="font-heading text-2xl sm:text-3xl text-primary font-bold flex items-center gap-2">
            <span>🎬</span> Videor & YouTube
          </h1>
          <span class="badge badge-primary badge-sm font-mono font-bold">
            {{ videosList?.length || 0 }} st
          </span>
        </div>
        <p class="text-xs text-base-content/70 mt-1">
          Hantera bandets videoklipp, liveupptagningar och musikvideor. Synkas automatiskt från YouTube.
        </p>
      </div>

      <div class="flex items-center gap-2.5 flex-wrap">
        <button
          type="button"
          class="btn btn-outline btn-primary btn-sm rounded-xl font-bold flex items-center gap-2 cursor-pointer shadow-sm hover:shadow-primary/20"
          :disabled="isSyncing"
          @click="syncYouTube"
        >
          <span v-if="isSyncing" class="loading loading-spinner loading-xs"/>
          <span v-else>⚡</span>
          <span>{{ isSyncing ? 'Synkar YouTube...' : 'Synka från YouTube' }}</span>
        </button>

        <button
          type="button"
          class="btn btn-primary btn-sm rounded-xl font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-primary/25"
          @click="openAddModal"
        >
          <span>➕</span>
          <span>Lägg till video</span>
        </button>
      </div>
    </div>

    <!-- YouTube Sync Status Banner -->
    <div class="p-4 rounded-2xl bg-base-200/80 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
      <div class="flex items-center gap-3">
        <span class="text-xl">📺</span>
        <div>
          <span class="font-bold text-base-content">
            YouTube-kanal: <code class="font-mono text-secondary font-bold">{{ adminSettings?.youtubeChannelId || '@det7egunget' }}</code>
          </span>
          <p class="text-[11px] text-base-content/60">
            Auto-import:
            <span :class="adminSettings?.youtubeAutoImport !== false ? 'text-success font-bold' : 'text-base-content/50'">
              {{ adminSettings?.youtubeAutoImport !== false ? 'Aktiv (1 ggr/dygn via Cron)' : 'Inaktiverad' }}
            </span>
            • Senast synkad:
            <span class="font-mono">
              {{
                adminSettings?.youtubeLastSynced
                  ? new Date(adminSettings.youtubeLastSynced).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' })
                  : 'Inte synkad ännu'
              }}
            </span>
          </p>
        </div>
      </div>
      <NuxtLink to="/admin/settings" class="btn btn-ghost btn-xs text-primary font-bold hover:bg-primary/10">
        ⚙️ Justera inställningar →
      </NuxtLink>
    </div>

    <!-- Search Bar -->
    <div class="flex items-center justify-between gap-4">
      <div class="relative flex-grow max-w-md">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Sök bland videor (titel, beskrivning, ID)..."
          class="input input-bordered input-sm w-full bg-base-200/90 pl-9 text-xs"
        >
        <span class="absolute left-3 top-2 text-xs opacity-50">🔍</span>
      </div>
      <div class="text-xs text-base-content/60 font-mono">
        Visar {{ filteredVideos.length }} av {{ videosList?.length || 0 }} videor
      </div>
    </div>

    <!-- Video Grid -->
    <div v-if="filteredVideos.length > 0" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="video in filteredVideos"
        :key="video.id"
        class="stage-card rounded-2xl border border-primary/20 overflow-hidden flex flex-col bg-base-100/95 hover:border-primary/50 transition-all shadow-md group"
      >
        <!-- Video Thumbnail with Preview Overlay -->
        <div class="relative aspect-video bg-neutral overflow-hidden group-hover:scale-[1.01] transition-transform">
          <img
            :src="video.thumbnailUrl || `https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`"
            :alt="video.title"
            class="w-full h-full object-cover"
            loading="lazy"
          >
          <!-- Play Badge / Open link -->
          <a
            :href="video.url"
            target="_blank"
            rel="noopener noreferrer"
            class="absolute inset-0 bg-black/40 hover:bg-black/20 flex items-center justify-center transition-all opacity-90 group-hover:opacity-100"
            title="Öppna på YouTube"
          >
            <div class="w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
              <span class="text-xl ml-0.5">▶</span>
            </div>
          </a>

          <!-- Active status badge -->
          <div class="absolute top-2 left-2">
            <button
              type="button"
              class="badge badge-sm font-bold cursor-pointer transition-all shadow-md"
              :class="video.isActive ? 'badge-success text-success-content' : 'badge-ghost text-base-content/60'"
              @click.stop="toggleActive(video)"
              :title="video.isActive ? 'Klicka för att dölja på sajten' : 'Klicka för att aktivera på sajten'"
            >
              {{ video.isActive ? '🟢 Visas' : '⚪ Dold' }}
            </button>
          </div>

          <!-- YouTube ID Pill -->
          <div class="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 font-mono text-[10px] text-white/90">
            {{ video.youtubeId }}
          </div>
        </div>

        <!-- Video Card Body -->
        <div class="p-4 flex flex-col flex-grow justify-between space-y-3">
          <div>
            <h3 class="font-heading text-base font-bold text-primary line-clamp-2 leading-snug" :title="video.title">
              {{ video.title }}
            </h3>
            <p v-if="video.description" class="text-xs text-base-content/70 line-clamp-2 mt-1">
              {{ video.description }}
            </p>
            <div class="flex items-center gap-2 mt-2 text-[11px] text-base-content/50 font-mono">
              <span v-if="video.publishedAt">
                📅 {{ new Date(video.publishedAt).toLocaleDateString('sv-SE') }}
              </span>
              <span v-if="video.sortOrder !== 0">• Sortering: {{ video.sortOrder }}</span>
            </div>
          </div>

          <!-- Action Buttons Footer -->
          <div class="pt-3 border-t border-primary/10 flex items-center justify-between gap-2">
            <!-- Share to Social Media -->
            <button
              type="button"
              class="btn btn-outline btn-secondary btn-xs rounded-lg font-bold flex items-center gap-1 cursor-pointer"
              @click="openSocialShare(video)"
              title="Dela videon till Facebook & Instagram"
            >
              <span>📢</span>
              <span>Dela</span>
            </button>

            <div class="flex items-center gap-1.5">
              <button
                type="button"
                class="btn btn-ghost btn-xs text-base-content/80 hover:text-primary rounded-lg font-bold"
                @click="openEditModal(video)"
              >
                ✏️ Ändra
              </button>

              <button
                type="button"
                class="btn btn-ghost btn-xs text-error hover:bg-error/10 rounded-lg font-bold"
                :disabled="isDeletingId === video.id"
                @click="deleteVideo(video)"
                title="Ta bort video"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!isLoadingVideos"
      class="p-12 text-center rounded-3xl bg-base-200/50 border border-dashed border-primary/30 space-y-4"
    >
      <span class="text-5xl block">🎬</span>
      <h3 class="font-heading text-lg font-bold text-primary">Inga videor hittades</h3>
      <p class="text-xs text-base-content/70 max-w-md mx-auto">
        Klicka på <strong>"Synka från YouTube"</strong> för att automatiskt hämta in bandets klipp från YouTube-kanalen, eller lägg till ett manuellt via länk.
      </p>
      <div class="flex items-center justify-center gap-3 pt-2">
        <button
          type="button"
          class="btn btn-primary btn-sm rounded-xl font-bold cursor-pointer"
          :disabled="isSyncing"
          @click="syncYouTube"
        >
          ⚡ Synka från YouTube nu
        </button>
        <button
          type="button"
          class="btn btn-outline btn-primary btn-sm rounded-xl font-bold cursor-pointer"
          @click="openAddModal"
        >
          ➕ Lägg till manuellt
        </button>
      </div>
    </div>

    <!-- Loading Skeleton -->
    <div v-else class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="i in 3" :key="i" class="stage-card p-4 rounded-2xl animate-pulse space-y-3">
        <div class="aspect-video bg-base-300 rounded-xl" />
        <div class="h-4 bg-base-300 rounded w-3/4" />
        <div class="h-3 bg-base-300 rounded w-1/2" />
      </div>
    </div>

    <!-- ADD / EDIT VIDEO MODAL -->
    <div
      v-if="isModalOpen"
      class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      @click.self="closeModal"
    >
      <div class="stage-card p-6 sm:p-8 rounded-3xl border border-primary/40 shadow-2xl max-w-lg w-full bg-base-100 space-y-5 my-8">
        <div class="flex items-center justify-between border-b border-primary/20 pb-3">
          <h2 class="font-heading text-lg text-primary font-bold flex items-center gap-2">
            <span>{{ editingVideo ? '✏️ Redigera YouTube-video' : '➕ Lägg till YouTube-video' }}</span>
          </h2>
          <button type="button" class="btn btn-ghost btn-xs btn-circle text-lg" @click="closeModal">✕</button>
        </div>

        <form @submit.prevent="saveVideo" class="space-y-4 text-xs">
          <!-- YouTube URL -->
          <div class="space-y-1">
            <label class="block font-bold text-secondary">
              YouTube-länk / URL *
            </label>
            <div class="flex items-center gap-2">
              <input
                v-model="form.url"
                type="url"
                placeholder="https://www.youtube.com/watch?v=... eller https://youtu.be/..."
                class="input input-bordered input-sm flex-grow bg-base-200 font-mono text-xs"
                required
                @blur="handleUrlChange"
              >
              <button
                type="button"
                class="btn btn-outline btn-primary btn-sm rounded-lg font-bold flex-shrink-0"
                :disabled="isFetchingOEmbed || !form.url.trim()"
                @click="handleUrlChange"
                title="Hämta titel och tumnagel automatiskt"
              >
                <span v-if="isFetchingOEmbed" class="loading loading-spinner loading-xs"/>
                <span v-else>🔍 Hämta</span>
              </button>
            </div>
            <p class="text-[10px] text-base-content/60">
              Klistra in länken så hämtas titel och miniatyrbild automagiskt från YouTube.
            </p>
          </div>

          <!-- Video Thumbnail Preview -->
          <div v-if="form.thumbnailUrl || form.youtubeId" class="p-2.5 rounded-xl bg-base-200/70 border border-primary/20 flex items-center gap-3">
            <img
              :src="form.thumbnailUrl || `https://i.ytimg.com/vi/${form.youtubeId}/hqdefault.jpg`"
              alt="Förhandsgranskning"
              class="w-24 aspect-video object-cover rounded-lg border border-primary/30"
            >
            <div class="min-w-0 flex-grow">
              <span class="text-[10px] text-secondary font-bold block uppercase tracking-wider">Förhandsgranskning</span>
              <p class="font-bold text-base-content truncate">{{ form.title || 'Namnlös video' }}</p>
              <span class="text-[10px] font-mono text-base-content/60">ID: {{ form.youtubeId || 'Ej spikat' }}</span>
            </div>
          </div>

          <!-- Title -->
          <div class="space-y-1">
            <label class="block font-bold text-secondary">
              Videotitel *
            </label>
            <input
              v-model="form.title"
              type="text"
              placeholder="Titel på videon"
              class="input input-bordered input-sm w-full bg-base-200 text-xs"
              required
            >
          </div>

          <!-- Description -->
          <div class="space-y-1">
            <label class="block font-bold text-secondary">
              Beskrivning / Notering (valfritt)
            </label>
            <textarea
              v-model="form.description"
              rows="3"
              placeholder="Kort beskrivning eller text som visas i galleriet..."
              class="textarea textarea-bordered text-xs w-full bg-base-200"
            />
          </div>

          <!-- Sort Order & Visibility Grid -->
          <div class="grid grid-cols-2 gap-4 pt-1">
            <div class="space-y-1">
              <label class="block font-bold text-secondary">Sorteringsordning</label>
              <input
                v-model.number="form.sortOrder"
                type="number"
                class="input input-bordered input-sm w-full bg-base-200 font-mono text-xs"
              >
              <span class="text-[10px] text-base-content/50">0 = standard</span>
            </div>

            <div class="space-y-1">
              <label class="block font-bold text-secondary">Synlighet</label>
              <label class="flex items-center gap-2 p-2 rounded-lg bg-base-200 cursor-pointer">
                <input
                  v-model="form.isActive"
                  type="checkbox"
                  class="toggle toggle-primary toggle-sm"
                >
                <span class="font-bold">{{ form.isActive ? 'Aktiv (visas)' : 'Dold' }}</span>
              </label>
            </div>
          </div>

          <!-- Post to Socials Checkbox (only for new videos) -->
          <div v-if="!editingVideo" class="p-3 rounded-xl bg-secondary/10 border border-secondary/30 space-y-1">
            <label class="flex items-start gap-3 cursor-pointer">
              <input
                v-model="form.postToSocials"
                type="checkbox"
                class="checkbox checkbox-secondary checkbox-sm mt-0.5"
              >
              <div>
                <span class="font-bold text-secondary block">Dela direkt till sociala medier</span>
                <span class="text-[11px] text-base-content/75">
                  Publicerar automatiskt ett snyggt videoinlägg till Facebook & Instagram när du sparar.
                </span>
              </div>
            </label>
          </div>

          <!-- Action Buttons -->
          <div class="pt-4 border-t border-primary/20 flex items-center justify-end gap-3">
            <button
              type="button"
              class="btn btn-ghost btn-sm rounded-xl font-bold"
              @click="closeModal"
            >
              Avbryt
            </button>
            <button
              type="submit"
              class="btn btn-primary btn-sm rounded-xl font-bold px-6 shadow-md shadow-primary/30"
              :disabled="isSaving"
            >
              <span v-if="isSaving" class="loading loading-spinner loading-xs"/>
              <span>{{ isSaving ? 'Sparar...' : editingVideo ? 'Uppdatera video' : 'Spara video' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Social Share Modal -->
    <SocialShareModal
      v-model="isSocialModalOpen"
      type="video"
      :item="selectedVideoForShare"
      @published="showToast('✓ Videon har delats till sociala medier!')"
    />
  </div>
</template>
