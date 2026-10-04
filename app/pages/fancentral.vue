<script setup lang="ts">
import type { GalleryItem } from '~/types'

const { t } = useI18n()

useSeoMeta({
  title: computed(() => `${t('fan_central.title')} | Det 7:e Gunget`),
  description: computed(() => t('fan_central.desc')),
})

// Fetch approved fan photos from the endpoint
const {
  data: fanPhotos,
  refresh: refreshPhotos,
} = await useFetch<GalleryItem[]>('/api/fan-central/photos', {
  default: () => [],
})

// LIGHTBOX / POPUP STATE
const activePhotoIndex = ref<number | null>(null)

const openLightbox = (index: number) => {
  activePhotoIndex.value = index
}

const closeLightbox = () => {
  activePhotoIndex.value = null
}

const prevPhoto = () => {
  if (activePhotoIndex.value === null || !fanPhotos.value?.length) return
  activePhotoIndex.value = activePhotoIndex.value > 0 ? activePhotoIndex.value - 1 : fanPhotos.value.length - 1
}

const nextPhoto = () => {
  if (activePhotoIndex.value === null || !fanPhotos.value?.length) return
  activePhotoIndex.value = activePhotoIndex.value < fanPhotos.value.length - 1 ? activePhotoIndex.value + 1 : 0
}

// UPLOAD MODAL STATE
const isUploadModalOpen = ref(false)

const openUploadModal = () => {
  isUploadModalOpen.value = true
}

const closeUploadModal = () => {
  isUploadModalOpen.value = false
}

const onPhotoUploaded = () => {
  refreshPhotos()
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 sm:px-6 pt-4 sm:pt-6 pb-16 lg:px-10 space-y-10 sm:space-y-12">
    <!-- Header -->
    <PageHeader
      :title="t('fan_central.title')"
      :description="t('fan_central.desc')"
    />

    <!-- Noticeboard Invitation Banner & Upload CTA Button -->
    <div class="stage-card p-6 sm:p-8 rounded-3xl border border-primary/30 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl bg-gradient-to-r from-base-200 via-base-100 to-base-200">
      <div class="space-y-2 text-center md:text-left">
        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
          <span>📌</span> {{ t('fan_central.banner_tag') }}
        </div>
        <h2 class="font-heading text-2xl sm:text-3xl text-primary font-bold">
          {{ t('fan_central.banner_title') }}
        </h2>
        <p class="text-xs sm:text-sm text-base-content/80 max-w-2xl leading-relaxed">
          {{ t('fan_central.banner_desc') }}
        </p>
      </div>

      <div class="flex-shrink-0">
        <button
          type="button"
          class="btn btn-primary btn-md rounded-full font-bold px-8 shadow-lg shadow-primary/25 hover:scale-105 transition-transform flex items-center gap-2 cursor-pointer"
          @click="openUploadModal"
        >
          <span>📌</span>
          <span>{{ t('fan_central.pin_photo_btn') }}</span>
        </button>
      </div>
    </div>

    <!-- THE CORK NOTICEBOARD (ANSLAGSTAVLA I KORK MED NATURLIG TRÄRAM) -->
    <div class="cork-board-frame shadow-2xl">
      <section class="cork-board-surface px-6 sm:px-10 md:px-12 pt-1 sm:pt-1.5 md:pt-2 pb-8 sm:pb-12 md:pb-14 min-h-[500px]">
        <!-- Header plaque pinned to cork -->
        <div class="flex items-center justify-center mb-6 sm:mb-8">
          <div class="relative bg-neutral text-neutral-content px-6 py-2.5 rounded-lg shadow-2xl border border-primary/40 text-center transform -rotate-1">
            <PhotoFastener type="pin" color="gold" position="top-left" />
            <PhotoFastener type="pin" color="gold" position="top-right" />
            <h3 class="font-heading text-base sm:text-lg font-bold text-primary tracking-wide">
              {{ t('fan_central.cork_plaque_title') }}
            </h3>
            <p class="text-[11px] font-mono text-base-content/80 opacity-90">
              {{ t('fan_central.cork_plaque_subtitle') }}
            </p>
          </div>
        </div>

        <!-- Empty state on cork board -->
        <div v-if="fanPhotos.length === 0" class="text-center py-20 text-neutral-content space-y-4">
          <div class="text-5xl">📌</div>
          <p class="font-heading text-xl font-bold text-white drop-shadow">
            {{ t('fan_central.empty_title') }}
          </p>
          <p class="text-xs text-white/80 max-w-sm mx-auto drop-shadow">
            {{ t('fan_central.empty_desc') }}
          </p>
          <button
            type="button"
            class="btn btn-primary btn-sm rounded-full font-bold px-6 shadow-xl"
            @click="openUploadModal"
          >
            {{ t('fan_central.pin_now_btn') }}
          </button>
        </div>

        <!-- Pinned Photos Gallery Grid -->
        <div
          v-else
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 sm:gap-10 items-start"
        >
          <FanPhotoCard
            v-for="(photo, index) in fanPhotos"
            :key="photo.id"
            :photo="photo"
            @click="openLightbox(index)"
          />
        </div>
      </section>
    </div>

    <!-- Official Band Merch Showcase Banner -->
    <div class="stage-card p-8 sm:p-12 rounded-3xl border border-primary/30 flex flex-col md:flex-row items-center justify-between gap-8 bg-gradient-to-r from-base-300 via-base-200 to-base-300 shadow-2xl">
      <div class="space-y-3 text-center md:text-left max-w-xl">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold uppercase tracking-widest">
          <span>👕</span> {{ t('fan_central.merch_tag') }}
        </div>
        <h2 class="font-heading text-3xl sm:text-4xl text-primary font-bold">
          {{ t('fan_central.merch_title') }}
        </h2>
        <p class="text-sm text-base-content/80 leading-relaxed">
          {{ t('fan_central.merch_desc') }}
        </p>
      </div>

      <div class="flex-shrink-0">
        <a
          href="https://det-7e-gunget.myspreadshop.se"
          target="_blank"
          rel="noopener noreferrer"
          class="btn btn-primary btn-md rounded-full font-bold px-8 shadow-lg shadow-primary/20 hover:scale-105 transition-transform inline-flex items-center gap-2"
        >
          <span>{{ t('fan_central.merch_btn') }}</span>
          <span>↗</span>
        </a>
      </div>
    </div>

    <!-- Asynchronously Loaded Modals (Zero impact on initial page bundle) -->
    <LazyFanPhotoLightbox
      :is-open="activePhotoIndex !== null"
      :photos="fanPhotos"
      :active-index="activePhotoIndex"
      @close="closeLightbox"
      @prev="prevPhoto"
      @next="nextPhoto"
    />

    <LazyFanPhotoUploadModal
      :is-open="isUploadModalOpen"
      @close="closeUploadModal"
      @uploaded="onPhotoUploaded"
    />
  </div>
</template>
