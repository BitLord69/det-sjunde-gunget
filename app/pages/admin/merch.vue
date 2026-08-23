<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
})

useSeoMeta({
  title: 'Merch & Spreadshop-synk | Det 7:e Gunget Admin',
})

const toastMessage = ref('')

const showToast = (msg: string) => {
  toastMessage.value = msg
  setTimeout(() => {
    toastMessage.value = ''
  }, 4000)
}

const { data: merchData, refresh: refreshMerch } = await useFetch<any[]>('/api/merch', {
  default: () => [],
})

const { data: adminSettings, refresh: refreshSettings } = await useFetch<{
  lastMerchSync?: number
  landingMerchCount?: number
}>('/api/admin/settings')

const isSyncingMerch = ref(false)
const triggerMerchSync = async () => {
  isSyncingMerch.value = true
  try {
    const res = await $fetch<{ success: boolean; count: number }>('/api/cron/sync-merch')
    await refreshMerch()
    await refreshSettings()
    showToast(`✓ Synkronisering klar! ${res.count || 0} artiklar uppdaterade.`)
  } catch (err: any) {
    showToast(`⚠️ Synkronisering misslyckades: ${err?.data?.message || err?.message || 'Fel'}`)
  } finally {
    isSyncingMerch.value = false
  }
}

const formatSyncTimestamp = (ts?: number | null) => {
  if (!ts) return 'Aldrig synkad'
  return new Date(ts).toLocaleString('sv-SE', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-6 pt-3 pb-10 lg:px-10 space-y-6 font-sans">
    <!-- Toast Notification -->
    <div
      v-if="toastMessage"
      class="fixed bottom-6 right-6 z-50 bg-secondary text-secondary-content px-6 py-3 rounded-xl font-bold shadow-2xl animate-bounce flex items-center gap-2"
    >
      <span>{{ toastMessage }}</span>
    </div>

    <!-- CMS Tab Navigation -->
    <AdminNavBar />

    <!-- MERCH & SPREADSHOP MANAGER -->
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="font-heading text-2xl text-primary font-bold">Band-merch & Spreadshop-synk</h2>
          <p class="text-xs text-base-content/70">
            Artiklar cachas säkert i databasen för blixtsnabb visning och synkas automatiskt 1 gång/dygn via Vercel Cron.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <a
            href="https://det-7e-gunget.myspreadshop.se/"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-outline btn-primary btn-sm rounded-full font-bold flex items-center gap-1.5"
          >
            <span>Öppna Spreadshop</span>
            <span>↗</span>
          </a>
        </div>
      </div>

      <!-- Sync Card with Status and Manual Trigger -->
      <div class="stage-card p-5 sm:p-6 rounded-2xl border border-primary/30 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6 bg-base-200/60">
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <span class="text-xl">🔄</span>
            <h3 class="font-heading text-lg text-primary font-bold">
              Spreadshop Databassynkronisering
            </h3>
          </div>
          <p class="text-xs text-base-content/75 leading-relaxed max-w-xl">
            Hämtar alla artiklar och deras namn på svenska och engelska direkt från Spreadshops katalog till databasen.
          </p>
          <div class="flex flex-wrap items-center gap-3 text-xs font-mono pt-1">
            <span class="badge badge-sm badge-neutral border border-primary/30">
              🕒 Senast synkad: {{ formatSyncTimestamp((adminSettings as any)?.lastMerchSync) }}
            </span>
            <span class="badge badge-sm badge-neutral border border-primary/30">
              📦 Totalt i databasen: {{ merchData?.length || 0 }} st
            </span>
            <span class="badge badge-sm badge-primary/20 text-primary font-bold">
              ⚡ Schemalagd: 1 gång/dygn (Vercel Cron)
            </span>
          </div>
        </div>

        <button
          type="button"
          class="btn btn-primary rounded-full font-bold px-6 flex items-center gap-2 shadow-md hover:scale-105 transition-transform flex-shrink-0 cursor-pointer"
          :class="isSyncingMerch ? 'loading' : ''"
          :disabled="isSyncingMerch"
          @click="triggerMerchSync"
        >
          <span v-if="!isSyncingMerch">🔄</span>
          <span>{{ isSyncingMerch ? 'Synkar från butiken...' : 'Synka Merch Nu' }}</span>
        </button>
      </div>

      <!-- Merch Products Catalog Grid in Database -->
      <div>
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-heading text-lg text-primary font-bold">
            Synkade artiklar i databasen ({{ merchData?.length || 0 }})
          </h3>
          <span class="text-xs text-base-content/60 font-mono">
            Klick öppnar produkten i Spreadshop
          </span>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div
            v-for="item in merchData || []"
            :key="item.id"
            class="stage-card p-3 rounded-xl border border-primary/20 flex flex-col justify-between group hover:border-primary/50 transition-all shadow"
          >
            <div>
              <div class="aspect-square bg-black/40 rounded-lg overflow-hidden flex items-center justify-center p-2 mb-2">
                <NuxtImg
                  :src="item.image"
                  :alt="item.typeSv"
                  class="w-full h-full object-contain group-hover:scale-105 transition-transform"
                  loading="lazy"
                />
              </div>
              <div class="space-y-1.5 mt-1">
                <!-- Category badge -->
                <div v-if="item.categorySv" class="flex items-center gap-1">
                  <span class="badge badge-xs badge-outline border-secondary/40 text-secondary font-mono text-[9px] font-bold px-1.5 py-0.5">
                    📁 {{ item.categorySv }}
                  </span>
                </div>

                <div class="flex items-start gap-1.5">
                  <span class="badge badge-xs badge-primary font-mono text-[9px] font-black px-1.5 py-0.5 mt-0.5 flex-shrink-0">SV</span>
                  <span class="font-heading text-xs text-primary font-bold line-clamp-2 leading-snug" :title="item.typeSv">
                    {{ item.typeSv }}
                  </span>
                </div>
                <div class="flex items-start gap-1.5">
                  <span class="badge badge-xs badge-neutral border border-primary/30 font-mono text-[9px] font-bold px-1.5 py-0.5 mt-0.5 flex-shrink-0 text-secondary">EN</span>
                  <span class="text-[10px] text-base-content/75 line-clamp-2 leading-snug" :title="item.typeEn">
                    {{ item.typeEn }}
                  </span>
                </div>
              </div>
            </div>

            <div class="pt-2 mt-2 border-t border-primary/10 flex items-center justify-between gap-1">
              <span class="font-mono text-xs font-bold text-amber-300">{{ item.price }}</span>
              <a
                :href="item.url"
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-ghost btn-xs text-primary hover:text-amber-300 px-1.5 font-mono text-[10px]"
                title="Öppna produkt i Spreadshop"
              >
                Öppna ↗
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
