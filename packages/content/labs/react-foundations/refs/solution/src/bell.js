// The cab screen is wired to the real bell on the Foundry Belle, the original from 1911. ring()
// rings it, and logRide() writes one line in Wilf's bell log at the end of each ride. In the
// Browser panel both show in the console.
export function ring() {
  console.log('Bell: ding')
}

export function logRide(rings) {
  console.log(`Bell log: rang ${rings} times on this ride`)
}
