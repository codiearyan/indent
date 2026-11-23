// Each export takes the learner's function and uses it the way Check's own code would.
export const labelSamples = (labelAll) =>
  labelAll(['Smoky Lapsang', 'Morning Keemun'], (blend) => `${blend} (sample)`)
export const labelNone = (labelAll) => labelAll([], (blend) => blend)

export const rulesInOrder = (applyRules) =>
  applyRules(1200, [(pence) => pence - 200, (pence) => pence * 2])
export const noRules = (applyRules) => applyRules(990, [])

export const positions = (numbered) =>
  numbered(['Frost Sencha', 'Hearth Assam', 'Ember Oolong'], (line, at) => `${at}:${line}`)
export const linesOnly = (numbered) => numbered(['Morning Keemun'], (line) => `- ${line}`)

export const tenOff = (percentOff) => percentOff(10)(2450)
export const quarterOff = (percentOff) => percentOff(25)(999)
export const twoRules = (percentOff) => {
  const small = percentOff(5)
  const large = percentOff(50)
  return [small(1000), large(1000), small(2000)]
}
