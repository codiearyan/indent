import type { Api } from '@shared/types'

declare global {
  interface Window {
    /** process.platform of the main process: 'darwin', 'win32', 'linux'. */
    platform: string
    api: Api
  }
}
