<script setup lang="ts">
const { locale } = useI18n()

const { data: products } = await useFetch<any[]>('/api/merch', {
  default: () => [],
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

    <!-- Single Compact Row of Real Products (4 items) -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-5">
      <div
        v-for="item in (products || []).slice(0, 4)"
        :key="item.id"
        class="stage-card rounded-xl overflow-hidden border border-primary/20 flex flex-col justify-between group transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 shadow-lg"
      >
        <!-- Product Photo from Spreadshop CDN -->
        <div class="relative overflow-hidden aspect-square bg-[#1a1614] flex items-center justify-center p-2">
          <NuxtImg
            :src="item.image"
            :alt="locale === 'en' ? item.typeEn : item.typeSv"
            class="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <!-- Price pill -->
          <div class="absolute bottom-2.5 right-2.5 bg-black/85 backdrop-blur-sm text-primary font-mono font-bold text-xs px-2.5 py-0.5 rounded border border-primary/30 shadow">
            {{ item.price }}
          </div>
        </div>

        <!-- Product Info & Direct Shop Button -->
        <div class="p-3.5 flex items-center justify-between gap-2 border-t border-primary/10 bg-base-200/40">
          <div class="truncate">
            <h3 class="font-heading text-sm text-primary font-bold truncate">
              {{ locale === 'en' ? item.typeEn : item.typeSv }}
            </h3>
            <span class="text-[10px] text-base-content/60 block font-mono">Spreadshop</span>
          </div>

          <a
            :href="item.url"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-xs btn-primary font-bold rounded-full px-3 flex-shrink-0"
          >
            <span>{{ locale === 'en' ? 'Buy' : 'Köp' }}</span>
            <span>↗</span>
          </a>
        </div>
      </div>
    </div>
  </section>
</template>
