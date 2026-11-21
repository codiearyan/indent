// Builds the repo library the app downloads from: index.json and one archive per repo.
// node scripts/build-packs.mjs <out dir>
// The site build writes it to apps/site/public/packs/v1; CI runs it to check content.
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getChapter, listLabs, listPaths } from '../apps/desktop/src/main/services/packs.ts'
import { packArchive, packVersion } from '../apps/desktop/src/main/packArchive.ts'

const out = process.argv[2] && resolve(process.argv[2])
if (!out) {
  console.error('Usage: node scripts/build-packs.mjs <out dir>')
  process.exit(2)
}

const content = fileURLToPath(new URL('../content/', import.meta.url))
const problems = []

const folders = readdirSync(join(content, 'labs'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
  .map((entry) => entry.name)
const labs = await listLabs(content)
for (const id of folders) {
  if (!labs.some((lab) => lab.id === id))
    problems.push(`${id}: lab.json or an issue's chapter.json does not load`)
}

for (const lab of labs) {
  for (const chapter of lab.chapters) {
    const dir = join(content, 'labs', lab.id, chapter.id)
    await getChapter(content, lab.id, chapter.id).catch((error) =>
      problems.push(`${lab.id}/${chapter.id}: ${error.message}`)
    )
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
