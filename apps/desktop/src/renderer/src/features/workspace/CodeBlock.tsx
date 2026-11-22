import { useEffect, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { useSettings } from '@/stores/settings'
import { IconButton } from './IconButton'

type MonacoModule = typeof import('@/features/editor/monaco')
let monacoModule: Promise<MonacoModule> | null = null
const loadMonaco = (): Promise<MonacoModule> =>
  (monacoModule ??= import('@/features/editor/monaco'))

interface Colored {
  code: string
  html: string
  label: string
}

/** Colours code with the editor's own tokenizer and theme; null for a language it does not know. */
async function colorize(code: string, tag: string, theme: string): Promise<Colored | null> {
  const { monaco } = await loadMonaco()
  const language = monaco.languages
    .getLanguages()
    .find(
      (l) =>
        l.id === tag ||
        l.aliases?.some((alias) => alias.toLowerCase() === tag) ||
        l.extensions?.includes(`.${tag}`)
    )
  if (!language) return null
  monaco.editor.setTheme(theme)
  const html = await monaco.editor.colorize(code, language.id, { tabSize: 2 })
  return { code, html, label: language.aliases?.[0] ?? tag }
}

/** A fenced code block: coloured by language, with its name and a button that copies the code. */
export function CodeBlock({
  code,
  language
}: {
  code: string
  language?: string
}): React.JSX.Element {
  const mode = useSettings((s) => s.theme)
  const codeTheme = useSettings((s) => s.codeTheme)
  const [colored, setColored] = useState<Colored | null>(null)
  const [copied, setCopied] = useState(false)
  const tag = language?.toLowerCase()

  useEffect(() => {
    if (!tag) return
    let live = true
    loadMonaco()
      .then(({ themeName }) => colorize(code, tag, themeName(codeTheme, mode)))
      .then((result) => live && setColored(result))
      .catch(() => live && setColored(null))
    return () => {
      live = false
    }
  }, [code, tag, codeTheme, mode])

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])

  const copy = (): void => {
    navigator.clipboard.writeText(code).then(
      () => setCopied(true),
      () => {}
    )
  }
  // Monaco escapes the code it colours, so this HTML holds only its own spans.
  // While a reply streams, colours from the previous chunk would hide the newest text.
  const html = colored?.code === code ? colored.html : null

  return (
    <figure className="code-block overflow-hidden rounded-lg border border-border bg-card">
      <figcaption className="flex h-9 items-center justify-between border-b border-rule pr-1 pl-3 font-sans text-xs text-muted-foreground">
        <span>{colored?.label ?? language ?? 'Code'}</span>
        <IconButton label={copied ? 'Copied' : 'Copy code'} onClick={copy}>
          {copied ? <Check /> : <Copy />}
        </IconButton>
      </figcaption>
      <pre>{html ? <code dangerouslySetInnerHTML={{ __html: html }} /> : <code>{code}</code>}</pre>
    </figure>
  )
}
