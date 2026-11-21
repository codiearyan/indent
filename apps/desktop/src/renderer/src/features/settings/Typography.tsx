import { useCallback, useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { codeChrome, codePalette } from '@indent/design/code-palette'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { DEFAULT_FONT, fontStack, isInstalled, listFonts, type FontKind } from '@/lib/fonts'
import {
  DEFAULT_TYPOGRAPHY as D,
  useSettings,
  type CursorStyle,
  type Typography as Options
} from '@/stores/settings'
import { Row, card, segment, segmented } from './controls'

const UI_SIZES = [12, 13, 14, 15, 16, 17, 18, 20]
const MONO_SIZES = [10, 11, 12, 13, 14, 15, 16, 18, 20]
const LINE_HEIGHTS = [1.2, 1.4, 1.5, 1.6, 1.8, 2]
const CURSORS: { value: CursorStyle; label: string }[] = [
  { value: 'block', label: 'Block' },
  { value: 'bar', label: 'Bar' },
  { value: 'underline', label: 'Underline' }
]

/** Fonts and how code reads: pickers with live samples, word wrap, and an Advanced group. */
export function Typography(): React.JSX.Element {
  const t = useSettings((s) => s.typography)
  const set = useSettings((s) => s.setTypography)
  const wordWrap = useSettings((s) => s.editor.wordWrap)
  const setEditorOption = useSettings((s) => s.setEditorOption)
  const changed = (...keys: (keyof Options)[]): boolean => keys.some((key) => t[key] !== D[key])

  return (
    <div className={card}>
      <div className="pb-4">
        <FontRow
          kind="sans"
          label="Interface font"
          hint="Everything outside code. The size is for lessons and tasks."
          font={t.uiFont}
          size={t.uiSize}
          sizes={UI_SIZES}
          onFont={(uiFont) => set({ uiFont })}
          onSize={(uiSize) => set({ uiSize })}
          onReset={
            changed('uiFont', 'uiSize') ? () => set({ uiFont: null, uiSize: D.uiSize }) : undefined
          }
        />
        <div className="mx-4">
          <LessonSample size={t.uiSize} />
        </div>
      </div>

      <div className="pb-4">
        <FontRow
          kind="mono"
          label="Monospace font"
          hint="The code editor, code in lessons, and the terminal."
          font={t.monoFont}
          size={t.monoSize}
          sizes={MONO_SIZES}
          onFont={(monoFont) => set({ monoFont })}
          onSize={(monoSize) => set({ monoSize })}
          onReset={
            changed('monoFont', 'monoSize')
              ? () => set({ monoFont: null, monoSize: D.monoSize })
              : undefined
          }
        />
        <div className="mx-4 space-y-3">
          <EditorSample t={t} />
          <TerminalSample t={t} />
        </div>
      </div>

      <Row
        id="editor-wordWrap"
        label="Word wrap"
        hint="Long lines in the code editor continue on the next line."
        onReset={wordWrap ? () => setEditorOption('wordWrap', false) : undefined}
      >
        <Switch
          id="editor-wordWrap"
          checked={wordWrap}
          onCheckedChange={(on) => setEditorOption('wordWrap', on)}
        />
      </Row>

      <Collapsible>
        <CollapsibleTrigger className="group flex h-12 w-full items-center gap-2 px-4 text-sm text-muted-foreground hover:text-foreground">
          <ChevronRight className="size-4 transition-transform duration-(--motion-state) group-data-[state=open]:rotate-90" />
          Advanced
        </CollapsibleTrigger>
        <CollapsibleContent className="divide-y divide-rule border-t border-rule">
          <Row
            id="code-line-height"
            label="Line height"
            hint="Space between lines in the code editor."
            onReset={changed('lineHeight') ? () => set({ lineHeight: D.lineHeight }) : undefined}
          >
            <Select
              value={String(t.lineHeight)}
              onValueChange={(value) => set({ lineHeight: Number(value) })}
            >
              <SelectTrigger id="code-line-height" className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LINE_HEIGHTS.map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    {value.toFixed(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
          <Row
            id="code-ligatures"
            label="Ligatures"
            hint="Joins pairs such as => and !== in fonts that have them."
            onReset={changed('ligatures') ? () => set({ ligatures: D.ligatures }) : undefined}
          >
            <Switch
              id="code-ligatures"
              checked={t.ligatures}
              onCheckedChange={(ligatures) => set({ ligatures })}
            />
          </Row>
          <Row
            label="Terminal cursor"
            onReset={changed('cursor') ? () => set({ cursor: D.cursor }) : undefined}
          >
            <ToggleGroup
              type="single"
              size="sm"
              spacing={1}
              aria-label="Terminal cursor"
              className={`w-60 shrink-0 ${segmented}`}
              value={t.cursor}
              onValueChange={(value) => value && set({ cursor: value as CursorStyle })}
            >
              {CURSORS.map(({ value, label }) => (
                <ToggleGroupItem key={value} value={value} className={segment}>
                  {label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Row>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

function FontRow({
  kind,
  label,
  hint,
  font,
  size,
  sizes,
  onFont,
  onSize,
  onReset
}: {
  kind: FontKind
  label: string
  hint: string
  font: string | null
  size: number
  sizes: number[]
  onFont: (font: string | null) => void
  onSize: (size: number) => void
  onReset?: () => void
}): React.JSX.Element {
  const [fonts, setFonts] = useState<string[]>([DEFAULT_FONT[kind]])
  const load = useCallback(() => void listFonts(kind).then(setFonts), [kind])
  useEffect(load, [load])
  const current = font ?? DEFAULT_FONT[kind]
  const missing = font !== null && !isInstalled(font)
  const names = fonts.includes(current) ? fonts : [current, ...fonts]
  const id = `font-${kind}`

  return (
    <Row id={id} label={label} hint={hint} onReset={onReset}>
      <div className="flex shrink-0 gap-2">
        <Select
          value={current}
          onValueChange={(name) => onFont(name === DEFAULT_FONT[kind] ? null : name)}
          onOpenChange={(open) => open && load()}
        >
          <SelectTrigger id={id} className="w-52 [&>span]:truncate">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            {names.map((name) => (
              <SelectItem key={name} value={name} style={{ fontFamily: fontStack(name, kind) }}>
                {name}
                {name === current && missing && (
                  <span className="font-sans text-muted-foreground">Not installed</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(size)} onValueChange={(value) => onSize(Number(value))}>
          <SelectTrigger aria-label={`${label} size`} className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sizes.map((value) => (
              <SelectItem key={value} value={String(value)}>
                {value} px
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </Row>
  )
}

function LessonSample({ size }: { size: number }): React.JSX.Element {
  return (
    <p
      aria-hidden
      className="prose-lab rounded-lg border border-border px-4 py-3"
      style={{ fontSize: size, lineHeight: 1.75 }}
    >
      <strong>Task 2</strong> asks for a total that skips refunded orders. Open{' '}
      <code>src/cart.js</code> and read{' '}
      <span className="underline underline-offset-2">the part on filter</span> before you press
      Check.
    </p>
  )
}

/** A changed line in the current code theme, with characters that are easy to confuse. */
export function EditorSample({
  t,
  children
}: {
  t: Options
  /** Shown under the code, inside the frame. */
  children?: React.ReactNode
}): React.JSX.Element {
  const theme = useSettings((s) => s.theme)
  const codeTheme = useSettings((s) => s.codeTheme)
  const p = codePalette(codeTheme, theme)
  const c = (color: string, text: string): React.JSX.Element => (
    <span style={{ color }}>{text}</span>
  )
  const line = (n: number, mark: '' | '-' | '+', code: React.ReactNode): React.JSX.Element => (
    <div
      className={mark === '-' ? 'bg-destructive/10' : mark === '+' ? 'bg-success/10' : undefined}
    >
      <span className="inline-block w-10 pr-3 text-right" style={{ color: p.muted }}>
        {n}
      </span>
      {code}
    </div>
  )

  return (
    <div aria-hidden className="overflow-hidden rounded-lg border border-border bg-editor">
      <div className="flex h-9 items-center justify-between border-b border-rule px-3 font-mono text-xs">
        <span className="text-foreground">src/order.js</span>
        <span className="tabular-nums">
          <span className="text-destructive">-1</span> <span className="text-success">+1</span>
        </span>
      </div>
      <pre
        className="overflow-hidden py-2 font-mono"
        style={{
          color: p.foreground,
          fontSize: t.monoSize,
          lineHeight: t.lineHeight,
          fontVariantLigatures: t.ligatures ? 'normal' : 'none'
        }}
      >
        {line(
          1,
          '',
          <>
            {c(p.keyword, 'export function ')}
            {c(p.function, 'label')}
            {'('}
            {c(p.variable, 'order')}
            {') {'}
          </>
        )}
        {line(
          2,
          '-',
          <>
            {c(p.keyword, '  return ')}
            {c(p.variable, 'order')}
            {'.id.'}
            {c(p.function, 'toUpperCase')}
            {'()'}
          </>
        )}
        {line(
          2,
          '+',
          <>
            {c(p.keyword, '  return ')}
            {c(p.variable, 'order')}
            {".id !== '' ? "}
            {c(p.string, '`#${order.id}`')}
            {' : '}
            {c(p.number, '0')}
            {c(p.comment, ' // 0O 1lI')}
          </>
        )}
        {line(3, '', '}')}
      </pre>
      {children}
    </div>
  )
}

export function TerminalSample({
  t,
  compact = false
}: {
  t: Options
  /** Leaves out the empty lines, for where the sample has little room. */
  compact?: boolean
}): React.JSX.Element {
  const gap = compact ? '\n' : '\n\n'
  const theme = useSettings((s) => s.theme)
  const p = codeChrome[theme]
  const cursor = {
    block: 'h-[1.2em] w-[0.6em]',
    bar: 'h-[1.2em] w-[2px]',
    underline: 'h-[2px] w-[0.6em]'
  }[t.cursor]
  const prompt = (
    <>
      <span style={{ color: p.ansi.green }}>~/Indent/js-foundations</span>
      <span style={{ color: p.ansi.blue }}> $ </span>
    </>
  )

  return (
    <pre
      aria-hidden
      className="overflow-hidden rounded-lg border border-border px-4 py-3 font-mono"
      style={{
        background: p.background,
        color: p.foreground,
        fontSize: t.monoSize,
        lineHeight: 1.5
      }}
    >
      {prompt}npm test{gap}
      <span style={{ color: p.ansi.green }}>{'  ✓ 12 passed'}</span>
      {'   '}
      <span style={{ color: p.ansi.red }}>✗ 1 failed</span>
      {gap}
      {prompt}
      <span
        className={`inline-block align-text-bottom ${cursor}`}
        style={{ background: p.cursor }}
      />
    </pre>
  )
}
