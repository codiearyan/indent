// Task: Load every route at once
//
// loadRoutes(ids, getRoute) resolves with the routes for every id, in the same order as ids.
// - start every getRoute(id) call before waiting for any of them
// - if any call rejects, reject with that error
// - an empty list resolves with []
// getRoute defaults to the fake service. The check passes its own.
import * as tidewell from './services.js'

export function loadRoutes(ids, getRoute = tidewell.getRoute) {
  return Promise.all(ids.map((id) => getRoute(id)))
}
