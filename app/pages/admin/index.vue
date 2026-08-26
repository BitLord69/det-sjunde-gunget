<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
})

const route = useRoute()

// Map query params cleanly to the new modular route pages
const tab = (route.query.tab as string) || (route.query.msg || route.query.messageId ? 'messages' : 'songs')

const routeMap: Record<string, string> = {
  songs: '/admin/songs',
  gigs: '/admin/gigs',
  band: '/admin/band',
  setlist: '/admin/setlist',
  gallery: '/admin/gallery',
  merch: '/admin/merch',
  admins: '/admin/admins',
  messages: '/admin/messages',
  subscribers: '/admin/subscribers',
  hashtags: '/admin/hashtags',
  settings: '/admin/settings',
  help: '/admin/help',
}

const targetPath = routeMap[tab] || '/admin/songs'

// Forward message IDs if present
if (route.query.msg || route.query.messageId) {
  const msgId = (route.query.msg || route.query.messageId) as string
  await navigateTo(`/admin/messages?msg=${encodeURIComponent(msgId)}`, { replace: true })
} else {
  await navigateTo(targetPath, { replace: true })
}
</script>

<template>
  <div class="flex items-center justify-center min-h-[50vh]">
    <div class="flex items-center gap-3 text-primary font-bold">
      <span class="loading loading-spinner loading-md"></span>
      <span>Laddar Adminpanelen...</span>
    </div>
  </div>
</template>
