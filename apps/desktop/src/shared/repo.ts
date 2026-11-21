/** The app's own repository on GitHub, as `owner/name` and as a link. */
export const REPO = 'codiearyan/indent'
export const REPO_URL = `https://github.com/${REPO}`
export const RELEASES_URL = `${REPO_URL}/releases/latest`

/** A new issue that asks for a repo, its title filled in with what the person searched for. */
export function repoRequestUrl(topic: string): string {
  const wanted = topic.trim()
  const title = wanted ? `Repo request: ${wanted}` : 'Repo request'
  const body = 'What should this repo teach?\n\n\nWhat would you like to build or fix in it?\n'
  return `${REPO_URL}/issues/new?${new URLSearchParams({ title, body })}`
}
