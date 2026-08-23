<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
})

const route = useRoute()
const messageId = route.params.id as string

// Redirect cleanly into the main admin dashboard with the specific message modal opened
await navigateTo(`/admin?tab=messages&msg=${encodeURIComponent(messageId)}`, { replace: true })
</script>

<template>
  <div class="flex items-center justify-center min-h-[50vh]">
    <div class="flex items-center gap-3 text-primary font-bold">
      <span class="loading loading-spinner loading-md"></span>
      <span>Öppnar bokningsförfrågan #{{ route.params.id }}...</span>
    </div>
  </div>
</template>
