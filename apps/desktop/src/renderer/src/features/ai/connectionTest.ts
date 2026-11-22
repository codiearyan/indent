import { create } from 'zustand'
import type { AiConfig } from '@shared/types'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/utils'
import { useAi } from './aiStore'

export type ConnectionTest =
  | { status: 'idle' }
  | { status: 'testing' }
  | { status: 'ok'; reply: string }
  | { status: 'error'; message: string }

/** A result belongs to one provider and model; another pick starts over. */
const pickOf = (config: AiConfig | null): string => `${config?.provider}/${config?.model}`

const useStore = create<{ pick: string; test: ConnectionTest }>()(() => ({
  pick: '',
  test: { status: 'idle' }
}))

/** Asks the chosen provider one tiny question. Anything that switches provider or model may call it. */
export async function runConnectionTest(): Promise<void> {
  const pick = pickOf(useAi.getState().config)
  useStore.setState({ pick, test: { status: 'testing' } })
  let test: ConnectionTest
  try {
    test = { status: 'ok', reply: await api.ai.test() }
  } catch (error) {
    test = { status: 'error', message: errorMessage(error) }
  }
  if (useStore.getState().pick === pick) useStore.setState({ test })
}

export function useConnectionTest(): ConnectionTest {
  const pick = useAi((s) => pickOf(s.config))
  return useStore((s) => (s.pick === pick ? s.test : IDLE))
}

const IDLE: ConnectionTest = { status: 'idle' }
