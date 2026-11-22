import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { IconButton } from '@/features/workspace/IconButton'

/** A command to run in a terminal, with a button that copies it. */
export function CopyCommand({ name, text }: { name: string; text: string }): React.JSX.Element {
  const [copied, setCopied] = useState(false)
  const copy = async (): Promise<void> => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="flex h-8 w-full items-center gap-1 rounded-md border border-input pr-1 pl-2.5">
      <code className="min-w-0 flex-1 truncate font-mono text-[11px]" title={text}>
        {text}
      </code>
      <IconButton
        label={copied ? 'Copied' : `Copy the ${name} command`}
        className="size-6"
        onClick={() => void copy()}
      >
        {copied ? <Check /> : <Copy />}
      </IconButton>
    </div>
  )
}
