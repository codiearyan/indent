// Hex mirror of the design tokens for libraries that cannot read CSS variables
// (Monaco themes, xterm themes). Keep in step with tokens.css.
//
// Code follows the app: neutral text in three steps of lightness, and the one hue. Keywords
// take the brand orange, strings a quieter tint of it, numbers the gold. No blues or greens.
export interface CodePalette {
  background: string
  foreground: string
  muted: string
  border: string
  selection: string
  lineHighlight: string
  cursor: string
  comment: string
  keyword: string
  string: string
  number: string
  type: string
  function: string
  variable: string
  ansi: {
    black: string
    red: string
    green: string
    yellow: string
    blue: string
    magenta: string
    cyan: string
    white: string
  }
}

export const codePalette: Record<'dark' | 'light', CodePalette> = {
  dark: {
    background: '#111112',
    foreground: '#e8e8eb',
    muted: '#a1a1a6',
    border: '#262628',
    selection: '#3d2418',
    lineHighlight: '#19191b',
    cursor: '#ea6030',
    comment: '#7c7c85',
    keyword: '#ea6030',
    string: '#e8b796',
    number: '#e5c14b',
    type: '#fafafa',
    function: '#fafafa',
    variable: '#d2d2d7',
    ansi: {
      black: '#262628',
      red: '#f0556a',
      green: '#4ac07f',
      yellow: '#e5c14b',
      blue: '#79b8ff',
      magenta: '#c79bf2',
      cyan: '#5fd0c0',
      white: '#e8ebe9'
    }
  },
  light: {
    background: '#ffffff',
    foreground: '#111113',
    muted: '#5c5c66',
    border: '#dfdfe3',
    selection: '#ffe1d3',
    lineHighlight: '#f4f4f5',
    cursor: '#111113',
    comment: '#6b6b75',
    keyword: '#b8431c',
    string: '#7d4a2a',
    number: '#8a6400',
    type: '#111113',
    function: '#111113',
    variable: '#3a3a40',
    ansi: {
      black: '#111113',
      red: '#c4242a',
      green: '#1b7a4c',
      yellow: '#92400e',
      blue: '#1f5fbf',
      magenta: '#7a3fc4',
      cyan: '#0f7480',
      white: '#5c5c66'
    }
  }
}
