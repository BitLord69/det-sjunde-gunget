<script setup lang="ts">
const { t } = useI18n()

useSeoMeta({
  title: 'Fan Central | Det 7:e Gunget',
  description: 'Det 7:e Gungets officiella hyllning till både våra fantastiska konsertbesökare och de livsviktiga bordsfläktarna på scen.',
})

const { data: galleryItems } = await useFetch('/api/gallery')

const fanFilter = ref<'all' | 'people' | 'appliances'>('all')

const fanItems = computed(() => {
  return galleryItems.value?.filter((i) => i.category === 'fan_central') || []
})
</script>

<template>
  <div class="mx-auto max-w-7xl px-6 py-12 lg:px-10 space-y-16">
    <!-- Header -->
    <div class="space-y-4 max-w-3xl mb-14">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/15 text-secondary text-xs font-bold uppercase tracking-widest">
        <span>💨</span> {{ t('fan_central.section_tag') }}
      </div>
      <h1 class="font-heading text-4xl sm:text-6xl text-primary text-gritty pb-2">
        {{ t('fan_central.title') }}
      </h1>
      <p class="text-base sm:text-lg text-base-content/80 leading-relaxed font-normal">
        {{ t('fan_central.desc') }}
      </p>
    </div>

    <!-- Category Filter -->
    <div class="flex flex-wrap gap-2 text-xs font-bold border-b border-primary/20 pb-4">
      <button
        type="button"
        class="px-4 py-2 rounded-full transition-all"
        :class="fanFilter === 'all' ? 'bg-secondary text-secondary-content font-black shadow' : 'bg-base-200 text-base-content/70 hover:text-primary'"
        @click="fanFilter = 'all'"
      >
        {{ t('fan_central.all_fans') }}
      </button>
      <button
        type="button"
        class="px-4 py-2 rounded-full transition-all"
        :class="fanFilter === 'people' ? 'bg-secondary text-secondary-content font-black shadow' : 'bg-base-200 text-base-content/70 hover:text-primary'"
        @click="fanFilter = 'people'"
      >
        {{ t('fan_central.human_fans') }}
      </button>
      <button
        type="button"
        class="px-4 py-2 rounded-full transition-all"
        :class="fanFilter === 'appliances' ? 'bg-secondary text-secondary-content font-black shadow' : 'bg-base-200 text-base-content/70 hover:text-primary'"
        @click="fanFilter = 'appliances'"
      >
        {{ t('fan_central.electric_fans') }}
      </button>
    </div>

    <!-- Fan Cards Showcase -->
    <div class="grid sm:grid-cols-2 gap-8">
      <!-- Human Fan Card -->
      <div
        v-if="fanFilter === 'all' || fanFilter === 'people'"
        class="stage-card p-6 sm:p-8 rounded-2xl flex flex-col justify-between border border-primary/30 shadow-xl"
      >
        <div>
          <FramedPhoto
            media-url="/media/fan-central/5B0EBD96-EAC2-4554-B7AF-433307968BD0.webp"
            alt-text-sv="Troget publikfan"
            :caption-sv="t('fan_central.human_badge')"
            frame-style="polaroid"
            class="mb-6"
          />

          <h2 class="font-heading text-2xl text-primary font-bold">{{ t('fan_central.human_title') }}</h2>
          <p class="text-sm text-base-content/80 mt-2 leading-relaxed">
            {{ t('fan_central.human_desc') }}
          </p>

          <div class="mt-6 space-y-1 text-xs font-mono text-base-content/70 pt-4 border-t border-base-content/10">
            <p><span class="text-secondary font-bold">{{ t('fan_central.human_features_label') }}:</span> {{ t('fan_central.human_features') }}</p>
            <p><span class="text-secondary font-bold">{{ t('fan_central.human_fav_label') }}:</span> {{ t('fan_central.human_fav') }}</p>
          </div>
        </div>

        <div class="mt-6 pt-4 border-t border-base-content/10 text-xs font-bold text-accent">
          {{ t('fan_central.human_status') }}
        </div>
      </div>

      <!-- Appliance Fan Card -->
      <div
        v-if="fanFilter === 'all' || fanFilter === 'appliances'"
        class="stage-card p-6 sm:p-8 rounded-2xl flex flex-col justify-between border border-secondary/40 shadow-xl"
      >
        <div>
          <FramedPhoto
            media-url="/media/fan-central/fanpic.png"
            alt-text-sv="Elektrisk bordsfläkt på scen"
            :caption-sv="t('fan_central.electric_model')"
            frame-style="taped"
            class="mb-6"
          />

          <h2 class="font-heading text-2xl text-secondary font-bold">{{ t('fan_central.electric_title') }}</h2>
          <p class="text-sm text-base-content/80 mt-2 leading-relaxed">
            {{ t('fan_central.electric_desc') }}
          </p>

          <div class="mt-6 space-y-1 text-xs font-mono text-base-content/70 pt-4 border-t border-base-content/10">
            <p><span class="text-secondary font-bold">{{ t('fan_central.electric_power_label') }}:</span> {{ t('fan_central.electric_power') }}</p>
            <p><span class="text-secondary font-bold">{{ t('fan_central.electric_feature_label') }}:</span> {{ t('fan_central.electric_feature') }}</p>
          </div>
        </div>

        <div class="mt-6 pt-4 border-t border-base-content/10 text-xs font-bold text-secondary">
          {{ t('fan_central.electric_status') }}
        </div>
      </div>
    </div>

    <!-- Official Band Merch Showcase Banner -->
    <div class="stage-card p-8 sm:p-12 rounded-3xl border border-primary/30 flex flex-col md:flex-row items-center justify-between gap-8 bg-gradient-to-r from-base-300 via-base-200 to-base-300 shadow-2xl">
      <div class="space-y-3 text-center md:text-left max-w-xl">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold uppercase tracking-widest">
          <span>👕</span> Officiell Merch-Shop
        </div>
        <h2 class="font-heading text-3xl sm:text-4xl text-primary font-bold">
          Bär Det 7:e Gunget med stolthet
        </h2>
        <p class="text-sm text-base-content/80 leading-relaxed">
          Kittad för nästa gig? Spana in våra officiella t-shirts, huvtröjor, tygpåsar och muggar i vår Spreadshop-butik.
        </p>
      </div>

      <div class="flex-shrink-0">
        <a
          href="https://det-7e-gunget.myspreadshop.se"
          target="_blank"
          rel="noopener noreferrer"
          class="btn btn-primary btn-md rounded-full font-bold px-8 shadow-lg shadow-primary/20 hover:scale-105 transition-transform inline-flex items-center gap-2"
        >
          <span>Besök Merch-butiken</span>
          <span>↗</span>
        </a>
      </div>
    </div>
  </div>
</template>
