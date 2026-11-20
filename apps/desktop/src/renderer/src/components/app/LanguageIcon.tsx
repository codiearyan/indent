import type { IconType } from '@icons-pack/react-simple-icons'
import SiGnubash from '@icons-pack/react-simple-icons/icons/SiGnubash'
import SiGo from '@icons-pack/react-simple-icons/icons/SiGo'
import SiHtml5 from '@icons-pack/react-simple-icons/icons/SiHtml5'
import SiJavascript from '@icons-pack/react-simple-icons/icons/SiJavascript'
import SiOpenjdk from '@icons-pack/react-simple-icons/icons/SiOpenjdk'
import SiPython from '@icons-pack/react-simple-icons/icons/SiPython'
import SiReact from '@icons-pack/react-simple-icons/icons/SiReact'
import SiRust from '@icons-pack/react-simple-icons/icons/SiRust'
import SiSqlite from '@icons-pack/react-simple-icons/icons/SiSqlite'
import SiTypescript from '@icons-pack/react-simple-icons/icons/SiTypescript'
import { languageName } from '@/lib/languages'
import { cn } from '@/lib/utils'

/**
 * The logo of each language. A logo keeps its own colour, the one place the interface shows a
 * hue that is not ours; `plain` logos are near black, so they take the text colour instead.
 */
const LOGOS: Record<string, { icon: IconType; plain?: boolean }> = {
  typescript: { icon: SiTypescript },
  javascript: { icon: SiJavascript },
  react: { icon: SiReact },
  html: { icon: SiHtml5 },
  sql: { icon: SiSqlite, plain: true },
  shell: { icon: SiGnubash },
  python: { icon: SiPython },
  go: { icon: SiGo },
  rust: { icon: SiRust, plain: true },
  java: { icon: SiOpenjdk, plain: true }
}

export function LanguageIcon({
  language,
  className
}: {
  language: string
  className?: string
}): React.JSX.Element {
  const logo = LOGOS[language]
  if (logo) {
    return (
      <logo.icon
        role="img"
        title={languageName(language)}
        color={logo.plain ? 'currentColor' : 'default'}
        className={cn(
          'size-6 shrink-0 rounded-[12%]',
          logo.plain && 'text-muted-foreground',
          className
        )}
      />
    )
  }
  return (
    <span
      role="img"
      aria-label={language}
      className={cn(
        'inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-muted font-mono text-[10px] font-medium text-muted-foreground uppercase',
        className
      )}
    >
      {language.slice(0, 2)}
    </span>
  )
}
