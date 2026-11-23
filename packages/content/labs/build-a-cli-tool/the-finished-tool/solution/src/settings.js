// What the tool takes from the computer it runs on: settings and the terminal.
//
// Task 1: A setting from the environment, that a flag overrides (withSettings)
// Task 2: Colour only for a person at a terminal (useColour)

export function withSettings(flags, env) {
  if (flags.limit !== undefined || env.ORDERS_LIMIT === undefined) return flags
  if (!/^[1-9]\d*$/.test(env.ORDERS_LIMIT)) {
    throw new Error(`ORDERS_LIMIT must be a whole number above 0, not "${env.ORDERS_LIMIT}"`)
  }
  return { ...flags, limit: env.ORDERS_LIMIT }
}

export function useColour(stream, env) {
  return stream.isTTY === true && !env.NO_COLOR
}
