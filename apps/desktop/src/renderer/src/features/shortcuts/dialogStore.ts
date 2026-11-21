import { create } from 'zustand'

interface ShortcutListStore {
  open: boolean
  setOpen(open: boolean): void
}

export const useShortcutList = create<ShortcutListStore>()((set) => ({
  open: false,
  setOpen: (open) => set({ open })
}))
