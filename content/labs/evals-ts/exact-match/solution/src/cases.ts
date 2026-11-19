// Task 1: load the test set.
//
// data/tickets.jsonl holds one case per line: {"id": "...", "input": "...", "expected": "..."}
// loadCases(path) reads that file and returns the cases in file order.
// - Skip lines that are empty or only whitespace.
// - Throw an Error that names the line, like "line 4", when a line is not valid JSON
//   or lacks a string id, input or expected. Count every line from 1, blank ones too.
// - Throw an Error that contains the id when two cases share an id.
import { readFileSync } from 'node:fs'

export interface Case {
  id: string
  input: string
  expected: string
}

function parseLine(line: string, number: number): Case {
  let value: unknown
  try {
    value = JSON.parse(line)
  } catch {
    throw new Error(`line ${number} is not valid JSON`)
  }
  const c = value as Record<string, unknown> | null
  if (typeof c?.id !== 'string' || typeof c.input !== 'string' || typeof c.expected !== 'string') {
    throw new Error(`line ${number} needs a string id, input and expected`)
  }
  return { id: c.id, input: c.input, expected: c.expected }
}

export function loadCases(path: string): Case[] {
  const cases: Case[] = []
  const seen = new Set<string>()
  readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .forEach((line, i) => {
      if (line.trim() === '') return
      const c = parseLine(line, i + 1)
      if (seen.has(c.id)) throw new Error(`duplicate case id ${c.id} on line ${i + 1}`)
      seen.add(c.id)
      cases.push(c)
    })
  return cases
}
