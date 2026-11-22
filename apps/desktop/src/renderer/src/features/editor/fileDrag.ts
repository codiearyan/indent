import { create } from 'zustand'

/** A file being dragged from the files panel, or a tab with the group it came from. */
export interface FileDrag {
  path: string
  from?: number
}

export const useFileDrag = create<{ drag: FileDrag | null }>(() => ({ drag: null }))

export function startFileDrag(event: React.DragEvent, drag: FileDrag): void {
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', drag.path)
  // Changing the page under the pointer during dragstart cancels the drag in Chromium.
  setTimeout(() => useFileDrag.setState({ drag }))
}

export function endFileDrag(): void {
  useFileDrag.setState({ drag: null })
}
