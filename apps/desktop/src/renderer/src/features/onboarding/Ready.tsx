import { Button } from '@/components/ui/button'
import { activeProvider, useAi } from '@/features/ai/aiStore'
import { useSettings } from '@/stores/settings'
import { FolderNote, MoveFolderDialog } from '@/features/workspace/FolderMove'
import { useWorkspaceRoot } from '@/features/workspace/useWorkspaceRoot'
import { StepLayout } from './StepLayout'
import { helpLevelFor } from './steps'

const HELP: Record<ReturnType<typeof helpLevelFor>, string> = {
  tutor: 'Only when I ask',
  manual: 'Suggestions when I ask',
  auto: 'Suggestions as I type'
}

export function Ready({ staged }: { staged: boolean }): React.JSX.Element {
  const config = useAi((s) => s.config)
  const provider = activeProvider(config)
  const on = config?.enabled ?? true
  const telemetry = useSettings((s) => s.telemetry)
  const folder = useWorkspaceRoot()

  const ai: [string, string][] = on
    ? [
        ['AI help', 'On'],
        [
          'Provider',
          provider
            ? `${provider.label}${config?.model ? `, ${config.model}` : ''}`
            : 'Not set up yet'
        ],
        ['Help in the editor', HELP[helpLevelFor(config?.suggestions ?? 'off')]],
        ['Tutor after a failed check', config?.nudge ? 'Offered' : 'Not offered']
      ]
    : [['AI help', 'Off']]
  const rows: [string, string][] = [...ai, ['Usage stats', telemetry ? 'Shared' : 'Not shared']]

  return (
    <StepLayout
      staged={staged}
      title="Ready to start"
      lead="Here is what you picked. All of it can be changed later in Settings."
    >
      <dl className="rounded-lg border border-border">
        {rows.map(([label, value], i) => (
          <div
            key={label}
            className="motion-enter flex h-12 items-center justify-between gap-6 border-b border-rule px-5"
            style={{ '--i': i } as React.CSSProperties}
          >
            <dt className="text-[13px] text-muted-foreground">{label}</dt>
            <dd className="min-w-0 truncate text-sm">{value}</dd>
          </div>
        ))}
        <div
          className="motion-enter flex h-12 items-center justify-between gap-6 px-5"
          style={{ '--i': rows.length } as React.CSSProperties}
        >
          <dt className="shrink-0 text-[13px] text-muted-foreground">Your work is saved in</dt>
          <dd className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 truncate font-mono text-xs">{folder.root}</span>
            <Button
              variant="ghost"
              size="xs"
              className="font-normal text-muted-foreground hover:text-foreground"
              disabled={folder.moving}
              onClick={() => void folder.change()}
            >
              Change
            </Button>
          </dd>
        </div>
      </dl>
      <FolderNote folder={folder} className="mt-2 px-5" />
      <MoveFolderDialog folder={folder} />
      <p className="mt-6 text-[13px] text-muted-foreground">
        Next, a short tour takes you from Home into your first issue. Skip it any time.
      </p>
    </StepLayout>
  )
}
