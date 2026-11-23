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
import { languageName } from '@/lib/languages'
import { cn } from '@/lib/utils'

/**
 * The logo of each language. A logo keeps its own colour, the one place the interface shows a
 * hue that is not ours; `plain` logos are near black, so they take the text colour instead.
 * `color` replaces a brand colour too dark to see on the dark theme with a lighter one of the same
 * logo. Java's cup is not in the set (it was taken down over its trademark), so it is drawn here.
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
  java: { icon: JavaLogo as IconType },
  cpp: { icon: SiCplusplus }
}

function JavaLogo({
  title,
  role,
  className
}: {
  title?: string
  role?: string
  className?: string
}): React.JSX.Element {
  return (
    <svg viewBox="0 0 128 128" role={role} className={className}>
      {title && <title>{title}</title>}
      <path
        fill="#0074BD"
        d="M47.617 98.12s-4.767 2.774 3.397 3.71c9.892 1.13 14.947.968 25.845-1.092 0 0 2.871 1.795 6.873 3.351-24.439 10.47-55.308-.607-36.115-5.969zm-2.988-13.665s-5.348 3.959 2.823 4.805c10.567 1.091 18.91 1.18 33.354-1.6 0 0 1.993 2.025 5.132 3.131-29.542 8.64-62.446.68-41.309-6.336z"
      />
      <path
        fill="#EA2D2E"
        d="M69.802 61.271c6.025 6.935-1.58 13.17-1.58 13.17s15.289-7.891 8.269-17.777c-6.559-9.215-11.587-13.792 15.635-29.58 0 .001-42.731 10.67-22.324 34.187z"
      />
      <path
        fill="#0074BD"
        d="M102.123 108.229s3.529 2.91-3.888 5.159c-14.102 4.272-58.706 5.56-71.094.171-4.451-1.938 3.899-4.625 6.526-5.192 2.739-.593 4.303-.485 4.303-.485-4.953-3.487-32.013 6.85-13.743 9.815 49.821 8.076 90.817-3.637 77.896-9.468zM49.912 70.294s-22.686 5.389-8.033 7.348c6.188.828 18.518.638 30.011-.326 9.39-.789 18.813-2.474 18.813-2.474s-3.308 1.419-5.704 3.053c-23.042 6.061-67.544 3.238-54.731-2.958 10.832-5.239 19.644-4.643 19.644-4.643zm40.697 22.747c23.421-12.167 12.591-23.86 5.032-22.285-1.848.385-2.677.72-2.677.72s.688-1.079 2-1.543c14.953-5.255 26.451 15.503-4.823 23.725 0-.002.359-.327.468-.617z"
      />
      <path
        fill="#EA2D2E"
        d="M76.491 1.587S89.459 14.563 64.188 34.51c-20.266 16.006-4.621 25.13-.007 35.559-11.831-10.673-20.509-20.07-14.688-28.815C58.041 28.42 81.722 22.195 76.491 1.587z"
      />
      <path
        fill="#0074BD"
        d="M52.214 126.021c22.476 1.437 57-.8 57.817-11.436 0 0-1.571 4.032-18.577 7.231-19.186 3.612-42.854 3.191-56.887.874 0 .001 2.875 2.381 17.647 3.331z"
      />
    </svg>
  )
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
