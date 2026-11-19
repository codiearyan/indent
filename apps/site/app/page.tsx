import type { ReactNode } from 'react'
import { WorkspaceDemo } from '@/components/WorkspaceDemo'
import { listLabs, listPaths, type Lab } from '@/lib/content'

const steps = [
  {
    title: 'Read a short lesson',
    body: 'A small company has a problem and you are its developer. The lesson gives you what you need for this chapter, and can read itself aloud.'
  },
  {
    title: 'Write the code',
    body: 'A real editor and a real terminal, in a folder on your disk. Run your code the way you would at work.'
  },
  {
    title: 'Press Check',
    body: 'Hidden tests run in about a second. Each task turns green, or says in plain words what to look at. Three hints per task unlock as you try.'
  }
]

const local = [
  {
    title: 'No account',
    body: 'Open the app and start. Your files and progress live in a folder on your computer.'
  },
  {
    title: 'An offline model',
    body: 'Labs about language models talk to a small model inside the app. It answers the same way every time, so tests are repeatable and nothing costs money.'
  },
  {
    title: 'Bring your own AI',
    body: 'The tutor uses a coding CLI you are already signed in to, or your own API key. It explains rather than answers.'
  }
]

function shelves(labs: Lab[]): [string, Lab[]][] {
  const byShelf = new Map<string, Lab[]>()
  for (const lab of labs.filter((l) => l.kind === 'lab')) {
    byShelf.set(lab.category, [...(byShelf.get(lab.category) ?? []), lab])
  }
  return [...byShelf]
}

export default function Home(): ReactNode {
  const labs = listLabs()
  const paths = listPaths()
  const challenges = labs.filter((l) => l.kind === 'challenge')
  const titleOf = new Map(labs.map((l) => [l.id, l.title]))
  const chapterCount = labs.reduce((n, l) => n + l.chapters, 0)

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-8">
      <header className="flex items-center justify-between py-6">
        <span className="text-[15px] font-medium tracking-tight">Labbench</span>
        <nav className="flex gap-6 text-[13px] text-muted-foreground">
          <a className="hover:text-foreground" href="#labs">
            Labs
          </a>
          <a className="hover:text-foreground" href="#paths">
            Paths
          </a>
          <a className="hover:text-foreground" href="#run">
            Run it
          </a>
        </nav>
      </header>

      <main>
        <section className="grid grid-cols-[minmax(0,1fr)] items-center gap-12 pt-12 pb-24 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:pt-20">
          <div>
            <h1 className="text-4xl font-medium tracking-tight text-balance sm:text-5xl">
              Learn to code by fixing real problems.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-pretty text-muted-foreground">
              Labbench is a desktop app with hands-on coding labs. Read a short lesson, write the
              code, press Check. Everything runs on your own computer.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#run"
                className="inline-flex h-10 items-center rounded-md bg-primary px-4 font-medium text-primary-foreground transition-transform active:scale-[0.97]"
              >
                Run it on your computer
              </a>
              <a
                href="#labs"
                className="inline-flex h-10 items-center rounded-md border border-border px-4 font-medium hover:bg-muted"
              >
                See the labs
              </a>
            </div>
          </div>
          <WorkspaceDemo />
        </section>

        <section className="border-t border-border py-20">
          <h2 className="text-2xl font-medium tracking-tight">How a chapter works</h2>
          <ol className="mt-10 grid gap-10 md:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step.title}>
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                  {i + 1}
                </span>
                <h3 className="mt-2 text-base font-medium">{step.title}</h3>
                <p className="mt-2 max-w-xs leading-relaxed text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="labs" className="scroll-mt-8 border-t border-border py-20">
          <h2 className="text-2xl font-medium tracking-tight">The labs</h2>
          <p className="mt-3 max-w-lg leading-relaxed text-muted-foreground">
            {labs.length - challenges.length} story labs and {challenges.length} challenges,{' '}
            {chapterCount} chapters in all.
          </p>
          <div className="mt-12 space-y-14">
            {shelves(labs).map(([shelf, items]) => (
              <div key={shelf} className="grid gap-6 md:grid-cols-[12rem_1fr]">
                <h3 className="font-medium">{shelf}</h3>
                <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
                  {items.map((lab) => (
                    <li key={lab.id}>
                      <p className="font-medium">{lab.title}</p>
                      <p className="mt-1.5 line-clamp-3 leading-relaxed text-muted-foreground">
                        {lab.description}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground tabular-nums">
                        {lab.chapters} chapters
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="grid gap-6 md:grid-cols-[12rem_1fr]">
              <h3 className="font-medium">Challenges</h3>
              <ul className="flex flex-wrap gap-2">
                {challenges.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-md border border-border px-3 py-1.5 text-[13px]"
                  >
                    {c.title}
                    {c.difficulty && (
                      <span className="ml-2 text-muted-foreground">{c.difficulty}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="paths" className="scroll-mt-8 border-t border-border py-20">
          <h2 className="text-2xl font-medium tracking-tight">Learning paths</h2>
          <p className="mt-3 max-w-lg leading-relaxed text-muted-foreground">
            Not sure where to start? A path puts the labs in order.
          </p>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {paths.map((path) => (
              <article key={path.id} className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-base font-medium">{path.title}</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">{path.tagline}</p>
                <ol className="mt-6 space-y-3 border-l border-border pl-4">
                  {path.stages.map((stage) => (
                    <li key={stage.title}>
                      <p className="text-[13px] font-medium">{stage.title}</p>
                      <p className="text-[13px] text-muted-foreground">
                        {stage.labs.map((id) => titleOf.get(id) ?? id).join(', ')}
                      </p>
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t border-border py-20">
          <h2 className="text-2xl font-medium tracking-tight">It stays on your computer</h2>
          <div className="mt-10 grid gap-10 md:grid-cols-3">
            {local.map((item) => (
              <div key={item.title}>
                <h3 className="text-base font-medium">{item.title}</h3>
                <p className="mt-2 max-w-xs leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="run" className="scroll-mt-8 border-t border-border py-20">
          <h2 className="text-2xl font-medium tracking-tight">Run it</h2>
          <p className="mt-3 max-w-lg leading-relaxed text-muted-foreground">
            You need Node.js 22.18 or newer and pnpm. The app runs your code and the checks with
            your own Node.
          </p>
          <pre className="mt-8 max-w-lg overflow-x-auto rounded-lg border border-border bg-card p-4 font-mono text-[13px] leading-relaxed">
            <span className="text-muted-foreground">$ </span>pnpm install{'\n'}
            <span className="text-muted-foreground">$ </span>pnpm dev
          </pre>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-[13px] text-muted-foreground">
        Labbench. Local-first coding labs.
      </footer>
    </div>
  )
}
