import { create } from 'zustand'

export type SettingsSection = 'appearance' | 'editor' | 'ai'

interface SettingsDialogStore {
  open: boolean
  section: SettingsSection
  /** Opens Settings, on `section` when given and where it was left otherwise. */
  show(section?: SettingsSection): void
  setOpen(open: boolean): void
  setSection(section: SettingsSection): void
}

export const useSettingsDialog = create<SettingsDialogStore>()((set) => ({
  open: false,
  section: 'appearance',
  show: (section) => set((s) => ({ open: true, section: section ?? s.section })),
  setOpen: (open) => set({ open }),
  setSection: (section) => set({ section })
}))
