<script setup lang="ts">
interface Props {
  type?: 'pin' | 'tape' | 'paperclip' | string
  color?: 'red' | 'gold' | 'amber' | 'blue' | 'green' | 'random' | string
  seed?: string
  position?: 'top-center' | 'top-left' | 'top-right' | string
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  type: 'pin',
  color: 'random',
  seed: 'fastener',
  position: 'top-center',
  size: 'md',
})

// Rich, high-contrast, chunky 3D palettes
const pinPalettes = {
  red: {
    capLight: '#ffc2c2',
    capMid: '#ff2a2a',
    capDark: '#cc0000',
    capDeep: '#660000',
    bodyLight: '#ff7373',
    bodyMid: '#d60000',
    bodyDark: '#8a0000',
    baseLight: '#ff9999',
    baseDark: '#730000',
  },
  gold: {
    capLight: '#fff9db',
    capMid: '#f5b041',
    capDark: '#d4ac0d',
    capDeep: '#7d6608',
    bodyLight: '#fdebd0',
    bodyMid: '#d68910',
    bodyDark: '#7e5109',
    baseLight: '#fef5e7',
    baseDark: '#6e4404',
  },
  amber: {
    capLight: '#ffe8cc',
    capMid: '#fb8c00',
    capDark: '#e65100',
    capDeep: '#7a2e01',
    bodyLight: '#ffcc80',
    bodyMid: '#e65100',
    bodyDark: '#8a2b00',
    baseLight: '#ffe0b2',
    baseDark: '#662000',
  },
  blue: {
    capLight: '#d4ebf2',
    capMid: '#0080ff',
    capDark: '#0059b3',
    capDeep: '#00264d',
    bodyLight: '#80bfff',
    bodyMid: '#0066cc',
    bodyDark: '#003366',
    baseLight: '#b3d9ff',
    baseDark: '#001a33',
  },
  green: {
    capLight: '#d5f5e3',
    capMid: '#2ecc71',
    capDark: '#229954',
    capDeep: '#0b3c1d',
    bodyLight: '#82e0aa',
    bodyMid: '#1e8449',
    bodyDark: '#114b27',
    baseLight: '#abebc6',
    baseDark: '#082b14',
  },
}

const activePalette = computed(() => {
  if (props.color === 'random' || !props.color) {
    const colors: Array<keyof typeof pinPalettes> = ['red', 'gold', 'amber', 'blue', 'green']
    const hash = Math.abs((props.seed || 'pin').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0))
    const picked = colors[hash % colors.length] ?? 'gold'
    return pinPalettes[picked] || pinPalettes.gold
  }
  const chosen = (props.color as keyof typeof pinPalettes) || 'gold'
  return pinPalettes[chosen] || pinPalettes.gold
})

const tiltAngle = computed(() => {
  const hash = Math.abs((props.seed || 'tilt').split('').reduce((acc, c) => acc * 17 + c.charCodeAt(0), 0))
  const angles = [-9, -5, 5, 9, -7, 7, -4, 4]
  return angles[hash % angles.length]
})

const gradientId = computed(() => {
  const hash = Math.abs((props.seed || 'fastener').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0))
  return `fastener-${hash}`
})
</script>

<template>
  <!-- 📌 Chunky, Sturdy Classic 3D Pushpin (Biffig & Realistisk) -->
  <div
    v-if="type === 'pin'"
    class="absolute pointer-events-none z-30 select-none"
    :class="[
      position === 'top-center' ? '-top-4 left-1/2 -translate-x-1/2' :
      position === 'top-left' ? '-top-3.5 left-3' :
      position === 'top-right' ? '-top-3.5 right-3' : ''
    ]"
    :style="{ transform: `rotate(${tiltAngle}deg)` }"
  >
    <svg
      :width="size === 'sm' ? 20 : size === 'lg' ? 32 : 26"
      :height="size === 'sm' ? 24 : size === 'lg' ? 38 : 31"
      viewBox="0 0 28 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class="overflow-visible"
    >
      <defs>
        <!-- 3D Solid Top Cap Radial Highlight -->
        <radialGradient :id="`${gradientId}-cap`" cx="38%" cy="30%" r="65%">
          <stop offset="0%" :stop-color="activePalette.capLight" />
          <stop offset="35%" :stop-color="activePalette.capMid" />
          <stop offset="75%" :stop-color="activePalette.capDark" />
          <stop offset="100%" :stop-color="activePalette.capDeep" />
        </radialGradient>

        <!-- 3D Chunky Grip Barrel -->
        <linearGradient :id="`${gradientId}-barrel`" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" :stop-color="activePalette.bodyDark" />
          <stop offset="25%" :stop-color="activePalette.bodyLight" />
          <stop offset="60%" :stop-color="activePalette.bodyMid" />
          <stop offset="88%" :stop-color="activePalette.bodyDark" />
          <stop offset="100%" :stop-color="activePalette.capDeep" />
        </linearGradient>

        <!-- 3D Wide Base Flange -->
        <radialGradient :id="`${gradientId}-base`" cx="42%" cy="32%" r="62%">
          <stop offset="0%" :stop-color="activePalette.baseLight" />
          <stop offset="45%" :stop-color="activePalette.bodyMid" />
          <stop offset="80%" :stop-color="activePalette.bodyDark" />
          <stop offset="100%" :stop-color="activePalette.baseDark" />
        </radialGradient>
      </defs>

      <!-- 1. Deep Contact Cast Shadow underneath Base Flange -->
      <ellipse
        cx="16"
        cy="26"
        rx="9"
        ry="4.2"
        fill="rgba(0, 0, 0, 0.65)"
        transform="rotate(-6 16 26)"
      />
      <!-- Needle puncture hole shadow -->
      <circle cx="14" cy="24.5" r="1.3" fill="rgba(0,0,0,0.9)" />

      <!-- 2. Metallic Needle Shaft Entry into Paper -->
      <path
        d="M13.2 24.5 L13 20 L15 20 L14.8 24.5 Z"
        fill="#b0bec5"
        stroke="#455a64"
        stroke-width="0.35"
      />

      <!-- 3. Wide Solid Base Flange (Flared bottom plate) -->
      <ellipse
        cx="14"
        cy="20.5"
        rx="8.5"
        ry="3.4"
        :fill="`url(#${gradientId}-base)`"
        stroke="rgba(255, 255, 255, 0.45)"
        stroke-width="0.5"
      />

      <!-- 4. Chunky Tapered Lower Waist -->
      <path
        d="M8.5 12 C8.5 12, 10 16.5, 10.5 20 L17.5 20 C18 16.5, 19.5 12, 19.5 12 Z"
        :fill="`url(#${gradientId}-barrel)`"
      />

      <!-- 5. Sturdy Center Grip Ring -->
      <ellipse
        cx="14"
        cy="13"
        rx="5.8"
        ry="2.2"
        :fill="`url(#${gradientId}-base)`"
        stroke="rgba(255, 255, 255, 0.35)"
        stroke-width="0.4"
      />

      <!-- 6. Chunky Upper Barrel / Head Grip -->
      <path
        d="M6.5 6 C6.5 6, 7.5 10, 8.5 13 L19.5 13 C20.5 10, 21.5 6, 21.5 6 Z"
        :fill="`url(#${gradientId}-barrel)`"
      />

      <!-- 7. Solid 3D Domed Cap (Wide & Chunky) -->
      <ellipse
        cx="14"
        cy="6"
        rx="7.5"
        ry="3.6"
        :fill="`url(#${gradientId}-cap)`"
        stroke="rgba(255, 255, 255, 0.55)"
        stroke-width="0.6"
      />

      <!-- 8. Bold Specular Reflection / Glint -->
      <ellipse
        cx="12"
        cy="5"
        rx="3.2"
        ry="1.4"
        fill="rgba(255, 255, 255, 0.95)"
        transform="rotate(-15 12 5)"
      />
      <!-- Secondary rim glow on cap edge -->
      <ellipse
        cx="17"
        cy="6.8"
        rx="1.4"
        ry="0.7"
        fill="rgba(255, 255, 255, 0.45)"
        transform="rotate(10 17 6.8)"
      />
    </svg>
  </div>

  <!-- 🏷️ Masking Tape Strip Fastener -->
  <div
    v-else-if="type === 'tape'"
    class="absolute -top-3.5 left-1/2 -translate-x-1/2 z-30 pointer-events-none select-none"
    style="transform: translateX(-50%) rotate(-2deg);"
  >
    <div
      class="w-20 h-6 bg-amber-200/60 dark:bg-amber-400/40 backdrop-blur-xs border border-white/20 shadow-md transform -skew-x-2"
      style="clip-path: polygon(0% 0%, 98% 2%, 100% 98%, 2% 100%);"
    />
  </div>

  <!-- 📎 Vintage Paperclip Fastener -->
  <div
    v-else-if="type === 'paperclip'"
    class="absolute -top-4 right-4 z-30 pointer-events-none select-none drop-shadow-md"
  >
    <svg width="20" height="34" viewBox="0 0 20 34" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M6 8V24C6 26.2 7.8 28 10 28C12.2 28 14 26.2 14 24V6C14 3.8 12.2 2 10 2C7.8 2 6 3.8 6 6V22C6 23.1 6.9 24 8 24C9.1 24 10 23.1 10 22V8"
        stroke="#e2bd72"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </div>
</template>
