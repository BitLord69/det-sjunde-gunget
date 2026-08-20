<script setup lang="ts">
const { locale } = useI18n()

const { data: settingsData, refresh: refreshSettings } = await useFetch<any>('/api/settings', {
  default: () => ({ landingMerchCount: 4 }),
})

const { data: products, refresh: refreshProducts } = await useFetch<any[]>('/api/merch', {
  default: () => [],
})

onMounted(() => {
  refreshSettings()
  refreshProducts()
})

const landingMerchCount = computed(() => {
  return Number(settingsData.value?.landingMerchCount) || 4
})

const displayedProducts = computed(() => {
  return (products.value || []).slice(0, landingMerchCount.value)
})
</script>

<template>
  <section id="merch" class="mx-auto max-w-7xl px-6 lg:px-10 scroll-mt-24">
    <!-- Compact Section Header -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-3 border-b border-primary/20 gap-4">
      <div>
        <span class="text-xs font-bold uppercase tracking-[0.25em] text-secondary">
          👕 {{ locale === 'en' ? 'Official Merch' : 'Officiell Band-Merch' }}
        </span>
        <h2 class="text-2xl sm:text-4xl font-heading text-primary mt-1 text-gritty">
          {{ locale === 'en' ? 'Geared for the Blues' : 'Kittad för bluesen' }}
        </h2>
      </div>

      <div>
        <a
          href="https://det-7e-gunget.myspreadshop.se"
          target="_blank"
          rel="noopener noreferrer"
          class="btn btn-outline btn-primary btn-sm rounded-full font-bold flex items-center gap-1.5 hover:scale-105 transition-transform"
        >
          <span>{{ locale === 'en' ? 'Visit Spreadshop' : 'Besök hela butiken' }}</span>
          <span>↗</span>
        </a>
      </div>
    </div>

    <!-- Dynamic Single-Row Grid of Products (Always exactly 1 row on desktop/tablet) -->
    <div class="grid grid-cols-2 sm:grid-flow-col sm:auto-cols-fr gap-3.5 lg:gap-4 w-full overflow-hidden">
      <div
        v-for="item in displayedProducts"
        :key="item.id"
        class="stage-card rounded-xl overflow-hidden border border-primary/20 flex flex-col justify-between group transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 shadow-lg"
      >
        <!-- Product Photo from Spreadshop CDN with Direct Deep Link -->
        <a
          :href="item.url"
          target="_blank"
          rel="noopener noreferrer"
          class="relative overflow-hidden aspect-square bg-[#1a1614] flex items-center justify-center p-2 block cursor-pointer"
        >
          <NuxtImg
            :src="item.image"
            :alt="locale === 'en' ? item.typeEn : item.typeSv"
            class="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <!-- Price pill -->
          <div class="absolute bottom-2 right-2 bg-black/85 backdrop-blur-sm text-primary font-mono font-bold text-[11px] px-2 py-0.5 rounded border border-primary/30 shadow">
            {{ item.price }}
          </div>
        </a>

        <!-- Product Info & Direct Shop Button -->
        <div class="p-2.5 sm:p-3 flex items-center justify-between gap-1.5 border-t border-primary/10 bg-base-200/40">
          <div class="truncate pr-0.5 min-w-0">
            <span
              v-if="item.categorySv"
              class="inline-block text-[8px] sm:text-[9px] font-mono font-bold uppercase tracking-wider text-secondary/90 mb-0.5 truncate block"
            >
              {{ locale === 'en' ? item.categoryEn : item.categorySv }}
            </span>
            <h3 class="font-heading text-xs sm:text-sm text-primary font-bold truncate" :title="locale === 'en' ? item.typeEn : item.typeSv">
              {{ locale === 'en' ? item.typeEn : item.typeSv }}
            </h3>
            <span class="text-[9px] text-base-content/60 block font-mono truncate">Spreadshop</span>
          </div>

          <a
            :href="item.url"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-xs btn-primary font-bold rounded-full px-2.5 flex-shrink-0 text-[11px]"
            title="Köp på Spreadshop"
          >
            <span>{{ locale === 'en' ? 'Buy' : 'Köp' }}</span>
            <span>↗</span>
          </a>
        </div>
      </div>
    </div>
  </section>
</template>
