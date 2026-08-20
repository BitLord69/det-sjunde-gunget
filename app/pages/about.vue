<script setup lang="ts">
const { t, locale } = useI18n()

useSeoMeta({
  title: 'Om bandet | Det 7:e Gunget',
  description: 'Möt Janis, Bosse, Marcus och Jonas i Det 7:e Gunget. Fyra herrar över 50 som spelar äkta svensk blues och rock.',
})

const { data: bandMembers } = await useFetch('/api/band')
</script>

<template>
  <div class="mx-auto max-w-7xl px-6 py-12 lg:px-10 space-y-20">
    <!-- Header -->
    <div class="space-y-4 max-w-3xl mb-14">
      <h1 class="font-heading text-4xl sm:text-6xl text-primary text-gritty pb-2">
        {{ t('band.title') }}
      </h1>
      <p class="text-base sm:text-lg text-base-content/80 leading-relaxed font-normal">
        {{ t('band.desc') }}
      </p>
    </div>

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

      <div class="frame-wood rounded-2xl overflow-hidden shadow-2xl">
        <NuxtImg
          src="/media/band/1..7de Gunget photoshoot1 21-6 26-21.jpg"
          alt="Det 7:e Gunget bandporträtt"
          class="w-full aspect-[4/3] object-cover filter contrast-105"
        />
        <div class="p-3 text-center text-xs font-heading font-bold text-primary bg-neutral">
          {{ t('about.photo_caption') }}
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
