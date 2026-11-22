import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'
import type { PathDef } from '../shared/types'

const read = (path: string): string =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8')

it('ships the first repo of every roadmap in the installer', () => {
  const shipped = [...read('../../electron-builder.yml').matchAll(/- labs\/([\w-]+)\/\*\*/g)]
    .map((match) => match[1])
    .sort()
  const roadmaps = JSON.parse(read('../../../../packages/content/paths.json')) as PathDef[]
  const first = roadmaps.map((roadmap) => roadmap.stages.flatMap((stage) => stage.labs)[0])
  expect(shipped).toEqual([...new Set(first)].sort())
})
