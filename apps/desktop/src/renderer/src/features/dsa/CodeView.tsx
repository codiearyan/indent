import { useEffect, useMemo, useRef } from 'react'
import { codePalette } from '@indent/design/code-palette'
import { cn } from '@/lib/utils'
import { useSettings } from '@/stores/settings'
import { tokenize, type TokenKind } from './highlight'

const TOKEN_CLASS: Record<TokenKind, string> = {
  comment: 'text-(--code-comment) italic',
  string: 'text-(--code-string)',
  number: 'text-(--code-number)',
  keyword: 'text-(--code-keyword)',
  plain: ''
}

export function CodeView({ code, lines }: { code: string; lines: number[] }): React.JSX.Element {
  const theme = useSettings((s) => s.theme)
  const palette = codePalette[theme]
  const tokenized = useMemo(() => code.split('\n').map(tokenize), [code])
  const scrollRef = useRef<HTMLDivElement>(null)
  const firstLine = lines[0]

  useEffect(() => {
    const box = scrollRef.current
    const line = box?.querySelector<HTMLElement>('[data-active]')
    if (!box || !line) return
    const top = line.offsetTop
    const bottom = top + line.offsetHeight
    if (top < box.scrollTop || bottom > box.scrollTop + box.clientHeight) {
      box.scrollTo({ top: top - box.clientHeight / 3, behavior: 'smooth' })
    }
  }, [firstLine])

  return (
    <div
      className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border"
      style={
        {
          '--code-comment': palette.comment,
          '--code-string': palette.string,
          '--code-number': palette.number,
          '--code-keyword': palette.keyword
        } as React.CSSProperties
      }
    >
      <div className="flex h-10 shrink-0 items-center border-b border-rule px-4 text-xs text-muted-foreground">
        TypeScript
      </div>
      <div ref={scrollRef} className="relative max-h-[560px] overflow-auto py-3">
        <pre className="w-max min-w-full font-mono text-[13px] leading-6">
          {tokenized.map((tokens, i) => {
            const active = lines.includes(i + 1)
            return (
              <div
                key={i}
                data-active={active || undefined}
                className={cn(
                  'flex border-l-2 pr-4 transition-colors duration-200 motion-reduce:transition-none',
                  active ? 'border-foreground bg-accent' : 'border-transparent'
                )}
              >
                <span className="w-10 shrink-0 pr-4 text-right text-muted-foreground tabular-nums select-none">
                  {i + 1}
                </span>
                <code>
                  {tokens.map((token, j) => (
                    <span key={j} className={TOKEN_CLASS[token.kind]}>
                      {token.text}
                    </span>
                  ))}
                </code>
              </div>
            )
          })}
        </pre>
      </div>
    </div>
  )
}
