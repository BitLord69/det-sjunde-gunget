<script setup lang="ts">
definePageMeta({
  layout: false,
})

useSeoMeta({
  title: 'Återställ lösenord | Det 7:e Gunget Admin',
  description: 'Välj ett nytt lösenord för ditt administratörskonto.',
})

const route = useRoute()
const token = computed(() => (route.query.token as string) || '')

const newPassword = ref('')
const confirmPassword = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const handleResetPassword = async () => {
  errorMessage.value = ''
  successMessage.value = null as any

  if (!token.value) {
    errorMessage.value = 'Ingen återställningstoken hittades. Vänligen klicka på länken i ditt e-postmeddelande.'
    return
  }

  if (newPassword.value.length < 6) {
    errorMessage.value = 'Lösenordet måste innehålla minst 6 tecken.'
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = 'Lösenorden matchar inte varandra.'
    return
  }

  isLoading.value = true

  try {
    const res = await $fetch<{ success: boolean; message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: {
        token: token.value,
        newPassword: newPassword.value,
      },
    })

    successMessage.value = res.message || 'Lösenordet har uppdaterats! Loggar in...'
    setTimeout(() => {
      navigateTo('/admin')
    }, 1500)
  } catch (err: any) {
    errorMessage.value = err?.data?.message || 'Kunde inte återställa lösenordet. Länken kan ha gått ut.'
  } finally {
    isLoading.value = false
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
            class="w-20 h-20 mx-auto object-contain drop-shadow-xl"
            priority
          />
        </NuxtLink>
        <div>
          <h1 class="font-heading text-2xl text-primary font-bold">
            Välj nytt lösenord
          </h1>
          <p class="text-xs text-base-content/70 mt-1">
            Ange ett säkert lösenord (minst 6 tecken) för ditt administratörskonto.
          </p>
        </div>
      </div>

      <!-- Error Alert -->
      <div v-if="errorMessage" class="p-3.5 bg-error/20 border border-error/40 text-error rounded-xl text-xs font-bold flex items-center gap-2">
        <span>⚠️</span>
        <span>{{ errorMessage }}</span>
      </div>

      <!-- Success Alert -->
      <div v-if="successMessage" class="p-3.5 bg-success/20 border border-success/40 text-success rounded-xl text-xs font-bold flex items-center gap-2">
        <span>✓</span>
        <span>{{ successMessage }}</span>
      </div>

      <!-- Reset Password Form -->
      <form v-if="!successMessage" class="space-y-4" @submit.prevent="handleResetPassword">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">Nytt lösenord</label>
          <input
            v-model="newPassword"
            type="password"
            required
            minlength="6"
            placeholder="••••••••"
            class="input input-bordered w-full bg-base-100 text-sm focus:border-primary text-base-content"
          />
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">Bekräfta nytt lösenord</label>
          <input
            v-model="confirmPassword"
            type="password"
            required
            minlength="6"
            placeholder="••••••••"
            class="input input-bordered w-full bg-base-100 text-sm focus:border-primary text-base-content"
          />
        </div>

        <button
          type="submit"
          class="btn btn-primary w-full font-bold shadow-lg shadow-primary/20 text-base"
          :disabled="isLoading"
        >
          {{ isLoading ? 'Sparar...' : 'Spara nytt lösenord →' }}
        </button>
      </form>

      <!-- Back to login link -->
      <div class="text-center pt-2">
        <NuxtLink to="/admin/login" class="text-xs text-secondary hover:text-primary font-bold transition-colors">
          ← Tillbaka till inloggning
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
