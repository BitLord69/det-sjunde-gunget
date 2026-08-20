<script setup lang="ts">
const { locale } = useI18n()

interface Props {
  mediaUrl: string
  altTextSv?: string | null
  altTextEn?: string | null
  captionSv?: string | null
  captionEn?: string | null
  frameStyle?: 'polaroid' | 'taped' | 'grunge' | 'wood' | 'pinned' | 'random' | string
  rotation?: number
  aspectRatio?: string
  clickable?: boolean
  pinColor?: 'gold' | 'red' | 'blue' | 'green' | 'amber' | 'random' | string
}

const props = withDefaults(defineProps<Props>(), {
  frameStyle: 'random',
  rotation: 0,
  aspectRatio: 'aspect-[4/3]',
  clickable: false,
  pinColor: 'random',
})

defineEmits<{
  click: []
}>()

const availableStyles: Array<'pinned' | 'polaroid' | 'taped' | 'grunge' | 'wood'> = [
  'pinned',
  'polaroid',
  'taped',
  'grunge',
  'wood',
]

const resolvedFrameStyle = computed(() => {
  if (!props.frameStyle || props.frameStyle === 'random') {
    const hash = Math.abs((props.mediaUrl || props.captionSv || 'photo').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0))
    return availableStyles[hash % availableStyles.length]
  }
  return props.frameStyle
})

const resolvedRotation = computed(() => {
  if (props.rotation !== undefined && props.rotation !== 0) {
    return props.rotation
  }
  // Subtle organic tilt if 0 / not specified (-2.5 to 2.5 degrees)
  const hash = Math.abs((props.mediaUrl || props.captionSv || 'tilt').split('').reduce((acc, c) => acc * 31 + c.charCodeAt(0), 0))
  const tilts = [-2.5, -1.5, -1, 1, 1.5, 2.5, -2, 2]
  return tilts[hash % tilts.length]
})
</script>

<template>
  <div
    :class="[
      resolvedFrameStyle === 'polaroid' ? 'frame-polaroid' :
      resolvedFrameStyle === 'taped' ? 'frame-taped' :
      resolvedFrameStyle === 'grunge' ? 'frame-grunge' :
      resolvedFrameStyle === 'pinned' ? 'frame-pinned' : 'frame-wood',
      clickable ? 'cursor-pointer hover:scale-[1.02] transition-transform duration-300' : ''
    ]"
    :style="{ transform: `rotate(${resolvedRotation || 0}deg)` }"
    @click="$emit('click')"
  >
    <!-- Reusable Photo Fastener Component -->
    <PhotoFastener
      v-if="resolvedFrameStyle === 'pinned'"
      type="pin"
      :color="pinColor"
      :seed="mediaUrl || captionSv || 'photo'"
      position="top-center"
    />

    <NuxtImg
      :src="mediaUrl"
      :alt="locale === 'en' && altTextEn ? altTextEn : (altTextSv || captionSv || 'Foto')"
      :class="['w-full object-cover rounded', aspectRatio]"
      loading="lazy"
    />
    <!-- Only Polaroid has a handwritten bottom margin caption area inside the frame -->
    <p
      v-if="(captionSv || captionEn) && resolvedFrameStyle === 'polaroid'"
      class="text-xs text-center font-medium mt-3 italic text-neutral"
    >
      {{ locale === 'en' && captionEn ? captionEn : captionSv }}
    </p>
  </div>
</template>
