import { useSettings } from '@/stores/settings'

/** Starts the guide from Home again; the workspace tour follows it on the next issue opened. */
export function showTourAgain(): void {
  useSettings.getState().setGuide('home')
  window.location.hash = '#/'
}
