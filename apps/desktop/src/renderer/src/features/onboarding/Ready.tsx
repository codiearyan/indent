import { activeProvider, useAi } from '@/features/ai/aiStore'
import { useSettings } from '@/stores/settings'
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
            className="motion-enter flex h-12 items-center justify-between gap-6 border-b border-rule px-5 last:border-b-0"
            style={{ '--i': i } as React.CSSProperties}
          >
            <dt className="text-[13px] text-muted-foreground">{label}</dt>
            <dd className="min-w-0 truncate text-sm">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-6 text-[13px] text-muted-foreground">
        Pick a repo on Home and open its first issue. The lesson, the tasks and the editor are all
        in one place.
      </p>
    </StepLayout>
  )
}
