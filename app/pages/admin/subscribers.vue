<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
})

useSeoMeta({
  title: 'Nyhetsbrev & Prenumeranter | Det 7:e Gunget Admin',
})

const toastMessage = ref('')

const showToast = (msg: string) => {
  toastMessage.value = msg
  setTimeout(() => {
    toastMessage.value = ''
  }, 4000)
}

const { data: subscribersData, refresh: refreshSubscribers } = await useFetch<any[]>('/api/admin/subscribers', {
  default: () => [],
})

const { data: adminSettings, refresh: refreshSettings } = await useFetch<{
  newsletterEnabled: boolean
}>('/api/admin/settings')

const isSavingSettings = ref(false)
const newsletterEnabledSetting = computed(() => adminSettings.value?.newsletterEnabled ?? false)

const toggleNewsletterSetting = async () => {
  isSavingSettings.value = true
  try {
    const nextVal = !newsletterEnabledSetting.value
    await $fetch('/api/admin/settings', {
      method: 'POST',
      body: {
        newsletterEnabled: nextVal,
      },
    })
    await refreshSettings()
    showToast(nextVal ? '✓ Nyhetsbrev aktiverat på sajten!' : '✓ Nyhetsbrev pausat på sajten!')
  } catch (err: any) {
    showToast('⚠️ Kunde inte uppdatera inställning.')
  } finally {
    isSavingSettings.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-6 pt-3 pb-10 lg:px-10 space-y-6 font-sans">
    <!-- Toast Notification -->
    <div
      v-if="toastMessage"
      class="fixed bottom-6 right-6 z-50 bg-secondary text-secondary-content px-6 py-3 rounded-xl font-bold shadow-2xl animate-bounce flex items-center gap-2"
    >
      <span>{{ toastMessage }}</span>
    </div>

    <!-- CMS Tab Navigation -->
    <AdminNavBar />

    <!-- NEWSLETTER SUBSCRIBERS & SETTING -->
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="font-heading text-2xl text-primary font-bold">Nyhetsbrev & Prenumerationer</h2>
          <p class="text-xs text-base-content/70">Hantera prenumeranter och kontrollera om nyhetsbrevet ska visas för besökare.</p>
        </div>
        <div class="flex items-center gap-3">
          <button type="button" class="btn btn-outline btn-primary btn-sm rounded-full cursor-pointer" @click="() => refreshSubscribers()">
            🔄 Uppdatera
          </button>
        </div>
      </div>

      <!-- MASTER SETTING: Enable/Pause Newsletter on Site -->
      <div class="p-6 rounded-2xl border stage-card shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
        :class="newsletterEnabledSetting ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-amber-500/40 bg-amber-950/20'"
      >
        <div class="space-y-1.5 max-w-2xl">
          <div class="flex items-center gap-2">
            <span class="text-lg">{{ newsletterEnabledSetting ? '🟢' : '⏸️' }}</span>
            <span class="font-heading text-lg font-bold text-primary">
              {{ newsletterEnabledSetting ? 'Nyhetsbrev & prenumerationer: AKTIVERAD' : 'Nyhetsbrev & prenumerationer: PAUSAD' }}
            </span>
            <span
              class="badge badge-xs font-mono font-bold uppercase"
              :class="newsletterEnabledSetting ? 'badge-success' : 'badge-warning'"
            >
              {{ newsletterEnabledSetting ? 'Synlig på sajten' : 'Dold på sajten' }}
            </span>
          </div>
          <p class="text-xs text-base-content/80 leading-relaxed">
            {{
              newsletterEnabledSetting
                ? 'Prenumerationsformuläret är synligt i sidfoten och fans kan anmäla sin e-postadress.'
                : 'Formuläret är dolt i sidfoten (visar istället bandets liveinfo och snabblänkar). Befintliga prenumeranter och all funktionalitet finns säkert sparad i systemet och kan aktiveras när som helst med ett klick.'
            }}
          </p>
        </div>

        <button
          type="button"
          class="btn btn-sm rounded-full font-bold px-6 shadow-md transition-all flex items-center gap-2 cursor-pointer flex-shrink-0"
          :class="newsletterEnabledSetting ? 'btn-warning' : 'btn-success'"
          :disabled="isSavingSettings"
          @click="toggleNewsletterSetting"
        >
          <span>{{ newsletterEnabledSetting ? '⏸ Pausa formulär på sajten' : '▶ Aktivera formulär på sajten' }}</span>
        </button>
      </div>

      <!-- Subscribers Table -->
      <div class="overflow-x-auto rounded-2xl border border-primary/20 stage-card">
        <table class="table table-zebra w-full text-xs">
          <thead>
            <tr class="text-secondary font-bold uppercase text-[10px] tracking-wider border-b border-primary/20">
              <th>E-postadress</th>
              <th>Status</th>
              <th>Anmäld datum</th>
              <th>Brevo-synk</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sub in subscribersData || []" :key="sub.id">
              <td class="font-bold text-primary font-mono text-[11px]">{{ sub.email }}</td>
              <td>
                <span
                  class="badge badge-xs font-bold uppercase text-[9px]"
                  :class="sub.status === 'subscribed' ? 'badge-success' : 'badge-ghost'"
                >
                  {{ sub.status === 'subscribed' ? 'Aktiv' : 'Avregistrerad' }}
                </span>
              </td>
              <td class="font-mono text-[11px]">
                {{ new Date(sub.subscribedAt).toLocaleDateString('sv-SE') }}
              </td>
              <td>
                <span class="badge badge-xs badge-outline font-mono text-[9px] text-emerald-400 border-emerald-500/40">
                  Synkad
                </span>
              </td>
            </tr>
            <tr v-if="!subscribersData || subscribersData.length === 0">
              <td colspan="4" class="text-center py-8 text-base-content/60 italic">
                Inga prenumeranter ännu.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
