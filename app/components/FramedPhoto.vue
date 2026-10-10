<script setup lang="ts">
const { locale } = useI18n()

interface Props {
  mediaUrl: string
  altTextSv?: string | null
  altTextEn?: string | null
  captionSv?: string | null
  captionEn?: string | null
  frameStyle?: 'polaroid' | 'black' | 'taped' | 'grunge' | 'wood' | 'pinned' | 'random' | string
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

const availableStyles: Array<'pinned' | 'polaroid' | 'black' | 'taped' | 'grunge' | 'wood'> = [
  'pinned',
  'polaroid',
  'black',
  'taped',
  'grunge',
  'wood',
]

const tilts = [-2.5, -1.8, -1.2, -0.8, 0.8, 1.2, 1.8, 2.5, -2, 2]

// Initial fallback som matchar SSR
const initialHash = Math.abs(((props.mediaUrl || '') + (props.captionSv || '') + 'seed').split('').reduce((acc, c) => acc * 31 + c.charCodeAt(0), 0))
const dynamicStyle = ref<string>(availableStyles[initialHash % availableStyles.length] || 'polaroid')
const dynamicTilt = ref<number>(tilts[initialHash % tilts.length] ?? 0)

onMounted(() => {
  // Äkta slump vid varje sidvisning / omladdning när användaren valt 'random'
  if (!props.frameStyle || props.frameStyle === 'random') {
    const randomIndex = Math.floor(Math.random() * availableStyles.length)
    dynamicStyle.value = availableStyles[randomIndex] || 'polaroid'
  }
  if (props.rotation === undefined || props.rotation === 0) {
    const randomTiltIndex = Math.floor(Math.random() * tilts.length)
    dynamicTilt.value = tilts[randomTiltIndex] ?? 0
  }
})

const resolvedFrameStyle = computed(() => {
  if (!props.frameStyle || props.frameStyle === 'random') {
    return dynamicStyle.value
  }
  return props.frameStyle
})

const isDarkFrame = computed(() => {
  return ['black', 'taped', 'grunge', 'wood', 'pinned'].includes(resolvedFrameStyle.value || '')
})

const resolvedRotation = computed(() => {
  if (props.rotation !== undefined && props.rotation !== 0) {
    return props.rotation
  }
  return dynamicTilt.value
})
</script>

<template>
  <div
    :class="[
      resolvedFrameStyle === 'polaroid' ? 'frame-polaroid' :
      resolvedFrameStyle === 'black' ? 'frame-black' :
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

    <!-- Caption area: vit text mot mörk/svart bakgrund (oberoende av light/dark mode), mörk text mot ljus Polaroid -->
    <p
      v-if="captionSv || captionEn"
      :class="[
        'text-xs text-center font-medium mt-2.5 italic transition-colors leading-snug px-1',
        isDarkFrame ? '!text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]' : '!text-[#1a1614]'
      ]"
    >
      {{ locale === 'en' && captionEn ? captionEn : captionSv }}
    </p>
  </div>
</template>
