import { create } from 'zustand'
import type { ReminderConfig, ReminderSettings } from '@shared/types'
import { api } from '@/lib/api'

interface RemindersStore {
  config: ReminderConfig | null
  load(): Promise<void>
  set(patch: Partial<ReminderSettings>): Promise<void>
}

/** The practice schedule and its switches; the main process keeps them, since it sends the reminders. */
export const useReminders = create<RemindersStore>()((set, get) => ({
  config: null,
  load: async () => set({ config: await api.reminders.get() }),
  set: async (patch) => {
    // Shown at once, so a second quick change builds on the first.
    const config = get().config
    if (config) set({ config: { ...config, ...patch } })
    set({ config: await api.reminders.set(patch) })
  }
}))
