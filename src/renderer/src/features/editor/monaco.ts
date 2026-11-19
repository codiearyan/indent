import * as monaco from 'monaco-editor'
import EditorWorker from 'monaco-editor/editor/editor.worker?worker'
import TsWorker from 'monaco-editor/language/typescript/ts.worker?worker'
import JsonWorker from 'monaco-editor/language/json/json.worker?worker'
import CssWorker from 'monaco-editor/language/css/css.worker?worker'
import HtmlWorker from 'monaco-editor/language/html/html.worker?worker'
import { codePalette, type CodePalette } from '@/lib/code-palette'
import { registerInlineSuggestions } from '@/features/ai/inlineSuggestions'

self.MonacoEnvironment = {
  getWorker(_id, label) {
    if (label === 'typescript' || label === 'javascript') return new TsWorker()
    if (label === 'json') return new JsonWorker()
    if (label === 'css' || label === 'scss' || label === 'less') return new CssWorker()
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new HtmlWorker()
    return new EditorWorker()
  }
}

const { typescript } = monaco
const compilerOptions: monaco.typescript.CompilerOptions = {
  target: typescript.ScriptTarget.ESNext,
  module: typescript.ModuleKind.ESNext,
  // ts.ModuleResolutionKind.Bundler; Monaco's enum stops at NodeJs.
  moduleResolution: 100 as monaco.typescript.ModuleResolutionKind,
  allowImportingTsExtensions: true,
  allowJs: true,
  jsx: typescript.JsxEmit.ReactJSX,
  noEmit: true,
  strict: true,
  esModuleInterop: true,
  resolveJsonModule: true
}
// Learner code imports npm packages (openai, vitest) and Node globals whose types are not loaded.
const diagnosticCodesToIgnore = [2307, 2792, 7016, 2580, 2591, 2593]
for (const defaults of [typescript.typescriptDefaults, typescript.javascriptDefaults]) {
  defaults.setCompilerOptions(compilerOptions)
  defaults.setDiagnosticsOptions({ diagnosticCodesToIgnore })
  defaults.setEagerModelSync(true)
}

function hex(color: string): string {
  return color.replace('#', '')
}

function defineTheme(name: string, base: 'vs' | 'vs-dark', p: CodePalette): void {
  monaco.editor.defineTheme(name, {
    base,
    inherit: true,
    rules: [
      { token: '', foreground: hex(p.foreground) },
      { token: 'comment', foreground: hex(p.comment), fontStyle: 'italic' },
      { token: 'keyword', foreground: hex(p.keyword) },
      { token: 'string', foreground: hex(p.string) },
      { token: 'number', foreground: hex(p.number) },
      { token: 'type', foreground: hex(p.type) },
      { token: 'function', foreground: hex(p.function) },
      { token: 'identifier', foreground: hex(p.variable) }
    ],
    colors: {
      'editor.background': p.background,
      'editor.foreground': p.foreground,
      'editor.lineHighlightBackground': p.lineHighlight,
      'editor.lineHighlightBorder': p.lineHighlight,
      'editor.selectionBackground': p.selection,
      'editorCursor.foreground': p.cursor,
      'editorLineNumber.foreground': p.muted,
      'editorLineNumber.activeForeground': p.foreground,
      'editorIndentGuide.background1': p.border,
      'editorWidget.border': p.border,
      'editorGutter.background': p.background
    }
  })
}

defineTheme('labbench-dark', 'vs-dark', codePalette.dark)
defineTheme('labbench-light', 'vs', codePalette.light)

registerInlineSuggestions(monaco)

// Monaco measures glyphs on creation; the webfont may arrive later.
void document.fonts.ready.then(() => monaco.editor.remeasureFonts())

const languages: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  json: 'json',
  md: 'markdown',
  css: 'css',
  html: 'html',
  py: 'python',
  sql: 'sql',
  sh: 'shell',
  yaml: 'yaml',
  yml: 'yaml'
}

export function languageFor(path: string): string {
  return languages[path.split('.').pop()?.toLowerCase() ?? ''] ?? 'plaintext'
}

export function uriFor(path: string): monaco.Uri {
  return monaco.Uri.file(`/${path}`)
}

export function pathOf(uri: monaco.Uri): string {
  return uri.path.slice(1)
}

export { monaco }
