// Each export takes the learner's function and uses it the way Check's own code would.
export const firstOfNone = (firstOf) => firstOf([]) === undefined
export const byIdNone = (byId) => byId([{ id: 'OK-3001', tins: 1 }], 'OK-9999') === undefined
