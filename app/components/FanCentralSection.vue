<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()

const fanFilter = ref<'all' | 'people' | 'appliances'>('all')
</script>

<template>
  <section id="fancentral" class="mx-auto max-w-7xl px-6 lg:px-10 scroll-mt-24">
    <div class="bg-base-200/90 rounded-3xl p-8 sm:p-12 border border-secondary/30 relative overflow-hidden shadow-2xl">
      <div class="flex flex-col md:flex-row md:items-end justify-between mb-14 pb-4 border-b border-primary/20 gap-4">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/20 text-secondary text-xs font-bold uppercase tracking-widest mb-2">
            <span>💨</span> {{ t('fan_central.section_tag') }}
          </div>
          <h2 class="text-3xl sm:text-5xl font-heading text-primary text-gritty">
            {{ t('fan_central.title') }}
          </h2>
        </div>
        <div class="flex flex-col sm:flex-row sm:items-center gap-4">
          <p class="text-sm text-base-content/80 max-w-md">
            {{ t('fan_central.desc') }}
          </p>
          <NuxtLink :to="localePath('/fancentral')" class="btn btn-secondary btn-sm rounded-full font-bold flex-shrink-0">
            {{ t('fan_central.open_fan_central') }} →
          </NuxtLink>
        </div>
      </div>

      <!-- Fan Categories Tabs -->
      <div class="flex flex-wrap gap-2 mb-8 text-xs font-bold">
        <button
          type="button"
          class="px-4 py-2 rounded-full transition-all cursor-pointer"
          :class="fanFilter === 'all' ? 'bg-secondary text-secondary-content font-black shadow' : 'bg-base-300 text-base-content/70 hover:text-primary'"
          @click="fanFilter = 'all'"
        >
          Alla Fans (Båda sorterna)
        </button>
        <button
          type="button"
          class="px-4 py-2 rounded-full transition-all cursor-pointer"
          :class="fanFilter === 'people' ? 'bg-secondary text-secondary-content font-black shadow' : 'bg-base-300 text-base-content/70 hover:text-primary'"
          @click="fanFilter = 'people'"
        >
          👥 Mänskliga Fans
        </button>
        <button
          type="button"
          class="px-4 py-2 rounded-full transition-all cursor-pointer"
          :class="fanFilter === 'appliances' ? 'bg-secondary text-secondary-content font-black shadow' : 'bg-base-300 text-base-content/70 hover:text-primary'"
          @click="fanFilter = 'appliances'"
        >
          🌀 Bords- & Takfläktar
        </button>
      </div>

      <!-- Fan Cards Side by Side -->
      <div class="grid sm:grid-cols-2 gap-8">
        <!-- Real Human Fan -->
        <div
          v-if="fanFilter === 'all' || fanFilter === 'people'"
          class="bg-base-100 p-6 rounded-2xl border border-primary/20 flex flex-col justify-between"
        >
          <div>
            <FramedPhoto
              media-url="/media/fan-central/5B0EBD96-EAC2-4554-B7AF-433307968BD0.webp"
              alt-text-sv="Troget fan i publiken"
              caption-sv="Publikfavorit #1"
              frame-style="polaroid"
              class="mb-4"
            />
            <h3 class="font-heading text-xl text-primary font-bold">Det Mänskliga Fanet</h3>
            <p class="text-xs text-base-content/75 mt-2 leading-relaxed">
              Står alltid längst fram, kan varenda textrad utantill och applåderar även när munspelssolot spårar ur.
            </p>
          </div>
          <div class="mt-4 pt-3 border-t border-base-content/10 text-[11px] font-mono text-accent">
            Status: 100% Gung-ackrediterad
          </div>
        </div>

        <!-- Electric Fan -->
        <div
          v-if="fanFilter === 'all' || fanFilter === 'appliances'"
          class="bg-base-100 p-6 rounded-2xl border border-secondary/30 flex flex-col justify-between"
        >
          <div>
            <FramedPhoto
              media-url="/media/fan-central/fanpic.png"
              alt-text-sv="Elektrisk bordsfläkt på scen"
              caption-sv="Modell: Andersson 45W"
              frame-style="taped"
              class="mb-4"
            />
            <h3 class="font-heading text-xl text-secondary font-bold">Det Elektriska Fanet</h3>
            <p class="text-xs text-base-content/75 mt-2 leading-relaxed">
              3 hastigheter, oscillerande svängrörelse. Räddar Jonas bakom trummorna från spontan förbränning under 12-takters solon.
            </p>
          </div>
          <div class="mt-4 pt-3 border-t border-base-content/10 text-[11px] font-mono text-secondary">
            Effekt: 45 Watt ren svalka
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
