import { expect } from 'vitest'
import type { Frame, Pattern, Step } from './types'

const MAX_STEPS = 150

function checkFrame(frame: Frame, where: string): void {
  switch (frame.kind) {
    case 'array': {
      const length = frame.values.length
      if (frame.keys) expect(frame.keys.length, `${where}: one key per value`).toBe(length)
      for (const index of Object.keys(frame.tones ?? {}).map(Number)) {
        expect(index >= 0 && index < length, `${where}: tone index ${index} in range`).toBe(true)
      }
      for (const pointer of frame.pointers ?? []) {
        const inRange = pointer.index >= -1 && pointer.index <= length
        expect(inRange, `${where}: pointer ${pointer.label} at ${pointer.index}`).toBe(true)
      }
      if (frame.range) {
        const { from, to } = frame.range
        expect(from >= 0 && to < length && from <= to, `${where}: range ${from}..${to}`).toBe(true)
      }
      break
    }
    case 'grid': {
      for (const key of Object.keys(frame.tones ?? {})) {
        const [row, col] = key.split(',').map(Number)
        expect(frame.cells[row]?.[col], `${where}: tone on cell ${key}`).toBeDefined()
      }
      break
    }
    case 'list': {
      const ids = new Set(frame.nodes.map((node) => node.id))
      for (const node of frame.nodes) {
        if (node.next !== null)
          expect(ids.has(node.next), `${where}: next of ${node.id}`).toBe(true)
      }
      for (const pointer of frame.pointers ?? []) {
        if (pointer.node !== null) {
          expect(ids.has(pointer.node), `${where}: pointer ${pointer.label}`).toBe(true)
        }
      }
      break
    }
    case 'tree': {
      const ids = new Set(frame.nodes.map((node) => node.id))
      if (frame.root !== null) expect(ids.has(frame.root), `${where}: root`).toBe(true)
      for (const node of frame.nodes) {
        for (const child of [node.left, node.right]) {
          if (child !== undefined)
            expect(ids.has(child), `${where}: child of ${node.id}`).toBe(true)
        }
      }
      for (const pointer of frame.pointers ?? []) {
        expect(ids.has(pointer.node), `${where}: pointer ${pointer.label}`).toBe(true)
      }
      break
    }
    case 'graph': {
      const ids = new Set(frame.nodes.map((node) => node.id))
      for (const node of frame.nodes) {
        const inside = node.x >= 0 && node.x <= 1 && node.y >= 0 && node.y <= 1
        expect(inside, `${where}: node ${node.id} position`).toBe(true)
      }
      for (const edge of frame.edges) {
        expect(
          ids.has(edge.from) && ids.has(edge.to),
          `${where}: edge ${edge.from}-${edge.to}`
        ).toBe(true)
      }
      break
    }
    case 'intervals': {
      for (const item of frame.items) {
        expect(item.start <= item.end, `${where}: interval ${item.key}`).toBe(true)
      }
      break
    }
  }
}

function checkSteps(pattern: Pattern, steps: Step[], preset: string): void {
  const codeLines = pattern.code.split('\n').length
  const shape = steps[0].frames.map((frame) => `${frame.kind}:${frame.label ?? ''}`).join('|')

  expect(steps.length, `${preset}: at least 3 steps`).toBeGreaterThanOrEqual(3)
  expect(steps.length, `${preset}: at most ${MAX_STEPS} steps`).toBeLessThanOrEqual(MAX_STEPS)

  steps.forEach((step, i) => {
    const where = `${preset} step ${i + 1}`
    expect(step.note.trim().length, `${where}: note`).toBeGreaterThan(10)
    expect(step.note.includes('—'), `${where}: no em dash in note`).toBe(false)
    expect(step.lines.length, `${where}: at least one code line`).toBeGreaterThan(0)
    for (const line of step.lines) {
      expect(line >= 1 && line <= codeLines, `${where}: code line ${line}`).toBe(true)
    }
    const stepShape = step.frames.map((frame) => `${frame.kind}:${frame.label ?? ''}`).join('|')
    expect(stepShape, `${where}: same frames as the first step`).toBe(shape)
    step.frames.forEach((frame) => checkFrame(frame, where))
  })

  expect(steps.at(-1)?.vars?.answer, `${preset}: last step carries vars.answer`).toBeDefined()
}

/** Every pattern's test calls this: it checks the metadata and every preset's animation. */
export function expectValidPattern(pattern: Pattern): void {
  expect(pattern.id).toMatch(/^[a-z0-9-]+$/)
  expect(pattern.presets.length, 'at least two presets').toBeGreaterThanOrEqual(2)
  expect(pattern.signals.length, 'at least three signals').toBeGreaterThanOrEqual(3)
  expect(pattern.mistakes.length, 'at least two mistakes').toBeGreaterThanOrEqual(2)
  for (const preset of pattern.presets) {
    for (const field of pattern.inputs) {
      expect(preset.values[field.name], `${preset.label}: value for ${field.name}`).toBeDefined()
    }
    checkSteps(pattern, pattern.build(preset.values), preset.label)
  }
}
