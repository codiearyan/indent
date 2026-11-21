import { create } from 'zustand'

interface QuickOpenStore {
  open: boolean
  setOpen(open: boolean): void
}

export const useQuickOpen = create<QuickOpenStore>()((set) => ({
  open: false,
  setOpen: (open) => set({ open })
}))
