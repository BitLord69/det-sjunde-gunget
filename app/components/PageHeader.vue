<script setup lang="ts">
const { t } = useI18n()

interface Props {
  title: string
  description?: string
  eyebrow?: string
}

const props = defineProps<Props>()
const resolvedEyebrow = computed(() => {
  if (props.eyebrow !== undefined) return props.eyebrow
  return t('common.presents')
})
</script>

<template>
  <div class="text-center space-y-1.5 max-w-2xl mx-auto mb-6 sm:mb-8">
    <div v-if="resolvedEyebrow" class="text-[11px] sm:text-xs font-mono uppercase tracking-[0.25em] text-secondary font-bold">
      {{ resolvedEyebrow }}
    </div>

    <h1 class="font-heading text-4xl sm:text-6xl lg:text-7xl text-primary text-gritty leading-none my-1">
      {{ title }}
    </h1>

    <p v-if="description" class="text-xs sm:text-sm text-base-content/80 leading-relaxed max-w-lg mx-auto pt-0.5">
      {{ description }}
    </p>

    <slot />
  </div>
</template>
