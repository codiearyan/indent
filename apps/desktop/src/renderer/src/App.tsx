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
import { WorkspacePage } from '@/features/workspace/WorkspacePage'
import { useSettings } from '@/stores/settings'

export default function App(): React.JSX.Element {
  // Not a route: until the setup is finished or skipped it replaces the app, then it is gone.
  const onboarded = useSettings((s) => s.onboarded)
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
              <Route path="learn/:labId/:chapterId" element={<WorkspacePage />} />
            </Routes>
          </HashRouter>
        </>
      )}
      <Toaster />
    </TooltipProvider>
  )
}
