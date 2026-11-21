import type { CodePalette } from '@indent/design/code-palette'
import { cn } from '@/lib/utils'

/** Three lines that use every colour of a code theme. */
export function CodeSample({
  palette: p,
  className,
  style
}: {
  palette: CodePalette
  className?: string
  style?: React.CSSProperties
}): React.JSX.Element {
  const part = (color: string, text: string): React.JSX.Element => (
    <span style={{ color }}>{text}</span>
  )
  return (
    <pre
      aria-hidden
      className={cn(
        'overflow-hidden rounded-md border border-rule bg-editor px-3 py-2 font-mono text-[11px] leading-5',
        className
      )}
      style={{ color: p.foreground, ...style }}
    >
      <span className="italic" style={{ color: p.comment }}>
        {'// add up the paid orders\n'}
      </span>
      {part(p.keyword, 'const ')}
      {part(p.variable, 'total')}
      {' = '}
      {part(p.function, 'Sum')}
      {'.of('}
      {part(p.variable, 'orders')}
      {', '}
      {part(p.number, '0')}
      {')\n'}
      {part(p.keyword, 'return ')}
      {part(p.string, "'Total: '")}
      {' + '}
      {part(p.variable, 'total')}
    </pre>
  )
}
