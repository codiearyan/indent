import { lazy, Suspense, useEffect } from 'react'
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
import { Onboarding } from '@/features/onboarding/Onboarding'
import { AppShortcuts } from '@/features/shortcuts/AppShortcuts'
import { ShortcutHints } from '@/features/shortcuts/ShortcutHints'
import { ShortcutList } from '@/features/shortcuts/ShortcutList'
import { SettingsDialog } from '@/features/settings/SettingsDialog'
import { StarPrompt } from '@/features/star/StarPrompt'
import { GuideTour } from '@/features/tour/GuideTour'
import { useSettings } from '@/stores/settings'

const loadWorkspace = (): Promise<typeof import('@/features/workspace/WorkspacePage')> =>
  import('@/features/workspace/WorkspacePage')

// The editor and the terminal are most of the app's code and Home needs none of it.
const WorkspacePage = lazy(() => loadWorkspace().then((m) => ({ default: m.WorkspacePage })))
const DsaPage = lazy(() => import('@/features/dsa/DsaPage').then((m) => ({ default: m.DsaPage })))
const PatternPage = lazy(() =>
  import('@/features/dsa/PatternPage').then((m) => ({ default: m.PatternPage }))
)

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
                <Route
                  path="dsa"
                  element={
                    <Suspense fallback={null}>
                      <DsaPage />
                    </Suspense>
                  }
                />
                <Route
                  path="dsa/:patternId"
                  element={
                    <Suspense fallback={null}>
                      <PatternPage />
                    </Suspense>
                  }
                />
                <Route path="year" element={<YearBoardPage />} />
              </Route>
              <Route
                path="learn/:labId/:chapterId"
                element={
                  <Suspense fallback={<div className="h-full bg-background" />}>
                    <WorkspacePage />
                  </Suspense>
                }
              />
            </Routes>
          </HashRouter>
        </>
      )}
      <Toaster />
    </TooltipProvider>
  )
}
