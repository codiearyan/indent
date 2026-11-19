// Task: Rewrite the report with await
//
// sailingReport(route, services) behaves exactly as before: it resolves with
// { route, time, sea } and rejects with the same error when either service fails.
// Rewrite it as an async function that uses await instead of .then().
// services defaults to the fake services. The check passes its own.
import * as tidewell from './services.js'

export function sailingReport(route, services = tidewell) {
  return services
    .getSailing(route)
    .then((sailing) => services.getSeaState(sailing.time).then((sea) => ({ ...sailing, sea })))
}
