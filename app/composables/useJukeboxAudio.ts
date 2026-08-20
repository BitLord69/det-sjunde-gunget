/**
 * Jukebox Audio Engine
 * Combines HTML5 audio playback for direct preview tracks and a Web Audio blues synthesis engine
 * with authentic retro vinyl needle-drop crackle and coin slot SFX.
 */

export function useJukeboxAudio() {
  const isAudioPlaying = useState<boolean>('jukebox_is_audio_playing', () => false)
  const currentTime = useState<number>('jukebox_current_time', () => 0)
  const duration = useState<number>('jukebox_duration', () => 30)

  // Persisted state via Nuxt useState store & cookies
  const repeatCookie = useCookie<boolean>('jukebox_repeat', {
    default: () => false,
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
  const isRepeatEnabled = useState<boolean>('jukebox_repeat_state', () => repeatCookie.value ?? false)
  watch(isRepeatEnabled, (val) => {
    repeatCookie.value = val
  })

  const volumeCookie = useCookie<number>('jukebox_volume', {
    default: () => 0.8,
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
  const volume = useState<number>('jukebox_volume_state', () => volumeCookie.value ?? 0.8)
  watch(volume, (val) => {
    volumeCookie.value = val
  })

  const muteCookie = useCookie<boolean>('jukebox_muted', {
    default: () => false,
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
  const isMuted = useState<boolean>('jukebox_muted_state', () => muteCookie.value ?? false)
  watch(isMuted, (val) => {
    muteCookie.value = val
  })

  const audioSourceType = ref<'synth' | 'file'>('synth')

  let audioCtx: AudioContext | null = null
  let synthInterval: any = null
  let synthGainNode: GainNode | null = null
  let crackleAudio: HTMLAudioElement | null = null
  let htmlAudio: HTMLAudioElement | null = null
  let crackleFadeTimeout: any = null

  // Ensure AudioContext is initialized on user interaction
  const getAudioContext = () => {
    if (import.meta.server) return null
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass()
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume()
    }
    return audioCtx
  }

  // 1. Coin Insert Chime SFX
  const playCoinChime = () => {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime

    // Clink metallic impact
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'triangle'
    osc1.frequency.setValueAtTime(1400, now)
    osc1.frequency.exponentialRampToValueAtTime(800, now + 0.08)
    gain1.gain.setValueAtTime(0.3 * volume.value, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.08)

    // Sweet double bell ping
    const pings = [
      { freq: 1760, time: now + 0.06, dur: 0.35 },
      { freq: 2637, time: now + 0.14, dur: 0.45 },
    ]

    pings.forEach((p) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(p.freq, p.time)
      gain.gain.setValueAtTime(0.25 * volume.value, p.time)
      gain.gain.exponentialRampToValueAtTime(0.0001, p.time + p.dur)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(p.time)
      osc.stop(p.time + p.dur)
    })
  }

  // Web Audio fallback for needle drop
  const playSynthNeedleDrop = (durationSeconds = 1.5) => {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime
    const sampleRate = ctx.sampleRate
    const bufferSize = Math.floor(sampleRate * durationSeconds)
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate)
    const data = buffer.getChannelData(0)
    let b0 = 0
    for (let i = 0; i < bufferSize; i++) {
      const t = i / sampleRate
      const thump = Math.exp(-t * 30) * Math.sin(t * 55 * 2 * Math.PI) * 0.5
      const white = Math.random() * 2 - 1
      b0 = (b0 * 0.95) + (white * 0.05)
      const pop = Math.random() < 0.0015 ? (Math.random() * 2 - 1) * 0.25 : 0
      data[i] = thump + (b0 * 0.2 + pop)
    }
    const noise = ctx.createBufferSource()
    noise.buffer = buffer
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(850, now)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.28 * volume.value, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationSeconds)
    noise.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)
    noise.start(now)
  }

  // 2. Authentic Real Vinyl Needle Drop & Continuous Background Groove Crackle
  const playNeedleDrop = () => {
    try {
      if (crackleFadeTimeout) {
        clearTimeout(crackleFadeTimeout)
        crackleFadeTimeout = null
      }
      if (!crackleAudio) {
        crackleAudio = new Audio('/audio/vinyl-crackle.mp3')
        crackleAudio.loop = true
      }
      crackleAudio.currentTime = 0
      // Start with prominent lead-in level
      crackleAudio.volume = isMuted.value ? 0 : Math.min(1, volume.value * 0.75)
      crackleAudio.play().catch(() => {
        playSynthNeedleDrop()
      })

      // After 2 seconds of lead-in, smoothly reduce to warm background bed level
      crackleFadeTimeout = setTimeout(() => {
        if (crackleAudio && isAudioPlaying.value) {
          crackleAudio.volume = isMuted.value ? 0 : Math.min(1, volume.value * 0.3)
        }
      }, 2000)
    } catch {
      playSynthNeedleDrop()
    }
  }

  // 3. Web Audio 12-Bar Blues Synthesizer Preview Riff
  const stopSynth = () => {
    if (synthInterval) {
      clearInterval(synthInterval)
      synthInterval = null
    }
    if (synthGainNode) {
      try {
        synthGainNode.gain.setValueAtTime(0, audioCtx?.currentTime || 0)
      } catch (_) { }
      synthGainNode = null
    }
  }

  const startBluesSynth = (seedKey = 'A') => {
    stopSynth()
    const ctx = getAudioContext()
    if (!ctx) return

    audioSourceType.value = 'synth'
    duration.value = 30
    currentTime.value = 0

    // Master synth gain node
    synthGainNode = ctx.createGain()
    synthGainNode.gain.setValueAtTime(volume.value * 0.22, ctx.currentTime)
    synthGainNode.connect(ctx.destination)

    // Blues notes frequencies (A Blues scale + Boogie bass)
    const baseFreq = seedKey.includes('B') ? 98.0 : 110.0 // G or A
    const bassRiff = [
      baseFreq,
      baseFreq * 1.25, // Major 3rd
      baseFreq * 1.5, // 5th
      baseFreq * 1.68, // 6th
      baseFreq * 1.78, // Dominant 7th
      baseFreq * 1.68,
      baseFreq * 1.5,
      baseFreq * 1.25,
    ]

    let step = 0
    const tempoMs = 280 // ~107 BPM swing shuffle

    const playStep = () => {
      if (!isAudioPlaying.value || !synthGainNode || !audioCtx) return

      // Handle non-repeating track ending
      if (currentTime.value >= duration.value) {
        if (isRepeatEnabled.value) {
          currentTime.value = 0
          step = 0
        } else {
          pauseTrack()
          currentTime.value = 0
          return
        }
      }

      const now = audioCtx.currentTime
      const bassNote = bassRiff[step % bassRiff.length] ?? baseFreq

      // 1. Warm Bass Osc
      const bassOsc = audioCtx.createOscillator()
      const bassGain = audioCtx.createGain()
      bassOsc.type = 'triangle'
      bassOsc.frequency.setValueAtTime(bassNote / 2, now)
      bassGain.gain.setValueAtTime(0.4, now)
      bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25)
      bassOsc.connect(bassGain)
      bassGain.connect(synthGainNode)
      bassOsc.start(now)
      bassOsc.stop(now + 0.26)

      // 2. Vintage Organ / Harmonica Chord stab on 2 and 4
      if (step % 2 === 0) {
        const chordPitches = [bassNote, bassNote * 1.25, bassNote * 1.5, bassNote * 1.78]
        chordPitches.forEach((freq) => {
          if (!audioCtx || !synthGainNode || !freq) return
          const chordOsc = audioCtx.createOscillator()
          const chordGain = audioCtx.createGain()
          chordOsc.type = 'sawtooth'
          chordOsc.frequency.setValueAtTime(freq * 2, now)

          const chordFilter = audioCtx.createBiquadFilter()
          chordFilter.type = 'lowpass'
          chordFilter.frequency.setValueAtTime(1400, now)

          chordGain.gain.setValueAtTime(0.12, now)
          chordGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)

          chordOsc.connect(chordFilter)
          chordFilter.connect(chordGain)
          chordGain.connect(synthGainNode)

          chordOsc.start(now)
          chordOsc.stop(now + 0.2)
        })
      }

      // 3. Shuffle Snare / Hi-Hat Brush noise
      const snareBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.08, audioCtx.sampleRate)
      const sData = snareBuffer.getChannelData(0)
      for (let i = 0; i < sData.length; i++) {
        sData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioCtx.sampleRate * 0.02))
      }
      const snareSource = audioCtx.createBufferSource()
      snareSource.buffer = snareBuffer
      const sFilter = audioCtx.createBiquadFilter()
      sFilter.type = step % 4 === 2 ? 'bandpass' : 'highpass'
      sFilter.frequency.setValueAtTime(step % 4 === 2 ? 2200 : 6000, now)
      const sGain = audioCtx.createGain()
      sGain.gain.setValueAtTime(step % 4 === 2 ? 0.25 : 0.08, now)
      snareSource.connect(sFilter)
      sFilter.connect(sGain)
      sGain.connect(synthGainNode)
      snareSource.start(now)

      step++
      currentTime.value = currentTime.value + tempoMs / 1000
    }

    playStep()
    synthInterval = setInterval(playStep, tempoMs)
  }

  let currentPlayingSong: { id: string; code?: string; title: string; audioUrl?: string | null } | null = null

  // 4. Direct Audio Playback & Transport Controls
  const playTrack = (song: { id: string; code?: string; title: string; audioUrl?: string | null }) => {
    currentPlayingSong = song
    stopSynth()
    if (htmlAudio) {
      htmlAudio.pause()
      htmlAudio = null
    }

    // Play tactile needle drop & continuous vinyl rasp
    playNeedleDrop()
    isAudioPlaying.value = true

    if (song.audioUrl) {
      audioSourceType.value = 'file'
      htmlAudio = new Audio(song.audioUrl)
      htmlAudio.volume = isMuted.value ? 0 : volume.value

      htmlAudio.addEventListener('timeupdate', () => {
        if (htmlAudio) {
          currentTime.value = htmlAudio.currentTime
          duration.value = htmlAudio.duration || 30
        }
      })

      htmlAudio.addEventListener('ended', () => {
        if (isRepeatEnabled.value && htmlAudio) {
          htmlAudio.currentTime = 0
          htmlAudio.play()
        } else {
          pauseTrack()
          currentTime.value = 0
        }
      })

      // Brief lead-in delay to let the needle drop and vinyl rasp play on the lead-in groove!
      setTimeout(() => {
        if (isAudioPlaying.value && htmlAudio) {
          htmlAudio.play().catch((err) => {
            console.warn('[JukeboxAudio] HTML5 audio error, falling back to blues synth:', err)
            startBluesSynth(song.code || 'A1')
          })
        }
      }, 1000)
    } else {
      // Start synthesised blues groove after lead-in crackle
      setTimeout(() => {
        if (isAudioPlaying.value) {
          startBluesSynth(song.code || 'A1')
        }
      }, 1000)
    }
  }

  const pauseTrack = () => {
    isAudioPlaying.value = false
    stopSynth()
    if (htmlAudio) {
      htmlAudio.pause()
    }
    if (crackleAudio) {
      crackleAudio.pause()
    }
    if (crackleFadeTimeout) {
      clearTimeout(crackleFadeTimeout)
      crackleFadeTimeout = null
    }
  }

  const resumeTrack = (song?: { id: string; code?: string; title: string; audioUrl?: string | null }) => {
    const targetSong = song || currentPlayingSong
    if (!targetSong) return

    currentPlayingSong = targetSong
    isAudioPlaying.value = true

    if (htmlAudio && audioSourceType.value === 'file') {
      htmlAudio.play().catch((err) => {
        console.warn('[JukeboxAudio] Error resuming HTML5 audio, restarting track:', err)
        playTrack(targetSong)
      })
      if (crackleAudio) {
        crackleAudio.volume = isMuted.value ? 0 : Math.min(1, volume.value * 0.22)
        crackleAudio.play().catch(() => {})
      }
    } else {
      startBluesSynth(targetSong.code || 'A1')
      if (crackleAudio) {
        crackleAudio.volume = isMuted.value ? 0 : Math.min(1, volume.value * 0.22)
        crackleAudio.play().catch(() => {})
      }
    }
  }

  const setAudioVolume = (newVol: number) => {
    volume.value = Math.max(0, Math.min(1, newVol))
    if (htmlAudio) {
      htmlAudio.volume = isMuted.value ? 0 : volume.value
    }
    if (crackleAudio) {
      crackleAudio.volume = isMuted.value ? 0 : Math.min(1, volume.value * 0.22)
    }
    if (synthGainNode && audioCtx) {
      synthGainNode.gain.setValueAtTime(isMuted.value ? 0 : volume.value * 0.22, audioCtx.currentTime)
    }
  }

  const toggleMute = () => {
    isMuted.value = !isMuted.value
    setAudioVolume(volume.value)
  }

  const toggleRepeat = () => {
    isRepeatEnabled.value = !isRepeatEnabled.value
  }

  const seek = (seconds: number) => {
    currentTime.value = seconds
    if (htmlAudio && audioSourceType.value === 'file') {
      htmlAudio.currentTime = seconds
    }
  }

  onUnmounted(() => {
    stopSynth()
    if (htmlAudio) {
      htmlAudio.pause()
      htmlAudio = null
    }
    if (crackleAudio) {
      crackleAudio.pause()
      crackleAudio = null
    }
    if (crackleFadeTimeout) {
      clearTimeout(crackleFadeTimeout)
      crackleFadeTimeout = null
    }
  })

  return {
    isAudioPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isRepeatEnabled,
    audioSourceType,
    playTrack,
    pauseTrack,
    resumeTrack,
    stopSong: pauseTrack,
    playCoinChime,
    playNeedleDrop,
    setAudioVolume,
    toggleMute,
    toggleRepeat,
    seek,
  }
}
