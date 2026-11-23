// Each export takes the learner's function and uses it the way Check's own code would.
export const fullHasNoNote = (reorderNote) =>
  reorderNote({ blend: 'Golden Yunnan', tins: 9, reorderAt: 6 }) === undefined
