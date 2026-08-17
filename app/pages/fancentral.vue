<script setup lang="ts">
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
    <div class="space-y-4 max-w-3xl">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/15 text-secondary text-xs font-bold uppercase tracking-widest">
        <span>💨</span> Humorsektionen
      </div>
      <h1 class="font-heading text-4xl sm:text-6xl text-primary text-gritty">
        Fan Central
      </h1>
      <p class="text-base sm:text-lg text-base-content/80 leading-relaxed font-normal">
        Vi älskar våra fans i publiken som sjunger med i refrängerna. Och vi älskar de elektriska bordsfläktarna som räddar oss från värmeslag på scenen. Här hyllar vi båda med samma kärlek.
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
        Alla fans (båda sorterna)
      </button>
      <button
        type="button"
        class="px-4 py-2 rounded-full transition-all"
        :class="fanFilter === 'people' ? 'bg-secondary text-secondary-content font-black shadow' : 'bg-base-200 text-base-content/70 hover:text-primary'"
        @click="fanFilter = 'people'"
      >
        👥 Mänskliga fans
      </button>
      <button
        type="button"
        class="px-4 py-2 rounded-full transition-all"
        :class="fanFilter === 'appliances' ? 'bg-secondary text-secondary-content font-black shadow' : 'bg-base-200 text-base-content/70 hover:text-primary'"
        @click="fanFilter = 'appliances'"
      >
        🌀 Elektriska bordsfläktar
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
          <div class="frame-polaroid mb-6">
            <NuxtImg
              src="/media/fan-central/5B0EBD96-EAC2-4554-B7AF-433307968BD0.webp"
              alt="Troget publikfan"
              class="w-full aspect-[4/3] object-cover rounded"
            />
            <div class="text-center font-heading text-xs font-bold text-neutral mt-2">
              Publikfavorit #1
            </div>
          </div>

          <h2 class="font-heading text-2xl text-primary font-bold">Det mänskliga fanet</h2>
          <p class="text-sm text-base-content/80 mt-2 leading-relaxed">
            Står längst fram vid scenkanten, klappar i takt och kan texten till låtar vi själva glömt bort. En ovärderlig del av konsertupplevelsen.
          </p>

          <div class="mt-6 space-y-1 text-xs font-mono text-base-content/70 pt-4 border-t border-base-content/10">
            <p><span class="text-secondary font-bold">Kännetecken:</span> Ler stort, håller i en öl, sjunger med</p>
            <p><span class="text-secondary font-bold">Favoritlåt:</span> Allt med munspelssolo</p>
          </div>
        </div>

        <div class="mt-6 pt-4 border-t border-base-content/10 text-xs font-bold text-accent">
          ✓ Status: 100% gung-ackrediterad
        </div>
      </div>

      <!-- Appliance Fan Card -->
      <div
        v-if="fanFilter === 'all' || fanFilter === 'appliances'"
        class="stage-card p-6 sm:p-8 rounded-2xl flex flex-col justify-between border border-secondary/40 shadow-xl"
      >
        <div>
          <div class="frame-taped mb-6">
            <NuxtImg
              src="/media/fan-central/fanpic.png"
              alt="Elektrisk bordsfläkt på scen"
              class="w-full aspect-[4/3] object-cover rounded"
            />
            <div class="text-center font-mono text-xs font-bold text-secondary mt-2">
              Modell: Andersson 45W
            </div>
          </div>

          <h2 class="font-heading text-2xl text-secondary font-bold">Det elektriska fanet</h2>
          <p class="text-sm text-base-content/80 mt-2 leading-relaxed">
            Oscillerande rörelse, 3 hastigheter. Utan denna trogna maskin bakom trumsetet hade Jonas förvandlats till ånga redan under andra låten.
          </p>

          <div class="mt-6 space-y-1 text-xs font-mono text-base-content/70 pt-4 border-t border-base-content/10">
            <p><span class="text-secondary font-bold">Effekt:</span> 45 Watt ren svalka</p>
            <p><span class="text-secondary font-bold">Bästa egenskap:</span> Kliffri luftström i 120 bpm</p>
          </div>
        </div>

        <div class="mt-6 pt-4 border-t border-base-content/10 text-xs font-bold text-secondary">
          ⚡ Energiklass: A+ för sväng
        </div>
      </div>
    </div>
  </div>
</template>
