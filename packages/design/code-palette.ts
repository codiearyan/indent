// Hex mirror of the design tokens for libraries that cannot read CSS variables
// (Monaco themes, xterm themes). Keep in step with tokens.css.
//
// The frame of a code surface (background, selection, cursor) always follows the app. A code
// theme only picks the colours of the code itself, once for the dark app and once for the light.

export type CodeMode = 'dark' | 'light'

export interface CodeChrome {
  background: string
  foreground: string
  muted: string
  border: string
  selection: string
  lineHighlight: string
  cursor: string
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

export interface CodeSyntax {
  comment: string
  keyword: string
  string: string
  number: string
  type: string
  function: string
  variable: string
}

export type CodePalette = CodeChrome & CodeSyntax

export const CODE_THEMES = [
  { id: 'ember', label: 'Ember', hint: 'The orange of the app on neutral text.' },
  { id: 'classic', label: 'Classic', hint: 'Blue keywords, teal types, warm strings.' },
  { id: 'dusk', label: 'Dusk', hint: 'Violet keywords and rose strings.' },
  { id: 'mono', label: 'Mono', hint: 'Greys only, nothing competes with the code.' }
] as const

export type CodeThemeId = (typeof CODE_THEMES)[number]['id']

export const DEFAULT_CODE_THEME: CodeThemeId = 'ember'

export const codeChrome: Record<CodeMode, CodeChrome> = {
  dark: {
    background: '#111112',
    foreground: '#e8e8eb',
    muted: '#a1a1a6',
    border: '#262628',
    selection: '#3d2418',
    lineHighlight: '#19191b',
    cursor: '#ea6030',
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

const syntax: Record<CodeThemeId, Record<CodeMode, CodeSyntax>> = {
  // Keywords take the brand orange, strings a quieter tint of it, numbers the gold.
  ember: {
    dark: {
      comment: '#7c7c85',
      keyword: '#ea6030',
      string: '#e8b796',
      number: '#e5c14b',
      type: '#fafafa',
      function: '#fafafa',
      variable: '#d2d2d7'
    },
    light: {
      comment: '#6b6b75',
      keyword: '#b8431c',
      string: '#7d4a2a',
      number: '#8a6400',
      type: '#111113',
      function: '#111113',
      variable: '#3a3a40'
    }
  },
  classic: {
    dark: {
      comment: '#7c7c85',
      keyword: '#79b8ff',
      string: '#e6b673',
      number: '#b5d68a',
      type: '#5fd0c0',
      function: '#d8c88a',
      variable: '#e8e8eb'
    },
    light: {
      comment: '#6b6b75',
      keyword: '#1f5fbf',
      string: '#9a4a12',
      number: '#1b7a4c',
      type: '#0f7480',
      function: '#6f5600',
      variable: '#111113'
    }
  },
  dusk: {
    dark: {
      comment: '#7c7c85',
      keyword: '#c79bf2',
      string: '#f2a7c0',
      number: '#e5c14b',
      type: '#fafafa',
      function: '#fafafa',
      variable: '#d2d2d7'
    },
    light: {
      comment: '#6b6b75',
      keyword: '#7a3fc4',
      string: '#a8325e',
      number: '#8a6400',
      type: '#111113',
      function: '#111113',
      variable: '#3a3a40'
    }
  },
  mono: {
    dark: {
      comment: '#7c7c85',
      keyword: '#fafafa',
      string: '#a1a1a6',
      number: '#c4c4cb',
      type: '#fafafa',
      function: '#fafafa',
      variable: '#d2d2d7'
    },
    light: {
      comment: '#6b6b75',
      keyword: '#111113',
      string: '#5c5c66',
      number: '#3a3a40',
      type: '#111113',
      function: '#111113',
      variable: '#3a3a40'
    }
  }
}

export function codePalette(theme: CodeThemeId, mode: CodeMode): CodePalette {
  return { ...codeChrome[mode], ...syntax[theme][mode] }
}
