import { codePalette } from '@indent/design/code-palette'
import { useSettings } from '@/stores/settings'

/**
 * Code outside the editor, set the way the editor sets it: the code font size and line height with
 * the editor's text size on top, ligatures as chosen, and the code theme's colour for plain text.
 */
export function useCodeStyle(): React.CSSProperties {
  const typography = useSettings((s) => s.typography)
  const scale = useSettings((s) => s.textScale.editor)
  const color = useSettings((s) => codePalette(s.codeTheme, s.theme).foreground)
  return {
    fontSize: Math.round(typography.monoSize * scale),
    lineHeight: typography.lineHeight,
    fontVariantLigatures: typography.ligatures ? 'normal' : 'none',
    color
  }
}
