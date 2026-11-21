import {
  CODE_THEMES,
  codePalette,
  type CodePalette,
  type CodeThemeId
} from '@indent/design/code-palette'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'
import { useSettings } from '@/stores/settings'

/** The code themes as cards, each with a sample in its colours. `hints` adds a line about each. */
export function CodeThemeCards({ hints = false }: { hints?: boolean }): React.JSX.Element {
  const theme = useSettings((s) => s.theme)
  const codeTheme = useSettings((s) => s.codeTheme)
  const setCodeTheme = useSettings((s) => s.setCodeTheme)

  return (
    <RadioGroup
      aria-label="Code theme"
      value={codeTheme}
      onValueChange={(value) => setCodeTheme(value as CodeThemeId)}
      className="grid-cols-2"
    >
      {CODE_THEMES.map(({ id, label, hint }) => (
        <label
          key={id}
          htmlFor={`code-theme-${id}`}
          className="flex cursor-pointer flex-col gap-2.5 rounded-lg border border-border p-3 hover:border-input has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50 has-[[data-state=checked]]:border-foreground"
        >
          <span className="flex items-center gap-2">
            <span className="flex-1 text-sm font-medium">{label}</span>
            <RadioGroupItem id={`code-theme-${id}`} value={id} className="focus-visible:ring-0" />
          </span>
          <CodeSample palette={codePalette(id, theme)} />
          {hints && <span className="text-[13px] text-muted-foreground">{hint}</span>}
        </label>
      ))}
    </RadioGroup>
  )
}

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
