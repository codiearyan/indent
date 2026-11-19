import type { Tone } from './types'

// The one place a tone becomes a color, so every view highlights the same way. Active is ink, not a
// hue, because green only ever means settled and the warning hue means being read.

/** Boxes: array cells, map entries, grid cells, list nodes drawn as HTML. */
export const toneBox: Record<Tone | 'none', string> = {
  none: 'border-border bg-card text-foreground',
  active: 'border-foreground inset-ring inset-ring-foreground bg-accent text-foreground',
  compare: 'border-warning bg-warning/10 text-foreground',
  good: 'border-success bg-success/10 text-foreground',
  bad: 'border-destructive bg-destructive/10 text-foreground',
  muted: 'border-border bg-muted/40 text-muted-foreground opacity-50'
}

/** Text and thin markers: pointer labels, arrows drawn with currentColor. */
export const toneText: Record<Tone | 'none', string> = {
  none: 'text-muted-foreground',
  active: 'text-foreground font-medium',
  compare: 'text-warning',
  good: 'text-success',
  bad: 'text-destructive',
  muted: 'text-muted-foreground opacity-50'
}

/** SVG shapes: tree and graph nodes. */
export const toneShape: Record<Tone | 'none', string> = {
  none: 'fill-card stroke-muted-foreground/50',
  active: 'fill-accent stroke-foreground stroke-2',
  compare: 'fill-warning/10 stroke-warning',
  good: 'fill-success/10 stroke-success',
  bad: 'fill-destructive/10 stroke-destructive',
  muted: 'fill-muted/40 stroke-border opacity-50'
}

/** SVG lines: tree and graph edges, list links. */
export const toneLine: Record<Tone | 'none', string> = {
  none: 'stroke-muted-foreground/50',
  active: 'stroke-foreground',
  compare: 'stroke-warning',
  good: 'stroke-success',
  bad: 'stroke-destructive',
  muted: 'stroke-border opacity-40'
}

/** Every animated element moves and recolors with this, and stands still for reduced motion. */
export const MOVE = 'transition-all duration-300 ease-out motion-reduce:transition-none'
