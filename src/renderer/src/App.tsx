import { HashRouter, Route, Routes } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { AppShell } from '@/features/catalog/AppShell'
import { DashboardPage } from '@/features/catalog/DashboardPage'
import { LabsPage } from '@/features/catalog/LabsPage'
import { LabDetailPage } from '@/features/catalog/LabDetailPage'
import { PathsPage } from '@/features/catalog/PathsPage'
import { YearBoardPage } from '@/features/catalog/YearBoardPage'
import { DsaPage } from '@/features/dsa/DsaPage'
import { PatternPage } from '@/features/dsa/PatternPage'
import { WorkspacePage } from '@/features/workspace/WorkspacePage'

export default function App(): React.JSX.Element {
  return (
    <TooltipProvider delayDuration={300}>
      <HashRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="labs" element={<LabsPage />} />
            <Route path="labs/:labId" element={<LabDetailPage />} />
            <Route path="paths" element={<PathsPage />} />
            <Route path="dsa" element={<DsaPage />} />
            <Route path="dsa/:patternId" element={<PatternPage />} />
            <Route path="year" element={<YearBoardPage />} />
          </Route>
          <Route path="learn/:labId/:chapterId" element={<WorkspacePage />} />
        </Routes>
      </HashRouter>
      <Toaster />
    </TooltipProvider>
  )
}
