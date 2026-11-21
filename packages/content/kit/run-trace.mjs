// Tracer CLI. Runs a task's example from flow.json on the learner's code and records each call of
// their functions. Prints one JSON line last on stdout and exits 0 whether their code works or
// throws. It reads only flow.json from the chapter, never grader/ or solution/.
// node run-trace.mjs --chapter <dir> --workspace <dir> --sandbox-root <dir> --task <id>
import { fork } from 'node:child_process'
import { readFile, rm } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { fileURLToPath } from 'node:url'
import { childEnv, clip, collect, DEFAULT_TIMEOUT, makeSandbox } from './sandbox.mjs'

const traceChild = fileURLToPath(new URL('./trace-child.mjs', import.meta.url))

const { values } = parseArgs({
  options: {
    chapter: { type: 'string' },
    workspace: { type: 'string' },
    'sandbox-root': { type: 'string' },
    task: { type: 'string' }
  }
})
if (!values.chapter || !values.workspace || !values['sandbox-root'] || !values.task) {
  throw new Error(
    'Usage: run-trace.mjs --chapter <dir> --workspace <dir> --sandbox-root <dir> --task <id>'
  )
}

const flow = JSON.parse(await readFile(join(resolve(values.chapter), 'flow.json'), 'utf8'))
const example = flow.tasks?.[values.task]?.trace
if (!example) throw new Error(`Task ${values.task} has no trace in flow.json`)

function runExample(dir) {
  const target = resolve(dir, example.file)
  const rel = relative(dir, target)
  if (rel.startsWith('..') || isAbsolute(rel))
    throw new Error(`${example.file} is outside the workspace`)
  const child = fork(traceChild, [dir, rel, example.call, JSON.stringify(example.args)], {
    cwd: dir,
    env: childEnv(),
    silent: true
  })
  const calls = []
  let truncated = false
  let result
  child.on('message', (m) => {
    if (m?.type === 'call') {
      calls[m.index] = { fn: m.fn, file: m.file, depth: m.depth, args: m.args }
    } else if (m?.type === 'end' && calls[m.index]) {
      if ('threw' in m) calls[m.index].threw = m.threw
      else calls[m.index].returned = m.returned
    } else if (m?.type === 'truncated') truncated = true
    else if (m?.type === 'result') result = m
  })
  return collect(child, DEFAULT_TIMEOUT).then((r) => ({
    ok: result?.ok === true && !r.timedOut,
    calls: calls.filter(Boolean),
    ...(result?.ok && !r.timedOut
      ? {}
      : {
          error:
            result?.error ??
            (r.timedOut ? 'Timed out' : clip(r.stderr) || `Exited with code ${r.code}`)
        }),
    timedOut: r.timedOut,
    truncated,
    stdout: r.stdout
  }))
}

const dir = await makeSandbox(resolve(values.workspace), resolve(values['sandbox-root']))
let trace
try {
  trace = await runExample(dir)
} finally {
  await rm(dir, { recursive: true, force: true })
}
process.stdout.write(JSON.stringify({ trace }) + '\n')
