// Proves every issue grades correctly: starter fails every task, solution passes every task.
// node scripts/verify-content.mjs <root with packages/content/runtime dependencies installed> [labId ...]
import { spawn } from 'node:child_process'
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises'
import { existsSync, readdirSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.argv[2] && resolve(process.argv[2])
if (!root || !existsSync(join(root, 'node_modules'))) {
  console.error('Usage: node scripts/verify-content.mjs <root with node_modules> [labId ...]')
  process.exit(2)
}

const content = fileURLToPath(new URL('../packages/content/', import.meta.url))
const kit = join(content, 'kit')
const sandboxRoot = join(root, '.sandbox-verify')
const CONCURRENCY = 4

function run(cmd, args, cwd, env) {
  return new Promise((done) => {
    const child = spawn(cmd, args, { cwd, env })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d) => (stdout += d))
    child.stderr.on('data', (d) => (stderr += d))
    child.on('close', (code) => done({ code, stdout, stderr }))
  })
}

async function startModel() {
  const child = spawn('node', [join(kit, 'lab-model.mjs')], {
    stdio: ['ignore', 'pipe', 'inherit']
  })
  const first = await new Promise((done, fail) => {
    createInterface({ input: child.stdout }).once('line', done)
    child.once('exit', (code) => fail(new Error(`local model exited with ${code}`)))
  })
  const url = `http://127.0.0.1:${JSON.parse(first).port}/v1`
  const env = {
    ...process.env,
    OPENAI_BASE_URL: url,
    LAB_MODEL_URL: url,
    OPENAI_API_KEY: 'lab-model'
  }
  return { child, env }
}

async function grade(chapterDir, source, taskIds, env, solve) {
  const workspace = await mkdtemp(join(root, 'ws-'))
  try {
    await cp(join(chapterDir, source), workspace, { recursive: true })
    for (const script of solve ? ['setup.mjs', 'solve.mjs'] : ['setup.mjs']) {
      if (!existsSync(join(workspace, script))) continue
      const r = await run('node', [script], workspace, env)
      if (r.code !== 0) return { error: `${source}/${script} exited ${r.code}: ${r.stderr}` }
    }
    const args = [join(kit, 'run-check.mjs'), '--chapter', chapterDir, '--workspace', workspace]
    args.push('--sandbox-root', sandboxRoot, ...taskIds.flatMap((id) => ['--task', id]))
    const started = Date.now()
    const r = await run('node', args, root, env)
    const last = r.stdout.trim().split('\n').pop()
    if (r.code !== 0 || !last) return { error: `grader exited ${r.code}: ${r.stderr}` }
    return { results: JSON.parse(last).results, ms: Date.now() - started }
  } finally {
    await rm(workspace, { recursive: true, force: true })
  }
}

async function verify(labId, chapterId, env) {
  const name = `${labId}/${chapterId}`
  const chapterDir = join(content, 'labs', labId, chapterId)
  const def = JSON.parse(await readFile(join(chapterDir, 'chapter.json'), 'utf8'))
  const taskIds = def.tasks.map((task) => task.id)
  const starter = await grade(chapterDir, 'starter', taskIds, env, false)
  const solution = await grade(chapterDir, 'solution', taskIds, env, true)
  const error = starter.error ?? solution.error
  if (error) return { ok: false, line: `ERROR ${name}\n  ${error.trim().slice(-1500)}` }
  const summary = (results) => results.map((r) => ({ taskId: r.taskId, passed: r.passed }))
  const ok =
    starter.results.length === taskIds.length &&
    solution.results.length === taskIds.length &&
    starter.results.every((r) => !r.passed) &&
    solution.results.every((r) => r.passed)
  if (ok) return { ok, tasks: taskIds.length, line: `ok    ${name} (${solution.ms} ms)` }
  const detail = (results) => JSON.stringify(results.filter((r) => !r.passed).map((r) => r.details))
  return {
    ok,
    line:
      `FAIL  ${name}\n  starter:  ${JSON.stringify(summary(starter.results))}\n` +
      `  solution: ${JSON.stringify(summary(solution.results))}\n  solution failures: ${detail(solution.results)}`
  }
}

const only = process.argv.slice(3)
const jobs = []
for (const labId of readdirSync(join(content, 'labs')).sort()) {
  if (only.length && !only.includes(labId)) continue
  const labFile = join(content, 'labs', labId, 'lab.json')
  if (!existsSync(labFile)) continue
  const lab = JSON.parse(await readFile(labFile, 'utf8'))
  for (const part of lab.parts) for (const chapterId of part.chapters) jobs.push([labId, chapterId])
}

const { child: model, env } = await startModel()
let problems = 0
let tasks = 0
try {
  const queue = [...jobs]
  const worker = async () => {
    for (let job = queue.shift(); job; job = queue.shift()) {
      const result = await verify(...job, env).catch((err) => ({
        ok: false,
        line: `ERROR ${job.join('/')}\n  ${err.stack}`
      }))
      if (!result.ok) problems++
      tasks += result.tasks ?? 0
      console.log(result.line)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
} finally {
  model.kill()
  await rm(sandboxRoot, { recursive: true, force: true })
}
console.log(`${jobs.length} issues, ${tasks} tasks verified, ${problems} problems`)
process.exit(problems ? 1 : 0)
