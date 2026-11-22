// Builds the repo library the app downloads from: index.json and one archive per repo.
// node scripts/build-packs.mjs <out dir>
// The site build writes it to apps/site/public/packs/v1; CI runs it to check content.
import { createHash } from 'node:crypto'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getChapter, listLabs, listPaths } from '../apps/desktop/src/main/services/packs.ts'
import { checkFlow, tasksWithoutFlow } from '../apps/desktop/src/shared/flow.ts'
import { checkIntro } from '../apps/desktop/src/shared/intro.ts'
import { videoProblems } from '../apps/desktop/src/shared/video.ts'
import { TOOL_IDS } from '../apps/desktop/src/shared/types.ts'
import { packArchive, packVersion } from '../apps/desktop/src/main/packArchive.ts'
import { functionNames, TRACED_EXTENSIONS } from '../packages/content/kit/declarations.mjs'

const out = process.argv[2] && resolve(process.argv[2])
if (!out) {
  console.error('Usage: node scripts/build-packs.mjs <out dir>')
  process.exit(2)
}

const content = fileURLToPath(new URL('../packages/content/', import.meta.url))
const problems = []

function starterFiles(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && TRACED_EXTENSIONS.includes(extname(entry.name)))
    .map((entry) => join(entry.parentPath, entry.name))
}

/** What a trace needs from the starter: its file, and each fn declared as a top-level function. */
function checkTraceNames(dir, name, flow) {
  const starter = join(dir, 'starter')
  const declared = new Set(
    starterFiles(starter).flatMap((f) => functionNames(readFileSync(f, 'utf8')))
  )
  for (const node of flow.scene.nodes) {
    if (node.fn && !declared.has(node.fn)) {
      problems.push(
        `${name}/flow.json: node "${node.id}": no starter file declares function ${node.fn}() at the top level`
      )
    }
  }
  for (const [taskId, task] of Object.entries(flow.tasks ?? {})) {
    if (!task.trace) continue
    const file = join(starter, task.trace.file)
    const where = `${name}/flow.json: the trace of task "${taskId}"`
    if (!TRACED_EXTENSIONS.includes(extname(file))) {
      problems.push(
        `${where} runs ${task.trace.file}; tracing runs ${TRACED_EXTENSIONS.join(', ')} files`
      )
    } else if (!existsSync(file)) {
      problems.push(`${where} runs ${task.trace.file}, which is not in starter/`)
    } else if (!functionNames(readFileSync(file, 'utf8')).includes(task.trace.call)) {
      problems.push(
        `${where} calls ${task.trace.call}(), which ${relative(starter, file)} does not declare`
      )
    }
  }
}

// An issue is not done without its flow and its intro; a repo's own scene stays optional.
function checkFlowFile(dir, name, taskIds) {
  const file = join(dir, 'flow.json')
  if (!existsSync(file)) {
    if (taskIds) problems.push(`${name}: flow.json is missing; every issue has a flow`)
    return
  }
  const { flow, problems: found } = checkFlow(
    readFileSync(file, 'utf8'),
    `${name}/flow.json`,
    taskIds
  )
  problems.push(...found)
  if (!flow || !taskIds) return
  for (const taskId of tasksWithoutFlow(flow, taskIds)) {
    problems.push(`${name}/flow.json: task "${taskId}" has no flow; every task has one`)
  }
  checkTraceNames(dir, name, flow)
}

function checkIntroFile(dir, name) {
  const file = join(dir, 'intro.json')
  if (!existsSync(file)) {
    problems.push(`${name}: intro.json is missing; every issue has an intro`)
    return
  }
  problems.push(...checkIntro(readFileSync(file, 'utf8'), `${name}/intro.json`).problems)
}

const folders = readdirSync(join(content, 'labs'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
  .map((entry) => entry.name)
const labs = await listLabs(content)
for (const id of folders) {
  if (!labs.some((lab) => lab.id === id))
    problems.push(`${id}: lab.json or an issue's chapter.json does not load`)
}

for (const lab of labs) {
  const tools = lab.tools ?? []
  if (!Array.isArray(tools) || tools.some((tool) => !TOOL_IDS.includes(tool))) {
    problems.push(`${lab.id}: tools must be a list of ${TOOL_IDS.join(', ')}`)
  }
  checkFlowFile(join(content, 'labs', lab.id), lab.id, null)
  for (const chapter of lab.chapters) {
    const dir = join(content, 'labs', lab.id, chapter.id)
    const loaded = await getChapter(content, lab.id, chapter.id).catch((error) => {
      problems.push(`${lab.id}/${chapter.id}: ${error.message}`)
    })
    if (loaded) {
      checkFlowFile(
        dir,
        `${lab.id}/${chapter.id}`,
        loaded.tasks.map((task) => task.id)
      )
      for (const task of loaded.tasks) {
        problems.push(...videoProblems(task.videos, `${lab.id}/${chapter.id}/${task.id}`))
      }
    }
    checkIntroFile(dir, `${lab.id}/${chapter.id}`)
    if (!existsSync(join(dir, 'grader', 'checks.mjs'))) {
      problems.push(`${lab.id}/${chapter.id}: grader/checks.mjs is missing`)
    }
  }
}

if (problems.length) {
  console.error(`The repos cannot be packed:\n${problems.map((p) => `  ${p}`).join('\n')}`)
  process.exit(1)
}

rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
const entries = labs.map((lab) => {
  const dir = join(content, 'labs', lab.id)
  const version = packVersion(dir)
  const file = `${lab.id}-${version}.tar.gz`
  const archive = packArchive(dir)
  writeFileSync(join(out, file), archive)
  // A card shows its cover before the repo is downloaded.
  const cover = existsSync(join(dir, 'cover.webp')) ? `${lab.id}-${version}.webp` : undefined
  if (cover) copyFileSync(join(dir, 'cover.webp'), join(out, cover))
  return {
    id: lab.id,
    version,
    format: lab.format ?? 1,
    file,
    size: archive.length,
    sha256: createHash('sha256').update(archive).digest('hex'),
    cover,
    summary: lab
  }
})
writeFileSync(
  join(out, 'index.json'),
  JSON.stringify({ paths: await listPaths(content), labs: entries })
)

const total = entries.reduce((sum, entry) => sum + entry.size, 0)
console.log(`Packed ${entries.length} repos, ${(total / 1e6).toFixed(1)} MB, into ${out}`)
