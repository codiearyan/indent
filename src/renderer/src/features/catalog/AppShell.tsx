import { Outlet } from 'react-router-dom'

export function AppShell(): React.JSX.Element {
  return (
    <div className="h-full overflow-auto">
      <Outlet />
    </div>
  )
}
