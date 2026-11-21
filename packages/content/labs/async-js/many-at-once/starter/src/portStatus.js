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
  throw new Error('Not implemented')
}
