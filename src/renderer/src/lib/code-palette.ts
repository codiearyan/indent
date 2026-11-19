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
    background: '#0b0c0f',
    foreground: '#e9eaee',
    muted: '#9a9dab',
    border: '#24262d',
    selection: '#2a3f6b',
    lineHighlight: '#14161b',
    cursor: '#e9eaee',
    comment: '#6f8f6a',
    keyword: '#7aa7ff',
    string: '#e6a777',
    number: '#b5d68a',
    type: '#5fd0c0',
    function: '#e3d28a',
    variable: '#e9eaee',
    ansi: {
      black: '#24262d',
      red: '#f0776a',
      green: '#5fd38d',
      yellow: '#e8b657',
      blue: '#7aa7ff',
      magenta: '#c79bf2',
      cyan: '#5fd0c0',
      white: '#e9eaee'
    }
  },
  light: {
    background: '#ffffff',
    foreground: '#1c1d22',
    muted: '#666978',
    border: '#e2e3e8',
    selection: '#cfe0ff',
    lineHighlight: '#f5f6f8',
    cursor: '#1c1d22',
    comment: '#4f7a4a',
    keyword: '#1f4fd6',
    string: '#a4481f',
    number: '#3d7a22',
    type: '#0f7f74',
    function: '#7a5b00',
    variable: '#1c1d22',
    ansi: {
      black: '#1c1d22',
      red: '#c9372c',
      green: '#1f8a4c',
      yellow: '#9a6a00',
      blue: '#1f4fd6',
      magenta: '#7a3fc4',
      cyan: '#0f7f74',
      white: '#666978'
    }
  }
}
