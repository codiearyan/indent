import { focusedEditor } from '@/features/editor/editors'
import { useSettings } from '@/stores/settings'

let focusBeforeTutor: Element | null = null

/** Opens the tutor with its composer focused, or closes it and gives focus back to where it was. */
export function toggleTutor(): void {
  const { panels, setPanel } = useSettings.getState()
  if (panels.chat && !panels.zen) {
    setPanel('chat', false)
    const previous = focusBeforeTutor
    focusBeforeTutor = null
    requestAnimationFrame(() => {
      // The editor's own focus() puts its cursor back; its hidden text area alone would not.
      if (previous instanceof HTMLElement && previous.isConnected) {
        if (previous.closest('.monaco-editor')) focusedEditor()?.focus()
        else previous.focus()
      } else {
        focusedEditor()?.focus()
      }
    })
    return
  }
  focusBeforeTutor = document.activeElement
  if (panels.zen) setPanel('zen', false)
  setPanel('chat', true)
  requestAnimationFrame(() => document.querySelector<HTMLElement>('#tutor-input')?.focus())
}
