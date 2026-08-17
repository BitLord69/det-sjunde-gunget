<script setup lang="ts">
const colorMode = useColorMode()
const { adminUser, logout, changePassword, isLoading } = useAdminAuth()

const isPasswordModalOpen = ref(false)
const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordMsg = ref<{ type: 'success' | 'error'; text: string } | null>(null)

const toggleTheme = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

const handlePasswordChange = async () => {
  passwordMsg.value = null

  if (newPassword.value !== confirmPassword.value) {
    passwordMsg.value = { type: 'error', text: 'De nya lösenorden matchar inte varandra.' }
    return
  }

  const result = await changePassword(oldPassword.value, newPassword.value)
  if (result.success) {
    passwordMsg.value = { type: 'success', text: result.message || 'Lösenordet har ändrats!' }
    oldPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    setTimeout(() => {
      isPasswordModalOpen.value = false
      passwordMsg.value = null
    }, 1500)
  } else {
    passwordMsg.value = { type: 'error', text: result.error || 'Kunde inte ändra lösenord.' }
  }
}
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
        <div class="flex items-center gap-3">
          <!-- Active Logged In Admin Profile -->
          <div v-if="adminUser" class="flex items-center gap-2 bg-base-300/80 px-3 py-1.5 rounded-full border border-primary/20 text-xs">
            <div class="avatar placeholder">
              <div class="w-6 h-6 rounded-full bg-primary text-primary-content text-[10px] font-bold overflow-hidden">
                <NuxtImg v-if="adminUser.avatarUrl" :src="adminUser.avatarUrl" :alt="adminUser.name" class="w-full h-full object-cover" />
                <span v-else>{{ adminUser.name.charAt(0) }}</span>
              </div>
            </div>
            <span class="font-bold text-primary">{{ adminUser.name }}</span>
          </div>

          <!-- Change Password Button -->
          <button
            type="button"
            class="btn btn-ghost btn-xs sm:btn-sm rounded-full text-xs font-bold text-base-content/80 hover:text-primary"
            title="Byt lösenord"
            @click="isPasswordModalOpen = true"
          >
            🔑 <span class="hidden sm:inline">Byt lösenord</span>
          </button>

          <!-- Light / Dark Mode Toggle -->
          <ClientOnly>
            <button
              type="button"
              class="btn btn-ghost btn-circle btn-sm text-base hover:bg-primary/20 transition-colors"
              :title="colorMode.value === 'dark' ? 'Växla till ljust läge' : 'Växla till mörkt läge'"
              @click="toggleTheme"
            >
              <span v-if="colorMode.value === 'dark'">☀️</span>
              <span v-else>🌙</span>
            </button>
          </ClientOnly>

          <!-- Back to Public Site -->
          <NuxtLink
            to="/"
            target="_blank"
            class="btn btn-outline btn-primary btn-xs sm:btn-sm rounded-full font-bold text-xs"
          >
            Till sajten ↗
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

    <!-- Change Password Modal -->
    <div
      v-if="isPasswordModalOpen"
      class="fixed inset-0 z-50 bg-neutral/80 backdrop-blur-sm flex items-center justify-center p-4"
      @click="isPasswordModalOpen = false"
    >
      <div
        class="bg-base-200 p-6 sm:p-8 rounded-2xl border border-primary/30 max-w-md w-full shadow-2xl space-y-4"
        @click.stop
      >
        <div class="flex items-center justify-between border-b border-primary/20 pb-3">
          <h3 class="font-heading text-xl text-primary font-bold">Byt lösenord</h3>
          <button
            type="button"
            class="btn btn-sm btn-circle btn-ghost text-xs"
            @click="isPasswordModalOpen = false"
          >
            ✕
          </button>
        </div>

        <div v-if="passwordMsg" class="p-3 rounded-xl text-xs font-bold" :class="passwordMsg.type === 'success' ? 'bg-success/20 text-success' : 'bg-error/20 text-error'">
          {{ passwordMsg.text }}
        </div>

        <form class="space-y-3" @submit.prevent="handlePasswordChange">
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Nuvarande lösenord</label>
            <input
              v-model="oldPassword"
              type="password"
              required
              class="input input-bordered w-full bg-base-100 input-sm text-sm"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Nytt lösenord (minst 6 tecken)</label>
            <input
              v-model="newPassword"
              type="password"
              required
              minlength="6"
              class="input input-bordered w-full bg-base-100 input-sm text-sm"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Bekräfta nytt lösenord</label>
            <input
              v-model="confirmPassword"
              type="password"
              required
              minlength="6"
              class="input input-bordered w-full bg-base-100 input-sm text-sm"
              placeholder="••••••••"
            />
          </div>

          <div class="flex items-center gap-3 pt-3">
            <button
              type="submit"
              class="btn btn-primary btn-sm rounded-full font-bold flex-1"
              :disabled="isLoading"
            >
              {{ isLoading ? 'Sparar...' : 'Spara nytt lösenord' }}
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-sm rounded-full"
              @click="isPasswordModalOpen = false"
            >
              Avbryt
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
