// Copied into a check's sandbox as .grader/drive.mjs. Imports one of the learner's files and says
// what it exports, or calls one export with each list of arguments and says what came back or
// what it threw. An error while importing is not caught here: the grader reads it as a load problem.
const load = (file) => import(new URL(`../${file}`, import.meta.url))

export async function exportsOf(file) {
  const module = await load(file)
  return Object.fromEntries(Object.entries(module).map(([name, value]) => [name, typeof value]))
}

export async function callEach(file, name, argLists) {
  const module = await load(file)
  if (typeof module[name] !== 'function') return { missing: true, names: Object.keys(module) }
  return {
    results: argLists.map((args) => {
      try {
        const value = module[name](...args)
        return value === undefined ? { undefined: true } : { value }
      } catch (error) {
        return { threw: error instanceof Error ? `${error.name}: ${error.message}` : String(error) }
      }
    })
  }
}

export async function valueOf(file, name) {
  const module = await load(file)
  return { value: module[name] }
}
