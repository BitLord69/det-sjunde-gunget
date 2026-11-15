<script setup lang="ts">
import { DEFAULT_ADMIN_HOME, explicitAdminDestination, normalizeAdminHome } from '#shared/utils/admin-home'

definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
})

const route = useRoute()
let destination = explicitAdminDestination(route.query)
if (destination === null) {
  try {
    const preference = await $fetch<{ homePath: string }>('/api/auth/admin-home')
    destination = normalizeAdminHome(preference.homePath)
  } catch {
    destination = DEFAULT_ADMIN_HOME
  }
}
await navigateTo(destination, { replace: true })
</script>

<template>
  <div class="flex items-center justify-center min-h-[50vh]">
    <div class="flex items-center gap-3 text-primary font-bold">
      <span class="loading loading-spinner loading-md"/>
      <span>Laddar Adminpanelen...</span>
    </div>
  </div>
</template>
