import { useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { toast } from 'sonner'
import { LevelBadge } from '@/components/app/LevelBadge'
import { ThemeToggle } from '@/components/app/ThemeToggle'
import { cn } from '@/lib/utils'
import { useCatalog } from '@/stores/catalog'
import { useProgress } from '@/stores/progress'

const NAV = [
  { to: '/', label: 'Dashboard' },
  { to: '/labs', label: 'My labs' },
  { to: '/paths', label: 'Paths' },
  { to: '/challenges', label: 'Challenges' },
  { to: '/year', label: 'Year board' }
]

function Mark(): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
      aria-hidden
    >
      <path d="M9 3h6" />
      <path d="M10 3v6.5l-5.4 8.9A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.4-2.6L14 9.5V3" />
      <path d="M7.5 15h9" />
    </svg>
  )
}

export function AppShell(): React.JSX.Element {
  useEffect(() => {
    useCatalog
      .getState()
      .load()
      .catch(() => toast.error('Could not load the labs.'))
    useProgress
      .getState()
      .load()
      .catch(() => toast.error('Could not load your progress.'))
  }, [])

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="app-drag flex h-16 shrink-0 items-center gap-8 border-b border-border pr-4 pl-[calc(var(--titlebar-inset)+16px)]">
        <NavLink to="/" className="flex items-center gap-2 text-base font-medium tracking-tight">
          <Mark />
          Labbench
        </NavLink>
        <nav className="flex min-w-0 items-center gap-1">
          {NAV.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50',
                  isActive ? 'font-medium text-foreground' : 'text-muted-foreground'
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <LevelBadge />
          <ThemeToggle />
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-[1200px] px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
