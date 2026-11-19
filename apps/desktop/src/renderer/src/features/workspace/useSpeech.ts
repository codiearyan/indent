import { useEffect, useRef, useState } from 'react'
import { narrationKey } from '@shared/narration'
import { api } from '@/lib/api'

export const RATES = [1, 1.25, 1.5, 2, 0.75]

type Status = 'idle' | 'playing' | 'paused'

interface Speech {
  status: Status
  index: number
  rate: number
  toggle(): void
  go(index: number): void
  cycleRate(): void
}

/**
 * Reads the parts aloud one after another. A part that has a recording plays it; a part
 * without one falls back to the system voice. Stops on unmount.
 */
export function useSpeech(parts: string[], labId: string, chapterId: string): Speech {
  const [status, setStatus] = useState<Status>('idle')
  const [index, setIndex] = useState(0)
  const [rate, setRate] = useState(RATES[0])
  const audio = useRef<HTMLAudioElement | null>(null)
  // Each play gets a number; anything that finishes for an older number is ignored.
  const run = useRef(0)

  const stop = (): void => {
    run.current++
    if (audio.current) {
      audio.current.pause()
      URL.revokeObjectURL(audio.current.src)
      audio.current = null
    }
    speechSynthesis.cancel()
    speechSynthesis.resume()
  }

  const play = async (at: number, speed: number): Promise<void> => {
    stop()
    if (at >= parts.length) {
      setStatus('idle')
      setIndex(0)
      return
    }
    const mine = run.current
    const next = (): void => {
      if (run.current === mine) void play(at + 1, speed)
    }
    setIndex(at)
    setStatus('playing')

    const recording = await api.content
      .narration(labId, chapterId, narrationKey(parts[at]))
      .catch(() => null)
    if (run.current !== mine) return

    if (recording) {
      const element = new Audio(
        URL.createObjectURL(new Blob([new Uint8Array(recording)], { type: 'audio/ogg' }))
      )
      element.playbackRate = speed
      element.onended = next
      audio.current = element
      await element.play().catch(() => run.current === mine && setStatus('idle'))
      return
    }
    const utterance = new SpeechSynthesisUtterance(parts[at])
    utterance.rate = speed
    utterance.onend = next
    utterance.onerror = () => run.current === mine && setStatus('idle')
    speechSynthesis.speak(utterance)
  }

  useEffect(() => stop, [])

  const toggle = (): void => {
    if (status === 'idle') return void play(index, rate)
    const playing = status === 'playing'
    if (audio.current) void (playing ? audio.current.pause() : audio.current.play())
    else if (playing) speechSynthesis.pause()
    else speechSynthesis.resume()
    setStatus(playing ? 'paused' : 'playing')
  }

  const go = (at: number): void => {
    if (status === 'idle') setIndex(at)
    else void play(at, rate)
  }

  const cycleRate = (): void => {
    const next = RATES[(RATES.indexOf(rate) + 1) % RATES.length]
    setRate(next)
    // A recording changes speed in place; the system voice has to start the part again.
    if (audio.current) audio.current.playbackRate = next
    else if (status !== 'idle') void play(index, next)
  }

  return { status, index, rate, toggle, go, cycleRate }
}
