type MermaidApi = (typeof import('mermaid'))['default']

let mermaidModule: Promise<MermaidApi> | null = null
let queue: Promise<unknown> = Promise.resolve()
let count = 0

/** A design token as #rrggbb; the diagram library cannot read the tokens' own colour syntax. */
function tokenColor(name: string): string {
  const context = document.createElement('canvas').getContext('2d')
  if (!context) return '#808080'
  context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  context.fillRect(0, 0, 1, 1)
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

function themeVariables(): Record<string, string> {
  const card = tokenColor('--card')
  const muted = tokenColor('--muted')
  const accent = tokenColor('--accent')
  const text = tokenColor('--foreground')
  const quiet = tokenColor('--muted-foreground')
  const border = tokenColor('--border')
  const input = tokenColor('--input')
  return {
    fontFamily: getComputedStyle(document.body).fontFamily,
    fontSize: '13px',
    background: card,
    primaryColor: accent,
    primaryTextColor: text,
    primaryBorderColor: input,
    secondaryColor: muted,
    tertiaryColor: card,
    lineColor: quiet,
    textColor: text,
    titleColor: text,
    mainBkg: accent,
    nodeBorder: input,
    clusterBkg: muted,
    clusterBorder: border,
    edgeLabelBackground: card,
    noteBkgColor: muted,
    noteTextColor: text,
    noteBorderColor: border,
    actorBkg: accent,
    actorBorder: input,
    actorTextColor: text,
    actorLineColor: quiet,
    signalColor: text,
    signalTextColor: text,
    labelBoxBkgColor: accent,
    labelBoxBorderColor: input,
    labelTextColor: text,
    loopTextColor: text
  }
}

export interface Diagram {
  svg: string
  /** Its natural width in pixels. */
  width: number
}

/**
 * Draws a diagram to SVG in the app's neutral colours, or rejects when its source is not valid.
 * Strict mode keeps scripts, click handlers and outside assets out of the SVG. Renders run one at
 * a time because the library keeps global settings.
 */
export function drawDiagram(source: string): Promise<Diagram> {
  const run = queue.then(async () => {
    const mermaid = await (mermaidModule ??= import('mermaid').then((m) => m.default))
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      suppressErrorRendering: true,
      theme: 'base',
      darkMode: document.documentElement.classList.contains('dark'),
      themeVariables: themeVariables()
    })
    await mermaid.parse(source)
    const { svg } = await mermaid.render(`diagram-${++count}`, source)
    const width = Number(/viewBox="[-\d.]+ [-\d.]+ ([\d.]+)/.exec(svg)?.[1]) || 0
    return { svg, width }
  })
  queue = run.catch(() => {})
  return run
}
