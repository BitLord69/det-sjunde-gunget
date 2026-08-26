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

onMounted(() => {
  applyTheme(adminTheme.value || 'dark')
})
</script>

<template>
  <div class="min-h-screen bg-base-100 text-base-content flex flex-col font-sans transition-colors duration-300">
    <!-- Admin Top Header Bar -->
    <header class="sticky top-0 z-40 bg-neutral/95 backdrop-blur-md border-b border-primary/20 shadow-md">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <!-- Brand & CMS Badge -->
        <div class="flex items-center gap-3">
          <NuxtLink to="/admin" class="flex items-center gap-2.5 group">
            <NuxtImg
              src="/media/brand/Logotyp_mini.webp"
              alt="Det 7:e Gunget"
              class="w-9 h-9 object-contain rounded-full border border-primary/30 group-hover:scale-105 transition-transform"
            />
            <div class="flex flex-col">
              <span class="font-heading text-lg text-primary leading-none">Det 7:e Gunget</span>
              <span class="text-[10px] text-secondary font-mono tracking-wider uppercase font-bold">Band Admin CMS</span>
            </div>
          </NuxtLink>

          <span class="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-[11px] font-bold text-primary">
            <span class="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            Live Backend
          </span>
        </div>

        <!-- Right Side Actions & Profile -->
        <div class="flex items-center gap-2 sm:gap-3">
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
            <span class="text-[10px] hidden md:inline" :class="isProfilePage ? 'opacity-90' : 'text-base-content/60'">
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
              <span class="text-xs font-mono hidden md:inline">{{ adminTheme === 'dark' ? 'Mörkt' : 'Ljust' }}</span>
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
      </div>
    </header>

    <!-- Admin Content Slot -->
    <main class="flex-grow">
      <slot />
    </main>
  </div>
</template>
