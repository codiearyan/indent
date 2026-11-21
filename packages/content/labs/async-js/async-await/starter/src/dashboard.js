// Task: A dashboard that waits only when it must
//
// loadDashboard(route, services) resolves with { sailings, weather, crew }.
// - sailings: services.getSailings(route)
// - weather: services.getWeather(route)
// - crew: services.getCrew(id of the first sailing), or [] with no call when there are no sailings
// It works, but it is slow. Start getSailings and getWeather at the same time, start getCrew as
// soon as the sailings arrive (without waiting for the weather), and never leave a weather
// failure unhandled: the dashboard rejects with that error.
import * as tidewell from './services.js'

export async function loadDashboard(route, services = tidewell) {
  const sailings = await services.getSailings(route)
  const weather = await services.getWeather(route)
  const crew = sailings.length > 0 ? await services.getCrew(sailings[0].id) : []
  return { sailings, weather, crew }
}
