export interface StarMoment {
  /** Star or Dismiss was pressed once; the request never comes back. */
  answered: boolean
  shownThisRun: boolean
  /** How many times the app has opened, this time included. */
  launches: number
  /** The person just left a repo for the rest of the app. */
  closedRepo: boolean
}

/** Asks at a natural pause: after a repo was closed, or from the second time the app opens. */
export function shouldAskForStar(moment: StarMoment): boolean {
  if (moment.answered || moment.shownThisRun) return false
  return moment.closedRepo || moment.launches >= 2
}
