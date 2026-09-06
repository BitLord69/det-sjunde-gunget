<script setup lang="ts">
export interface SetlistItem {
  id: string
  title: string
  artist: string | null
  isOriginal: boolean
  setName: string
  notes: string | null
  sortOrder: number
}

const props = defineProps<{
  groupedSetlist?: Record<string, SetlistItem[]>
}>()

const { t } = useI18n()
const localePath = useLocalePath()

// If groupedSetlist is not provided via prop, fetch it directly
const { data: fetchedSetlist } = !props.groupedSetlist
  ? await useFetch<SetlistItem[]>('/api/setlist')
  : { data: ref<SetlistItem[] | null>(null) }

const internalGroupedSetlist = computed(() => {
  if (props.groupedSetlist) return props.groupedSetlist
  const items = fetchedSetlist?.value || []
  const groups: Record<string, SetlistItem[]> = {}
  for (const item of items) {
    const set = item.setName || 'Set 1'
    if (!groups[set]) groups[set] = []
    groups[set].push(item)
  }
  return groups
})

const exportSetlistAsTxt = () => {
  if (import.meta.server) return

  const dateStr = new Date().toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  let output = '============================================================\r\n'
  output += 'DET 7:E GUNGET — AKTUELL SCENSETLISTA\r\n'
  output += `Genererad: ${dateStr}\r\n`
  output += 'Webb: https://www.det7egunget.se\r\n'
  output += '============================================================\r\n\r\n'

  const groups = internalGroupedSetlist.value
  const setNames = Object.keys(groups)

  if (!setNames.length) {
    output += 'Inga låtar i setlistan just nu.\r\n'
  } else {
    for (const setName of setNames) {
      const tracks = groups[setName] || []
      output += `------------------------------------------------------------\r\n`
      output += `[${setName.toUpperCase()}] (${tracks.length} låtar)\r\n`
      output += `------------------------------------------------------------\r\n`

      tracks.forEach((track, idx) => {
        const num = String(idx + 1).padStart(2, '0')
        const originalTag = track.isOriginal ? ' [Egen låt]' : (track.artist ? ` (${track.artist})` : '')
        output += `${num}. ${track.title}${originalTag}\r\n`
        if (track.notes) {
          output += `    * Notering: ${track.notes}\r\n`
        }
      })
      output += '\r\n'
    }
  }

  output += '============================================================\r\n'
  output += 'Det 7:e Gunget • Blues & rock med glimt i ögat\r\n'
  output += '============================================================\r\n'

  const blob = new Blob([output], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `det-7e-gunget-setlista-${dateStr}.txt`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const printSetlist = () => {
  if (import.meta.server) return
  window.print()
}
</script>

<template>
  <!-- AUTHENTIC GAFFER-TAPED STAGE SETLIST & REPERTOIRE -->
  <div class="space-y-6 max-w-4xl mx-auto">
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div class="text-center sm:text-left space-y-2">
        <span class="text-xs font-bold uppercase tracking-widest text-secondary flex items-center justify-center sm:justify-start gap-2">
          <span>📋</span> {{ t('music.repertoire_tag') }}
        </span>
        <h2 class="font-heading text-3xl sm:text-4xl text-primary font-bold">
          {{ t('music.repertoire_title') }}
        </h2>
        <p class="text-sm text-base-content/80 max-w-2xl">
          {{ t('music.repertoire_desc') }}
        </p>
      </div>

      <!-- Setlist Action Toolbar: Text File Export & Print -->
      <div class="flex items-center justify-center sm:justify-end gap-2 flex-wrap no-print">
        <button
          type="button"
          class="btn btn-outline btn-primary btn-sm rounded-full font-mono text-xs font-bold flex items-center gap-1.5 shadow-sm hover:scale-105 transition-transform cursor-pointer"
          title="Ladda ner setlistan som ren textfil för import eller redigering"
          @click="exportSetlistAsTxt"
        >
          <span>📄</span>
          <span>Spara som .txt</span>
        </button>

        <button
          type="button"
          class="btn btn-secondary btn-sm rounded-full font-mono text-xs font-bold flex items-center gap-1.5 shadow-sm hover:scale-105 transition-transform cursor-pointer"
          title="Skriv ut eller spara som PDF för scengolvet"
          @click="printSetlist"
        >
          <span>🖨️</span>
          <span>Skriv ut</span>
        </button>
      </div>
    </div>

    <!-- Stage Floor / Monitor Surface with Gaffer-Taped Paper Sheet -->
    <div class="stage-floor-board p-4 sm:p-10 rounded-3xl border border-primary/30 relative shadow-2xl">
      <!-- Worn Paper Setlist Sheet (With realistic angle & gaffer tape on corners) -->
      <div class="stage-setlist-sheet relative mx-auto max-w-2xl bg-[#faf6ed] text-[#1c1611] p-6 sm:p-10 rounded-sm shadow-[0_20px_45px_rgba(0,0,0,0.85)] border border-[#dfd2be] select-none">
        <!-- Silver Gaffer Tape Strips -->
        <div class="gaffer-tape gaffer-tape-tl" />
        <div class="gaffer-tape gaffer-tape-tr" />
        <div class="gaffer-tape gaffer-tape-bl" />
        <div class="gaffer-tape gaffer-tape-br" />

        <!-- Authentic Coffee Mug Ring Stains & Drips -->
        <div class="coffee-stain coffee-stain-main" aria-hidden="true">
          <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
            <!-- Outer dried dark coffee ring -->
            <circle cx="98" cy="98" r="82" stroke="#633716" stroke-width="4" stroke-dasharray="18 4 35 6 12 3 50 8" stroke-linecap="round" opacity="0.45" filter="blur(0.3px)" />
            <!-- Secondary inner coffee edge ring -->
            <circle cx="100" cy="100" r="78" stroke="#87532a" stroke-width="2.5" stroke-dasharray="30 8 40 5 15 6" opacity="0.35" />
            <!-- Watery coffee translucent center wash -->
            <circle cx="99" cy="99" r="80" fill="#a46838" opacity="0.10" />
            <!-- Coffee drip splatters -->
            <circle cx="184" cy="72" r="4.5" fill="#633716" opacity="0.40" />
            <circle cx="192" cy="86" r="2.5" fill="#87532a" opacity="0.35" />
            <circle cx="177" cy="115" r="3.2" fill="#633716" opacity="0.32" />
            <circle cx="16" cy="138" r="3.5" fill="#87532a" opacity="0.28" />
          </svg>
        </div>

        <!-- Second faint coffee ring near bottom-left -->
        <div class="coffee-stain coffee-stain-secondary" aria-hidden="true">
          <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
            <circle cx="80" cy="80" r="68" stroke="#7a461e" stroke-width="3.2" stroke-dasharray="25 6 45 4 10 5" opacity="0.24" filter="blur(0.2px)" />
            <circle cx="80" cy="80" r="65" fill="#8c5024" opacity="0.06" />
            <circle cx="148" cy="45" r="2.5" fill="#7a461e" opacity="0.25" />
          </svg>
        </div>

        <!-- Sharpie Band Header -->
        <div class="text-center pb-4 mb-6 border-b-2 border-dashed border-[#8c765c]/40 relative z-10">
          <div class="text-[10px] font-mono font-bold tracking-widest uppercase text-[#735e47]">
            LIVE PÅ SCEN • AKTUELL SETLISTA
          </div>
          <h3 class="font-heading font-black text-2xl sm:text-3xl text-[#1a1209] tracking-tight uppercase mt-0.5 setlist-handwritten">
            DET 7:E GUNGET
          </h3>
          <div class="text-[11px] font-mono text-[#8a725b] mt-1 italic">
            Blues, rock & sväng i lagom doser • 2x45 min + extranummer
          </div>
        </div>

        <!-- Grouped Sets (Set 1, Set 2, Encores...) -->
        <div class="space-y-6">
          <div
            v-for="(tracks, setName) in internalGroupedSetlist"
            :key="setName"
            class="space-y-2.5 setlist-group"
          >
            <!-- Set Name Header with Sharpie underline -->
            <div class="flex items-center gap-2 border-b border-[#a8957e]/50 pb-1 pt-1">
              <span class="text-xs sm:text-sm font-mono font-black uppercase tracking-wider text-[#912426]">
                ▶ {{ setName }}
              </span>
              <span class="text-[10px] font-mono text-[#7d6852]">({{ tracks.length }} låtar)</span>
            </div>

            <!-- Song List in Set -->
            <div class="space-y-1.5 pl-1">
              <div
                v-for="(track, idx) in tracks"
                :key="track.id"
                class="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 py-1 border-b border-[#efe6d5]/80 hover:bg-[#ede3d1]/50 px-2 rounded transition-colors"
              >
                <div class="flex items-baseline gap-2.5 min-w-0">
                  <span class="font-mono font-bold text-xs text-[#8c745c] w-5 text-right flex-shrink-0">
                    {{ (idx + 1) < 10 ? `0${idx + 1}` : idx + 1 }}.
                  </span>
                  <span class="font-heading font-bold text-sm sm:text-base text-[#1c150e] tracking-tight truncate">
                    {{ track.title }}
                  </span>
                  <NuxtLink
                    v-if="track.isOriginal"
                    :to="localePath('/lyrics')"
                    class="text-[9px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-[#ebd1be] hover:bg-primary hover:text-neutral text-[#801b1c] border border-[#a8484a]/40 flex-shrink-0 transition-colors no-print"
                    title="Se låttext & ackord i låttextboken"
                  >
                    📜 Egen text
                  </NuxtLink>
                  <span
                    v-else-if="track.artist"
                    class="text-xs font-mono text-[#6e5946] truncate hidden sm:inline"
                  >
                    ({{ track.artist }})
                  </span>
                </div>

                <!-- Live Performance Cue / Notes -->
                <div v-if="track.notes" class="text-[11px] font-mono italic text-[#70563e] pl-7 sm:pl-0 sm:text-right flex-shrink-0">
                  ✎ {{ track.notes }}
                </div>
              </div>
            </div>
          </div>

          <div v-if="!Object.keys(internalGroupedSetlist).length" class="text-center py-6 font-mono text-xs text-[#735e47]">
            Laddar setlista...
          </div>
        </div>

        <!-- Footer Stamp / Stage Sound Note -->
        <div class="mt-8 pt-3 border-t border-dashed border-[#8c765c]/40 flex items-center justify-between text-[10px] font-mono text-[#8a725b]">
          <span>Gung-garanti: 100%</span>
          <span class="font-bold text-[#801b1c]">VOLYM: 11 ⚡</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Authentic Stage Setlist & Silver Gaffer Tape Styling */
.stage-floor-board {
  background: radial-gradient(ellipse at 50% 20%, #1e150f 0%, #120c08 60%, #0a0705 100%);
  background-image: 
    radial-gradient(ellipse at 50% 20%, #1e150f 0%, #120c08 60%, #0a0705 100%),
    repeating-linear-gradient(90deg, rgba(255,255,255,0.01) 0px, rgba(255,255,255,0.01) 2px, transparent 2px, transparent 40px);
  border-color: rgba(226, 189, 114, 0.3);
}

:global([data-theme='light']) .stage-floor-board {
  background: radial-gradient(ellipse at 50% 20%, #f8f1e6 0%, #efe4d3 60%, #e2d2bc 100%);
  background-image: 
    radial-gradient(ellipse at 50% 20%, #f8f1e6 0%, #efe4d3 60%, #e2d2bc 100%),
    repeating-linear-gradient(90deg, rgba(140, 90, 40, 0.05) 0px, rgba(140, 90, 40, 0.05) 2px, transparent 2px, transparent 40px);
  border: 4px solid rgba(184, 125, 59, 0.35);
  box-shadow: 0 20px 40px -10px rgba(90, 55, 20, 0.15);
}

.stage-setlist-sheet {
  background: radial-gradient(ellipse at 50% 10%, #fffdf8 0%, #faf4e8 70%, #ede3d1 100%);
  transform: rotate(-0.75deg);
  transition: transform 0.3s ease;
}

:global([data-theme='light']) .stage-setlist-sheet {
  box-shadow: 0 12px 30px rgba(80, 45, 15, 0.18);
  border: 1px solid #d8c7ad;
}

.stage-setlist-sheet:hover {
  transform: rotate(0deg);
}

/* Classic Silver Stage Gaffer Tape with realistic metallic cloth weave */
.gaffer-tape {
  position: absolute;
  width: 95px;
  height: 28px;
  background: linear-gradient(135deg, #e4e4e4 0%, #bebebe 40%, #a8a8a8 70%, #d2d2d2 100%);
  filter: drop-shadow(0 3px 5px rgba(0, 0, 0, 0.65));
  clip-path: polygon(
    0% 0%, 100% 0%,
    96% 10%, 100% 20%, 95% 30%, 99% 40%, 95% 50%, 100% 60%, 95% 70%, 99% 80%, 96% 90%, 98% 100%,
    2% 100%,
    5% 90%, 1% 80%, 5% 70%, 0% 60%, 5% 50%, 1% 40%, 5% 30%, 0% 20%, 5% 10%, 0% 0%
  );
  z-index: 10;
  pointer-events: none;
}
.gaffer-tape::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: 
    repeating-linear-gradient(90deg, rgba(0,0,0,0.08) 0px, rgba(0,0,0,0.08) 1px, transparent 1px, transparent 2.5px),
    repeating-linear-gradient(0deg, rgba(255,255,255,0.12) 0px, rgba(255,255,255,0.12) 1px, transparent 1px, transparent 3px);
  opacity: 0.7;
}

.gaffer-tape-tl {
  top: -12px;
  left: -22px;
  transform: rotate(-38deg);
}

.gaffer-tape-tr {
  top: -12px;
  right: -22px;
  transform: rotate(36deg);
}

.gaffer-tape-bl {
  bottom: -12px;
  left: -22px;
  transform: rotate(40deg);
}

.gaffer-tape-br {
  bottom: -12px;
  right: -22px;
  transform: rotate(-35deg);
}

/* Authentic Rehearsal Coffee Mug Stains */
.coffee-stain {
  position: absolute;
  pointer-events: none;
  z-index: 5;
  mix-blend-mode: multiply;
}

.coffee-stain-main {
  width: 175px;
  height: 175px;
  top: 12px;
  right: 18px;
  transform: rotate(-15deg);
}

.coffee-stain-secondary {
  width: 135px;
  height: 135px;
  bottom: 20px;
  left: 15px;
  transform: rotate(25deg);
}

/* High-contrast Clean Print Styles for Stage Floor Board Tape-up */
@media print {
  :global(header),
  :global(footer),
  :global(nav),
  .no-print,
  .ambient-bg {
    display: none !important;
  }

  :global(body),
  :global(html) {
    background: #ffffff !important;
    color: #000000 !important;
  }

  .stage-floor-board {
    background: none !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  .stage-setlist-sheet {
    background: #ffffff !important;
    color: #000000 !important;
    border: 2px solid #000000 !important;
    box-shadow: none !important;
    transform: none !important;
    padding: 1.5cm !important;
    width: 100% !important;
    max-width: 100% !important;
  }

  .gaffer-tape,
  .coffee-stain {
    display: none !important;
  }

  .setlist-group {
    break-inside: avoid;
  }
}
</style>
