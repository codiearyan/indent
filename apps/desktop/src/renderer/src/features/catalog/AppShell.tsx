import { useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Bug, CalendarDays, FolderGit2, House, Moon, Route, Sun, Workflow } from 'lucide-react'
import { toast } from 'sonner'
import { levelFor } from '@shared/rules'
import { APP_NAME, BrandMark } from '@/components/app/Brand'
import { cn } from '@/lib/utils'
import { viewTransition } from '@/lib/viewTransition'
import { useCatalog } from '@/stores/catalog'
import { useProgress } from '@/stores/progress'
import { useSettings } from '@/stores/settings'

const NAV = [
  { to: '/', label: 'Home', icon: House },
  { to: '/labs', label: 'Repos', icon: FolderGit2 },
  { to: '/paths', label: 'Roadmaps', icon: Route },
  { to: '/dsa', label: 'Patterns', icon: Workflow },
  { to: '/year', label: 'Activity', icon: CalendarDays }
]

const row =
  'flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50'

/** The frame: navigation on the tinted ground, the page on a sheet beside it. */
export function AppShell(): React.JSX.Element {
  const loadCatalog = useCatalog((s) => s.load)
  const loadProgress = useProgress((s) => s.load)

  useEffect(() => {
    Promise.all([loadCatalog(), loadProgress()]).catch((error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Could not load your repos.')
    })
  }, [loadCatalog, loadProgress])

  return (
    <div className="flex h-full bg-background">
      <aside className="app-drag flex w-[228px] shrink-0 flex-col px-3 pt-[var(--sidebar-top)] pb-3">
        <NavLink to="/" className="mb-5 flex items-center gap-2.5 px-2.5 text-[15px] font-semibold">
          <BrandMark />
          {APP_NAME}
        </NavLink>
        <nav className="flex flex-col gap-0.5">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  row,
                  isActive
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              <Icon className="size-4" strokeWidth={1.5} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-3">
          <LevelMeter />
          <div className="flex flex-col gap-0.5">
            <ThemeRow />
            {import.meta.env.DEV && <SetupRow />}
          </div>
        </div>
      </aside>
      <main className="my-2 mr-2 min-w-0 flex-1 overflow-auto rounded-2xl border border-border bg-card">
        <div className="mx-auto w-full max-w-[1180px] px-10 py-9">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

function LevelMeter(): React.JSX.Element {
  const totalPoints = useProgress((s) => s.progress?.totalPoints ?? 0)
  const { level, into, span } = levelFor(totalPoints)
  return (
    <div className="px-2.5">
      <div className="flex items-baseline justify-between text-[13px]">
        <span className="font-medium">Level {level}</span>
        <span className="text-muted-foreground tabular-nums">{totalPoints} points</span>
      </div>
      <div
        role="img"
        aria-label={`${span - into} points to level ${level + 1}`}
        className="mt-2 h-1 overflow-hidden rounded-full bg-accent"
      >
        <div
          className="h-full rounded-full bg-brand"
          style={{ width: `${(into / span) * 100}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
        {span - into} to level {level + 1}
      </p>
    </div>
  )
}

function ThemeRow(): React.JSX.Element {
  const theme = useSettings((s) => s.theme)
  const toggleTheme = useSettings((s) => s.toggleTheme)
  const Icon = theme === 'dark' ? Sun : Moon
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(row, 'w-full text-muted-foreground hover:text-foreground')}
    >
      <Icon className="size-4" strokeWidth={1.5} />
      {theme === 'dark' ? 'Light theme' : 'Dark theme'}
    </button>
  )
}

/** Development only: opens the first-run setup again without clearing any saved data. */
function SetupRow(): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={() =>
        viewTransition('onboarding-finish', () => useSettings.getState().setOnboarded(false))
      }
      className={cn(row, 'w-full text-muted-foreground hover:text-foreground')}
    >
      <Bug className="size-4" strokeWidth={1.5} />
      Run setup again
    </button>
  )
}
