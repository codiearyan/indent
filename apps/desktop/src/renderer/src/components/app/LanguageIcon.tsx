import type { IconType } from '@icons-pack/react-simple-icons'
import SiCplusplus from '@icons-pack/react-simple-icons/icons/SiCplusplus'
import SiGnubash from '@icons-pack/react-simple-icons/icons/SiGnubash'
import SiGo from '@icons-pack/react-simple-icons/icons/SiGo'
import SiHtml5 from '@icons-pack/react-simple-icons/icons/SiHtml5'
import SiJavascript from '@icons-pack/react-simple-icons/icons/SiJavascript'
import SiPython from '@icons-pack/react-simple-icons/icons/SiPython'
import SiReact from '@icons-pack/react-simple-icons/icons/SiReact'
import SiRust from '@icons-pack/react-simple-icons/icons/SiRust'
import SiSqlite from '@icons-pack/react-simple-icons/icons/SiSqlite'
import SiTypescript from '@icons-pack/react-simple-icons/icons/SiTypescript'
import { Coffee } from 'lucide-react'
import { languageName } from '@/lib/languages'
import { cn } from '@/lib/utils'

/**
 * The logo of each language. A logo keeps its own colour, the one place the interface shows a
 * hue that is not ours; `plain` logos are near black, so they take the text colour instead.
 * `color` replaces a brand colour too dark to see on the dark theme with a lighter one of the same
 * logo. Java has no logo in the set (it was taken down over its trademark), so it is a coffee cup.
 */
const LOGOS: Record<string, { icon: IconType; plain?: boolean; color?: string }> = {
  typescript: { icon: SiTypescript },
  javascript: { icon: SiJavascript },
  react: { icon: SiReact },
  html: { icon: SiHtml5 },
  sql: { icon: SiSqlite, color: '#0F80CC' },
  shell: { icon: SiGnubash },
  python: { icon: SiPython },
  go: { icon: SiGo },
  rust: { icon: SiRust, plain: true },
  java: { icon: Coffee as IconType, plain: true },
  cpp: { icon: SiCplusplus }
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
        color={logo.plain ? 'currentColor' : (logo.color ?? 'default')}
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
