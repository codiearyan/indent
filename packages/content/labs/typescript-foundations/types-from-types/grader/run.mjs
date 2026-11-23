// Each export takes the learner's function and uses it the way Check's own code would.
export const keepsTin = (updateTin) => {
  const tin = { id: 'T-31', blend: 'Morning Keemun', size: 250, pence: 990, stock: 8 }
  updateTin(tin, { stock: 1, pence: 500 })
  return tin.stock === 8 && tin.pence === 990
}
