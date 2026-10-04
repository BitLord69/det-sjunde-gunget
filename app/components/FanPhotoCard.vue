<script setup lang="ts">
const { t } = useI18n()

export interface FanPhoto {
  id: string
  mediaUrl: string
  caption?: string | null
  location?: string | null
  takenWhen?: string | null
  fastenerType?: 'pin' | 'tape' | 'paperclip' | string | null
  pinColor?: string | null
  rotation?: number | null
}

interface Props {
  photo: FanPhoto
  rotation?: number
  size?: 'sm' | 'md'
  to?: string
}

const props = withDefaults(defineProps<Props>(), {
  rotation: undefined,
  size: 'md',
  to: undefined,
})

defineEmits<{
  click: []
}>()

// Deterministic rotation angle based on photo ID if rotation not supplied
const effectiveRotation = computed(() => {
  if (typeof props.rotation === 'number') return props.rotation
  if (typeof props.photo.rotation === 'number') return props.photo.rotation
  const hash = Math.abs(props.photo.id.split('').reduce((acc, c) => acc * 13 + c.charCodeAt(0), 0))
  const angles = [-3.5, -2.5, -1.5, 1.5, 2.5, 3.5, -2, 2, -3, 3]
  return angles[hash % angles.length] ?? 0
})
</script>

<template>
  <component
    :is="to ? 'NuxtLink' : 'div'"
    :to="to"
    class="cork-pinned-card relative group select-none block"
    :style="{ transform: `rotate(${effectiveRotation}deg)` }"
    @click="$emit('click')"
  >
    <!-- 3D Pushpin fastener or tape -->
    <PhotoFastener
      :type="photo.fastenerType || 'pin'"
      :color="photo.pinColor || 'gold'"
      :seed="photo.id"
      position="top-center"
      :size="size === 'sm' ? 'sm' : 'md'"
    />

    <!-- Vintage Polaroid style paper card -->
    <div
      class="bg-[#f9f6ee] dark:bg-[#f2eee3] text-neutral-900 rounded-sm shadow-[0_12px_24px_rgba(0,0,0,0.5),0_3px_6px_rgba(0,0,0,0.4)] border border-neutral-300 flex flex-col justify-between transition-all group-hover:shadow-[0_20px_35px_rgba(0,0,0,0.65)]"
      :class="size === 'sm' ? 'p-2.5 pb-4' : 'p-3 pb-5'"
    >
      <!-- Photo inside Polaroid card -->
      <div class="relative overflow-hidden rounded-xs aspect-[4/3] bg-neutral-800">
        <NuxtImg
          :src="photo.mediaUrl"
          :alt="photo.caption || t('fan_central.alt_photo')"
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
      </div>

      <!-- Card text & metadata -->
      <div :class="size === 'sm' ? 'mt-2.5' : 'mt-3.5 space-y-1.5'">
        <p
          v-if="photo.caption"
          class="font-serif italic text-neutral-800 leading-snug"
          :class="size === 'sm' ? 'text-[11px] line-clamp-1' : 'text-xs font-medium line-clamp-2'"
        >
          "{{ photo.caption }}"
        </p>

        <div
          class="flex items-center justify-between text-[10px] font-mono text-neutral-600"
          :class="size === 'sm' ? 'mt-1 text-[9px]' : 'pt-2 border-t border-neutral-300/80'"
        >
          <span class="truncate font-semibold text-neutral-800 flex items-center gap-1">
            <IconMapPin class="w-3 h-3 text-primary shrink-0" /> {{ photo.location || t('fan_central.unknown_location') }}
          </span>
          <span v-if="photo.takenWhen" class="truncate opacity-85">
            {{ photo.takenWhen }}
          </span>
        </div>
      </div>
    </div>
  </component>
</template>
