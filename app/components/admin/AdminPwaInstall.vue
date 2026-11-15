<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'header' | 'menu' | 'card' }>(), { variant: 'header' })

const { state, install } = useAdminPwa()
const guide = ref<HTMLDialogElement | null>(null)

const startInstall = async () => {
  const result = await install()
  if (result === 'guide') guide.value?.showModal()
}
</script>

<template>
  <div v-if="variant === 'card' || !state.installed">
    <div v-if="variant === 'card'" class="stage-card p-6 sm:p-7 rounded-3xl border border-primary/30 shadow-xl space-y-4 bg-base-100/95">
      <div class="border-b border-primary/20 pb-3">
        <h3 class="font-heading text-lg text-primary font-bold">📱 Admin som app</h3>
        <p class="text-xs text-base-content/70">Öppna administrationen från hemskärmen eller datorn.</p>
      </div>
      <p v-if="state.installed" class="text-sm text-success" role="status">Admin är installerad eller öppnad som app på den här enheten.</p>
      <template v-else>
        <p class="text-sm text-base-content/80">{{ state.canPrompt ? 'Webbläsaren erbjuder installation på den här enheten.' : 'Installationssättet beror på din webbläsare och enhet.' }}</p>
        <button type="button" class="btn btn-primary btn-sm rounded-full" @click="startInstall">
          {{ state.canPrompt ? 'Installera admin' : 'Visa installationsguide' }}
        </button>
      </template>
      <p class="text-xs text-base-content/60">Appen kräver internetanslutning och vanlig inloggning.</p>
    </div>
    <button
      v-else
      type="button"
      :class="variant === 'menu' ? 'flex items-center gap-2.5 w-full px-3 py-2 rounded-xl hover:bg-base-200 text-base-content transition-colors text-left' : 'btn btn-outline btn-primary btn-xs sm:btn-sm rounded-full font-bold text-xs'"
      @click="startInstall"
    >
      <span aria-hidden="true">📲</span> {{ state.canPrompt ? 'Installera admin' : 'Installationsguide' }}
    </button>

    <dialog ref="guide" class="modal" aria-label="Installera admin som app">
      <div class="modal-box space-y-4">
        <h2 class="font-heading text-lg font-bold text-primary">Installera admin som app</h2>
        <template v-if="state.isAppleMobile">
          <p class="text-sm">Öppna den här adminsidan i Safari på din iPhone eller iPad.</p>
          <ol class="list-decimal list-inside text-sm space-y-2">
            <li>Tryck på <strong>Dela</strong> i Safari.</li>
            <li>Välj <strong>Lägg till på hemskärmen</strong> och bekräfta.</li>
          </ol>
        </template>
        <p v-else class="text-sm">Öppna webbläsarens meny och leta efter <strong>Installera app</strong> eller <strong>Lägg till på hemskärmen</strong>. Alternativet finns inte i alla webbläsare eller på alla enheter. Du kan alltid använda admin i webbläsaren.</p>
        <p class="text-xs text-base-content/70">Installation kräver en webbläsare som stöder funktionen. Internetanslutning och vanlig inloggning krävs även i appen.</p>
        <div class="modal-action"><form method="dialog"><button type="submit" class="btn btn-primary btn-sm">Stäng</button></form></div>
      </div>
      <form method="dialog" class="modal-backdrop"><button type="submit" aria-label="Stäng installationsguiden">Stäng</button></form>
    </dialog>
  </div>
</template>