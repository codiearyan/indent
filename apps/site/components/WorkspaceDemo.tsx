import type { CSSProperties, ReactNode } from 'react'

// A still of a real chapter (Retrieval from scratch, chapter 1) drawn in HTML.
const tasks = [
  'Split text into whole-word chunks',
  'Overlap neighbouring chunks',
  'Keep where each chunk came from'
]

const code = [
  ['export function ', 'chunkText', '(text: string, size: number, overlap = 0): string[] {'],
  ["  if (size < 1) throw new Error('size must be at least 1')", '', ''],
  ['  const words = text.', 'split', '(/\\s+/).filter(Boolean)'],
  ['  const chunks: string[] = []', '', ''],
  ['  let start = 0', '', ''],
  ['  while (start < words.length) {', '', ''],
  ['    const end = ', 'fillChunk', '(words, start, size)'],
  ['    chunks.', 'push', "(words.slice(start, end).join(' '))"],
  ['    if (end === words.length) break', '', ''],
  ['    start = ', 'carryBack', '(words, start, end, overlap)'],
  ['  }', '', ''],
  ['  return chunks', '', ''],
  ['}', '', '']
]

export function WorkspaceDemo(): ReactNode {
  return (
    <figure
      aria-label="The Labbench workspace with three tasks turning green after a check"
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="ml-3 truncate text-xs text-muted-foreground">
          Retrieval from scratch / Cutting the handbook into chunks
        </span>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] md:grid-cols-[15rem_minmax(0,1fr)]">
        <div className="border-b border-border p-4 md:border-r md:border-b-0">
          <p className="text-xs text-muted-foreground">Tasks</p>
          <ul className="mt-3 space-y-2">
            {tasks.map((title, i) => (
              <li
                key={title}
                className="demo-task flex items-start gap-2.5"
                style={{ '--i': i } as CSSProperties}
              >
                <span className="demo-task-mark mt-px grid size-4 shrink-0 place-items-center rounded-full text-[10px] leading-none">
                  <span className="demo-pass col-start-1 row-start-1">✓</span>
                  <span className="demo-fail col-start-1 row-start-1">✕</span>
                </span>
                <span className="text-[13px] leading-snug">{title}</span>
              </li>
            ))}
          </ul>
          <span className="demo-check mt-5 inline-flex h-8 items-center rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground">
            Check
          </span>
        </div>

        <div className="min-w-0">
          <div className="flex border-b border-border font-mono text-xs">
            <span className="border-r border-border bg-background px-3 py-2">src/chunk.ts</span>
            <span className="hidden px-3 py-2 text-muted-foreground sm:inline">
              src/handbook.ts
            </span>
          </div>
          <pre className="overflow-x-auto p-4 font-mono text-[12px] leading-relaxed">
            {code.map(([before, name, after], n) => (
              <div key={n} className="flex gap-4">
                <span className="w-4 shrink-0 text-right text-muted-foreground/60 select-none">
                  {n + 1}
                </span>
                <span>
                  {before}
                  <span className="text-brand">{name}</span>
                  {after}
                </span>
              </div>
            ))}
          </pre>
          <div className="border-t border-border bg-background px-4 py-3 font-mono text-[12px]">
            <span className="text-muted-foreground">$ </span>node src/demo.ts
            <div className="truncate text-muted-foreground">
              &apos;Staff check the marine forecast at 7 am every morning. Trips are paused when
              the&apos;,
            </div>
          </div>
        </div>
      </div>
    </figure>
  )
}
