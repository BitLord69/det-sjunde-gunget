<script setup lang="ts">
const { t, locale } = useI18n()
const localePath = useLocalePath()

useSeoMeta({
  title: 'Galleri & scenbilder | Det 7:e Gunget',
  description: 'Se bilder och ögonblick från Det 7:e Gungets spelningar, replokaler och studiosessioner.',
})

const { data: galleryItems } = await useFetch('/api/gallery')

const selectedImage = ref<any | null>(null)

const photos = computed(() => galleryItems.value?.filter((i) => i.category !== 'fan_central') || [])
</script>

<template>
  <div class="mx-auto max-w-7xl px-6 py-12 lg:px-10 space-y-12">
    <!-- Header -->
    <PageHeader :title="t('gallery.title')" :description="t('gallery.desc')" />

    <!-- Gallery Grid -->
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
      <FramedPhoto
        v-for="item in photos"
        :key="item.id"
        :media-url="item.mediaUrl"
        :alt-text-sv="item.altTextSv"
        :alt-text-en="item.altTextEn"
        :caption-sv="item.captionSv"
        :caption-en="item.captionEn"
        :frame-style="item.frameStyle || undefined"
        :rotation="item.rotation ?? undefined"
        :pin-color="'random'"
        :clickable="true"
        @click="selectedImage = item"
      />
    </div>

    <!-- Fan Central Callout -->
    <div class="stage-card p-8 rounded-2xl border border-secondary/30 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <span class="text-3xl">💨</span>
        <div>
          <h2 class="font-heading text-xl text-primary font-bold">{{ t('fan_central.title') }}</h2>
          <p class="text-xs text-base-content/70">{{ t('fan_central.desc') }}</p>
        </div>
      </div>
      <NuxtLink :to="localePath('/fancentral')" class="btn btn-secondary btn-sm rounded-full font-bold">
        {{ t('fan_central.open_fan_central') }} →
      </NuxtLink>
    </div>

    <!-- Lightbox Modal -->
    <div
      v-if="selectedImage"
      class="fixed inset-0 z-50 bg-neutral/90 backdrop-blur-md flex items-center justify-center p-4"
      @click="selectedImage = null"
    >
      <div class="max-w-4xl max-h-[90vh] flex flex-col items-center space-y-3" @click.stop>
        <NuxtImg
          :src="selectedImage.mediaUrl"
          :alt="locale === 'en' && selectedImage.altTextEn ? selectedImage.altTextEn : selectedImage.altTextSv"
          class="max-h-[75vh] w-auto object-contain rounded-xl shadow-2xl border border-primary/30"
        />
        <p class="text-sm font-bold text-primary text-center">
          {{ locale === 'en' && selectedImage.captionEn ? selectedImage.captionEn : selectedImage.captionSv }}
        </p>
        <button
          type="button"
          class="btn btn-sm btn-circle btn-primary font-bold text-xs"
          @click="selectedImage = null"
        >
          ✕
        </button>
      </div>
    </div>
  </div>
</template>
