import { api } from '@/lib/api'
import { useProgress } from '@/stores/progress'
import { useShownHints } from './hints'

/** Shows hints of a task up to `hint` and keeps that in progress, where a finished repo counts it. */
export function showHint(key: string, hint: number): void {
  useShownHints.getState().setShown(key, hint)
  // Keys are `${labId}/${chapterId}/${taskId}`, and ids never hold a slash.
  const [labId, chapterId, taskId] = key.split('/')
  api.progress
    .showHint(labId, chapterId, taskId, hint)
    .then((progress) => useProgress.getState().set(progress))
    .catch(() => {})
}
