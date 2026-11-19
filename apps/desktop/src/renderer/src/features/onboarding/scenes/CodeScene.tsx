import { MS_PER_CHAR, Typed } from './Typed'

const CODE = [
  'function weekTotal(orders) {',
  '  return orders.reduce((sum, o) => sum + o.price, 0)',
  '}',
  '',
  'console.log(weekTotal(orders).toFixed(2))'
]
const COMMAND = 'node report.js'
const START_MS = 300

export function CodeScene(): React.JSX.Element {
  const starts: number[] = []
  let at = START_MS
  for (const line of CODE) {
    starts.push(at)
    at += line.length * MS_PER_CHAR + 80
  }
  const commandAt = at + 300
  const outputAt = commandAt + COMMAND.length * MS_PER_CHAR + 450

  return (
    <div className="motion-enter w-full max-w-[520px] overflow-hidden rounded-lg border border-border font-mono text-xs">
      <div className="flex h-9 items-center border-b border-rule px-3">
        <span className="rounded-sm bg-accent px-2 py-0.5 text-foreground">report.js</span>
      </div>
      <ol className="py-3 leading-6">
        {CODE.map((line, i) => (
          <li key={i} className="flex">
            <span className="w-10 shrink-0 pr-3 text-right text-muted-foreground/60 select-none">
              {i + 1}
            </span>
            <Typed text={line} at={starts[i]} className="text-foreground" />
          </li>
        ))}
      </ol>
      <div className="border-t border-rule px-4 py-3 leading-6">
        <div className="flex">
          <span
            className="ob-appear pr-2 text-muted-foreground"
            style={{ animationDelay: `${commandAt}ms` }}
          >
            $
          </span>
          <Typed text={COMMAND} at={commandAt} className="text-foreground" />
        </div>
        <div className="ob-appear text-foreground" style={{ animationDelay: `${outputAt}ms` }}>
          41.50
        </div>
      </div>
    </div>
  )
}
