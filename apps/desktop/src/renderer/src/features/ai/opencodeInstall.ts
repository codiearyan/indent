import { create } from 'zustand'
import { api } from '@/lib/api'
import { track } from '@/lib/telemetry'
import { errorMessage } from '@/lib/utils'
import { activeProvider, useAi } from './aiStore'
import { runConnectionTest } from './connectionTest'

export const INSTALL_OPENCODE =
  window.platform === 'win32'
    ? 'npm install -g @opencode/cli'
    : 'curl -fsSL https://opencode.ai/v2/install | bash'

/** Signing in to the app's own OpenCode, which is not on the terminal's PATH. */
export function signInCommand(bin: string): string {
  return window.platform === 'win32' ? `& "${bin}" auth login` : `"${bin}" auth login`
}

/** Where the one-click OpenCode setup is, from the download to its first answer. */
export type OpencodeSetup =
  | { step: 'idle' }
  | { step: 'downloading'; done: number }
  | { step: 'testing' }
  | { step: 'ready'; reply: string }
  /** Installed and picked, but the free models did not answer. */
  | { step: 'silent'; message: string }
  | { step: 'failed'; message: string }

export const useOpencodeSetup = create<{ setup: OpencodeSetup }>()(() => ({
  setup: { step: 'idle' }
}))

const set = (setup: OpencodeSetup): void => useOpencodeSetup.setState({ setup })

let cancelled = false

/** Installs the app's OpenCode, picks it, then asks it one question to prove AI works. */
export async function setUpOpencode(): Promise<void> {
  cancelled = false
  set({ step: 'downloading', done: 0 })
  try {
    useAi.setState({ config: await api.ai.installOpencode() })
  } catch (error) {
    set({ step: 'failed', message: errorMessage(error) })
    track('tool_install', { tool: 'opencode', result: cancelled ? 'cancelled' : 'failed' })
    return
  }
  track('tool_install', { tool: 'opencode', result: 'done' })
  await testOpencode()
}

/** Asks the installed OpenCode one question; also run again after a sign-in or a wait. */
export async function testOpencode(): Promise<void> {
  set({ step: 'testing' })
  try {
    set({ step: 'ready', reply: await api.ai.test() })
  } catch (error) {
    set({
      step: 'silent',
      message: errorMessage(error).replace(/^OpenCode could not answer: /, '')
    })
  }
}

/** After a switch from OpenCode's result: test OpenCode's new model, or the new provider. */
export function retryAfterSwitch(): void {
  if (activeProvider(useAi.getState().config)?.id === 'opencode') return void testOpencode()
  set({ step: 'idle' })
  void runConnectionTest()
}

export function cancelOpencodeSetup(): void {
  cancelled = true
  api.ai.cancelOpencodeInstall()
}

/**
 * Shown while no AI is set up, and while a setup started here is still going or has just ended,
 * so its result stays in view after OpenCode becomes the provider.
 */
export function useShowOpencodeSetup(hasProvider: boolean): boolean {
  const step = useOpencodeSetup((s) => s.setup.step)
  return !hasProvider || step !== 'idle'
}

export async function removeOwnOpencode(): Promise<void> {
  useAi.setState({ config: await api.ai.removeOpencode() })
  set({ step: 'idle' })
}

api.ai.onInstallProgress((done) => {
  if (useOpencodeSetup.getState().setup.step === 'downloading') set({ step: 'downloading', done })
})
