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

export function loadCases(path: string): Case[] {
  throw new Error('Not implemented')
}
