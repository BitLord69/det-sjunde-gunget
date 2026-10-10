<script setup lang="ts">
import type { GalleryItem } from '~/types'

const { t, locale } = useI18n()

useSeoMeta({
  title: computed(() => `${t('band.title')} | Det 7:e Gunget`),
  description: computed(() => t('band.desc')),
})

const { data: bandMembers } = await useFetch('/api/band')

// Hämta/återanvänd bildpoolen från den globala storen
const { bandPhotos, fetchBandPhotos } = useBandPhotos()
await fetchBandPhotos()

// Välj ett slumpmässigt foto ur poolen varje gång sidan renderas / laddas
const currentPhoto = ref<GalleryItem | null>(null)

if (bandPhotos.value && bandPhotos.value.length > 0) {
  const initialIndex = Math.floor(Math.random() * bandPhotos.value.length)
  currentPhoto.value = bandPhotos.value[initialIndex] || null
}

onMounted(() => {
  if (bandPhotos.value && bandPhotos.value.length > 0) {
    const randomIndex = Math.floor(Math.random() * bandPhotos.value.length)
    currentPhoto.value = bandPhotos.value[randomIndex] || null
  }
})
</script>

<template>
  <div class="mx-auto max-w-7xl px-6 pt-4 sm:pt-6 pb-12 lg:px-10 space-y-14">
    <!-- Header -->
    <PageHeader :title="t('band.title')" :description="t('band.desc')" />

    <!-- Band Origin Story -->
    <div class="grid lg:grid-cols-2 gap-12 items-center">
      <div class="space-y-4 text-base text-base-content/85 leading-relaxed">
        <h2 class="font-heading text-2xl sm:text-3xl text-primary font-bold">
          {{ t('about.story_title') }}
        </h2>
        <p>
          {{ t('about.story_p1') }}
        </p>
        <p>
          {{ t('about.story_p2') }}
        </p>
        <div class="pt-2 flex items-center gap-4 text-xs font-mono text-secondary font-bold flex-wrap">
          <span>✦ {{ t('about.bullet_instruments') }}</span>
          <span>✦ {{ t('about.bullet_no_tracks') }}</span>
          <span>✦ {{ t('about.bullet_tubes') }}</span>
        </div>
      </div>

      <!-- Slumpad bild i klassisk träram från bandets bildpool (eller fallback) -->
      <div class="frame-wood rounded-2xl overflow-hidden shadow-2xl">
        <NuxtImg
          :src="currentPhoto?.mediaUrl || '/media/band/1..7de Gunget photoshoot1 21-6 26-21.jpg'"
          :alt="locale === 'en' && currentPhoto?.altTextEn ? currentPhoto.altTextEn : (currentPhoto?.altTextSv || t('common.band_photo_alt'))"
          class="w-full aspect-[4/3] object-cover filter contrast-105"
        />
        <div class="p-3 text-center text-xs font-heading font-bold text-primary bg-neutral">
          {{ (locale === 'en' && currentPhoto?.captionEn ? currentPhoto.captionEn : currentPhoto?.captionSv) || t('about.photo_caption') }}
        </div>
      </div>
    </div>

    <!-- Member Profiles Grid -->
    <div class="space-y-10">
      <div class="border-b border-primary/20 pb-4">
        <span class="text-xs font-bold uppercase tracking-widest text-secondary">{{ t('about.members_tag') }}</span>
        <h2 class="font-heading text-3xl sm:text-4xl text-primary font-bold mt-1">
          {{ t('about.members_title') }}
        </h2>
      </div>

      <div class="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <BandMemberCard
          v-for="member in bandMembers"
          :key="member.id"
          :member="member"
        />
      </div>
    </div>
  </div>
</template>
