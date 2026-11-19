// Hex mirror of the design tokens for libraries that cannot read CSS variables
// (Monaco themes, xterm themes). Keep in step with styles/globals.css.
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
    background: '#131514',
    foreground: '#e8ebe9',
    muted: '#a7ada9',
    border: '#262a28',
    selection: '#234535',
    lineHighlight: '#1a1d1b',
    cursor: '#e8ebe9',
    comment: '#7d8580',
    keyword: '#79b8ff',
    string: '#e6b673',
    number: '#b5d68a',
    type: '#5fd0c0',
    function: '#d8c88a',
    variable: '#e8ebe9',
    ansi: {
      black: '#262a28',
      red: '#e5566f',
      green: '#46c283',
      yellow: '#e3ad48',
      blue: '#79b8ff',
      magenta: '#c79bf2',
      cyan: '#5fd0c0',
      white: '#e8ebe9'
    }
  },
  light: {
    background: '#ffffff',
    foreground: '#121513',
    muted: '#5a5f5c',
    border: '#e4e8e5',
    selection: '#cfeadb',
    lineHighlight: '#f5f7f6',
    cursor: '#121513',
    comment: '#6b726e',
    keyword: '#1f5fbf',
    string: '#9a4a12',
    number: '#1b7a4c',
    type: '#0f7480',
    function: '#6f5600',
    variable: '#121513',
    ansi: {
      black: '#121513',
      red: '#c4242a',
      green: '#1b7a4c',
      yellow: '#92400e',
      blue: '#1f5fbf',
      magenta: '#7a3fc4',
      cyan: '#0f7480',
      white: '#5a5f5c'
    }
  }
}
