<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
</script>

<template>
  <nav class="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-primary/20 bg-base-100/95 backdrop-blur-md p-1.5 lg:hidden shadow-2xl">
    <NuxtLink class="flex flex-col items-center gap-0.5 p-1 text-[10px] font-bold text-base-content/70 hover:text-primary" active-class="!text-primary" :to="localePath('/')">
      <span class="text-base">🏠</span>
      <span>{{ t('nav.home') }}</span>
    </NuxtLink>
    <NuxtLink class="flex flex-col items-center gap-0.5 p-1 text-[10px] font-bold text-base-content/70 hover:text-primary" active-class="!text-primary" :to="localePath('/gigs')">
      <span class="text-base">📅</span>
      <span>{{ t('nav.gigs') }}</span>
    </NuxtLink>
    <NuxtLink class="flex flex-col items-center gap-0.5 p-1 text-[10px] font-bold text-base-content/70 hover:text-primary" active-class="!text-primary" :to="localePath('/music')">
      <span class="text-base">🎵</span>
      <span>{{ t('nav.music') }}</span>
    </NuxtLink>
    <NuxtLink class="flex flex-col items-center gap-0.5 p-1 text-[10px] font-bold text-base-content/70 hover:text-primary" active-class="!text-primary" :to="localePath('/about')">
      <span class="text-base">🎸</span>
      <span>{{ t('nav.band') }}</span>
    </NuxtLink>
    <NuxtLink class="flex flex-col items-center gap-0.5 p-1 text-[10px] font-bold text-base-content/70 hover:text-primary" active-class="!text-primary" :to="localePath('/contact')">
      <span class="text-base">✉️</span>
      <span>{{ t('nav.book') }}</span>
    </NuxtLink>
  </nav>
</template>
