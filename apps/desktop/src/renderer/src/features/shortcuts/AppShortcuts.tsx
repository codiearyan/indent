import { useNavigate } from 'react-router-dom'
import { useShortcuts } from '@/lib/useShortcuts'

/** The shortcuts that work on every page. Mount inside the router. */
export function AppShortcuts(): null {
  const navigate = useNavigate()
  useShortcuts({
    goHome: () => navigate('/'),
    goRepos: () => navigate('/labs'),
    goRoadmaps: () => navigate('/paths'),
    goPatterns: () => navigate('/dsa'),
    goActivity: () => navigate('/year')
  })
  return null
}
