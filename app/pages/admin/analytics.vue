<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
})

useSeoMeta({
  title: 'Besöksstatistik & Publikpuls | Det 7:e Gunget Admin',
})

const selectedRange = ref<'today' | '7d' | '30d' | '90d' | 'all'>('30d')
const copyToast = ref('')

const showCopyToast = (msg: string) => {
  copyToast.value = msg
  setTimeout(() => {
    copyToast.value = ''
  }, 3000)
}

interface AnalyticsDashboardResponse {
  range: string
  summary: {
    liveVisitorsNow: number
    uniqueVisitors: number
    prevUniqueVisitors: number
    visitorsGrowthPct: number | null
    pageviews: number
    prevPageviews: number
    pageviewsGrowthPct: number | null
    jukeboxPlays: number
    lyricsViews: number
    gigInteractions: number
    epkInteractions: number
    merchClicks: number
    videoPlays: number
    easterEggTriggers: number
  }
  dailySeries: Array<{
    date: string
    label: string
    pageviews: number
    uniqueVisitors: number
    jukeboxPlays: number
    epkDownloads: number
    gigsOnDay: Array<{ venue: string; city: string }>
  }>
  topPages: Array<{
    path: string
    label: string
    views: number
    uniqueVisitors: number
    pct: number
  }>
  referrers: Array<{
    source: string
    count: number
    pct: number
  }>
  campaigns: Array<{
    campaign: string
    count: number
    pct: number
  }>
  locations: {
    cities: Array<{ city: string; country: string; countryLabel: string; count: number; pct: number }>
    countries: Array<{ code: string; label: string; count: number; pct: number }>
  }
  devices: {
    deviceTypes: Array<{ type: string; label: string; count: number; pct: number }>
    os: Array<{ name: string; count: number; pct: number }>
    browsers: Array<{ name: string; count: number; pct: number }>
    locales: Array<{ locale: string; label: string; count: number; pct: number }>
  }
  bandTelemetry: {
    topSongs: Array<{ id: string; title: string; plays: number; lyricsViews: number; total: number }>
    topGigs: Array<{
      id: string
      label: string
      ticketClicks: number
      calendarExports: number
      posterViews: number
      total: number
    }>
    topMerch: Array<{ id: string; label: string; clicks: number }>
    topVideos: Array<{ id: string; label: string; plays: number }>
    organizerRadar: Array<{
      id: string
      eventType: string
      label: string
      city: string
      country: string
      deviceType: string
      createdAt: string | number
    }>
  }
}

const {
  data: analytics,
  status,
  refresh,
} = await useFetch<AnalyticsDashboardResponse>('/api/admin/analytics', {
  query: {
    range: selectedRange,
  },
  headers: { 'Cache-Control': 'no-cache' },
  watch: [selectedRange],
})

const isLoading = computed(() => status.value === 'pending')

const rangeOptions: Array<{ key: 'today' | '7d' | '30d' | '90d' | 'all'; label: string }> = [
  { key: 'today', label: 'Idag (24h)' },
  { key: '7d', label: '7 dagar' },
  { key: '30d', label: '30 dagar' },
  { key: '90d', label: '90 dagar' },
  { key: 'all', label: 'All tid' },
]

// Chart max value for scaling bars
const maxDailyViews = computed(() => {
  const series = analytics.value?.dailySeries || []
  if (!series.length) return 10
  const m = Math.max(...series.map((d) => Math.max(d.pageviews || 0, d.uniqueVisitors || 0)))
  return Math.max(m, 5)
})

const formatRelativeTime = (ts: string | number | Date) => {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleString('sv-SE', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Campaign Link Generator
const campaignPage = ref('/gigs')
const campaignRef = ref('poster')

const generatedCampaignUrl = computed(() => {
  const cleanPage = campaignPage.value.startsWith('/') ? campaignPage.value : `/${campaignPage.value}`
  const cleanRef = (campaignRef.value || 'poster').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
  return `https://sjundegunget.se${cleanPage === '/' ? '' : cleanPage}?ref=${cleanRef || 'poster'}`
})

const copyCampaignUrl = async () => {
  if (!import.meta.client) return
  try {
    await navigator.clipboard.writeText(generatedCampaignUrl.value)
    showCopyToast('✓ Spårningslänk kopierad till urklipp!')
  } catch {
    showCopyToast('⚠️ Kunde inte kopiera automatiskt')
  }
}
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 sm:px-6 pb-20 space-y-6">
    <AdminNavBar />

    <!-- Toast notification -->
    <div
      v-if="copyToast"
      class="fixed bottom-6 right-6 z-50 bg-primary text-primary-content px-5 py-3 rounded-2xl shadow-2xl font-bold text-xs sm:text-sm animate-bounce"
    >
      {{ copyToast }}
    </div>

    <!-- Header & Range Filter -->
    <div class="stage-card p-5 sm:p-7 rounded-3xl border border-primary/30 bg-gradient-to-br from-base-200 via-base-100 to-base-200 shadow-xl">
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div class="space-y-1.5">
          <div class="flex items-center gap-2.5 flex-wrap">
            <span class="badge badge-primary font-mono text-xs uppercase tracking-widest px-3 py-2 font-bold">
              📊 Stage & Publik-telemetri
            </span>
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{{ analytics?.summary?.liveVisitorsNow || 0 }} live i publiken nu</span>
            </span>
            <span class="badge badge-outline badge-secondary text-[10px] font-mono">
              🛡️ Endast publik trafik (Admins & botar exkluderade)
            </span>
          </div>
          <h1 class="font-heading text-2xl sm:text-3xl font-bold text-primary">
            Besöksstatistik & Publikpuls
          </h1>
          <p class="text-xs sm:text-sm text-base-content/75 max-w-2xl">
            100 % egen förstapartsstatistik för de publika sidorna – helt utan tredjepartskakor eller adblock-bortfall. Se vilka sidor, städer, låtar och spelningar som engagerar mest.
          </p>
        </div>

        <!-- Time Range Selector & Refresh -->
        <div class="flex items-center gap-2 flex-wrap">
          <div class="flex items-center bg-base-300/80 p-1 rounded-2xl border border-primary/20">
            <button
              v-for="opt in rangeOptions"
              :key="opt.key"
              type="button"
              class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
              :class="
                selectedRange === opt.key
                  ? 'bg-primary text-primary-content shadow-sm'
                  : 'text-base-content/70 hover:text-primary'
              "
              @click="selectedRange = opt.key"
            >
              {{ opt.label }}
            </button>
          </div>
          <button
            type="button"
            class="btn btn-outline btn-primary btn-sm rounded-xl font-bold"
            :disabled="isLoading"
            title="Uppdatera statistik"
            @click="refresh()"
          >
            <span :class="isLoading ? 'animate-spin' : ''">🔄</span>
            <span class="hidden sm:inline">Uppdatera</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Row 1: Top KPI Cards (VU-Meter Style) -->
    <div class="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
      <!-- 1. Unique Visitors -->
      <div class="bg-base-200/70 p-4 sm:p-5 rounded-2xl border border-primary/25 shadow-md flex flex-col justify-between">
        <div class="flex items-center justify-between text-xs text-base-content/70 font-mono uppercase">
          <span>Unika besökare</span>
          <span class="text-lg">👥</span>
        </div>
        <div class="my-2">
          <div class="font-heading text-2xl sm:text-3xl font-black text-primary">
            {{ analytics?.summary?.uniqueVisitors ?? 0 }}
          </div>
        </div>
        <div class="text-[11px] font-mono flex items-center gap-1.5">
          <template v-if="analytics?.summary?.visitorsGrowthPct !== null && analytics?.summary?.visitorsGrowthPct !== undefined">
            <span
              class="font-bold"
              :class="analytics.summary.visitorsGrowthPct >= 0 ? 'text-emerald-400' : 'text-rose-400'"
            >
              {{ analytics.summary.visitorsGrowthPct >= 0 ? `+${analytics.summary.visitorsGrowthPct}%` : `${analytics.summary.visitorsGrowthPct}%` }}
            </span>
            <span class="text-base-content/50">mot föreg. period</span>
          </template>
          <span v-else class="text-base-content/50">Daglig anonym hash</span>
        </div>
      </div>

      <!-- 2. Pageviews -->
      <div class="bg-base-200/70 p-4 sm:p-5 rounded-2xl border border-primary/25 shadow-md flex flex-col justify-between">
        <div class="flex items-center justify-between text-xs text-base-content/70 font-mono uppercase">
          <span>Sidvisningar</span>
          <span class="text-lg">📄</span>
        </div>
        <div class="my-2">
          <div class="font-heading text-2xl sm:text-3xl font-black text-primary">
            {{ analytics?.summary?.pageviews ?? 0 }}
          </div>
        </div>
        <div class="text-[11px] font-mono flex items-center gap-1.5">
          <template v-if="analytics?.summary?.pageviewsGrowthPct !== null && analytics?.summary?.pageviewsGrowthPct !== undefined">
            <span
              class="font-bold"
              :class="analytics.summary.pageviewsGrowthPct >= 0 ? 'text-emerald-400' : 'text-rose-400'"
            >
              {{ analytics.summary.pageviewsGrowthPct >= 0 ? `+${analytics.summary.pageviewsGrowthPct}%` : `${analytics.summary.pageviewsGrowthPct}%` }}
            </span>
            <span class="text-base-content/50">mot föreg. period</span>
          </template>
          <span v-else class="text-base-content/50">Publika sidor</span>
        </div>
      </div>

      <!-- 3. Jukebox Plays -->
      <div class="bg-base-200/70 p-4 sm:p-5 rounded-2xl border border-primary/25 shadow-md flex flex-col justify-between">
        <div class="flex items-center justify-between text-xs text-base-content/70 font-mono uppercase">
          <span>Jukebox-spelningar</span>
          <span class="text-lg">📻</span>
        </div>
        <div class="my-2">
          <div class="font-heading text-2xl sm:text-3xl font-black text-secondary">
            {{ analytics?.summary?.jukeboxPlays ?? 0 }}
          </div>
        </div>
        <div class="text-[11px] font-mono text-base-content/60">
          🎤 {{ analytics?.summary?.lyricsViews ?? 0 }} text-/karaokevisningar
        </div>
      </div>

      <!-- 4. Gig & Ticket Interest -->
      <div class="bg-base-200/70 p-4 sm:p-5 rounded-2xl border border-primary/25 shadow-md flex flex-col justify-between">
        <div class="flex items-center justify-between text-xs text-base-content/70 font-mono uppercase">
          <span>Gig- & Biljettklick</span>
          <span class="text-lg">🎟️</span>
        </div>
        <div class="my-2">
          <div class="font-heading text-2xl sm:text-3xl font-black text-amber-400">
            {{ analytics?.summary?.gigInteractions ?? 0 }}
          </div>
        </div>
        <div class="text-[11px] font-mono text-base-content/60">
          Biljetter, kalender & affischer
        </div>
      </div>

      <!-- 5. Organizer EPK & Easter Eggs -->
      <div class="col-span-2 lg:col-span-1 bg-base-200/70 p-4 sm:p-5 rounded-2xl border border-primary/25 shadow-md flex flex-col justify-between">
        <div class="flex items-center justify-between text-xs text-base-content/70 font-mono uppercase">
          <span>Presskit & Påskägg</span>
          <span class="text-lg">💼</span>
        </div>
        <div class="my-2 flex items-baseline gap-2">
          <span class="font-heading text-2xl sm:text-3xl font-black text-emerald-400">
            {{ analytics?.summary?.epkInteractions ?? 0 }}
          </span>
          <span class="text-xs text-base-content/60 font-mono">EPK-laddningar</span>
        </div>
        <div class="text-[11px] font-mono text-base-content/60">
          🎶 {{ analytics?.summary?.easterEggTriggers ?? 0 }} Blues Harp-jam • 👕 {{ analytics?.summary?.merchClicks ?? 0 }} merch
        </div>
      </div>
    </div>

    <!-- Row 2: Daily Traffic & Gig Timeline Chart -->
    <div class="bg-base-200/60 p-5 sm:p-6 rounded-3xl border border-primary/25 shadow-lg space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-primary/15 pb-3">
        <div>
          <h2 class="font-heading text-lg sm:text-xl font-bold text-primary flex items-center gap-2">
            <span>📈</span>
            <span>Trafik- & Konsertpuls dag för dag</span>
          </h2>
          <p class="text-xs text-base-content/65">
            Staplarna visar sidvisningar och unika besökare. Dagar med inbokade spelningar är markerade med 🎸.
          </p>
        </div>
        <div class="flex items-center gap-4 text-xs font-mono">
          <span class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-xs bg-primary inline-block" />
            <span>Sidvisningar</span>
          </span>
          <span class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-xs bg-secondary/80 inline-block" />
            <span>Unika besökare</span>
          </span>
          <span class="flex items-center gap-1">
            <span>🎸</span>
            <span>Speldag</span>
          </span>
        </div>
      </div>

      <div v-if="analytics?.dailySeries?.length" class="pt-4">
        <div class="h-52 flex items-end gap-1 sm:gap-1.5 overflow-x-auto pb-2 px-1">
          <div
            v-for="day in analytics.dailySeries"
            :key="day.date"
            class="flex-1 min-w-[20px] h-full flex flex-col justify-end items-center group relative"
          >
            <!-- Tooltip on hover -->
            <div class="opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity absolute -top-2 z-20 -translate-y-full bg-base-300 border border-primary/40 text-base-content px-2.5 py-1.5 rounded-xl shadow-xl text-[10px] font-mono whitespace-nowrap">
              <div class="font-bold text-primary">{{ day.date }} ({{ day.label }})</div>
              <div>👥 Unika: {{ day.uniqueVisitors }} • 📄 Visningar: {{ day.pageviews }}</div>
              <div v-if="day.jukeboxPlays">📻 Jukebox: {{ day.jukeboxPlays }} spelningar</div>
              <div v-for="(g, gIdx) in day.gigsOnDay" :key="gIdx" class="text-amber-400 font-bold">
                🎸 Gig: {{ g.venue }} ({{ g.city }})
              </div>
            </div>

            <!-- Gig Marker Icon above bar if concert on this day -->
            <div
              v-if="day.gigsOnDay && day.gigsOnDay.length > 0"
              class="text-xs mb-1 animate-bounce"
              :title="`Spelning: ${day.gigsOnDay.map((g) => g.venue).join(', ')}`"
            >
              🎸
            </div>

            <!-- Dual Bar Stack -->
            <div class="w-full flex items-end justify-center gap-0.5 h-36">
              <!-- Pageviews bar -->
              <div
                class="w-1/2 max-w-[14px] rounded-t-md transition-all duration-300"
                :class="day.gigsOnDay?.length ? 'bg-amber-400 shadow-sm shadow-amber-400/50' : 'bg-primary/85 group-hover:bg-primary'"
                :style="{ height: `${Math.max(4, Math.round((day.pageviews / maxDailyViews) * 100))}%` }"
              />
              <!-- Unique visitors bar -->
              <div
                class="w-1/2 max-w-[14px] rounded-t-md bg-secondary/75 group-hover:bg-secondary transition-all duration-300"
                :style="{ height: `${Math.max(4, Math.round((day.uniqueVisitors / maxDailyViews) * 100))}%` }"
              />
            </div>

            <!-- X-axis Date Label -->
            <span class="text-[9px] font-mono text-base-content/55 mt-1.5 truncate max-w-full">
              {{ day.label }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Row 3: Top Public Pages & Traffic Sources / Campaigns -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <!-- Top Pages -->
      <div class="bg-base-200/60 p-5 rounded-3xl border border-primary/25 shadow-md space-y-3.5">
        <div class="flex items-center justify-between border-b border-primary/15 pb-2.5">
          <h3 class="font-heading text-base sm:text-lg font-bold text-primary flex items-center gap-2">
            <span>📄</span>
            <span>Populäraste Publika Sidorna</span>
          </h3>
          <span class="text-[11px] font-mono text-base-content/60">Visningar (Unika)</span>
        </div>

        <div v-if="analytics?.topPages?.length" class="space-y-2.5">
          <div
            v-for="page in analytics.topPages"
            :key="page.path"
            class="space-y-1"
          >
            <div class="flex items-center justify-between text-xs">
              <div class="flex items-center gap-2 min-w-0">
                <span class="font-bold text-base-content truncate">{{ page.label }}</span>
                <span class="font-mono text-[10px] text-secondary opacity-75">{{ page.path }}</span>
              </div>
              <div class="font-mono font-bold text-primary flex-shrink-0">
                {{ page.views }} <span class="text-base-content/50 font-normal">({{ page.uniqueVisitors }})</span>
              </div>
            </div>
            <div class="w-full h-2 bg-base-300 rounded-full overflow-hidden">
              <div
                class="h-full bg-primary rounded-full transition-all duration-500"
                :style="{ width: `${Math.max(4, page.pct)}%` }"
              />
            </div>
          </div>
        </div>
        <div v-else class="text-xs text-base-content/50 italic py-6 text-center">
          Inga publika sidvisningar registrerade för vald period ännu. Öppna den publika sajten i ett inkognitofönster för att testa!
        </div>
      </div>

      <!-- Traffic Sources & Campaigns -->
      <div class="bg-base-200/60 p-5 rounded-3xl border border-primary/25 shadow-md space-y-3.5">
        <div class="flex items-center justify-between border-b border-primary/15 pb-2.5">
          <h3 class="font-heading text-base sm:text-lg font-bold text-primary flex items-center gap-2">
            <span>🌐</span>
            <span>Trafikkällor & Kampanjer</span>
          </h3>
          <span class="text-[11px] font-mono text-base-content/60">Andel</span>
        </div>

        <div v-if="analytics?.referrers?.length" class="space-y-2.5">
          <div
            v-for="refItem in analytics.referrers"
            :key="refItem.source"
            class="space-y-1"
          >
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-base-content">{{ refItem.source }}</span>
              <span class="font-mono font-bold text-secondary">
                {{ refItem.count }} ({{ refItem.pct }}%)
              </span>
            </div>
            <div class="w-full h-2 bg-base-300 rounded-full overflow-hidden">
              <div
                class="h-full bg-secondary rounded-full transition-all duration-500"
                :style="{ width: `${Math.max(4, refItem.pct)}%` }"
              />
            </div>
          </div>

          <!-- Active Campaign Tags (?ref=...) -->
          <div v-if="analytics?.campaigns?.length" class="pt-3 border-t border-primary/15 space-y-1.5">
            <span class="text-[11px] font-mono font-bold text-primary uppercase tracking-wider block">
              Spårade Kampanjtaggar (?ref=):
            </span>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="c in analytics.campaigns"
                :key="c.campaign"
                class="badge badge-sm badge-outline border-primary/40 font-mono text-xs gap-1.5 py-2.5 px-3"
              >
                <span class="text-primary font-bold">?ref={{ c.campaign }}</span>
                <span class="opacity-75">• {{ c.count }} träffar</span>
              </span>
            </div>
          </div>
        </div>
        <div v-else class="text-xs text-base-content/50 italic py-6 text-center">
          Inga trafikkällor registrerade under vald period ännu.
        </div>
      </div>
    </div>

    <!-- Row 4: Geography (Cities & Countries) + Devices & Languages -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <!-- Geography: Cities & Countries -->
      <div class="bg-base-200/60 p-5 rounded-3xl border border-primary/25 shadow-md space-y-4">
        <div class="flex items-center justify-between border-b border-primary/15 pb-2.5">
          <h3 class="font-heading text-base sm:text-lg font-bold text-primary flex items-center gap-2">
            <span>📍</span>
            <span>Geografi – Städer & Länder</span>
          </h3>
          <span class="text-[11px] font-mono text-base-content/60">Via Vercel Edge</span>
        </div>

        <div v-if="analytics?.locations?.cities?.length" class="space-y-4">
          <div class="space-y-2">
            <span class="text-[11px] font-mono uppercase text-secondary font-bold">Toppstäder / Orter:</span>
            <div
              v-for="cityItem in analytics.locations.cities"
              :key="`${cityItem.city}-${cityItem.country}`"
              class="flex items-center justify-between text-xs bg-base-300/50 px-3 py-2 rounded-xl border border-primary/10"
            >
              <div class="flex items-center gap-2">
                <span class="font-bold text-base-content">{{ cityItem.city }}</span>
                <span class="text-[10px] opacity-65">{{ cityItem.countryLabel }}</span>
              </div>
              <span class="font-mono font-bold text-primary">{{ cityItem.count }} ({{ cityItem.pct }}%)</span>
            </div>
          </div>

          <div v-if="analytics?.locations?.countries?.length" class="pt-2 border-t border-primary/15 space-y-1.5">
            <span class="text-[11px] font-mono uppercase text-secondary font-bold block">Länder:</span>
            <div class="flex flex-wrap gap-2">
              <div
                v-for="c in analytics.locations.countries"
                :key="c.code"
                class="px-3 py-1.5 rounded-xl bg-base-300/60 border border-primary/15 text-xs flex items-center gap-2 font-mono"
              >
                <span class="font-bold">{{ c.label }}</span>
                <span class="text-primary font-bold">{{ c.count }} ({{ c.pct }}%)</span>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="text-xs text-base-content/50 italic py-6 text-center">
          Ingen geografisk data registrerad för vald period ännu.
        </div>
      </div>

      <!-- Devices, OS, Browsers & Languages -->
      <div class="bg-base-200/60 p-5 rounded-3xl border border-primary/25 shadow-md space-y-4">
        <div class="flex items-center justify-between border-b border-primary/15 pb-2.5">
          <h3 class="font-heading text-base sm:text-lg font-bold text-primary flex items-center gap-2">
            <span>📱</span>
            <span>Enheter, System & Språk</span>
          </h3>
          <span class="text-[11px] font-mono text-base-content/60">Fördelning</span>
        </div>

        <div v-if="analytics?.devices?.deviceTypes?.length" class="space-y-4">
          <!-- Device Types -->
          <div class="grid grid-cols-3 gap-2">
            <div
              v-for="dev in analytics.devices.deviceTypes"
              :key="dev.type"
              class="bg-base-300/50 p-3 rounded-2xl border border-primary/15 text-center"
            >
              <div class="text-xs font-bold text-base-content/80 truncate">{{ dev.label }}</div>
              <div class="font-heading text-xl font-black text-primary mt-0.5">{{ dev.pct }}%</div>
              <div class="text-[10px] font-mono text-base-content/50">{{ dev.count }} visn.</div>
            </div>
          </div>

          <!-- Language Split (SV vs EN) -->
          <div class="space-y-1.5">
            <span class="text-[11px] font-mono uppercase text-secondary font-bold block">Språkval på sajten:</span>
            <div class="flex flex-wrap gap-2">
              <div
                v-for="loc in analytics.devices.locales"
                :key="loc.locale"
                class="px-3 py-1.5 rounded-xl bg-base-300/60 border border-primary/15 text-xs flex items-center gap-2 font-mono"
              >
                <span class="font-bold">{{ loc.label }}</span>
                <span class="text-primary font-bold">{{ loc.count }} ({{ loc.pct }}%)</span>
              </div>
            </div>
          </div>

          <!-- OS & Browsers -->
          <div class="grid grid-cols-2 gap-3 pt-2 border-t border-primary/15 text-xs">
            <div class="space-y-1">
              <span class="text-[10px] font-mono uppercase text-secondary font-bold block">Operativsystem:</span>
              <div
                v-for="osItem in analytics.devices.os"
                :key="osItem.name"
                class="flex items-center justify-between font-mono text-[11px]"
              >
                <span>{{ osItem.name }}</span>
                <span class="text-primary font-bold">{{ osItem.pct }}%</span>
              </div>
            </div>
            <div class="space-y-1">
              <span class="text-[10px] font-mono uppercase text-secondary font-bold block">Webbläsare:</span>
              <div
                v-for="brItem in analytics.devices.browsers"
                :key="brItem.name"
                class="flex items-center justify-between font-mono text-[11px]"
              >
                <span>{{ brItem.name }}</span>
                <span class="text-secondary font-bold">{{ brItem.pct }}%</span>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="text-xs text-base-content/50 italic py-6 text-center">
          Ingen enhetsdata registrerad för vald period ännu.
        </div>
      </div>
    </div>

    <!-- Row 5: Band Telemetry (Jukebox Top Songs, Gig Interest & Organizer Radar) -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <!-- 1. Jukebox Top Songs -->
      <div class="bg-base-200/60 p-5 rounded-3xl border border-primary/25 shadow-md space-y-3.5">
        <div class="flex items-center justify-between border-b border-primary/15 pb-2.5">
          <h3 class="font-heading text-base font-bold text-primary flex items-center gap-2">
            <span>🏆</span>
            <span>Jukebox-toppen</span>
          </h3>
          <span class="text-[10px] font-mono text-base-content/60">Spelningar</span>
        </div>

        <div v-if="analytics?.bandTelemetry?.topSongs?.length" class="space-y-2">
          <div
            v-for="(song, idx) in analytics.bandTelemetry.topSongs"
            :key="song.id"
            class="flex items-center justify-between p-2.5 rounded-xl bg-base-300/50 border border-primary/10 text-xs"
          >
            <div class="flex items-center gap-2 min-w-0">
              <span class="badge badge-xs badge-primary font-mono font-bold">{{ idx + 1 }}</span>
              <span class="font-bold truncate">{{ song.title }}</span>
            </div>
            <div class="font-mono text-right flex-shrink-0 ml-2">
              <span class="text-primary font-bold">▶ {{ song.plays }}</span>
              <span v-if="song.lyricsViews" class="text-[10px] text-base-content/60 ml-1.5">
                (🎤 {{ song.lyricsViews }})
              </span>
            </div>
          </div>
        </div>
        <div v-else class="text-xs text-base-content/50 italic py-6 text-center">
          Inga låtar spelade i Jukeboxen av publika besökare under perioden ännu.
        </div>
      </div>

      <!-- 2. Hottest Gigs -->
      <div class="bg-base-200/60 p-5 rounded-3xl border border-primary/25 shadow-md space-y-3.5">
        <div class="flex items-center justify-between border-b border-primary/15 pb-2.5">
          <h3 class="font-heading text-base font-bold text-primary flex items-center gap-2">
            <span>🎟️</span>
            <span>Hetaste Gigen</span>
          </h3>
          <span class="text-[10px] font-mono text-base-content/60">Interaktioner</span>
        </div>

        <div v-if="analytics?.bandTelemetry?.topGigs?.length" class="space-y-2">
          <div
            v-for="gigItem in analytics.bandTelemetry.topGigs"
            :key="gigItem.id"
            class="p-2.5 rounded-xl bg-base-300/50 border border-primary/10 text-xs space-y-1"
          >
            <div class="flex items-center justify-between font-bold">
              <span class="truncate text-primary">{{ gigItem.label }}</span>
              <span class="badge badge-xs badge-warning text-stone-900 font-mono font-bold">
                {{ gigItem.total }} totalt
              </span>
            </div>
            <div class="flex items-center gap-3 text-[10px] font-mono text-base-content/70">
              <span>🎫 Biljett: {{ gigItem.ticketClicks }}</span>
              <span>📅 Kalender: {{ gigItem.calendarExports }}</span>
              <span>🖼️ Affisch: {{ gigItem.posterViews }}</span>
            </div>
          </div>
        </div>
        <div v-else class="text-xs text-base-content/50 italic py-6 text-center">
          Inga biljettklick, kalenderexporter eller affischvisningar registrerade ännu.
        </div>
      </div>

      <!-- 3. Organizer Radar (EPK Downloads & Bio Copies) -->
      <div class="bg-base-200/60 p-5 rounded-3xl border border-primary/25 shadow-md space-y-3.5">
        <div class="flex items-center justify-between border-b border-primary/15 pb-2.5">
          <h3 class="font-heading text-base font-bold text-emerald-400 flex items-center gap-2">
            <span>💼</span>
            <span>Arrangörsradar (/epk)</span>
          </h3>
          <span class="text-[10px] font-mono text-base-content/60">Senaste händelser</span>
        </div>

        <div v-if="analytics?.bandTelemetry?.organizerRadar?.length" class="space-y-2 max-h-64 overflow-y-auto pr-1">
          <div
            v-for="item in analytics.bandTelemetry.organizerRadar"
            :key="item.id"
            class="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs space-y-0.5"
          >
            <div class="flex items-center justify-between font-bold text-emerald-300">
              <span class="truncate">{{ item.label }}</span>
              <span class="text-[10px] font-mono opacity-80">{{ formatRelativeTime(item.createdAt) }}</span>
            </div>
            <div class="text-[10px] font-mono text-base-content/75 flex items-center justify-between">
              <span>📍 {{ item.city }} ({{ item.country }})</span>
              <span>{{ item.deviceType === 'mobile' ? '📱 Mobil' : '💻 Dator' }}</span>
            </div>
          </div>
        </div>
        <div v-else class="text-xs text-base-content/50 italic py-6 text-center">
          Inga nedladdningar av Presskit (.zip) eller Tech Rider registrerade i perioden ännu.
        </div>
      </div>
    </div>

    <!-- Row 6: Campaign & Poster QR Link Builder -->
    <div class="bg-primary/10 p-5 sm:p-6 rounded-3xl border border-primary/30 space-y-3">
      <div class="flex items-center gap-2">
        <span class="text-xl">🔗</span>
        <div>
          <h3 class="font-heading text-base sm:text-lg font-bold text-primary">
            Spårningslänkar för Affischer, QR-koder & Utskick
          </h3>
          <p class="text-xs text-base-content/75">
            Lägg till <code class="text-primary font-mono">?ref=...</code> på länkar i sociala medier, nyhetsbrev eller QR-koder på tryckta affischer för att se exakt hur många besökare varje kanal ger!
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        <div>
          <label class="block text-[11px] font-mono font-bold text-secondary uppercase mb-1">Målsida</label>
          <select v-model="campaignPage" class="select select-bordered select-sm w-full bg-base-100 text-xs font-mono">
            <option value="/">/ (Startsidan)</option>
            <option value="/gigs">/gigs (Spelningar & Biljetter)</option>
            <option value="/music">/music (Jukebox)</option>
            <option value="/epk">/epk (Presskit & Tech Rider)</option>
            <option value="/contact">/contact (Bokning & Kontakt)</option>
          </select>
        </div>

        <div>
          <label class="block text-[11px] font-mono font-bold text-secondary uppercase mb-1">Kampanjkod (?ref=)</label>
          <div class="flex gap-1.5">
            <input
              v-model="campaignRef"
              type="text"
              class="input input-bordered input-sm w-full bg-base-100 text-xs font-mono"
              placeholder="poster"
            >
            <button type="button" class="btn btn-xs btn-ghost border border-primary/20 font-mono" @click="campaignRef = 'poster'">
              poster
            </button>
            <button type="button" class="btn btn-xs btn-ghost border border-primary/20 font-mono" @click="campaignRef = 'fb'">
              fb
            </button>
            <button type="button" class="btn btn-xs btn-ghost border border-primary/20 font-mono" @click="campaignRef = 'ig'">
              ig
            </button>
          </div>
        </div>

        <div>
          <label class="block text-[11px] font-mono font-bold text-secondary uppercase mb-1">Färdig länk att kopiera</label>
          <div class="flex items-center gap-2">
            <input
              :value="generatedCampaignUrl"
              readonly
              type="text"
              class="input input-bordered input-sm w-full bg-base-100 text-xs font-mono text-primary font-bold"
            >
            <button
              type="button"
              class="btn btn-primary btn-sm rounded-xl font-bold flex-shrink-0 cursor-pointer"
              @click="copyCampaignUrl"
            >
              📋 Kopiera
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
