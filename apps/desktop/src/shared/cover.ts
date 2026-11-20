export const COVER_SCHEME = 'indent-cover'

/** The picture of a repo, served by the main process from the repo's folder in the content pack. */
export function coverUrl(labId: string): string {
  return `${COVER_SCHEME}://${labId}/`
}
