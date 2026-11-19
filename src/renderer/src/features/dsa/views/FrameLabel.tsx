export function FrameLabel({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <div className="font-mono text-xs text-muted-foreground">{children}</div>
}
