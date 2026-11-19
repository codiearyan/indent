// Task: One report from two services
//
// sailingReport(route, services) returns a promise of { route, time, sea }.
// - services.getSailing(route) resolves with { route, time }
// - services.getSeaState(time) resolves with 'calm', 'choppy' or 'rough' for that time
// - ask for the sea state only once you know the sailing's time
// - when either service rejects, the returned promise rejects with that same error
// Build it with .then(). services defaults to the fake services. The check passes its own.
import * as tidewell from './services.js'

export function sailingReport(route, services = tidewell) {
  return services
    .getSailing(route)
    .then((sailing) => services.getSeaState(sailing.time).then((sea) => ({ ...sailing, sea })))
}
