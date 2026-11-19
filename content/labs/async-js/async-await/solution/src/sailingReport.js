// Task: Rewrite the report with await
//
// sailingReport(route, services) behaves exactly as before: it resolves with
// { route, time, sea } and rejects with the same error when either service fails.
// Rewrite it as an async function that uses await instead of .then().
// services defaults to the fake services. The check passes its own.
import * as tidewell from './services.js'

export async function sailingReport(route, services = tidewell) {
  const sailing = await services.getSailing(route)
  const sea = await services.getSeaState(sailing.time)
  return { ...sailing, sea }
}
