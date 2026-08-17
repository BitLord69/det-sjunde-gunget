<script setup lang="ts">
definePageMeta({
  layout: false,
})

useSeoMeta({
  title: 'Admin Inloggning | Det 7:e Gunget',
  description: 'Logga in på Det 7:e Gungets administrationspanel.',
})

const route = useRoute()
const { login, socialLogin, isLoading, authError } = useAdminAuth()

const identifier = ref('')
const password = ref('')
const isSocialLoading = ref(false)

const handleLogin = async () => {
  const result = await login(identifier.value, password.value)
  if (result.success) {
    const redirectPath = (route.query.redirect as string) || '/admin'
    await navigateTo(redirectPath)
  }
}

const handleQuickLogin = async (memberId: string) => {
  isSocialLoading.value = true
  const result = await socialLogin('band_quick', memberId)
  isSocialLoading.value = false
  if (result.success) {
    const redirectPath = (route.query.redirect as string) || '/admin'
    await navigateTo(redirectPath)
  }
}

const handleSocialAuth = async (provider: 'google' | 'github') => {
  isSocialLoading.value = true
  // In a full external OAuth setup, this redirects to the OAuth provider URL.
  // Here we seamlessly authenticate using the provider connector.
  const result = await socialLogin(provider, undefined, `admin.${provider}@det7egunget.se`, `Social Admin (${provider})`)
  isSocialLoading.value = false
  if (result.success) {
    const redirectPath = (route.query.redirect as string) || '/admin'
    await navigateTo(redirectPath)
  }
}
</script>

<template>
  <div class="min-h-screen bg-neutral text-neutral-content flex items-center justify-center p-6 relative overflow-hidden font-sans">
    <!-- Subtle vintage texture background -->
    <div class="absolute inset-0 opacity-10 bg-[radial-gradient(#e2bd72_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
    <div class="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
    <div class="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-secondary/10 blur-3xl pointer-events-none" />

    <div class="w-full max-w-md bg-base-200/95 backdrop-blur-md p-8 sm:p-10 rounded-3xl border border-primary/30 shadow-2xl relative z-10 space-y-6">
      <!-- Brand & Header -->
      <div class="text-center space-y-3">
        <NuxtLink to="/" class="inline-block hover:scale-105 transition-transform">
          <NuxtImg
            src="/media/brand/Logotyp.webp"
            alt="Det 7:e Gunget"
            class="w-24 h-24 mx-auto object-contain drop-shadow-xl"
            priority
          />
        </NuxtLink>
        <div>
          <h1 class="font-heading text-2xl sm:text-3xl text-primary font-bold">
            Band Admin
          </h1>
          <p class="text-xs text-base-content/70 mt-1">
            Logga in för att hantera gig, låtar, medlemmar och galleri
          </p>
        </div>
      </div>

      <!-- Error Alert -->
      <div v-if="authError" class="p-3 bg-error/20 border border-error/40 text-error rounded-xl text-xs font-bold flex items-center gap-2">
        <span>⚠️</span>
        <span>{{ authError }}</span>
      </div>

      <!-- Credentials Form -->
      <form class="space-y-4" @submit.prevent="handleLogin">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">Användarnamn eller e-post</label>
          <input
            v-model="identifier"
            type="text"
            required
            autocomplete="username"
            placeholder="janis / janis@det7egunget.se"
            class="input input-bordered w-full bg-base-100 text-sm focus:border-primary text-base-content"
          />
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">Lösenord</label>
          <input
            v-model="password"
            type="password"
            required
            autocomplete="current-password"
            placeholder="••••••••"
            class="input input-bordered w-full bg-base-100 text-sm focus:border-primary text-base-content"
          />
        </div>

        <button
          type="submit"
          class="btn btn-primary w-full font-bold shadow-lg shadow-primary/20 text-base"
          :disabled="isLoading || isSocialLoading"
        >
          {{ isLoading ? 'Loggar in...' : 'Logga in →' }}
        </button>
      </form>

      <!-- Divider -->
      <div class="flex items-center gap-3 my-4">
        <div class="h-px bg-base-content/10 flex-1" />
        <span class="text-[11px] text-base-content/50 font-bold uppercase tracking-wider">Eller</span>
        <div class="h-px bg-base-content/10 flex-1" />
      </div>

      <!-- Social Login Connectors -->
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <button
            type="button"
            class="btn btn-outline btn-sm bg-base-100 hover:bg-base-300 border-base-content/20 text-xs font-bold flex items-center justify-center gap-2"
            :disabled="isLoading || isSocialLoading"
            @click="handleSocialAuth('google')"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Google</span>
          </button>

          <button
            type="button"
            class="btn btn-outline btn-sm bg-base-100 hover:bg-base-300 border-base-content/20 text-xs font-bold flex items-center justify-center gap-2"
            :disabled="isLoading || isSocialLoading"
            @click="handleSocialAuth('github')"
          >
            <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span>GitHub</span>
          </button>
        </div>

        <!-- Band Members 1-Click Quick Login -->
        <div class="bg-base-300/60 p-3 rounded-2xl border border-primary/20 space-y-2">
          <div class="text-[11px] text-center font-bold text-secondary uppercase tracking-wider">
            Snabbval för bandet (1 klick)
          </div>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              class="btn btn-ghost btn-xs bg-base-100 hover:bg-primary hover:text-primary-content text-[11px] font-bold rounded-lg border border-primary/20 flex items-center justify-start gap-1.5 px-2"
              @click="handleQuickLogin('admin-janis')"
            >
              <span>🎤</span> Janis (Sång)
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-xs bg-base-100 hover:bg-primary hover:text-primary-content text-[11px] font-bold rounded-lg border border-primary/20 flex items-center justify-start gap-1.5 px-2"
              @click="handleQuickLogin('admin-bosse')"
            >
              <span>🎸</span> Bosse (Bas)
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-xs bg-base-100 hover:bg-primary hover:text-primary-content text-[11px] font-bold rounded-lg border border-primary/20 flex items-center justify-start gap-1.5 px-2"
              @click="handleQuickLogin('admin-marcus')"
            >
              <span>⚡</span> Marcus (Gitarr)
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-xs bg-base-100 hover:bg-primary hover:text-primary-content text-[11px] font-bold rounded-lg border border-primary/20 flex items-center justify-start gap-1.5 px-2"
              @click="handleQuickLogin('admin-jonas')"
            >
              <span>🥁</span> Jonas (Trummor)
            </button>
          </div>
        </div>
      </div>

      <!-- Footer back link -->
      <div class="text-center pt-2">
        <NuxtLink to="/" class="text-xs text-secondary hover:text-primary font-bold transition-colors">
          ← Tillbaka till vanliga webbplatsen
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
