import type { Tone } from './types'

// The one place a tone becomes a color, so every view highlights the same way.

/** Boxes: array cells, map entries, grid cells, list nodes drawn as HTML. */
export const toneBox: Record<Tone | 'none', string> = {
  none: 'border-border bg-card text-foreground',
  active: 'border-brand bg-brand/15 text-foreground',
  compare: 'border-warning bg-warning/15 text-foreground',
  good: 'border-success bg-success/15 text-foreground',
  bad: 'border-destructive bg-destructive/15 text-foreground',
  muted: 'border-border bg-muted/40 text-muted-foreground opacity-50'
}

/** Text and thin markers: pointer labels, arrows drawn with currentColor. */
export const toneText: Record<Tone | 'none', string> = {
  none: 'text-muted-foreground',
  active: 'text-brand',
  compare: 'text-warning',
  good: 'text-success',
  bad: 'text-destructive',
  muted: 'text-muted-foreground opacity-50'
}

/** SVG shapes: tree and graph nodes. */
export const toneShape: Record<Tone | 'none', string> = {
  none: 'fill-card stroke-border',
  active: 'fill-brand/15 stroke-brand',
  compare: 'fill-warning/15 stroke-warning',
  good: 'fill-success/15 stroke-success',
  bad: 'fill-destructive/15 stroke-destructive',
  muted: 'fill-muted/40 stroke-border opacity-50'
}

/** SVG lines: tree and graph edges, list links. */
export const toneLine: Record<Tone | 'none', string> = {
  none: 'stroke-border',
  active: 'stroke-brand',
  compare: 'stroke-warning',
  good: 'stroke-success',
  bad: 'stroke-destructive',
  muted: 'stroke-border opacity-40'
}

/** Every animated element moves and recolors with this, and stands still for reduced motion. */
export const MOVE = 'transition-all duration-300 ease-out motion-reduce:transition-none'
