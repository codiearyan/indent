import type { TelemetryEvent, TelemetryProps } from '@shared/types'
import { useSettings } from '@/stores/settings'
import { api } from './api'

/** Sends an anonymous usage event, unless usage stats are turned off in Settings. */
export function track(event: TelemetryEvent, props?: TelemetryProps): void {
  if (useSettings.getState().telemetry) api.telemetry.track(event, props)
}
