import { reactive } from 'vue'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// Created once by the client plugin, before admin components are mounted.
export function createAdminPwa(window: Window) {
  const navigator = window.navigator as Navigator & { standalone?: boolean }
  const displayMode = window.matchMedia('(display-mode: standalone)')
  const state = reactive({
    installed: displayMode.matches || navigator.standalone === true,
    canPrompt: false,
    isAppleMobile: /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
  })
  let deferredPrompt: InstallPromptEvent | null = null

  const updateDisplayMode = () => {
    state.installed = displayMode.matches || navigator.standalone === true
    if (state.installed) {
      deferredPrompt = null
      state.canPrompt = false
    }
  }
  displayMode.addEventListener('change', updateDisplayMode)
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    if (!state.installed) {
      deferredPrompt = event as InstallPromptEvent
      state.canPrompt = true
    }
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    state.canPrompt = false
    state.installed = true
  })

  async function install(): Promise<'installed' | 'prompted' | 'guide'> {
    if (state.installed) return 'installed'
    const prompt = deferredPrompt
    if (!prompt) return 'guide'
    deferredPrompt = null
    state.canPrompt = false
    try {
      // Call directly from the click handler before awaiting, preserving activation.
      await prompt.prompt()
      await prompt.userChoice
      return 'prompted'
    } catch {
      return 'guide'
    }
  }

  return { state, install }
}