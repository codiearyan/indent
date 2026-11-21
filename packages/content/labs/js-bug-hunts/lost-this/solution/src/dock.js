// The barcode scanner on the dock. It calls a handler with the boat id it scanned.
// Leave this file as it is: the fix belongs in fleet.js.

export function createScanner() {
  const handlers = new Map()
  return {
    on(event, handler) {
      handlers.set(event, handler)
    },
    scan(event, boatId) {
      const handler = handlers.get(event)
      handler(boatId)
    }
  }
}

export function connectScanner(scanner, fleet) {
  scanner.on('out', fleet.checkOut)
  scanner.on('in', fleet.checkIn)
}
