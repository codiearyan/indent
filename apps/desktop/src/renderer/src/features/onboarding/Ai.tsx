import { useEffect, useState } from 'react'
import { BookOpen, Sparkles } from 'lucide-react'
import { ProviderIcon } from '@/components/app/ProviderIcon'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { RadioGroup } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import { activeProvider, useAi } from '@/features/ai/aiStore'
import { InstallOpencode } from '@/features/ai/InstallOpencode'
import { useShowOpencodeSetup } from '@/features/ai/opencodeInstall'
import { FolderNote, MoveFolderDialog } from '@/features/workspace/FolderMove'
import { useWorkspaceRoot } from '@/features/workspace/useWorkspaceRoot'
import { ChoiceCard } from './ChoiceCard'
import { ProviderPicker } from './Provider'
import { StepLayout } from './StepLayout'

const quiet = 'press font-normal text-muted-foreground hover:text-foreground'

export function Ai({ staged }: { staged: boolean }): React.JSX.Element {
  const config = useAi((s) => s.config)
  const load = useAi((s) => s.load)
  const update = useAi((s) => s.update)
  const enabled = config?.enabled ?? true
  const provider = activeProvider(config)
  const connected = provider?.available ? provider : undefined
  const folder = useWorkspaceRoot()
  const [picking, setPicking] = useState(false)
  const showSetup = useShowOpencodeSetup(!!connected)

  // Looks for installed CLIs again, so one installed a minute ago shows up.
  useEffect(() => void load(), [load])

  return (
    <StepLayout
      staged={staged}
      title="Learn with AI, or without"
      lead="You can change this any time from the AI menu."
    >
      <RadioGroup
        aria-label="AI help"
        value={enabled ? 'on' : 'off'}
        onValueChange={(value) => void update({ enabled: value === 'on' })}
        className="grid-cols-2 gap-4"
      >
        <ChoiceCard value="on" title="With AI help" icon={<Sparkles strokeWidth={1.5} />}>
          <p className="text-[13px] leading-5 text-muted-foreground">
            A tutor that explains and asks the right questions, but never hands over the answer.
          </p>
          <p className="text-[13px] leading-5">
            It can cost nothing. Two ways to connect are free.
          </p>
          <p className="mt-auto text-xs text-muted-foreground">
            Your questions and code go to the provider you pick.
          </p>
        </ChoiceCard>
        <ChoiceCard value="off" title="Without AI" icon={<BookOpen strokeWidth={1.5} />}>
          <p className="text-[13px] leading-5 text-muted-foreground">
            Lessons, tasks, hints and checks. You work every answer out on your own, with the help
            of docs and references.
          </p>
          <p className="mt-auto text-xs text-muted-foreground">Nothing leaves this computer.</p>
        </ChoiceCard>
      </RadioGroup>

      <dl className="mt-4 rounded-lg border border-border">
        <div
          className="ob-dim flex h-12 items-center justify-between gap-6 border-b border-rule px-5"
          data-on={enabled}
          inert={!enabled}
        >
          <dt className="shrink-0 text-[13px] text-muted-foreground">Provider</dt>
          <dd className="flex min-w-0 items-center gap-2 text-sm">
            {!config ? (
              <Skeleton className="h-3.5 w-32" />
            ) : connected ? (
              <span key={connected.id} className="ob-swap flex min-w-0 items-center gap-2">
                <ProviderIcon id={connected.id} />
                <span className="truncate">{connected.label}</span>
              </span>
            ) : (
              <span className="truncate text-muted-foreground">None connected yet</span>
            )}
            <Button
              variant="ghost"
              size="xs"
              className={quiet}
              disabled={!config}
              onClick={() => setPicking(true)}
            >
              {connected ? 'Change' : 'Connect'}
            </Button>
          </dd>
        </div>
        <div className="flex h-12 items-center justify-between gap-6 px-5">
          <dt className="shrink-0 text-[13px] text-muted-foreground">Your work is saved in</dt>
          <dd className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 truncate font-mono text-xs">{folder.root}</span>
            <Button
              variant="ghost"
              size="xs"
              className={quiet}
              disabled={folder.moving}
              onClick={() => void folder.change()}
            >
              Change
            </Button>
          </dd>
        </div>
      </dl>
      {enabled && config && showSetup && !picking && <InstallOpencode className="mt-4 px-5" />}
      {folder.error && <FolderNote folder={folder} className="mt-2 px-5" />}
      <MoveFolderDialog folder={folder} />

      <Dialog open={picking} onOpenChange={setPicking}>
        <DialogContent className="sm:max-w-[880px]">
          <DialogHeader>
            <DialogTitle>Connect a provider</DialogTitle>
            <DialogDescription>
              Every AI call goes from this computer straight to the provider you pick, on your own
              plan or key. Two ways cost nothing: the free models of OpenCode and a free Gemini key.
              Both have a usage limit.
            </DialogDescription>
          </DialogHeader>
          <ProviderPicker />
        </DialogContent>
      </Dialog>
    </StepLayout>
  )
}
