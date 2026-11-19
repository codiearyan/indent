import { useEffect, useRef, useState } from 'react'

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

/** Reads the parts aloud one after another with speechSynthesis. Stops on unmount. */
export function useSpeech(parts: string[]): Speech {
  const [status, setStatus] = useState<Status>('idle')
  const [index, setIndex] = useState(0)
  const [rate, setRate] = useState(RATES[0])
  const current = useRef<SpeechSynthesisUtterance | null>(null)

  const speak = (at: number, speed: number): void => {
    current.current = null
    speechSynthesis.cancel()
    speechSynthesis.resume()
    if (at >= parts.length) {
      setStatus('idle')
      setIndex(0)
      return
    }
    const utterance = new SpeechSynthesisUtterance(parts[at])
    utterance.rate = speed
    // cancel() fires end or error on the previous utterance; only the current one may advance.
    utterance.onend = () => {
      if (current.current === utterance) speak(at + 1, speed)
    }
    utterance.onerror = () => {
      if (current.current === utterance) setStatus('idle')
    }
    current.current = utterance
    setIndex(at)
    setStatus('playing')
    speechSynthesis.speak(utterance)
  }

  useEffect(
    () => () => {
      current.current = null
      speechSynthesis.cancel()
    },
    []
  )

  const toggle = (): void => {
    if (status === 'playing') {
      speechSynthesis.pause()
      setStatus('paused')
    } else if (status === 'paused') {
      speechSynthesis.resume()
      setStatus('playing')
    } else {
      speak(index, rate)
    }
  }

  const go = (at: number): void => {
    if (status === 'idle') setIndex(at)
    else speak(at, rate)
  }

  const cycleRate = (): void => {
    const next = RATES[(RATES.indexOf(rate) + 1) % RATES.length]
    setRate(next)
    if (status !== 'idle') speak(index, next)
  }

  return { status, index, rate, toggle, go, cycleRate }
}
