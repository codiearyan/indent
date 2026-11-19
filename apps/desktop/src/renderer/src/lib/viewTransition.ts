import { flushSync } from 'react-dom'

/**
 * Runs a React state change inside a view transition. `type` selects the CSS that animates it
 * (`html:active-view-transition-type(type)`), so transitions elsewhere in the app stay untouched.
 */
export function viewTransition(type: string, update: () => void): void {
  if (!document.startViewTransition) return update()
  document.startViewTransition({ update: () => flushSync(update), types: [type] })
}
