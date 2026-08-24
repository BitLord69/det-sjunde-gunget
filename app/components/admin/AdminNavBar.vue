<script setup lang="ts">
const props = defineProps<{
  dirty?: boolean
}>()

const route = useRoute()
const isMobileDropdownOpen = ref(false)

// Fetch fresh unread messages count for booking notifications badge
const { data: messagesData } = await useFetch<any[]>('/api/admin/messages', { default: () => [], lazy: true })

const unreadMessagesCount = computed(() => {
  if (!messagesData.value || !Array.isArray(messagesData.value)) return 0
  return messagesData.value.filter((m: any) => m.status === 'unread').length
})

const navItems = computed(() => [
  { path: '/admin/songs', label: 'Låtar' },
  { path: '/admin/ideas', label: 'Idébank' },
  { path: '/admin/gigs', label: 'Gig' },
  { path: '/admin/band', label: 'Bandet' },
  { path: '/admin/setlist', label: 'Setlist' },
  { path: '/admin/gallery', label: 'Galleri' },
  { path: '/admin/hashtags', label: 'Taggar' },
  {
    path: '/admin/messages',
    label: 'Bokningar',
    badge: unreadMessagesCount.value > 0 ? `${unreadMessagesCount.value}` : null,
  },
  { path: '/admin/admins', label: 'Admins' },
  { path: '/admin/subscribers', label: 'Nyhetsbrev' },
  { path: '/admin/merch', label: 'Merch' },
  { path: '/admin/settings', label: 'Inställningar' },
])

const isCurrent = (path: string) => {
  return route.path === path || route.path.startsWith(path + '/')
}

const activeNavItem = computed(() => {
  return navItems.value.find((item) => isCurrent(item.path)) || navItems.value[0]
})

const handleNav = (targetPath: string) => {
  isMobileDropdownOpen.value = false
  if (route.path === targetPath) return
  if (props.dirty) {
    const ok = confirm('⚠️ Du har osparade ändringar eller ett öppet formulär.\n\nVill du verkligen lämna sidan och kasta dina osparade ändringar?')
    if (!ok) return
  }
  navigateTo(targetPath)
}
</script>

<template>
  <nav class="border-b border-primary/20 bg-base-100/60 backdrop-blur-sm mb-4">
    <!-- 1. DESKTOP & TABLET: Ultra-Condensed Single-Line Text Links (No Icons) -->
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
          title="Nya bokningsförfrågningar"
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

    <!-- 2. MOBILE PHONE (< md): Compact, Elegant Dropdown & Quick Scroll Tabs -->
    <div class="md:hidden py-2 space-y-2">
      <!-- Mobile Active Bar & Drawer Toggle -->
      <div class="flex items-center justify-between gap-3 bg-base-200/90 p-2.5 rounded-2xl border border-primary/30 shadow-md">
        <button
          type="button"
          class="flex items-center gap-2 font-bold text-primary text-sm flex-grow text-left cursor-pointer"
          @click="isMobileDropdownOpen = !isMobileDropdownOpen"
        >
          <div class="flex flex-col">
            <span class="text-[10px] uppercase font-mono text-secondary font-bold leading-none">Aktiv flik</span>
            <span class="font-heading text-sm">{{ activeNavItem?.label }}</span>
          </div>
          <span
            v-if="activeNavItem?.badge"
            class="badge badge-xs bg-amber-400 text-neutral font-mono font-black px-1.5 py-0.5 rounded-full ml-1"
          >
            {{ activeNavItem.badge }}
          </span>
          <span
            v-if="dirty"
            class="badge badge-warning badge-xs font-bold animate-pulse ml-auto"
          >
            ⚠️ Osparad
          </span>
        </button>

        <button
          type="button"
          class="btn btn-xs btn-primary font-bold rounded-xl flex items-center gap-1 cursor-pointer"
          @click="isMobileDropdownOpen = !isMobileDropdownOpen"
        >
          <span>Meny</span>
          <span class="text-[10px] transition-transform duration-200" :class="isMobileDropdownOpen ? 'rotate-180' : ''">▼</span>
        </button>
      </div>

      <!-- Mobile Dropdown Menu Drawer -->
      <div
        v-if="isMobileDropdownOpen"
        class="stage-card p-3 rounded-2xl border border-primary/40 shadow-2xl space-y-1 divide-y divide-primary/10 bg-base-100"
      >
        <button
          v-for="item in navItems"
          :key="item.path"
          type="button"
          class="w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs font-bold cursor-pointer transition-colors"
          :class="isCurrent(item.path) ? 'bg-primary text-primary-content font-black shadow' : 'text-base-content/80 hover:bg-base-200 hover:text-primary'"
          @click="handleNav(item.path)"
        >
          <span>{{ item.label }}</span>

          <div class="flex items-center gap-1.5 font-mono text-[11px]">
            <span v-if="item.badge" class="badge badge-xs bg-amber-400 text-neutral font-black px-1.5 py-0.5 rounded-full">
              {{ item.badge }}
            </span>
            <span v-if="isCurrent(item.path)" class="text-xs font-bold text-primary-content">✓</span>
          </div>
        </button>
      </div>

      <!-- Horizontal Quick Touch Scroller for Fast Thumb Access on Mobile -->
      <div class="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 text-xs">
        <button
          v-for="item in navItems"
          :key="item.path"
          type="button"
          class="px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer flex-shrink-0"
          :class="isCurrent(item.path) ? 'bg-primary text-primary-content font-bold shadow' : 'bg-base-200/90 text-base-content/70 hover:text-primary'"
          @click="handleNav(item.path)"
        >
          <span>{{ item.label }}</span>
          <span
            v-if="item.badge"
            class="badge badge-xs bg-amber-400 text-neutral font-mono font-black px-1 py-0.2 rounded-full text-[10px]"
          >
            {{ item.badge }}
          </span>
        </button>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
