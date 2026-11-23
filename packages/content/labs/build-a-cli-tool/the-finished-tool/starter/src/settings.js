// What the tool takes from the computer it runs on: a setting, and whether a person is watching.
//
// Task 1: A setting from the environment, that a flag overrides (withSettings)
// Task 2: Colour only for a person at a terminal (useColour)

// withSettings(flags, env) returns the flags with the settings from the environment env filled
// in: limit from ORDERS_LIMIT when no --limit was typed. A flag that was typed always wins.
export function withSettings(flags, env) {
  throw new Error('Not implemented')
}

// useColour(stream, env) says whether to colour what is written to stream: only when it is a
// terminal, and never when NO_COLOR is set.
export function useColour(stream, env) {
  throw new Error('Not implemented')
}
