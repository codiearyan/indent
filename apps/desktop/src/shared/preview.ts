/** The scheme the Browser panel loads a workspace's pages from. */
export const PREVIEW_SCHEME = 'indent-preview'

/** Messages a previewed page posts to the app carry this marker. */
export const PREVIEW_MESSAGE = 'indent-preview'

export interface PreviewMessage {
  source: typeof PREVIEW_MESSAGE
  level: 'log' | 'info' | 'warn' | 'error'
  text: string
}

/** A previewed page posts its title once it has loaded; empty when it has none. */
export interface PreviewTitle {
  source: typeof PREVIEW_MESSAGE
  title: string
}

/** Each workspace is its own origin, so the pages of two issues never share storage. */
export function previewUrl(labId: string, chapterId: string, page: string): string {
  return `${PREVIEW_SCHEME}://${chapterId}.${labId}/${page}`
}

export function previewTarget(url: string): { labId: string; chapterId: string; path: string } {
  const { hostname, pathname } = new URL(url)
  const [chapterId, labId, ...rest] = hostname.split('.')
  if (!chapterId || !labId || rest.length) throw new Error(`Not a workspace page: ${url}`)
  return {
    labId,
    chapterId,
    path: decodeURIComponent(pathname).replace(/^\/+/, '') || 'index.html'
  }
}
