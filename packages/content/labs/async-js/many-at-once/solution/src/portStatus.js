// Task: Which ports are answering
//
// portStatus(ports, ping) pings every port at the same time and resolves with
// { up: [port, ...], down: [{ port, reason }, ...] }, both in the same order as ports.
// - a port is up when ping(port) resolves, and down when it rejects
// - reason is the rejection's message
// - portStatus never rejects because of a failed ping
// ping defaults to the fake service. The check passes its own.
import * as tidewell from './services.js'

export function portStatus(ports, ping = tidewell.pingPort) {
  return Promise.allSettled(ports.map((port) => ping(port))).then((results) => {
    const up = []
    const down = []
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') up.push(ports[i])
      else down.push({ port: ports[i], reason: result.reason.message })
    })
    return { up, down }
  })
}
