<script setup lang="ts">
const route = useRoute()
const isAdminRoute = computed(() => route.path === '/admin' || route.path.startsWith('/admin/'))

useHead(() => ({
  title: 'Det 7:e Gunget | Blues och rock med glimt i ögat',
  link: [
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
    { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon.png' },
    { rel: 'icon', type: 'image/webp', href: '/media/brand/favicon.webp' },
    { rel: 'shortcut icon', href: '/favicon.ico' },
    { key: 'apple-touch-icon', rel: 'apple-touch-icon', sizes: '180x180', href: isAdminRoute.value ? '/media/admin-pwa/apple-touch-icon.png' : '/apple-touch-icon.png' },
    ...(isAdminRoute.value ? [{ key: 'admin-manifest', rel: 'manifest' as const, href: '/admin.webmanifest' }] : []),
  ],
}))
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
