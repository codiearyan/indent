import { lazy, Suspense, useEffect, useState } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { AppShell } from '@/features/catalog/AppShell'
import { DashboardPage } from '@/features/catalog/DashboardPage'
import { LabsPage } from '@/features/catalog/LabsPage'
import { LabDetailPage } from '@/features/catalog/LabDetailPage'
import { CompletionPage } from '@/features/completion/CompletionPage'
import { PathsPage } from '@/features/catalog/PathsPage'
import { YearBoardPage } from '@/features/catalog/YearBoardPage'
import { DsaPage } from '@/features/dsa/DsaPage'
import { PatternPage } from '@/features/dsa/PatternPage'
import { Onboarding } from '@/features/onboarding/Onboarding'
import { AppShortcuts } from '@/features/shortcuts/AppShortcuts'
import { ShortcutHints } from '@/features/shortcuts/ShortcutHints'
import { ShortcutList } from '@/features/shortcuts/ShortcutList'
import { SettingsDialog } from '@/features/settings/SettingsDialog'
import { StarPrompt } from '@/features/star/StarPrompt'
import { GuideTour } from '@/features/tour/GuideTour'
import { useSettings } from '@/stores/settings'

type WorkspacePage = (typeof import('@/features/workspace/WorkspacePage'))['WorkspacePage']

let workspacePage: WorkspacePage | undefined

// The editor and the terminal are most of the app's code and Home needs none of it.
const loadWorkspace = (): Promise<WorkspacePage> =>
  import('@/features/workspace/WorkspacePage').then((m) => (workspacePage = m.WorkspacePage))

const LazyWorkspace = lazy(() => loadWorkspace().then((page) => ({ default: page })))

function Workspace(): React.JSX.Element {
  // Drawn directly once it is fetched: a lazy component shows its fallback first, and React keeps
  // a fallback on screen for 300 ms. Decided once, so the page is not mounted a second time.
  const [Loaded] = useState(() => workspacePage)
  if (Loaded) return <Loaded />
  return (
    <Suspense fallback={<div className="h-full bg-background" />}>
      <LazyWorkspace />
    </Suspense>
  )
}

export default function App(): React.JSX.Element {
  // Not a route: until the setup is finished or skipped it replaces the app, then it is gone.
  const onboarded = useSettings((s) => s.onboarded)
  // Fetched once the first screen is up and the window is idle, so opening an issue does not wait.
  useEffect(() => {
    const id = requestIdleCallback(() => void loadWorkspace())
    return () => cancelIdleCallback(id)
  }, [])
  return (
    <TooltipProvider delayDuration={300}>
      {!onboarded ? (
        <Onboarding />
      ) : (
        <>
          <SettingsDialog />
          <ShortcutList />
          <ShortcutHints />
          <HashRouter>
            <AppShortcuts />
            {/* Inside the router: it watches routes to know when a repo is closed. */}
            <StarPrompt />
            <GuideTour />
            <Routes>
              <Route element={<AppShell />}>
                <Route index element={<DashboardPage />} />
                <Route path="labs" element={<LabsPage />} />
                <Route path="labs/:labId" element={<LabDetailPage />} />
                <Route path="labs/:labId/done" element={<CompletionPage />} />
                <Route path="paths" element={<PathsPage />} />
                <Route path="dsa" element={<DsaPage />} />
                <Route path="dsa/:patternId" element={<PatternPage />} />
                <Route path="year" element={<YearBoardPage />} />
              </Route>
              <Route path="learn/:labId/:chapterId" element={<Workspace />} />
            </Routes>
          </HashRouter>
        </>
      )}
      <Toaster />
    </TooltipProvider>
  )
}
