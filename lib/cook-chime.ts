/**
 * lib/cook-chime.ts
 *
 * Web Audio API chime synthesis for cooking-flow alerts.
 * Three distinct profiles so the cook can identify which alert
 * fired by ear alone — important when hands are floured/oily and
 * the phone might be across the room.
 *
 * No asset file dependency — synthesized in JavaScript. Works
 * in all modern browsers including iOS Safari (subject to the
 * standard "first audio requires user gesture" unlock; the act
 * of starting a cook timer counts as the unlock).
 *
 * Profiles:
 *   - playWarningChime()    1-min heads-up: single soft 440Hz tone
 *   - playStepDoneChime()   two-note ascending (G5 → C6) doorbell
 *   - playRecipeDoneChime() three-note ascending (C5 → E5 → G5) victory
 */

let audioCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!Ctor) return null
    audioCtx = new Ctor()
  }
  // Safari can leave the context suspended after backgrounding —
  // explicit resume() unlocks it on the next user-initiated tone.
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {
      /* fail silent — chime won't play; haptic + notification still fire */
    })
  }
  return audioCtx
}

/**
 * Play a single tone with soft attack/release to avoid clicks.
 *
 * @param freq    frequency in Hz
 * @param startMs delay from "now" before the tone begins
 * @param durMs   total tone duration
 * @param volume  peak gain (0..1; default 0.25)
 */
function playTone(
  freq: number,
  startMs: number,
  durMs: number,
  volume = 0.25,
): void {
  const ctx = getCtx()
  if (!ctx) return
  const start = ctx.currentTime + startMs / 1000
  const dur = durMs / 1000

  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.value = freq

  const gain = ctx.createGain()
  // 10ms attack, 30ms release — eliminates the click that bare
  // square-cuts produce on tone start/stop.
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(volume, start + 0.01)
  gain.gain.linearRampToValueAtTime(volume, start + dur - 0.03)
  gain.gain.linearRampToValueAtTime(0, start + dur)

  osc.connect(gain).connect(ctx.destination)
  osc.start(start)
  osc.stop(start + dur)
}

/** 1-min warning: single soft tone, "heads up." */
export function playWarningChime(): void {
  playTone(440, 0, 250, 0.2)
}

/** Step timer done: two-note ascending (G5 → C6), doorbell-ish. */
export function playStepDoneChime(): void {
  playTone(784, 0, 180, 0.3)
  playTone(1046, 200, 220, 0.3)
}

/** Recipe complete: three-note ascending (C5 → E5 → G5), victory. */
export function playRecipeDoneChime(): void {
  playTone(523, 0, 160, 0.3)
  playTone(659, 170, 160, 0.3)
  playTone(784, 340, 280, 0.35)
}
