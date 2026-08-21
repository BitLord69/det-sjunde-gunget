/**
 * Blues Harp (Harmonica) Easter Egg Audio Engine
 * Synthesizes an expressive, authentic Chicago blues harmonica bend lick using Web Audio API.
 */

export function useBluesHarp() {
  const isPlayingHarp = useState<boolean>('blues_harp_playing', () => false)

  let audioCtx: AudioContext | null = null

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

  /**
   * Synthesize a single harmonica reed note with acoustic formant filter and vibrato
   */
  const playReedNote = (
    ctx: AudioContext,
    startFreq: number,
    endFreq: number,
    startTime: number,
    duration: number,
    masterGain: GainNode,
    options: { vibratoRate?: number; vibratoDepth?: number; isChord?: boolean } = {}
  ) => {
    const { vibratoRate = 5.5, vibratoDepth = 8, isChord = false } = options

    // Dual oscillator blend (Pulse/Sawtooth for rich reed buzz + Sub Sine for body)
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const subOsc = ctx.createOscillator()

    osc1.type = 'sawtooth'
    osc2.type = 'square'
    subOsc.type = 'sine'

    // Pitch bend trajectory
    osc1.frequency.setValueAtTime(startFreq, startTime)
    osc1.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), startTime + duration * 0.45)

    osc2.frequency.setValueAtTime(startFreq * 1.003, startTime) // slight chorusing
    osc2.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq * 1.003), startTime + duration * 0.45)

    subOsc.frequency.setValueAtTime(startFreq, startTime)
    subOsc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), startTime + duration * 0.45)

    // Hand/Throat Vibrato LFO
    if (vibratoDepth > 0 && duration > 0.2) {
      const lfo = ctx.createOscillator()
      const lfoGain = ctx.createGain()
      lfo.frequency.setValueAtTime(vibratoRate, startTime)
      lfoGain.gain.setValueAtTime(0, startTime)
      // Delay vibrato onset slightly like a real blues player
      lfoGain.gain.setValueAtTime(0, startTime + duration * 0.25)
      lfoGain.gain.linearRampToValueAtTime(vibratoDepth, startTime + duration * 0.6)

      lfo.connect(lfoGain)
      lfoGain.connect(osc1.frequency)
      lfoGain.connect(osc2.frequency)
      lfo.start(startTime)
      lfo.stop(startTime + duration)
    }

    // Harmonica acoustic chamber formant filter (peak at ~1600Hz, resonant hand cup)
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(1600, startTime)
    filter.Q.setValueAtTime(2.2, startTime)
    // Hand wah filter sweep
    filter.frequency.exponentialRampToValueAtTime(2200, startTime + duration * 0.3)
    filter.frequency.exponentialRampToValueAtTime(1400, startTime + duration)

    // Note Envelope (quick attack, warm sustain, gentle reed release)
    const noteGain = ctx.createGain()
    const maxGain = isChord ? 0.08 : 0.18

    noteGain.gain.setValueAtTime(0.001, startTime)
    noteGain.gain.linearRampToValueAtTime(maxGain, startTime + 0.03) // crisp tongue slap attack
    noteGain.gain.setValueAtTime(maxGain * 0.9, startTime + duration * 0.7)
    noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)

    // Breath Air Noise Generator (adds acoustic realism)
    try {
      const bufferSize = ctx.sampleRate * Math.min(duration, 0.4)
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const output = noiseBuffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1
      }
      const noise = ctx.createBufferSource()
      noise.buffer = noiseBuffer

      const noiseFilter = ctx.createBiquadFilter()
      noiseFilter.type = 'highpass'
      noiseFilter.frequency.value = 2500

      const noiseGain = ctx.createGain()
      noiseGain.gain.setValueAtTime(0.015, startTime)
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.4)

      noise.connect(noiseFilter)
      noiseFilter.connect(noiseGain)
      noiseGain.connect(masterGain)
      noise.start(startTime)
      noise.stop(startTime + duration)
    } catch {
      // Audio buffer fallback if restricted
    }

    // Connect node graph
    osc1.connect(filter)
    osc2.connect(filter)
    subOsc.connect(filter)
    filter.connect(noteGain)
    noteGain.connect(masterGain)

    osc1.start(startTime)
    osc2.start(startTime)
    subOsc.start(startTime)
    osc1.stop(startTime + duration + 0.05)
    osc2.stop(startTime + duration + 0.05)
    subOsc.stop(startTime + duration + 0.05)
  }

  /**
   * Play an authentic Chicago Blues Harp Lick (Cross Harp Key of A Blues / D Harp)
   */
  const playBluesHarpLick = () => {
    const ctx = getAudioContext()
    if (!ctx) return

    if (isPlayingHarp.value) return
    isPlayingHarp.value = true

    const now = ctx.currentTime
    const masterGain = ctx.createGain()
    masterGain.gain.setValueAtTime(0.85, now)
    masterGain.connect(ctx.destination)

    // Chicago Blues Harp Lick sequence (bends, scoops and turnaround chord)
    // 1. Draw 2 scooped bend (D -> E: 293.6Hz -> 329.6Hz)
    playReedNote(ctx, 275, 329.6, now, 0.32, masterGain, { vibratoRate: 6, vibratoDepth: 6 })

    // 2. Draw 3 blue-third bend (G -> G# / Blue 3rd: 392Hz -> 415Hz)
    playReedNote(ctx, 380, 415.3, now + 0.30, 0.35, masterGain, { vibratoRate: 6.5, vibratoDepth: 9 })

    // 3. Draw 4 bend & heavy vibrato (D5: 587.3Hz)
    playReedNote(ctx, 550, 587.3, now + 0.62, 0.45, masterGain, { vibratoRate: 7, vibratoDepth: 14 })

    // 4. Blow 4 root resolution (E5: 659.2Hz)
    playReedNote(ctx, 650, 659.2, now + 1.05, 0.28, masterGain, { vibratoRate: 5, vibratoDepth: 4 })

    // 5. Draw 2-3-4 Chunky Blues Chord (Tongue slap!)
    const chordTime = now + 1.32
    playReedNote(ctx, 293.6, 293.6, chordTime, 0.65, masterGain, { isChord: true, vibratoDepth: 8 })
    playReedNote(ctx, 392.0, 392.0, chordTime, 0.65, masterGain, { isChord: true, vibratoDepth: 8 })
    playReedNote(ctx, 587.3, 587.3, chordTime, 0.65, masterGain, { isChord: true, vibratoDepth: 8 })

    setTimeout(() => {
      isPlayingHarp.value = false
    }, 2100)
  }

  return {
    isPlayingHarp,
    playBluesHarpLick,
  }
}
