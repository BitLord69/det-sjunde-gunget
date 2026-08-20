<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()

const { data: galleryItems } = await useFetch<any[]>('/api/gallery', {
  default: () => [],
})
</script>

<template>
  <section id="gallery" class="mx-auto max-w-7xl px-6 lg:px-10 scroll-mt-24">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between mb-14 pb-4 border-b border-primary/20 gap-4">
      <div>
        <span class="text-xs font-bold uppercase tracking-[0.25em] text-secondary">Scen, Svett & Rep</span>
        <h2 class="text-3xl sm:text-5xl font-heading text-primary mt-1 text-gritty pb-2">
          Galleri
        </h2>
      </div>
      <div class="flex flex-col sm:flex-row sm:items-center gap-4">
        <p class="text-sm text-base-content/70 max-w-md">
          Ögonblick från studion, replokalen och livescener runt om i landet.
        </p>
        <NuxtLink :to="localePath('/gallery')" class="btn btn-outline btn-primary btn-sm rounded-full font-bold flex-shrink-0">
          {{ t('gallery.all_gallery') }} →
        </NuxtLink>
      </div>
    </div>

    <!-- Tactile Gallery Grid -->
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
      <FramedPhoto
        v-for="item in galleryItems"
        :key="item.id"
        :media-url="item.mediaUrl"
        :alt-text-sv="item.altTextSv"
        :alt-text-en="item.altTextEn"
        :caption-sv="item.captionSv"
        :caption-en="item.captionEn"
        :frame-style="item.frameStyle"
        :rotation="item.rotation"
        :pin-color="'random'"
      />
    </div>
  </section>
</template>
