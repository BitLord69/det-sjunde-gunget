<script setup lang="ts">
const props = defineProps<{
  dirty?: boolean
}>()

const emit = defineEmits<{
  (e: 'discard'): void
}>()

const route = useRoute()
const isMobileDropdownOpen = ref(false)
const showLeaveModal = ref(false)
const pendingTargetPath = ref<string | null>(null)

const pendingNavItem = computed(() => {
  if (!pendingTargetPath.value) return null
  return navItems.value.find((i) => i.path === pendingTargetPath.value) || null
})

// Fetch fresh unread messages count for booking notifications badge
const { data: messagesData } = await useFetch<any[]>('/api/admin/messages', { default: () => [], lazy: true })
const { data: fanCentralData } = await useFetch<{ counts?: { pending: number } }>('/api/admin/fan-central/submissions', { default: () => ({ counts: { pending: 0 } }), lazy: true })

const unreadMessagesCount = computed(() => {
  if (!messagesData.value || !Array.isArray(messagesData.value)) return 0
  return messagesData.value.filter((m: any) => m.status === 'unread').length
})

const pendingFanCount = computed(() => {
  return fanCentralData.value?.counts?.pending || 0
})

const totalBadgeCount = computed(() => {
  return (unreadMessagesCount.value || 0) + (pendingFanCount.value || 0)
})

const navItems = computed(() => [
  { path: '/admin/songs', label: 'Låtar', icon: '🎵' },
  { path: '/admin/ideas', label: 'Idébank', icon: '🎙️' },
  { path: '/admin/gigs', label: 'Gig', icon: '🗓️' },
  { path: '/admin/band', label: 'Bandet', icon: '👥' },
  { path: '/admin/setlist', label: 'Setlist', icon: '📋' },
  { path: '/admin/gallery', label: 'Galleri', icon: '📷' },
  {
    path: '/admin/fancentral',
    label: 'Fan Central',
    icon: '📌',
    badge: pendingFanCount.value > 0 ? `${pendingFanCount.value}` : null,
  },
  { path: '/admin/hashtags', label: 'Taggar', icon: '🏷️' },
  {
    path: '/admin/messages',
    label: 'Bokningar',
    icon: '📬',
    badge: unreadMessagesCount.value > 0 ? `${unreadMessagesCount.value}` : null,
  },
  { path: '/admin/admins', label: 'Admins', icon: '👤' },
  { path: '/admin/subscribers', label: 'Nyhetsbrev', icon: '💌' },
  { path: '/admin/merch', label: 'Merch', icon: '👕' },
  { path: '/admin/settings', label: 'Inställningar', icon: '⚙️' },
  { path: '/admin/help', label: 'Hjälp', icon: '❓' },
])

const isCurrent = (path: string) => {
  return route.path === path || route.path.startsWith(path + '/')
}

const activeNavItem = computed(() => {
  return navItems.value.find((item) => isCurrent(item.path)) || navItems.value[0]
})

const handleNav = async (targetPath: string) => {
  isMobileDropdownOpen.value = false

  // Om formuläret är öppet eller har osparade ändringar: visa alltid in-app bekräftelsedialog
  if (props.dirty) {
    pendingTargetPath.value = targetPath
    showLeaveModal.value = true
    return
  }

  // Om inte dirty och användaren klickar på samma sektion: avbryt tidigt
  if (route.path === targetPath) return

  await navigateTo(targetPath)
}

const confirmLeave = async () => {
  const target = pendingTargetPath.value
  showLeaveModal.value = false
  pendingTargetPath.value = null

  // Trigga discard så att sidans öppna formulär stängs och återställs
  emit('discard')

  // Om målet är en annan sida: navigera dit
  if (target && target !== route.path) {
    await navigateTo(target)
  }
}

const cancelLeave = () => {
  showLeaveModal.value = false
  pendingTargetPath.value = null
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && showLeaveModal.value) {
    cancelLeave()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <nav class="relative z-40 border-b border-primary/20 bg-base-100/90 mb-4">
    <!-- 1. DESKTOP & TABLET (>= md): Ultra-Condensed Single-Line Text Links (No Icons) -->
    <div class="hidden md:flex items-center justify-between gap-1 lg:gap-3 py-1.5 text-xs lg:text-sm font-semibold tracking-wide font-sans">
      <button
        v-for="item in navItems"
        :key="item.path"
        type="button"
        class="group inline-flex items-center gap-1 py-1.5 px-2 transition-all border-b-2 cursor-pointer whitespace-nowrap font-medium relative focus:outline-none"
        :class="[
          isCurrent(item.path)
            ? 'text-primary border-primary font-bold shadow-[0_2px_0_0_rgba(226,189,114,0.8)]'
            : 'text-base-content/70 hover:text-primary border-transparent hover:border-primary/40'
        ]"
        @click="handleNav(item.path)"
      >
        <span>{{ item.label }}</span>

        <!-- Compact Number Badge for Unread Booking Requests -->
        <span
          v-if="item.badge"
          class="badge badge-xs bg-amber-400 text-neutral font-mono font-black animate-pulse px-1.5 py-0.5 rounded-full shadow-sm"
          title="Nya händelser"
        >
          {{ item.badge }}
        </span>

        <!-- Pulsing dirty indicator -->
        <span
          v-if="dirty && isCurrent(item.path)"
          class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping absolute top-1 -right-0.5"
          title="Osparade ändringar"
        />
      </button>
    </div>

    <!-- 2. MOBILE PHONE (< md): Clean Active Bar with Hamburger Menu Sheet -->
    <div class="md:hidden py-1">
      <!-- Active Section Bar with Tap-to-Open -->
      <div
        class="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-base-200/90 border border-primary/30 shadow-xs cursor-pointer hover:border-primary/60 transition-all select-none"
        @click="isMobileDropdownOpen = !isMobileDropdownOpen"
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="text-base flex-shrink-0">{{ activeNavItem?.icon }}</span>
          <div class="flex flex-col min-w-0">
            <span class="text-[9px] uppercase font-mono text-secondary font-bold tracking-wider leading-none">Aktiv sektion</span>
            <span class="font-heading text-sm font-bold text-primary truncate mt-0.5">{{ activeNavItem?.label }}</span>
          </div>
          <span
            v-if="activeNavItem?.badge"
            class="badge badge-xs bg-amber-400 text-neutral font-mono font-black px-1.5 py-0.5 rounded-full ml-1"
          >
            {{ activeNavItem.badge }}
          </span>
          <span
            v-if="dirty"
            class="badge badge-warning badge-xs font-bold animate-pulse ml-1"
            title="Osparade ändringar"
          >
            ⚠️ Osparad
          </span>
        </div>

        <!-- Hamburger Icon Button with Badge -->
        <button
          type="button"
          class="w-8 h-8 rounded-full flex items-center justify-center border border-primary/30 bg-base-100 text-primary font-bold text-sm cursor-pointer shadow-xs active:scale-95 transition-all relative flex-shrink-0 ml-2"
          :class="isMobileDropdownOpen ? 'bg-primary text-primary-content border-primary ring-2 ring-primary/40' : ''"
          aria-label="Öppna adminsektioner"
          title="Öppna adminsektioner"
          @click.stop="isMobileDropdownOpen = !isMobileDropdownOpen"
        >
          <span>☰</span>
          <span
            v-if="totalBadgeCount > 0"
            class="badge badge-xs bg-amber-400 text-neutral font-mono font-black px-1 rounded-full text-[9px] absolute -top-1 -right-1 shadow-xs"
          >
            {{ totalBadgeCount }}
          </span>
        </button>
      </div>

      <!-- Teleport modal and overlay to body to escape all parent stacking contexts -->
      <Teleport to="body">
        <!-- Backdrop Overlay for Mobile Sheet -->
        <div
          v-if="isMobileDropdownOpen"
          class="fixed inset-0 z-[999] bg-black/60 backdrop-blur-xs md:hidden"
          @click="isMobileDropdownOpen = false"
        />

        <!-- Floating All-Tabs Modal Sheet for Mobile -->
        <div
          v-if="isMobileDropdownOpen"
          class="fixed inset-x-3 top-16 z-[1000] max-h-[80vh] overflow-y-auto stage-card p-4 rounded-2xl border border-primary/40 shadow-2xl space-y-3 bg-base-100 md:hidden animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div class="flex items-center justify-between border-b border-primary/20 pb-2">
            <div class="flex items-center gap-2">
              <span class="text-lg">🛠️</span>
              <span class="font-heading text-base text-primary font-bold">Välj adminsektion</span>
              <span class="text-xs text-base-content/60 font-mono">({{ navItems.length }})</span>
            </div>
            <button
              type="button"
              class="btn btn-ghost btn-xs btn-circle text-base-content/70 hover:text-primary"
              @click="isMobileDropdownOpen = false"
            >
              ✕
            </button>
          </div>

          <div class="grid grid-cols-2 gap-2 text-xs font-semibold">
            <button
              v-for="item in navItems"
              :key="item.path"
              type="button"
              class="flex items-center justify-between p-2.5 rounded-xl text-left cursor-pointer transition-all border"
              :class="isCurrent(item.path)
                ? 'bg-primary text-primary-content border-primary font-bold shadow-sm'
                : 'bg-base-200/80 hover:bg-base-200 border-primary/15 text-base-content'"
              @click="handleNav(item.path)"
            >
              <div class="flex items-center gap-1.5 min-w-0">
                <span class="text-sm flex-shrink-0">{{ item.icon }}</span>
                <span class="truncate">{{ item.label }}</span>
              </div>
              <span v-if="item.badge" class="badge badge-xs bg-amber-400 text-neutral font-black ml-1 flex-shrink-0">
                {{ item.badge }}
              </span>
              <span v-else-if="isCurrent(item.path)" class="text-xs font-bold text-primary-content ml-1 flex-shrink-0">✓</span>
            </button>
          </div>
        </div>
      </Teleport>
    </div>

    <!-- In-App Modal för bekräftelse vid osparade ändringar i formulär -->
    <Teleport to="body">
      <div
        v-if="showLeaveModal"
        class="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-modal-title"
        @click.self="cancelLeave"
      >
        <div
          class="stage-card bg-base-100 border-2 border-primary/50 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 text-center relative"
        >
          <!-- Varningsikon -->
          <div class="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center text-3xl mx-auto shadow-inner">
            ⚠️
          </div>

          <!-- Titel & förklaring -->
          <div class="space-y-2">
            <h3 id="leave-modal-title" class="font-heading text-xl sm:text-2xl font-bold text-primary">
              Osparade ändringar
            </h3>
            <p class="text-xs sm:text-sm text-base-content/80 leading-relaxed">
              Du har ett öppet formulär eller osparade ändringar på den här sidan.
            </p>

            <!-- Målinformation -->
            <div
              v-if="pendingNavItem && pendingNavItem.path !== route.path"
              class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-base-200/90 border border-primary/25 text-xs text-base-content/90 font-medium mt-1"
            >
              <span>Navigerar till:</span>
              <span class="font-bold text-primary">{{ pendingNavItem.icon }} {{ pendingNavItem.label }}</span>
            </div>
            <div
              v-else
              class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-base-200/90 border border-primary/25 text-xs text-base-content/90 font-medium mt-1"
            >
              <span>Stänger formuläret och återgår till listan.</span>
            </div>
          </div>

          <!-- Tydliga knappar: Lämna (röd/danger) vs Stanna (ghost) -->
          <div class="flex flex-col sm:flex-row items-stretch gap-2.5 pt-2">
            <button
              type="button"
              class="btn btn-error btn-sm sm:btn-md rounded-full font-bold flex-1 cursor-pointer shadow-md hover:scale-[1.02] active:scale-95 transition-all text-white"
              @click="confirmLeave"
            >
              Ja, lämna formuläret
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-sm sm:btn-md rounded-full font-bold flex-1 border border-base-content/25 cursor-pointer hover:bg-base-200"
              @click="cancelLeave"
            >
              Stanna kvar & spara
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </nav>
</template>
