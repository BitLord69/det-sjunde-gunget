<script setup lang="ts">
const { adminUser, logout } = useAdminAuth()
const route = useRoute()

// Dedicated cookie-based theme persistence for Admin
const adminTheme = useCookie<'dark' | 'light'>('admin_theme', {
  maxAge: 60 * 60 * 24 * 365,
  default: () => 'dark',
})

const applyTheme = (theme: 'dark' | 'light') => {
  adminTheme.value = theme
  if (import.meta.client) {
    document.documentElement.setAttribute('data-theme', theme)
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
      document.documentElement.classList.remove('light')
    } else {
      document.documentElement.classList.add('light')
      document.documentElement.classList.remove('dark')
    }
  }
}

const toggleTheme = () => {
  const next = adminTheme.value === 'dark' ? 'light' : 'dark'
  applyTheme(next)
}

const isProfilePage = computed(() => route.path === '/admin/profile')

// Mobile user menu state
const isMobileUserMenuOpen = ref(false)

const toggleMobileUserMenu = () => {
  isMobileUserMenuOpen.value = !isMobileUserMenuOpen.value
}

const closeMobileUserMenu = () => {
  isMobileUserMenuOpen.value = false
}

const handleMobileLogout = async () => {
  closeMobileUserMenu()
  await logout()
}

// Auto-close menu when changing route
watch(() => route.path, () => {
  isMobileUserMenuOpen.value = false
})

onMounted(() => {
  applyTheme(adminTheme.value || 'dark')
})
</script>

<template>
  <div class="min-h-screen bg-base-100 text-base-content flex flex-col font-sans transition-colors duration-300">
    <!-- Admin Top Header Bar -->
    <header class="sticky top-0 z-40 bg-neutral/95 backdrop-blur-md border-b border-primary/20 shadow-md">
      <div class="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        <!-- Brand & CMS Badge -->
        <div class="flex items-center gap-2 sm:gap-3 min-w-0">
          <NuxtLink to="/admin" class="flex items-center gap-2 sm:gap-2.5 group min-w-0">
            <NuxtImg
              src="/media/brand/Logotyp_mini.webp"
              alt="Det 7:e Gunget"
              class="w-8 h-8 sm:w-9 sm:h-9 object-contain rounded-full border border-primary/30 group-hover:scale-105 transition-transform flex-shrink-0"
            />
            <div class="flex flex-col min-w-0">
              <span class="font-heading text-base sm:text-lg text-primary leading-none truncate">Det 7:e Gunget</span>
              <span class="text-[9px] sm:text-[10px] text-secondary font-mono tracking-wider uppercase font-bold truncate">Band Admin CMS</span>
            </div>
          </NuxtLink>

          <span class="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-[11px] font-bold text-primary flex-shrink-0">
            <span class="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            Live Backend
          </span>
        </div>

        <!-- Desktop Right Side Actions & Profile (md and up) -->
        <div class="hidden md:flex items-center gap-2 sm:gap-3">
          <!-- Active Logged In Admin Profile Link (Navigates to /admin/profile) -->
          <NuxtLink
            v-if="adminUser"
            to="/admin/profile"
            class="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition-all cursor-pointer group shadow-sm"
            :class="isProfilePage
              ? 'bg-primary text-primary-content border-primary font-bold shadow-md'
              : 'bg-base-300/80 hover:bg-base-300 border-primary/30 hover:border-primary text-base-content'"
            title="Gå till Min profil & kontoinställningar"
          >
            <div class="avatar placeholder">
              <div
                class="w-6 h-6 rounded-full text-[10px] font-bold overflow-hidden shadow-sm flex items-center justify-center"
                :class="isProfilePage ? 'bg-neutral text-primary' : 'bg-primary text-primary-content'"
              >
                <NuxtImg v-if="adminUser.avatarUrl" :src="adminUser.avatarUrl" :alt="adminUser.name" class="w-full h-full object-cover" />
                <span v-else>{{ adminUser.name.charAt(0) }}</span>
              </div>
            </div>
            <span class="font-bold" :class="isProfilePage ? 'text-primary-content' : 'text-primary group-hover:underline'">
              {{ adminUser.name }}
            </span>
            <span class="text-[10px] hidden lg:inline" :class="isProfilePage ? 'opacity-90' : 'text-base-content/60'">
              ({{ adminUser.email }})
            </span>
            <span class="text-[10px]" :class="isProfilePage ? 'text-primary-content' : 'text-primary/70'">⚙️</span>
          </NuxtLink>

          <!-- Light / Dark Mode Toggle with Dedicated Cookie -->
          <ClientOnly>
            <button
              type="button"
              class="btn btn-sm rounded-full gap-2 transition-all duration-300 font-bold border"
              :class="adminTheme === 'dark'
                ? 'bg-base-200 text-yellow-300 border-primary/30 hover:border-primary hover:bg-base-300'
                : 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200 shadow-sm'"
              :title="adminTheme === 'dark' ? 'Växla till ljust läge' : 'Växla till mörkt läge'"
              @click="toggleTheme"
            >
              <span class="text-base">{{ adminTheme === 'dark' ? '🌙' : '☀️' }}</span>
              <span class="text-xs font-mono hidden lg:inline">{{ adminTheme === 'dark' ? 'Mörkt' : 'Ljust' }}</span>
            </button>
          </ClientOnly>

          <!-- Back to Public Site -->
          <NuxtLink
            to="/"
            target="_blank"
            class="btn btn-outline btn-primary btn-xs sm:btn-sm rounded-full font-bold text-xs"
          >
            Sajten ↗
          </NuxtLink>

          <!-- Logout Button -->
          <button
            type="button"
            class="btn btn-ghost btn-xs sm:btn-sm rounded-full text-xs font-bold text-error hover:bg-error/15"
            @click="logout"
          >
            Logga ut
          </button>
        </div>

        <!-- Mobile Right Side Actions (< md) -->
        <div class="flex md:hidden items-center gap-1.5 relative">
          <!-- Quick Theme Toggle for Mobile -->
          <ClientOnly>
            <button
              type="button"
              class="w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-200 cursor-pointer text-sm"
              :class="adminTheme === 'dark'
                ? 'bg-base-200 text-yellow-300 border-primary/30 active:scale-95'
                : 'bg-amber-100 text-amber-900 border-amber-300 active:scale-95 shadow-xs'"
              :title="adminTheme === 'dark' ? 'Växla till ljust läge' : 'Växla till mörkt läge'"
              @click="toggleTheme"
            >
              <span>{{ adminTheme === 'dark' ? '🌙' : '☀️' }}</span>
            </button>
          </ClientOnly>

          <!-- Mobile User Menu Button -->
          <button
            v-if="adminUser"
            type="button"
            class="flex items-center gap-1 px-1.5 py-1 rounded-full border transition-all cursor-pointer shadow-xs"
            :class="isMobileUserMenuOpen
              ? 'bg-primary text-primary-content border-primary ring-2 ring-primary/40'
              : 'bg-base-200/90 hover:bg-base-300 border-primary/30 text-base-content'"
            aria-label="Öppna användarmeny"
            @click="toggleMobileUserMenu"
          >
            <div class="avatar placeholder">
              <div
                class="w-7 h-7 rounded-full text-[11px] font-bold overflow-hidden shadow-xs flex items-center justify-center"
                :class="isProfilePage ? 'bg-neutral text-primary' : 'bg-primary text-primary-content'"
              >
                <NuxtImg v-if="adminUser.avatarUrl" :src="adminUser.avatarUrl" :alt="adminUser.name" class="w-full h-full object-cover" />
                <span v-else>{{ adminUser.name.charAt(0) }}</span>
              </div>
            </div>
            <span class="text-[9px] transition-transform duration-200 px-0.5" :class="isMobileUserMenuOpen ? 'rotate-180' : ''">▼</span>
          </button>

          <!-- Backdrop overlay to dismiss dropdown on tap outside -->
          <div
            v-if="isMobileUserMenuOpen"
            class="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
            @click="closeMobileUserMenu"
          />

          <!-- Mobile User Dropdown Sheet / Popover -->
          <div
            v-if="isMobileUserMenuOpen && adminUser"
            class="absolute right-0 top-12 z-50 w-64 rounded-2xl bg-base-100 border border-primary/40 shadow-2xl p-3 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-150"
          >
            <!-- User Info Header -->
            <div class="flex items-center gap-2.5 p-2 rounded-xl bg-base-200/80 border border-primary/20">
              <div class="avatar placeholder flex-shrink-0">
                <div class="w-9 h-9 rounded-full bg-primary text-primary-content font-bold text-sm flex items-center justify-center overflow-hidden shadow-sm">
                  <NuxtImg v-if="adminUser.avatarUrl" :src="adminUser.avatarUrl" :alt="adminUser.name" class="w-full h-full object-cover" />
                  <span v-else>{{ adminUser.name.charAt(0) }}</span>
                </div>
              </div>
              <div class="flex flex-col min-w-0">
                <span class="font-bold text-sm text-primary leading-tight truncate">{{ adminUser.name }}</span>
                <span class="text-[11px] text-base-content/70 truncate">{{ adminUser.email }}</span>
                <span class="text-[9px] font-mono uppercase text-secondary font-bold mt-0.5">Band Admin</span>
              </div>
            </div>

            <!-- Action Links -->
            <div class="space-y-1 text-xs font-semibold">
              <NuxtLink
                to="/admin/profile"
                class="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl transition-colors"
                :class="isProfilePage ? 'bg-primary text-primary-content font-bold shadow-xs' : 'hover:bg-base-200 text-base-content'"
                @click="closeMobileUserMenu"
              >
                <span class="text-sm">⚙️</span>
                <span>Min profil & inställningar</span>
              </NuxtLink>

              <NuxtLink
                to="/"
                target="_blank"
                class="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl hover:bg-base-200 text-base-content transition-colors"
                @click="closeMobileUserMenu"
              >
                <span class="text-sm">🌐</span>
                <span>Besök sajten</span>
                <span class="text-[10px] ml-auto text-base-content/50">↗</span>
              </NuxtLink>

              <NuxtLink
                to="/admin/help"
                class="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl hover:bg-base-200 text-base-content transition-colors"
                @click="closeMobileUserMenu"
              >
                <span class="text-sm">❓</span>
                <span>Hjälp & adminmanual</span>
              </NuxtLink>
            </div>

            <!-- Divider -->
            <div class="border-t border-primary/20 pt-1" />

            <!-- Logout Button -->
            <button
              type="button"
              class="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-bold text-error hover:bg-error/15 transition-colors cursor-pointer"
              @click="handleMobileLogout"
            >
              <span class="text-sm">🚪</span>
              <span>Logga ut från CMS</span>
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Admin Content Slot -->
    <main class="flex-grow">
      <slot />
    </main>
  </div>
</template>
