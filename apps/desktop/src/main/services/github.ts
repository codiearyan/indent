import { REPO } from '@shared/repo'
import { handle } from '../ipc'
import { shellEnv } from '../labEnv'
import { run } from '../run'

/**
 * Stars the app's repository through the GitHub CLI the person is signed in to. It only runs
 * when they press the button. False means no CLI, no sign-in or no network; the caller then
 * opens the repository's page instead.
 */
async function star(): Promise<boolean> {
  try {
    await run('gh', ['api', '--method', 'PUT', `user/starred/${REPO}`, '--silent'], {
      env: await shellEnv(),
      timeout: 10_000
    })
    return true
  } catch {
    return false
  }
}

/** Whether the signed-in account already starred the repo; null when the CLI can't tell. */
async function starred(): Promise<boolean | null> {
  try {
    await run('gh', ['api', `user/starred/${REPO}`, '--silent'], {
      env: await shellEnv(),
      timeout: 10_000
    })
    return true
  } catch (error) {
    // GitHub answers 404 for a repo this account hasn't starred.
    return /HTTP 404/.test(String((error as { stderr?: string }).stderr)) ? false : null
  }
}

export function register(): void {
  handle('github', { star, starred })
}
