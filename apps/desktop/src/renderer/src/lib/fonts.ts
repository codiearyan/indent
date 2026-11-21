export type FontKind = 'sans' | 'mono'

export const DEFAULT_FONT: Record<FontKind, string> = {
  sans: 'IBM Plex Sans',
  mono: 'IBM Plex Mono'
}

const FALLBACK: Record<FontKind, string> = {
  sans: "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, monospace"
}

// Used when the computer's font list cannot be read.
const COMMON: Record<FontKind, string[]> = {
  sans: ['Helvetica Neue', 'Arial', 'Segoe UI', 'Roboto', 'Inter', 'Verdana'],
  mono: ['SF Mono', 'Menlo', 'Monaco', 'Consolas', 'Cascadia Code', 'JetBrains Mono', 'Fira Code']
}

/** A CSS font-family list: the picked font, then the default, so a missing one falls back. */
export function fontStack(name: string | null, kind: FontKind): string {
  const clean = name?.replace(/["\\]/g, '')
  return clean ? `"${clean}", ${FALLBACK[kind]}` : FALLBACK[kind]
}

let context: CanvasRenderingContext2D | null = null
const widthOf = (family: string, text: string): number => {
  context ??= document.createElement('canvas').getContext('2d')!
  context.font = `40px ${family}`
  return context.measureText(text).width
}

/** A font the computer lacks renders in the generic fallback, so its widths match both of them. */
export function isInstalled(name: string): boolean {
  const sample = 'mmmmmmmmmlli10OQ'
  const quoted = `"${name.replace(/["\\]/g, '')}"`
  return ['monospace', 'serif', 'sans-serif'].some(
    (generic) => widthOf(`${quoted}, ${generic}`, sample) !== widthOf(generic, sample)
  )
}

// Fonts of pictures instead of letters, which would make the app unreadable.
const SYMBOLS = /dings|symbol|emoji|icons|ornament|bodoni orn|zapf/i

const isMonospace = (name: string): boolean =>
  widthOf(`"${name}", serif`, 'iiiiiiii') === widthOf(`"${name}", serif`, 'WWWWWWWW')

declare global {
  interface Window {
    queryLocalFonts?: () => Promise<{ family: string }[]>
  }
}

let families: string[] | null = null

/** Families installed on the computer; empty when they cannot be read (the window is hidden). */
async function installedFamilies(): Promise<string[]> {
  if (families) return families
  try {
    const fonts = (await window.queryLocalFonts?.()) ?? []
    const names = [...new Set(fonts.map((font) => font.family))]
    if (names.length) families = names.sort((a, b) => a.localeCompare(b))
    return names
  } catch {
    return []
  }
}

/** The bundled default first, then the computer's fonts of that kind. */
export async function listFonts(kind: FontKind): Promise<string[]> {
  let names = await installedFamilies()
  if (names.length === 0) names = COMMON[kind].filter(isInstalled)
  const others = names.filter(
    (name) =>
      name !== DEFAULT_FONT[kind] && !SYMBOLS.test(name) && (kind === 'sans') !== isMonospace(name)
  )
  return [DEFAULT_FONT[kind], ...others]
}
