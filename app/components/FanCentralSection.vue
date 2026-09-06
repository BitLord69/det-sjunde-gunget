<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()

// Fetch real approved photos from Fan Central
const { data: previewPhotos } = await useFetch<any[]>('/api/fan-central/photos', {
  default: () => [],
})

const displayedPhotos = computed(() => {
  if (previewPhotos.value && previewPhotos.value.length > 0) {
    return previewPhotos.value.slice(0, 3)
  }
  return [
    {
      id: 'p1',
      mediaUrl: '/media/fan-central/5B0EBD96-EAC2-4554-B7AF-433307968BD0.webp',
      caption: 'Troget publikfan – sjunger med i varje refräng!',
      location: 'Konsertscenen',
      rotation: 2,
      pinColor: 'gold',
    },
    {
      id: 'p2',
      mediaUrl: '/media/fan-central/fanpic.png',
      caption: 'Andersson 45W bordsfläkt – håller trummisen sval.',
      location: 'Scengolvet',
      rotation: -2,
      pinColor: 'red',
    },
  ]
})
</script>

<template>
  <section id="fancentral" class="mx-auto max-w-7xl px-6 lg:px-10 scroll-mt-24">
    <div class="bg-base-200/90 rounded-3xl p-8 sm:p-12 border border-secondary/30 relative overflow-hidden shadow-2xl space-y-8">
      <div class="flex flex-col md:flex-row md:items-end justify-between pb-6 border-b border-primary/20 gap-6">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/20 text-secondary text-xs font-bold uppercase tracking-widest mb-2">
            <span>📌</span> {{ t('fan_central.section_tag') }}
          </div>
          <h2 class="text-3xl sm:text-5xl font-heading text-primary text-gritty">
            {{ t('fan_central.title') }}
          </h2>
        </div>
        <div class="flex flex-col sm:flex-row sm:items-center gap-4">
          <p class="text-sm text-base-content/80 max-w-md">
            {{ t('fan_central.desc') }}
          </p>
          <NuxtLink :to="localePath('/fancentral')" class="btn btn-primary btn-sm rounded-full font-bold flex-shrink-0 shadow-lg cursor-pointer">
            <span>{{ t('fan_central.to_cork_board') }}</span>
            <span>→</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Teaser Cork Noticeboard Preview (No category filter tabs!) -->
      <div class="cork-board-frame">
        <div class="cork-board-surface p-6 sm:p-8">
          <div class="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 items-start">
            <FanPhotoCard
              v-for="photo in displayedPhotos"
              :key="photo.id"
              :photo="photo"
              :rotation="photo.rotation"
              size="sm"
              :to="localePath('/fancentral')"
            />
          </div>

          <div class="mt-6 text-center">
            <NuxtLink
              :to="localePath('/fancentral')"
              class="inline-flex items-center gap-1.5 text-xs font-bold text-white drop-shadow hover:text-primary transition-colors cursor-pointer"
            >
              <span>{{ t('fan_central.teaser_pin_cta') }}</span>
              <span>→</span>
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
