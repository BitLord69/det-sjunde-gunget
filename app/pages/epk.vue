<script setup lang="ts">
const { t, locale } = useI18n()
const localePath = useLocalePath()
const { contactEmail } = useSiteSettings()

useSeoMeta({
  title: computed(() => `${t('epk.page_title')} | Det 7:e Gunget`),
  description: computed(() => t('epk.page_desc')),
})

const activeTab = ref<'press' | 'rider' | 'hospitality'>('press')
const toastMessage = ref('')

const showToast = (msg: string) => {
  toastMessage.value = msg
  setTimeout(() => {
    toastMessage.value = ''
  }, 3500)
}

const copyToClipboard = async (text: string, successMsg: string) => {
  if (import.meta.server) return
  try {
    await navigator.clipboard.writeText(text)
    showToast(successMsg)
  } catch {
    showToast('Kunde inte kopiera text automatiskt.')
  }
}

// Press Photos fallback catalog
const defaultPressPhotos = [
  {
    id: 'photo-full-band',
    title: 'Det 7:e Gunget — Fullt band (Liggande)',
    titleEn: 'Det 7:e Gunget — Full Band (Landscape)',
    url: '/media/band/1..7de Gunget photoshoot1 21-6 26-21.jpg',
    resolution: '300 DPI • 3.2 MB',
    orientation: 'Liggande (Landscape)',
  },
  {
    id: 'photo-janis-lead',
    title: 'Janis — Sång & Munspel',
    titleEn: 'Janis — Lead Vocals & Harmonica',
    url: '/media/band/17..7de Gunget photoshoot1 21-6 26-4.jpg',
    resolution: '300 DPI • 3.8 MB',
    orientation: 'Stående (Portrait)',
  },
  {
    id: 'photo-bosse-bass',
    title: 'Bosse — Bas & Sång',
    titleEn: 'Bosse — Bass & Backing Vocals',
    url: '/media/band/19..7de Gunget photoshoot1 21-6 26-5.jpg',
    resolution: '300 DPI • 4.3 MB',
    orientation: 'Stående (Portrait)',
  },
  {
    id: 'photo-marcus-guitar',
    title: 'Marcus — Gitarr & Sång',
    titleEn: 'Marcus — Guitar & Backing Vocals',
    url: '/media/band/2..7de Gunget photoshoot1 21-6 26-20.jpg',
    resolution: '300 DPI • 2.6 MB',
    orientation: 'Stående (Portrait)',
  },
  {
    id: 'photo-jonas-drums',
    title: 'Jonas — Trumset',
    titleEn: 'Jonas — Drums',
    url: '/media/band/10..7de Gunget photoshoot1 21-6 26-16.jpg',
    resolution: '300 DPI • 3.5 MB',
    orientation: 'Stående (Portrait)',
  },
  {
    id: 'photo-rehearsal-vibe',
    title: 'Replokal & Rörglöd',
    titleEn: 'Rehearsal Vibes & Tube Glow',
    url: '/media/band/21..7de Gunget photoshoot1 21-6 26-3.jpg',
    resolution: '300 DPI • 5.3 MB',
    orientation: 'Liggande (Landscape)',
  },
  {
    id: 'photo-live-mood',
    title: 'Det 7:e Gunget — Liveporträtt',
    titleEn: 'Det 7:e Gunget — Live Stage Portrait',
    url: '/media/band/6..7de Gunget photoshoot1 21-6 26-12.jpg',
    resolution: '300 DPI • 2.9 MB',
    orientation: 'Liggande (Landscape)',
  },
]

// Dynamic EPK resources from database (CMS managed)
const { data: dbEpkPhotos } = await useFetch<any[]>('/api/gallery?epk=true')
const { data: dbDocuments } = await useFetch<any[]>('/api/epk/documents')

const displayPressPhotos = computed(() => {
  if (dbEpkPhotos.value && dbEpkPhotos.value.length > 0) {
    return dbEpkPhotos.value.map((item) => ({
      id: item.id,
      title: item.epkTitleSv || item.captionSv || 'Det 7:e Gunget',
      titleEn: item.epkTitleEn || item.captionEn || item.epkTitleSv || 'Det 7:e Gunget',
      url: item.mediaUrl,
      resolution: item.epkResolution || '300 DPI • Full upplösning',
      orientation: item.category === 'fan_central' ? 'Fan Central' : 'Officiell pressbild',
    }))
  }
  return defaultPressPhotos
})

// Official Logos
const brandLogos = [
  {
    id: 'logo-full',
    title: 'Officiellt Vintage Cirkulärt Emblem',
    titleEn: 'Official Circular Vintage Emblem',
    url: '/media/brand/Logotyp.webp',
    format: 'High-Res WebP / PNG',
  },
  {
    id: 'logo-mini',
    title: 'Kompakt Logotyp / Badge',
    titleEn: 'Compact Badge Wordmark',
    url: '/media/brand/Logotyp_mini.webp',
    format: 'High-Res WebP / PNG',
  },
]

// 13-Channel List
const channelList = [
  { ch: '01', source: 'Baskagge (Kick)', sourceEn: 'Bass Drum (Kick)', mic: 'Shure Beta 52 / AKG D112', stand: 'Litet bomstativ', standEn: 'Short boom', notes: 'Gate / Punchy sub', notesEn: 'Gate / Punchy sub' },
  { ch: '02', source: 'Virvel (Snare)', sourceEn: 'Snare Top', mic: 'Shure SM57 / Audix i5', stand: 'Litet stativ / klämma', standEn: 'Short stand / clip', notes: 'Snappy attack', notesEn: 'Snappy attack' },
  { ch: '03', source: 'Hi-Hat', sourceEn: 'Hi-Hat', mic: 'Kondensator (C451/SM81)', stand: 'Litet bomstativ', standEn: 'Short boom', notes: 'Rikta bort från virvel', notesEn: 'Point away from snare' },
  { ch: '04', source: 'Hängpuka (Rack Tom)', sourceEn: 'Rack Tom', mic: 'Sennheiser e604 / SM57', stand: 'Sargklämma', standEn: 'Rim clamp', notes: 'Warm resonance', notesEn: 'Warm resonance' },
  { ch: '05', source: 'Golvpuka (Floor Tom)', sourceEn: 'Floor Tom', mic: 'Sennheiser e604 / D112', stand: 'Sargklämma / stativ', standEn: 'Rim clamp / stand', notes: 'Deep low thump', notesEn: 'Deep low thump' },
  { ch: '06', source: 'Overhead L (OH L)', sourceEn: 'Overhead L (OH L)', mic: 'Kondensator (AKG/Røde)', stand: 'Högt bomstativ', standEn: 'Tall boom', notes: 'Stereopar L', notesEn: 'Stereo pair L' },
  { ch: '07', source: 'Overhead R (OH R)', sourceEn: 'Overhead R (OH R)', mic: 'Kondensator (AKG/Røde)', stand: 'Högt bomstativ', standEn: 'Tall boom', notes: 'Stereopar R', notesEn: 'Stereo pair R' },
  { ch: '08', source: 'Elbas (Bosse)', sourceEn: 'Bass Guitar (Bosse)', mic: 'Aktiv DI / Balanserad XLR ut', stand: '—', standEn: '—', notes: 'Fender P-Bass / Ampeg, AUX 3', notesEn: 'Fender P-Bass / Ampeg, AUX 3' },
  { ch: '09', source: 'Elgitarr (Marcus)', sourceEn: 'Guitar Amp (Marcus)', mic: 'Shure SM57 / Sennheiser e906', stand: 'Litet bomstativ', standEn: 'Short boom', notes: 'Fender Tweed, AUX 2', notesEn: 'Fender Tweed, AUX 2' },
  { ch: '10', source: 'Munspel (Janis)', sourceEn: 'Harmonica (Janis)', mic: 'Shure SM57 / Bullet / DI', stand: 'Litet bomstativ / DI', standEn: 'Short boom / DI', notes: 'Rörstärkare eller DI, AUX 1', notesEn: 'Tube amp or DI, AUX 1' },
  { ch: '11', source: 'Janis Huvudsång', sourceEn: 'Lead Vocals (Janis)', mic: 'Shure 55SH / SM58', stand: 'Högt bomstativ', standEn: 'Tall boom', notes: 'Center fram, lite delay/reverb, AUX 1', notesEn: 'Center front, subtle delay/verb, AUX 1' },
  { ch: '12', source: 'Bosse Körsång', sourceEn: 'Backing Vocals (Bosse)', mic: 'Shure SM58', stand: 'Högt bomstativ', standEn: 'Tall boom', notes: 'Scen höger (publikens vänster), AUX 3', notesEn: 'Stage right (audience left), AUX 3' },
  { ch: '13', source: 'Marcus Körsång', sourceEn: 'Backing Vocals (Marcus)', mic: 'Shure SM58', stand: 'Högt bomstativ', standEn: 'Tall boom', notes: 'Scen vänster (publikens höger), AUX 2', notesEn: 'Stage left (audience right), AUX 2' },
]

// Print function
const printPage = () => {
  if (import.meta.server) return
  window.print()
}

// Plain Text Export
const exportTechRiderAsTxt = () => {
  if (import.meta.server) return

  const dateStr = new Date().toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  let output = '============================================================\r\n'
  output += 'DET 7:e GUNGET — TEKNISK RIDER & SCENPLOT\r\n'
  output += `Genererad: ${dateStr}\r\n`
  output += 'Webb: https://www.det7egunget.se/epk\r\n'
  output += `Bokningskontakt: ${contactEmail.value}\r\n`
  output += '============================================================\r\n\r\n'

  output += '1. SNABBFAKTA\r\n'
  output += '------------------------------------------------------------\r\n'
  output += 'Sättning: 4 musiker (sång/munspel, elgitarr, elbas, trummor)\r\n'
  output += 'Genre: Blues, bluesrock & svängig rock\'n\'roll\r\n'
  output += 'Speltid: 2x45 min eller 3x40 min (efter ök)\r\n'
  output += 'Scenyta: Minst ca 4 x 3 meter med stabil konstruktion\r\n'
  output += 'Ström: Minst 2 st separata jordade 230V 10A/16A uttag på scen\r\n\r\n'

  output += '2. SCENPLOT (SETT UR PUBLIKENS SYNVINKEL / FRONT OF HOUSE)\r\n'
  output += '------------------------------------------------------------\r\n'
  output += '           [BAKRE SCENVÄGG / DRAPERI]\r\n\r\n'
  output += '                  [TRUMMOR: JONAS]\r\n'
  output += '               Trumset på matta (min 2x2m)\r\n'
  output += '               Monitor AUX 4 / 230V ström\r\n\r\n'
  output += ' [BAS: BOSSE]                             [GITARR: MARCUS]\r\n'
  output += ' Ampeg basstärkare                        Fender Tweed stärkare\r\n'
  output += ' Sångmick (SM58)                          Sångmick (SM58)\r\n'
  output += ' Monitor AUX 3 / 230V                     Monitor AUX 2 / 230V\r\n\r\n'
  output += '                  [SÅNG & MUNSPEL: JANIS]\r\n'
  output += '               Shure 55SH / SM58 sångmick\r\n'
  output += '               Munspelsstärkare / DI\r\n'
  output += '               Monitor AUX 1 / 230V ström\r\n\r\n'
  output += '           [SCENKANT / PUBLIK (FOH)]\r\n\r\n'

  output += '3. KANALLISTA (13 KANALER)\r\n'
  output += '------------------------------------------------------------\r\n'
  output += 'CH | KÄLLA                | MICK / DI           | STATIV       | MONITOR & NOT\r\n'
  output += '---+----------------------+---------------------+--------------+------------------------\r\n'
  channelList.forEach((c) => {
    const chStr = c.ch.padEnd(2, ' ')
    const srcStr = c.source.padEnd(20, ' ').substring(0, 20)
    const micStr = c.mic.padEnd(19, ' ').substring(0, 19)
    const stdStr = c.stand.padEnd(12, ' ').substring(0, 12)
    output += `${chStr} | ${srcStr} | ${micStr} | ${stdStr} | ${c.notes}\r\n`
  })
  output += '\r\n'

  output += '4. BACKLINE & TEKNIK\r\n'
  output += '------------------------------------------------------------\r\n'
  output += '* Bandet tar med: Elgitarr- och basförstärkare, personliga instrument, pedaler, trumset samt personliga sångmickar (Shure 55SH).\r\n'
  output += '* Arrangören tillhandahåller: Välljudande PA dimensionerat för lokalen, 4 monitorlinjer (AUX 1-4), mickar/kablar enligt kanallista, och 230V jordad ström.\r\n'
  output += '* Mindre gig / privatfester: Bandet kan vid behov tillhandahålla eget kompakt PA-system.\r\n\r\n'

  output += '5. HOSPITALITY (LOGE & FIKA)\r\n'
  output += '------------------------------------------------------------\r\n'
  output += '* Mat: Varm måltid för 4 personer före eller efter soundcheck.\r\n'
  output += '* Kaffe: Obegränsat med nybryggt kaffe (livsviktigt!).\r\n'
  output += '* Dryck: Mineralvatten, läsk och några kalla öl för efter giget.\r\n'
  output += '* Loge: Låsbart och uppvärmt utrymme med 4 stolar, spegel och toalett.\r\n'
  output += '* Ankomst: Normalt 2 timmar innan dörrarna öppnar.\r\n\r\n'
  output += '============================================================\r\n'

  const blob = new Blob([output], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Det-7e-Gunget-Teknisk-Rider-${dateStr}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  showToast('✓ Teknisk Rider laddades ner som .txt!')
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-6 pt-4 sm:pt-6 pb-16 lg:px-10 space-y-10">
    <!-- Header -->
    <div class="print:hidden">
      <PageHeader
        :title="t('epk.page_title')"
        :description="t('epk.page_desc')"
      />
    </div>

    <!-- Toast notification -->
    <Transition name="fade">
      <div
        v-if="toastMessage"
        class="fixed bottom-6 right-6 z-50 bg-neutral text-primary border border-primary/40 px-5 py-3 rounded-xl shadow-2xl font-bold text-sm flex items-center gap-2"
      >
        <span>⚡</span> {{ toastMessage }}
      </div>
    </Transition>

    <!-- ================================================================= -->
    <!-- EPK WORKBENCH: INTEGRATED TABBED PANEL (Like IDE Editor) -->
    <!-- ================================================================= -->
    <div class="print:hidden rounded-2xl border-2 border-primary/30 bg-base-200 shadow-2xl overflow-hidden">
      <!-- 1. Editor-Style Tab Header Bar (Docked directly on the panel, 0px gap) -->
      <div class="bg-neutral/90 border-b border-primary/25 flex items-stretch select-none h-12 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div class="flex items-stretch h-full">
          <!-- Tab 1: Presskit -->
          <button
            type="button"
            class="group relative flex items-center gap-2 sm:gap-2.5 px-4 sm:px-6 h-full text-xs sm:text-sm font-heading cursor-pointer transition-all border-r border-base-100/30 whitespace-nowrap"
            :class="activeTab === 'press'
              ? 'bg-base-200 text-primary font-bold z-10'
              : 'bg-neutral/40 text-base-content/60 hover:text-base-content hover:bg-base-200/30'"
            @click="activeTab = 'press'"
          >
            <!-- Active bottom indicator line under the text -->
            <span
              v-if="activeTab === 'press'"
              class="absolute bottom-0 left-0 right-0 h-[3px] bg-primary z-20"
            />
            <span class="text-sm sm:text-base text-primary/80 font-mono">{ }</span>
            <span>{{ t('epk.tab_press') }}</span>
            <span class="text-[10px] font-mono text-base-content/30 ml-1 group-hover:text-base-content/60">✕</span>
          </button>

          <!-- Tab 2: Rider -->
          <button
            type="button"
            class="group relative flex items-center gap-2 sm:gap-2.5 px-4 sm:px-6 h-full text-xs sm:text-sm font-heading cursor-pointer transition-all border-r border-base-100/30 whitespace-nowrap"
            :class="activeTab === 'rider'
              ? 'bg-base-200 text-primary font-bold z-10'
              : 'bg-neutral/40 text-base-content/60 hover:text-base-content hover:bg-base-200/30'"
            @click="activeTab = 'rider'"
          >
            <span
              v-if="activeTab === 'rider'"
              class="absolute bottom-0 left-0 right-0 h-[3px] bg-primary z-20"
            />
            <span class="text-sm sm:text-base text-primary/80 font-mono">⚡</span>
            <span>{{ t('epk.tab_rider') }}</span>
            <span class="text-[10px] font-mono text-base-content/30 ml-1 group-hover:text-base-content/60">✕</span>
          </button>

          <!-- Tab 3: Hospitality -->
          <button
            type="button"
            class="group relative flex items-center gap-2 sm:gap-2.5 px-4 sm:px-6 h-full text-xs sm:text-sm font-heading cursor-pointer transition-all border-r border-base-100/30 whitespace-nowrap"
            :class="activeTab === 'hospitality'
              ? 'bg-base-200 text-primary font-bold z-10'
              : 'bg-neutral/40 text-base-content/60 hover:text-base-content hover:bg-base-200/30'"
            @click="activeTab = 'hospitality'"
          >
            <span
              v-if="activeTab === 'hospitality'"
              class="absolute bottom-0 left-0 right-0 h-[3px] bg-primary z-20"
            />
            <span class="text-sm sm:text-base text-primary/80 font-mono">☕</span>
            <span>{{ t('epk.tab_hospitality') }}</span>
            <span class="text-[10px] font-mono text-base-content/30 ml-1 group-hover:text-base-content/60">✕</span>
          </button>
        </div>

        <!-- Breadcrumb / Active status on the right (VS Code style) -->
        <div class="flex-grow flex items-center justify-end px-4 text-[11px] font-mono text-base-content/40 hidden sm:flex">
          <div class="flex items-center gap-2 bg-base-100/40 px-3 py-1 rounded border border-primary/10">
            <span class="text-secondary font-semibold">epk</span>
            <span class="text-base-content/30">&gt;</span>
            <span class="text-primary font-medium">{{ activeTab === 'press' ? 'presskit-media.json' : activeTab === 'rider' ? 'tech-rider-stageplot.vue' : 'hospitality.json' }}</span>
          </div>
        </div>
      </div>

      <!-- 2. Integrated Content Area (Sitting directly beneath the tab bar, 0px gap!) -->
      <div class="p-6 sm:p-8 space-y-10 bg-base-200">
        <!-- ================================================================= -->
        <!-- TAB 1: PRESS KIT & MEDIA -->
        <!-- ================================================================= -->
        <div v-show="activeTab === 'press'" class="space-y-10">
          <!-- Fast Facts for Promoters -->
          <div class="bg-base-100/50 p-6 sm:p-7 rounded-2xl border border-primary/20 space-y-6">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-primary/15 pb-4">
              <div>
                <span class="text-xs uppercase font-bold text-secondary font-mono tracking-widest block">{{ t('epk.badge') }}</span>
                <h2 class="font-heading text-2xl sm:text-3xl text-primary font-bold">{{ t('epk.fast_facts_title') }}</h2>
              </div>
              <NuxtLink :to="localePath('/contact')" class="btn btn-xs sm:btn-sm btn-outline btn-primary rounded-full self-start sm:self-auto">
                {{ t('nav.book') }} →
              </NuxtLink>
            </div>

        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
          <div class="space-y-1 bg-base-100/60 p-4 rounded-xl border border-primary/10">
            <span class="text-xs text-base-content/60 uppercase font-bold block">{{ t('epk.fact_genre') }}</span>
            <span class="font-bold text-primary">{{ t('epk.fact_genre_val') }}</span>
          </div>
          <div class="space-y-1 bg-base-100/60 p-4 rounded-xl border border-primary/10">
            <span class="text-xs text-base-content/60 uppercase font-bold block">{{ t('epk.fact_lineup') }}</span>
            <span class="font-bold text-base-content/90">{{ t('epk.fact_lineup_val') }}</span>
          </div>
          <div class="space-y-1 bg-base-100/60 p-4 rounded-xl border border-primary/10">
            <span class="text-xs text-base-content/60 uppercase font-bold block">{{ t('epk.fact_set_length') }}</span>
            <span class="font-bold text-base-content/90">{{ t('epk.fact_set_length_val') }}</span>
          </div>
          <div class="space-y-1 bg-base-100/60 p-4 rounded-xl border border-primary/10">
            <span class="text-xs text-base-content/60 uppercase font-bold block">{{ t('epk.fact_origin') }}</span>
            <span class="font-bold text-base-content/90">{{ t('epk.fact_origin_val') }}</span>
          </div>
        </div>
      </div>

      <!-- Press Bios (Short & Long) -->
      <div class="grid lg:grid-cols-2 gap-8">
        <!-- Short Bio -->
        <div class="stage-card rounded-2xl p-6 sm:p-7 bg-base-200/80 border border-primary/20 shadow-lg flex flex-col justify-between space-y-4">
          <div class="space-y-3">
            <div class="flex items-center justify-between gap-3">
              <h3 class="font-heading text-lg sm:text-xl text-primary font-bold">{{ t('epk.bio_short_title') }}</h3>
              <span class="badge badge-sm badge-outline border-primary/40 font-mono text-[10px] shrink-0 whitespace-nowrap uppercase">
                {{ locale === 'en' ? 'Short' : 'Kort' }}
              </span>
            </div>
            <p class="text-sm text-base-content/85 leading-relaxed bg-base-100/80 p-4 rounded-xl border border-primary/15 font-sans">
              "{{ t('epk.bio_short_text') }}"
            </p>
          </div>
          <button
            type="button"
            class="btn btn-sm btn-outline btn-primary rounded-full self-start gap-1.5 text-xs font-bold"
            @click="copyToClipboard(t('epk.bio_short_text'), t('epk.copied_toast'))"
          >
            <span>📋</span>
            <span>{{ t('epk.copy_bio_btn') }}</span>
          </button>
        </div>

        <!-- Long Bio -->
        <div class="stage-card rounded-2xl p-6 sm:p-7 bg-base-200/80 border border-primary/20 shadow-lg flex flex-col justify-between space-y-4">
          <div class="space-y-3">
            <div class="flex items-center justify-between gap-3">
              <h3 class="font-heading text-lg sm:text-xl text-primary font-bold">{{ t('epk.bio_long_title') }}</h3>
              <span class="badge badge-sm badge-outline border-primary/40 font-mono text-[10px] shrink-0 whitespace-nowrap uppercase">
                {{ locale === 'en' ? 'Full' : 'Fullständig' }}
              </span>
            </div>
            <p class="text-sm text-base-content/85 leading-relaxed bg-base-100/80 p-4 rounded-xl border border-primary/15 font-sans">
              "{{ t('epk.bio_long_text') }}"
            </p>
          </div>
          <button
            type="button"
            class="btn btn-sm btn-outline btn-primary rounded-full self-start gap-1.5 text-xs font-bold"
            @click="copyToClipboard(t('epk.bio_long_text'), t('epk.copied_toast'))"
          >
            <span>📋</span>
            <span>{{ t('epk.copy_bio_btn') }}</span>
          </button>
        </div>
      </div>

      <!-- High-Res Press Photos -->
      <div class="space-y-6">
        <div class="border-b border-primary/20 pb-3 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h3 class="font-heading text-2xl text-primary font-bold">{{ t('epk.download_photos_title') }}</h3>
            <p class="text-xs text-base-content/75 mt-1">{{ t('epk.download_photos_desc') }}</p>
          </div>
          <div class="text-[11px] font-mono text-secondary font-bold">
            {{ t('epk.photo_credits') }}
          </div>
        </div>

        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="photo in displayPressPhotos"
            :key="photo.id"
            class="stage-card rounded-2xl overflow-hidden bg-base-200/90 border border-primary/25 shadow-lg group hover:border-primary/60 transition-all flex flex-col justify-between"
          >
            <div class="relative aspect-[4/3] overflow-hidden bg-black">
              <NuxtImg
                :src="photo.url"
                :alt="locale === 'en' ? photo.titleEn : photo.title"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 filter contrast-105"
                loading="lazy"
              />
              <span class="absolute top-2 right-2 badge badge-neutral text-[10px] font-mono border-primary/30 shadow">
                {{ photo.resolution }}
              </span>
            </div>

            <div class="p-4 space-y-3">
              <div>
                <h4 class="font-heading font-bold text-sm text-primary line-clamp-1">
                  {{ locale === 'en' ? photo.titleEn : photo.title }}
                </h4>
                <span class="text-[11px] text-base-content/60 font-sans block">{{ photo.orientation }}</span>
              </div>

              <div class="flex items-center justify-between gap-2 pt-2 border-t border-primary/10">
                <a
                  :href="photo.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn btn-xs btn-ghost text-xs text-base-content/70 hover:text-primary"
                >
                  🔍 Förhandsgranska
                </a>
                <a
                  :href="photo.url"
                  :download="photo.title + '.jpg'"
                  class="btn btn-xs btn-primary rounded-full font-bold gap-1 shadow"
                >
                  <span>⬇️</span>
                  <span>{{ t('epk.download_photo_btn') }}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Official Logos -->
      <div class="space-y-6">
        <div class="border-b border-primary/20 pb-3">
          <h3 class="font-heading text-2xl text-primary font-bold">{{ t('epk.logos_title') }}</h3>
          <p class="text-xs text-base-content/75 mt-1">{{ t('epk.logos_desc') }}</p>
        </div>

        <div class="grid sm:grid-cols-2 gap-6">
          <div
            v-for="logo in brandLogos"
            :key="logo.id"
            class="stage-card rounded-2xl p-6 bg-base-200/90 border border-primary/25 shadow-lg flex flex-col sm:flex-row items-center gap-6 justify-between"
          >
            <div class="w-32 h-32 flex-shrink-0 bg-neutral/80 rounded-2xl p-3 border border-primary/20 flex items-center justify-center shadow-inner">
              <NuxtImg :src="logo.url" :alt="logo.title" class="max-h-full max-w-full object-contain filter drop-shadow" />
            </div>
            <div class="space-y-3 flex-1 text-center sm:text-left">
              <div>
                <h4 class="font-heading font-bold text-base text-primary">{{ locale === 'en' ? logo.titleEn : logo.title }}</h4>
                <span class="text-xs text-secondary font-mono">{{ logo.format }}</span>
              </div>
              <p class="text-xs text-base-content/70 leading-relaxed">
                Perfekt för konsertaffischer, festivalflyers, programblad och digital marknadsföring.
              </p>
              <a
                :href="logo.url"
                :download="logo.title + '.webp'"
                class="btn btn-sm btn-outline btn-primary rounded-full font-bold gap-1 text-xs shadow inline-flex"
              >
                <span>⬇️</span>
                <span>{{ t('epk.download_photo_btn') }}</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Organizer Documents & Poster Templates -->
      <div v-if="dbDocuments && dbDocuments.length > 0" class="space-y-6">
        <div class="border-b border-primary/20 pb-3 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h3 class="font-heading text-2xl text-primary font-bold">
              {{ locale === 'en' ? 'Promoter Documents & Poster Templates' : 'Arrangörsdokument & Affischmallar' }}
            </h3>
            <p class="text-xs text-base-content/75 mt-1">
              {{ locale === 'en' ? 'Print-ready materials and promoter sheets for upcoming concerts and events.' : 'Tryckfärdiga affischmallar och arrangörsbilagor för konsert- och festivalarrangörer.' }}
            </p>
          </div>
          <a
            href="/api/epk/zip"
            download="Det-7e-Gunget-Komplett-Presskit.zip"
            class="btn btn-xs btn-outline btn-warning rounded-full font-bold gap-1 shadow self-start sm:self-auto"
          >
            <span>📦</span>
            <span>{{ locale === 'en' ? 'Download All in ZIP' : 'Ladda ner allt i ZIP' }}</span>
          </a>
        </div>

        <div class="grid sm:grid-cols-2 gap-6">
          <div
            v-for="doc in dbDocuments"
            :key="doc.id"
            class="stage-card rounded-2xl p-6 bg-base-200/90 border border-primary/25 shadow-lg flex flex-col justify-between space-y-4 group hover:border-primary/50 transition-all"
          >
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-2xl bg-secondary/15 border border-secondary/30 flex items-center justify-center flex-shrink-0 text-2xl shadow-inner">
                📄
              </div>
              <div class="space-y-1.5 flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <h4 class="font-heading font-bold text-base text-primary truncate" :title="locale === 'en' && doc.titleEn ? doc.titleEn : doc.titleSv">
                    {{ locale === 'en' && doc.titleEn ? doc.titleEn : doc.titleSv }}
                  </h4>
                  <span v-if="doc.fileSize" class="badge badge-neutral text-[10px] font-mono border-primary/30 shrink-0">
                    {{ doc.fileSize }}
                  </span>
                </div>
                <p class="text-xs text-base-content/75 leading-relaxed line-clamp-2">
                  {{ locale === 'en' && doc.descriptionEn ? doc.descriptionEn : doc.descriptionSv }}
                </p>
              </div>
            </div>

            <div class="flex items-center justify-between gap-2 pt-3 border-t border-primary/10">
              <a
                :href="doc.fileUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-xs btn-ghost text-xs text-base-content/70 hover:text-primary"
              >
                🔍 {{ locale === 'en' ? 'Preview' : 'Förhandsgranska' }}
              </a>
              <a
                :href="doc.fileUrl"
                :download="(locale === 'en' && doc.titleEn ? doc.titleEn : doc.titleSv) + '.pdf'"
                class="btn btn-xs btn-primary rounded-full font-bold gap-1.5 shadow"
              >
                <span>⬇️</span>
                <span>{{ locale === 'en' ? 'Download' : 'Ladda ner' }}</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Live Samples & Jukebox -->
      <div class="rounded-2xl p-8 bg-gradient-to-r from-base-200 via-base-100 to-base-200 border-2 border-primary/40 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div class="space-y-2 text-center md:text-left">
          <h3 class="font-heading text-2xl text-primary font-bold">{{ t('epk.listen_samples_title') }}</h3>
          <p class="text-sm text-base-content/80 max-w-xl">
            {{ t('epk.listen_samples_desc') }}
          </p>
        </div>
        <div class="flex items-center gap-3 flex-wrap justify-center">
          <NuxtLink :to="localePath('/music')" class="btn btn-primary rounded-full font-bold shadow-md">
            {{ t('epk.open_jukebox_btn') }}
          </NuxtLink>
          <a
            href="https://youtube.com/@det7egunget"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-outline btn-secondary rounded-full font-bold text-xs"
          >
            {{ t('epk.open_youtube_btn') }}
          </a>
        </div>
      </div>
    </div>

    <!-- ================================================================= -->
    <!-- TAB 2: TECHNICAL RIDER & STAGE PLOT -->
    <!-- ================================================================= -->
    <div v-show="activeTab === 'rider'" class="space-y-10">
      <!-- 1. Visual Stage Plot Graphic Box -->
      <div class="bg-base-100/50 p-6 sm:p-7 rounded-2xl border border-primary/20 space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-primary/20 pb-4">
          <div>
            <span class="text-xs uppercase font-bold text-secondary tracking-widest block font-mono">STAGE PLOT • 4 MUSIKER</span>
            <h2 class="font-heading text-2xl sm:text-3xl text-primary font-bold">{{ t('epk.stage_plot_title') }}</h2>
          </div>
          <div class="text-xs font-mono text-base-content/70">
            {{ t('epk.stage_plot_subtitle') }}
          </div>
        </div>

        <!-- The Interactive Stage Surface Canvas -->
        <div class="relative bg-gradient-to-b from-[#1c140e] via-[#120d09] to-[#0a0705] text-amber-50 rounded-2xl p-6 sm:p-10 border-4 border-[#3a281c] shadow-inner overflow-hidden">
          <!-- Stage Wall Marker (Top) -->
          <div class="text-center font-mono text-xs uppercase tracking-widest text-amber-200/50 pb-6 border-b border-amber-500/20">
            {{ t('epk.stage_back') }}
          </div>

          <!-- Musician Positions Grid -->
          <div class="my-8 grid grid-cols-1 md:grid-cols-3 gap-8 items-center relative z-10">
            <!-- Stage Right (Audience Left): Bosse (Bass) -->
            <div class="bg-[#241a12]/90 border-2 border-amber-600/40 rounded-xl p-5 text-center shadow-lg space-y-3 relative group hover:border-amber-400 transition-colors">
              <div class="absolute -top-3 left-4 badge badge-xs badge-neutral border-amber-500/40 text-[10px] font-mono uppercase whitespace-nowrap">
                {{ locale === 'en' ? 'Stage Right' : 'Scen Höger' }}
              </div>
              <div class="w-14 h-14 mx-auto rounded-full bg-amber-950/80 border border-amber-500/60 flex items-center justify-center text-2xl shadow">
                🎸
              </div>
              <div>
                <h4 class="font-heading text-lg font-bold text-amber-400">{{ t('epk.pos_bosse') }}</h4>
                <p class="text-xs text-amber-100/75 mt-1 leading-relaxed">
                  {{ t('epk.pos_bosse_desc') }}
                </p>
              </div>
              <div class="flex items-center justify-center gap-2 pt-2 border-t border-amber-500/20 text-[10px] font-mono flex-wrap">
                <span class="badge badge-xs bg-amber-600/20 text-amber-300 border-amber-600/40">⚡ {{ t('epk.power_badge') }}</span>
                <span class="badge badge-xs bg-blue-600/20 text-blue-300 border-blue-600/40">🔊 AUX 3 (Monitor)</span>
                <span class="badge badge-xs bg-emerald-600/20 text-emerald-300 border-emerald-600/40">DI Box</span>
              </div>
            </div>

            <!-- Center Column: Jonas (Drums back) & Janis (Lead front) -->
            <div class="space-y-8">
              <!-- Jonas Drums (Center Back) -->
              <div class="bg-[#241a12]/90 border-2 border-amber-600/40 rounded-xl p-5 text-center shadow-lg space-y-3 relative group hover:border-amber-400 transition-colors">
                <div class="absolute -top-3 left-4 badge badge-xs badge-neutral border-amber-500/40 text-[10px] font-mono uppercase whitespace-nowrap">
                  {{ locale === 'en' ? 'Upstage Center' : 'Center Bak' }}
                </div>
                <div class="w-14 h-14 mx-auto rounded-full bg-amber-950/80 border border-amber-500/60 flex items-center justify-center text-2xl shadow">
                  🥁
                </div>
                <div>
                  <h4 class="font-heading text-lg font-bold text-amber-400">{{ t('epk.pos_jonas') }}</h4>
                  <p class="text-xs text-amber-100/75 mt-1 leading-relaxed">
                    {{ t('epk.pos_jonas_desc') }}
                  </p>
                </div>
                <div class="flex items-center justify-center gap-2 pt-2 border-t border-amber-500/20 text-[10px] font-mono flex-wrap">
                  <span class="badge badge-xs bg-amber-600/20 text-amber-300 border-amber-600/40">⚡ {{ t('epk.power_badge') }}</span>
                  <span class="badge badge-xs bg-blue-600/20 text-blue-300 border-blue-600/40">🔊 AUX 4 (Monitor)</span>
                  <span class="badge badge-xs bg-neutral text-amber-200/80 border-amber-500/30">Matta 2x2m</span>
                </div>
              </div>

              <!-- Janis Vocals & Harp (Center Front) -->
              <div class="bg-gradient-to-b from-[#332418] to-[#241a12] border-2 border-primary rounded-xl p-5 text-center shadow-2xl space-y-3 relative ring-2 ring-primary/30">
                <div class="absolute -top-3 left-4 badge badge-xs badge-primary text-[10px] font-mono uppercase font-bold whitespace-nowrap">
                  {{ locale === 'en' ? 'Front of Stage' : 'Center Fram' }}
                </div>
                <div class="w-16 h-16 mx-auto rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center text-3xl shadow-lg">
                  🎙️
                </div>
                <div>
                  <h4 class="font-heading text-xl font-bold text-primary">{{ t('epk.pos_janis') }}</h4>
                  <p class="text-xs text-amber-100/85 mt-1 leading-relaxed">
                    {{ t('epk.pos_janis_desc') }}
                  </p>
                </div>
                <div class="flex items-center justify-center gap-2 pt-2 border-t border-primary/30 text-[10px] font-mono flex-wrap">
                  <span class="badge badge-xs bg-amber-600/20 text-amber-300 border-amber-600/40 font-bold">⚡ {{ t('epk.power_badge') }}</span>
                  <span class="badge badge-xs bg-blue-600/20 text-blue-300 border-blue-600/40 font-bold">🔊 AUX 1 (Monitor)</span>
                  <span class="badge badge-xs bg-primary/20 text-primary border-primary/40 font-bold">Shure 55SH Mic</span>
                </div>
              </div>
            </div>

            <!-- Stage Left (Audience Right): Marcus (Guitar) -->
            <div class="bg-[#241a12]/90 border-2 border-amber-600/40 rounded-xl p-5 text-center shadow-lg space-y-3 relative group hover:border-amber-400 transition-colors">
              <div class="absolute -top-3 left-4 badge badge-xs badge-neutral border-amber-500/40 text-[10px] font-mono uppercase whitespace-nowrap">
                {{ locale === 'en' ? 'Stage Left' : 'Scen Vänster' }}
              </div>
              <div class="w-14 h-14 mx-auto rounded-full bg-amber-950/80 border border-amber-500/60 flex items-center justify-center text-2xl shadow">
                🎸
              </div>
              <div>
                <h4 class="font-heading text-lg font-bold text-amber-400">{{ t('epk.pos_marcus') }}</h4>
                <p class="text-xs text-amber-100/75 mt-1 leading-relaxed">
                  {{ t('epk.pos_marcus_desc') }}
                </p>
              </div>
              <div class="flex items-center justify-center gap-2 pt-2 border-t border-amber-500/20 text-[10px] font-mono flex-wrap">
                <span class="badge badge-xs bg-amber-600/20 text-amber-300 border-amber-600/40">⚡ {{ t('epk.power_badge') }}</span>
                <span class="badge badge-xs bg-blue-600/20 text-blue-300 border-blue-600/40">🔊 AUX 2 (Monitor)</span>
                <span class="badge badge-xs bg-amber-600/20 text-amber-300 border-amber-600/40">Tweed Amp</span>
              </div>
            </div>
          </div>

          <!-- Audience / FOH Marker (Bottom) -->
          <div class="text-center font-mono text-xs uppercase tracking-widest text-primary font-bold pt-6 border-t border-primary/30">
            {{ t('epk.stage_front') }}
          </div>
        </div>
      </div>

      <!-- 2. Channel List (Input Patch Sheet) -->
      <div class="stage-card rounded-2xl p-6 sm:p-8 bg-base-200/90 border border-primary/30 shadow-xl space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-primary/20 pb-4">
          <div>
            <span class="text-xs uppercase font-bold text-secondary tracking-widest block font-mono">INPUT LIST • 13 CHANNELS</span>
            <h3 class="font-heading text-2xl text-primary font-bold">{{ t('epk.channel_list_title') }}</h3>
          </div>
          <p class="text-xs text-base-content/75 max-w-md">
            {{ t('epk.channel_list_desc') }}
          </p>
        </div>

        <div class="overflow-x-auto rounded-xl border border-primary/20 shadow">
          <table class="table table-sm sm:table-md w-full bg-base-100/80 text-xs sm:text-sm">
            <thead class="bg-neutral text-primary font-heading uppercase text-[11px] tracking-wider">
              <tr>
                <th class="w-12 text-center">{{ t('epk.col_ch') }}</th>
                <th>{{ t('epk.col_instrument') }}</th>
                <th>{{ t('epk.col_mic') }}</th>
                <th>{{ t('epk.col_stand') }}</th>
                <th>{{ t('epk.col_notes') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-base-content/10 font-sans">
              <tr
                v-for="row in channelList"
                :key="row.ch"
                class="hover:bg-primary/5 transition-colors"
                :class="row.ch === '11' ? 'bg-primary/10 font-medium' : ''"
              >
                <td class="font-mono font-bold text-center text-primary">{{ row.ch }}</td>
                <td class="font-bold text-base-content/95">{{ locale === 'en' ? row.sourceEn : row.source }}</td>
                <td class="text-secondary font-medium">{{ row.mic }}</td>
                <td class="text-base-content/70">{{ locale === 'en' ? row.standEn : row.stand }}</td>
                <td class="text-base-content/80 font-mono text-xs">{{ locale === 'en' ? row.notesEn : row.notes }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 3. Sound, Light & Backline Responsibility Grid -->
      <div class="grid md:grid-cols-2 gap-8">
        <!-- Band Brings -->
        <div class="stage-card rounded-2xl p-6 sm:p-7 bg-base-200/80 border border-primary/25 shadow-lg space-y-4">
          <div class="flex items-center gap-3 border-b border-primary/20 pb-3">
            <span class="text-2xl">🎸</span>
            <div>
              <span class="text-xs font-mono uppercase font-bold text-secondary">Egen Backline</span>
              <h4 class="font-heading text-xl text-primary font-bold">{{ t('epk.backline_band_brings_title') }}</h4>
            </div>
          </div>
          <ul class="space-y-2.5 text-xs sm:text-sm text-base-content/85 list-disc list-inside">
            <li>{{ t('epk.backline_band_brings_1') }}</li>
            <li>{{ t('epk.backline_band_brings_2') }}</li>
            <li>{{ t('epk.backline_band_brings_3') }}</li>
            <li>{{ t('epk.backline_band_brings_4') }}</li>
          </ul>
        </div>

        <!-- Venue Provides -->
        <div class="stage-card rounded-2xl p-6 sm:p-7 bg-base-200/80 border border-primary/25 shadow-lg space-y-4">
          <div class="flex items-center gap-3 border-b border-primary/20 pb-3">
            <span class="text-2xl">🏛️</span>
            <div>
              <span class="text-xs font-mono uppercase font-bold text-secondary">Arrangörens Ansvar</span>
              <h4 class="font-heading text-xl text-primary font-bold">{{ t('epk.backline_venue_provides_title') }}</h4>
            </div>
          </div>
          <ul class="space-y-2.5 text-xs sm:text-sm text-base-content/85 list-disc list-inside">
            <li>{{ t('epk.backline_venue_provides_1') }}</li>
            <li>{{ t('epk.backline_venue_provides_2') }}</li>
            <li>{{ t('epk.backline_venue_provides_3') }}</li>
            <li>{{ t('epk.backline_venue_provides_4') }}</li>
            <li>{{ t('epk.backline_venue_provides_5') }}</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- ================================================================= -->
    <!-- TAB 3: HOSPITALITY RIDER -->
    <!-- ================================================================= -->
    <div v-show="activeTab === 'hospitality'" class="space-y-10 print:hidden">
      <div class="bg-base-100/50 p-6 sm:p-7 rounded-2xl border border-primary/20 space-y-6">
        <div class="border-b border-primary/20 pb-4">
          <span class="text-xs uppercase font-bold text-secondary tracking-widest block font-mono">HOSPITALITY & LOGE</span>
          <h2 class="font-heading text-2xl sm:text-3xl text-primary font-bold">{{ t('epk.hospitality_title') }}</h2>
          <p class="text-sm text-base-content/80 mt-2 max-w-2xl leading-relaxed">
            {{ t('epk.hospitality_intro') }}
          </p>
        </div>

        <div class="grid sm:grid-cols-2 gap-6">
          <!-- Food & Coffee -->
          <div class="p-5 rounded-xl bg-base-100/70 border border-primary/15 space-y-2">
            <div class="flex items-center gap-2 text-primary font-heading font-bold text-lg">
              <span>☕</span>
              <h4>{{ t('epk.hosp_food_title') }}</h4>
            </div>
            <p class="text-xs sm:text-sm text-base-content/85 leading-relaxed">
              {{ t('epk.hosp_food_desc') }}
            </p>
          </div>

          <!-- Drinks in Green Room -->
          <div class="p-5 rounded-xl bg-base-100/70 border border-primary/15 space-y-2">
            <div class="flex items-center gap-2 text-primary font-heading font-bold text-lg">
              <span>🍺</span>
              <h4>{{ t('epk.hosp_drinks_title') }}</h4>
            </div>
            <p class="text-xs sm:text-sm text-base-content/85 leading-relaxed">
              {{ t('epk.hosp_drinks_desc') }}
            </p>
          </div>

          <!-- Dressing Room -->
          <div class="p-5 rounded-xl bg-base-100/70 border border-primary/15 space-y-2">
            <div class="flex items-center gap-2 text-primary font-heading font-bold text-lg">
              <span>🛋️</span>
              <h4>{{ t('epk.hosp_room_title') }}</h4>
            </div>
            <p class="text-xs sm:text-sm text-base-content/85 leading-relaxed">
              {{ t('epk.hosp_room_desc') }}
            </p>
          </div>

          <!-- Schedule & Soundcheck -->
          <div class="p-5 rounded-xl bg-base-100/70 border border-primary/15 space-y-2">
            <div class="flex items-center gap-2 text-primary font-heading font-bold text-lg">
              <span>⏱️</span>
              <h4>{{ t('epk.hosp_arrival_title') }}</h4>
            </div>
            <p class="text-xs sm:text-sm text-base-content/85 leading-relaxed">
              {{ t('epk.hosp_arrival_desc') }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

    <!-- ================================================================= -->
    <!-- BOTTOM ACTION BAR: DOWNLOADS & TOOLS (Under content) -->
    <!-- ================================================================= -->
    <div class="print:hidden stage-card p-6 sm:p-8 rounded-2xl bg-base-200/95 border-2 border-primary/30 shadow-2xl text-center space-y-4">
      <div class="max-w-xl mx-auto space-y-1">
        <span class="text-xs uppercase font-bold text-secondary font-mono tracking-widest block">
          Arrangörsverktyg & Offline-material
        </span>
        <h3 class="font-heading text-xl sm:text-2xl text-primary font-bold">
          Ladda ner material eller skriv ut för konserten
        </h3>
        <p class="text-xs text-base-content/70">
          Ta med ridern till mixerbordet, spara teknisk patchlista eller hämta alla högupplösta pressfoton och affischmallar i en samlad ZIP-fil.
        </p>
      </div>

      <div class="flex flex-wrap items-center justify-center gap-3 pt-2">
        <a
          href="/api/epk/zip"
          download="Det-7e-Gunget-Komplett-Presskit.zip"
          class="btn btn-warning rounded-full gap-2 font-bold text-warning-content shadow-lg hover:scale-105 transition-transform text-xs sm:text-sm px-6"
          :title="locale === 'en' ? 'Download full press kit bundle (photos, logos, documents) as ZIP' : 'Ladda ner alla pressfoton, logotyper och dokument i en samlad ZIP-fil'"
        >
          <span class="text-base sm:text-lg">📦</span>
          <span>{{ locale === 'en' ? 'Full Press Kit (.zip)' : 'Komplett Presskit (.zip)' }}</span>
        </a>

        <button
          type="button"
          class="btn btn-outline btn-primary rounded-full gap-2 font-bold shadow text-xs sm:text-sm hover:scale-105 transition-transform px-5"
          :title="t('epk.export_txt_btn')"
          @click="exportTechRiderAsTxt"
        >
          <span class="text-base sm:text-lg">💾</span>
          <span>{{ t('epk.export_txt_btn') }}</span>
        </button>

        <button
          type="button"
          class="btn btn-primary rounded-full gap-2 font-bold shadow-lg text-xs sm:text-sm hover:scale-105 transition-transform px-5"
          :title="t('epk.export_print_btn')"
          @click="printPage"
        >
          <span class="text-base sm:text-lg">🖨️</span>
          <span>{{ t('epk.export_print_btn') }}</span>
        </button>
      </div>
    </div>

    <!-- ================================================================= -->
    <!-- DEDICATED PRINT VIEW (@media print only) -->
    <!-- ================================================================= -->
    <div class="hidden print:block text-black bg-white p-4 space-y-6 text-xs font-sans">
      <!-- Print Header -->
      <div class="border-b-2 border-black pb-4 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold tracking-wide">DET 7<span class="lowercase">:e</span> GUNGET — TEKNISK RIDER & SCENPLOT</h1>
          <p class="text-xs text-gray-700">4 musiker • Äkta Chicagoblues & Träskrock • www.det7egunget.se • {{ contactEmail }}</p>
        </div>
        <div class="text-right text-[10px] text-gray-600 font-mono">
          Utskriftsdatum: {{ new Date().toLocaleDateString('sv-SE') }}
        </div>
      </div>

      <!-- Quick Facts in Print -->
      <div class="grid grid-cols-4 gap-2 text-[11px] bg-gray-100 p-3 rounded border border-gray-300">
        <div><strong>Sättning:</strong> 4 musiker</div>
        <div><strong>Scenyta:</strong> Minst 4 x 3 meter</div>
        <div><strong>Ström:</strong> 2x 230V 10A jordat</div>
        <div><strong>Monitorer:</strong> 4 linjer (AUX 1–4)</div>
      </div>

      <!-- Print Stage Plot -->
      <div class="border border-black p-4 rounded text-center space-y-3">
        <div class="text-[10px] uppercase font-bold tracking-widest text-gray-500 border-b border-gray-300 pb-1">
          ▲ BAKRE SCENVÄGG / UPSTAGE ▲
        </div>
        <div class="grid grid-cols-3 gap-4 py-2 items-center">
          <div class="border border-gray-400 p-2 rounded">
            <strong class="block text-xs">BAS: BOSSE</strong>
            <span class="text-[10px] block">Ampeg basstärkare (DI ut)</span>
            <span class="text-[10px] block">Sångmick SM58</span>
            <span class="text-[10px] font-bold block mt-1">Monitor AUX 3 • 230V</span>
          </div>
          <div class="space-y-3">
            <div class="border border-gray-400 p-2 rounded">
              <strong class="block text-xs">TRUMMOR: JONAS</strong>
              <span class="text-[10px] block">Ludwig trumset på matta (min 2x2m)</span>
              <span class="text-[10px] font-bold block mt-1">Monitor AUX 4 • 230V</span>
            </div>
            <div class="border-2 border-black p-2 rounded bg-gray-50">
              <strong class="block text-xs">SÅNG & MUNSPEL: JANIS</strong>
              <span class="text-[10px] block">Shure 55SH/SM58 bomstativ</span>
              <span class="text-[10px] block">Munspelsstärkare / DI</span>
              <span class="text-[10px] font-bold block mt-1">Monitor AUX 1 • 230V</span>
            </div>
          </div>
          <div class="border border-gray-400 p-2 rounded">
            <strong class="block text-xs">GITARR: MARCUS</strong>
            <span class="text-[10px] block">Fender Tweed (mikad)</span>
            <span class="text-[10px] block">Sångmick SM58</span>
            <span class="text-[10px] font-bold block mt-1">Monitor AUX 2 • 230V</span>
          </div>
        </div>
        <div class="text-[10px] uppercase font-bold tracking-widest text-gray-900 border-t border-gray-300 pt-1">
          ▼ SCENKANT / PUBLIK (FRONT OF HOUSE) ▼
        </div>
      </div>

      <!-- Print Input Patch Table -->
      <div>
        <h3 class="font-bold text-sm uppercase mb-2 border-b border-gray-300 pb-1">Kanallista / Input Patch (13 Kanaler)</h3>
        <table class="w-full text-left border-collapse border border-gray-400 text-[10px]">
          <thead>
            <tr class="bg-gray-200">
              <th class="border border-gray-400 px-2 py-1 w-8 text-center">Ch</th>
              <th class="border border-gray-400 px-2 py-1">Instrument</th>
              <th class="border border-gray-400 px-2 py-1">Önskad Mick / DI</th>
              <th class="border border-gray-400 px-2 py-1">Stativ</th>
              <th class="border border-gray-400 px-2 py-1">Monitor & Notering</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in channelList" :key="r.ch">
              <td class="border border-gray-400 px-2 py-1 text-center font-bold">{{ r.ch }}</td>
              <td class="border border-gray-400 px-2 py-1 font-semibold">{{ r.source }}</td>
              <td class="border border-gray-400 px-2 py-1">{{ r.mic }}</td>
              <td class="border border-gray-400 px-2 py-1">{{ r.stand }}</td>
              <td class="border border-gray-400 px-2 py-1">{{ r.notes }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Print Backline & Hospitality Summary -->
      <div class="grid grid-cols-2 gap-4 text-[10px] pt-2 border-t border-gray-300">
        <div>
          <strong class="block mb-1">Backline & Teknik:</strong>
          <p>Bandet har med gitarr- och basstärkare, personliga instrument och trumset. Arrangören ordnar PA, 4 monitorlinjer och mickar/DI enligt lista.</p>
        </div>
        <div>
          <strong class="block mb-1">Hospitality & Tider:</strong>
          <p>Ankomst ca 2h före dörröppning. Varm mat för 4 personer, kaffe och vatten i låsbar loge. Kontakt: {{ contactEmail }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media print {
  /* Hide all regular website chrome */
  :deep(header),
  :deep(footer),
  :deep(nav),
  .site-header,
  .site-footer,
  .mobile-bottom-nav {
    display: none !important;
  }

  body {
    background: white !important;
    color: black !important;
  }
}
</style>
