// Records every lesson part with a neural voice so "Read aloud" sounds like a person.
// usage: node scripts/narrate.mjs [labId ...]     needs uvx (for edge-tts) and ffmpeg
// Each part is saved as packages/content/labs/<lab>/<issue>/audio/<key>.ogg, where the key is derived from
// the part's text. Parts that already have a recording are skipped; recordings whose text no
// longer exists are removed.
import { execFile } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { lessonParts, narrationKey } from '../apps/desktop/src/shared/narration.ts'

const VOICE = 'en-US-AndrewNeural'
// One part at a time: the voice service stops answering for a while when asked for many at once.
const ATTEMPTS = 6
const run = promisify(execFile)
const labsDir = new URL('../packages/content/labs/', import.meta.url).pathname
const only = process.argv.slice(2)
const scratch = mkdtempSync(join(tmpdir(), 'indent-narrate-'))

const jobs = []
for (const labId of readdirSync(labsDir).sort()) {
  if (only.length && !only.includes(labId)) continue
  const lab = JSON.parse(readFileSync(join(labsDir, labId, 'lab.json'), 'utf8'))
  for (const chapterId of lab.parts.flatMap((part) => part.chapters)) {
    const dir = join(labsDir, labId, chapterId)
    const audio = join(dir, 'audio')
    const parts = lessonParts(readFileSync(join(dir, 'lesson.md'), 'utf8'))
    const keys = new Set(parts.map(narrationKey))
    mkdirSync(audio, { recursive: true })
    for (const file of readdirSync(audio)) {
      if (!keys.has(file.replace(/\.ogg$/, ''))) rmSync(join(audio, file))
    }
    for (const text of parts) {
      const out = join(audio, `${narrationKey(text)}.ogg`)
      if (!existsSync(out)) jobs.push({ label: `${labId}/${chapterId}`, text, out })
    }
  }
}

async function record({ text, out }, n) {
  const source = join(scratch, `${n}.txt`)
  const mp3 = join(scratch, `${n}.mp3`)
  writeFileSync(source, text)
  await run('uvx', ['edge-tts', '--voice', VOICE, '--file', source, '--write-media', mp3], {
    timeout: 120000
  })
  // Speech survives a low bitrate well; this keeps a whole lesson under a megabyte.
  await run('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    '-i',
    mp3,
    '-c:a',
    'libopus',
    '-b:a',
    '24k',
    '-ac',
    '1',
    out
  ])
}

let failed = 0
console.log(`${jobs.length} parts to record with ${VOICE}`)
for (const [n, job] of jobs.entries()) {
  let recorded = false
  for (let attempt = 1; attempt <= ATTEMPTS && !recorded; attempt++) {
    try {
      await record(job, n)
      recorded = true
    } catch {
      // Back off longer each time; a refusal usually clears within a few minutes.
      if (attempt < ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, attempt * 30000))
    }
  }
  if (!recorded) {
    failed++
    console.error(`failed: ${job.label}`)
  }
  if ((n + 1) % 25 === 0) console.log(`${n + 1} / ${jobs.length}`)
}
rmSync(scratch, { recursive: true, force: true })
console.log(`recorded ${jobs.length - failed}, failed ${failed}`)
process.exit(failed ? 1 : 0)
