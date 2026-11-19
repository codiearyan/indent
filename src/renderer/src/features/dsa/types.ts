// The contract between pattern authors (who produce steps) and views (which draw them).
// A pattern never touches React: it turns input into a list of steps, and each step is a
// full snapshot of what the stage shows. Views animate the difference between two snapshots.

/**
 * What a highlight means. Use them the same way in every pattern:
 * - active:  the element being worked on right now
 * - compare: being read or compared, not changed
 * - good:    settled, or part of the answer
 * - bad:     rejected or removed
 * - muted:   no longer relevant
 */
export type Tone = 'active' | 'compare' | 'good' | 'bad' | 'muted'

/** A labelled marker on an array position. `index` may be -1 or `values.length` (off either end). */
export interface Pointer {
  label: string
  index: number
  tone?: Tone
}

export interface ArrayFrame {
  kind: 'array'
  label?: string
  values: (number | string)[]
  /** Stable identity per position, so a swap or shift animates as a move. Defaults to the index. */
  keys?: string[]
  /** Highlight per index. */
  tones?: Record<number, Tone>
  pointers?: Pointer[]
  /** A bracket under positions from..to inclusive, such as the current window. */
  range?: { from: number; to: number; label?: string }
}

/** A stack (last item is the top) or a queue (first item is the front). */
export interface BucketFrame {
  kind: 'bucket'
  label?: string
  shape: 'stack' | 'queue'
  items: { key: string; value: string | number; tone?: Tone }[]
}

/** A hash map or set, drawn as key and value pairs in insertion order. */
export interface MapFrame {
  kind: 'map'
  label?: string
  entries: { key: string; value: string | number; tone?: Tone }[]
}

/** Intervals on a shared number line, one row per item, in the order given. */
export interface IntervalsFrame {
  kind: 'intervals'
  label?: string
  /** Fixes the number line. Without it the line fits the items, so it rescales as they change. */
  domain?: { min: number; max: number }
  items: { key: string; start: number; end: number; label?: string; tone?: Tone }[]
}

/** A table: a DP table, a matrix, or a maze. Tones are keyed by `${row},${col}`. */
export interface GridFrame {
  kind: 'grid'
  label?: string
  cells: (string | number)[][]
  rowLabels?: string[]
  colLabels?: string[]
  tones?: Record<string, Tone>
}

/**
 * A singly linked list. `nodes` is the left-to-right drawing order and never changes between
 * steps; only `next` changes. A link to a node drawn further left is drawn as a curved back
 * edge, which is how a cycle or a reversed link shows up.
 */
export interface ListFrame {
  kind: 'list'
  label?: string
  nodes: { id: string; value: string | number; next: string | null; tone?: Tone }[]
  /** Markers such as slow, fast, prev, curr. `node: null` draws the marker on "null". */
  pointers?: { label: string; node: string | null; tone?: Tone }[]
}

/** A binary tree. The view lays it out from `root`. */
export interface TreeFrame {
  kind: 'tree'
  label?: string
  root: string | null
  nodes: { id: string; value: string | number; left?: string; right?: string; tone?: Tone }[]
  pointers?: { label: string; node: string; tone?: Tone }[]
}

/** A graph with author-chosen positions: x and y are fractions (0..1) of the drawing area. */
export interface GraphFrame {
  kind: 'graph'
  label?: string
  directed?: boolean
  nodes: { id: string; label: string; x: number; y: number; tone?: Tone; badge?: string }[]
  edges: { from: string; to: string; tone?: Tone; label?: string }[]
}

export type Frame =
  | ArrayFrame
  | BucketFrame
  | MapFrame
  | IntervalsFrame
  | GridFrame
  | ListFrame
  | TreeFrame
  | GraphFrame

export interface Step {
  /**
   * What the stage draws, top to bottom. Every step of a pattern has the same frames in the same
   * order (same kinds, same labels), so the stage animates between steps instead of jumping.
   */
  frames: Frame[]
  /** Named values worth watching, shown as chips, such as { sum: 9, best: 3 }. */
  vars?: Record<string, string | number>
  /** 1-based lines of the pattern's `code` that this step is executing. */
  lines: number[]
  /** One or two plain sentences: what just happened and why. */
  note: string
}

export const GROUPS = [
  'Arrays and strings',
  'Linked lists',
  'Heaps and greedy',
  'Trees and graphs',
  'Recursion and dynamic programming'
] as const

export type PatternGroup = (typeof GROUPS)[number]

export interface InputField {
  name: string
  label: string
  /** Shown under the field, such as "Up to 10 whole numbers, sorted". */
  help?: string
}

export interface Preset {
  label: string
  values: Record<string, string>
}

export interface Pattern {
  id: string
  title: string
  group: PatternGroup
  /** One line for the card, such as "Walk a sorted array from both ends". */
  tagline: string
  /** The concrete problem the animation solves. Markdown, one to three sentences. */
  problem: string
  /** "Reach for it when": signs in a problem statement that point to this pattern. */
  signals: string[]
  /** The idea in plain words. Markdown, two or three short paragraphs. */
  idea: string
  complexity: { time: string; space: string; why: string }
  /** Common mistakes. */
  mistakes: string[]
  /** The algorithm in TypeScript, as shown beside the animation. `Step.lines` point into it. */
  code: string
  inputs: InputField[]
  /** The first preset is what the page opens with. At least two. */
  presets: Preset[]
  /**
   * Turns input values (one string per input field) into the animation.
   * Throws an Error with a plain message when the input cannot be used.
   * The last step states the result in its note and carries it in `vars.answer`.
   */
  build(values: Record<string, string>): Step[]
}
