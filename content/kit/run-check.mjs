// Grader CLI. Prints one JSON line last on stdout and exits 0 whether tasks pass or fail.
// node run-check.mjs --chapter <dir> --workspace <dir> --sandbox-root <dir> --task <id> [--task <id> ...]
import { parseArgs } from 'node:util'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createContext } from './context.mjs'

const { values } = parseArgs({
  options: {
    chapter: { type: 'string' },
    workspace: { type: 'string' },
    'sandbox-root': { type: 'string' },
    task: { type: 'string', multiple: true }
  }
})
if (!values.chapter || !values.workspace || !values['sandbox-root'] || !values.task?.length) {
  throw new Error('Usage: run-check.mjs --chapter <dir> --workspace <dir> --sandbox-root <dir> --task <id>...')
}

const chapter = resolve(values.chapter)
const { checks } = await import(pathToFileURL(join(chapter, 'grader', 'checks.mjs')).href)

async function runTask(taskId) {
  const { t, cleanup } = createContext({
    chapter,
    workspace: resolve(values.workspace),
    sandboxRoot: resolve(values['sandbox-root'])
  })
  let details
  try {
    details = checks[taskId]
      ? await checks[taskId](t)
      : [{ name: 'Checks exist', passed: false, message: `This chapter has no checks for task ${taskId}.` }]
  } catch (err) {
    details = [{ name: 'Check ran', passed: false, message: `The check itself failed: ${err?.message ?? err}` }]
  } finally {
    await cleanup()
  }
  return { taskId, passed: details.length > 0 && details.every((d) => d.passed), details }
}

const results = await Promise.all(values.task.map(runTask))
process.stdout.write(JSON.stringify({ results }) + '\n')
