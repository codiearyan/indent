import { initialize, trackEvent } from '@aptabase/electron/main'
import { listen } from '../ipc'

const APP_KEY = 'A-EU-3530820487'

/** Starts the SDK. It sends nothing on its own; the renderer decides what is tracked. */
export function init(): void {
  void initialize(APP_KEY)
}

export function register(): void {
  listen('telemetry', {
    track: (event, props) => void trackEvent(event, props)
  })
}
