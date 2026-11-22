import { Check, Download, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { activeProvider, useAi } from './aiStore'
import { CopyCommand } from './CopyCommand'
import {
  cancelOpencodeSetup,
  INSTALL_OPENCODE,
  setUpOpencode,
  signInCommand,
  testOpencode,
  useOpencodeSetup
} from './opencodeInstall'

const outline =
  'press shrink-0 border-input bg-transparent shadow-none dark:bg-transparent dark:hover:bg-accent'

/** One click from no AI to a working tutor: downloads OpenCode, picks it and tests it. */
export function InstallOpencode({ className }: { className?: string }): React.JSX.Element {
  const setup = useOpencodeSetup((s) => s.setup)
  const own = useAi((s) => s.config?.providers.find((p) => p.id === 'opencode' && p.managed))
  const picked = useAi((s) => activeProvider(s.config)?.id === 'opencode')

  return (
    <div className={cn('flex flex-col items-start gap-2', className)}>
      {setup.step === 'downloading' || setup.step === 'testing' ? (
        <span className="flex h-8 items-center gap-2">
          <span
            role="status"
            className="flex items-center gap-2 text-[13px] text-muted-foreground tabular-nums"
          >
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
            {setup.step === 'downloading'
              ? `Downloading OpenCode ${Math.round(setup.done * 100)}%`
              : 'Checking that it answers'}
          </span>
          {setup.step === 'downloading' && (
            <Button variant="ghost" size="sm" onClick={cancelOpencodeSetup}>
              <X />
              Cancel
            </Button>
          )}
        </span>
      ) : setup.step === 'silent' ? (
        <Button variant="outline" size="sm" className={outline} onClick={() => void testOpencode()}>
          Test again
        </Button>
      ) : (
        setup.step !== 'ready' && (
          <Button
            variant="outline"
            size="sm"
            className={outline}
            onClick={() => void setUpOpencode()}
          >
            <Download />
            {setup.step === 'failed' ? 'Try again' : 'Install OpenCode'}
          </Button>
        )
      )}

      <div aria-live="polite" className="text-[13px] leading-5">
        {setup.step === 'ready' && (
          <p className="motion-enter flex gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={2} aria-hidden />
            <span>
              <span className="text-foreground">OpenCode is ready.</span>{' '}
              <span className="text-muted-foreground">It said: {setup.reply}</span>
            </span>
          </p>
        )}
        {setup.step === 'silent' && (
          <div className="motion-enter flex flex-col gap-1 text-muted-foreground">
            <p>
              <span className="text-foreground">OpenCode is installed, but it did not answer.</span>{' '}
              {setup.message}
            </p>
            <p>Sign in for a paid plan or your own key, or pick another provider.</p>
          </div>
        )}
        {setup.step === 'failed' && (
          <p className="motion-enter text-destructive">{setup.message}</p>
        )}
      </div>

      {(setup.step === 'idle' || setup.step === 'failed') && (
        <>
          <p className="text-xs leading-5 text-muted-foreground">
            Downloads OpenCode, about 80 MB, from its official release into the app. Nothing else on
            this computer changes. Your questions and code go to OpenCode&apos;s free models.
          </p>
          <p className="text-xs text-muted-foreground">Or install it yourself in a terminal:</p>
          <CopyCommand name="install" text={INSTALL_OPENCODE} />
        </>
      )}

      {(setup.step === 'idle' || setup.step === 'failed' || setup.step === 'silent') && (
        <>
          <p className="text-xs text-muted-foreground">
            Signing in is only for a paid plan or your own key:
          </p>
          <CopyCommand
            name="sign-in"
            text={own?.bin && picked ? signInCommand(own.bin) : 'opencode auth login'}
          />
        </>
      )}
    </div>
  )
}
