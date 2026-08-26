<script setup lang="ts">
interface Props {
  title: string
  description?: string
  eyebrow?: string
}

withDefaults(defineProps<Props>(), {
  eyebrow: '★ Det 7:e Gunget presenterar ★',
  description: '',
})
</script>

<template>
  <div class="text-center space-y-3 max-w-2xl mx-auto mb-12 sm:mb-14">
    <div v-if="eyebrow" class="text-xs sm:text-sm font-mono uppercase tracking-[0.25em] text-secondary font-bold">
      {{ eyebrow }}
    </div>

    <h1 class="font-heading text-4xl sm:text-6xl lg:text-7xl text-primary text-gritty pt-2 pb-2 leading-tight">
      {{ title }}
    </h1>

    <p v-if="description" class="text-sm sm:text-base text-base-content/80 leading-relaxed max-w-xl mx-auto">
      {{ description }}
    </p>

    <slot />
  </div>
</template>
