// Hex mirror of the design tokens for libraries that cannot read CSS variables
// (Monaco themes, xterm themes). Keep in step with tokens.css.
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
    foreground: '#e8ebe9',
    muted: '#a1a1a6',
    border: '#262628',
    selection: '#3d2418',
    lineHighlight: '#19191b',
    cursor: '#ea6030',
    comment: '#7c7c85',
    keyword: '#79b8ff',
    string: '#e6b673',
    number: '#b5d68a',
    type: '#5fd0c0',
    function: '#d8c88a',
    variable: '#e8ebe9',
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
    keyword: '#1f5fbf',
    string: '#9a4a12',
    number: '#1b7a4c',
    type: '#0f7480',
    function: '#6f5600',
    variable: '#111113',
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
