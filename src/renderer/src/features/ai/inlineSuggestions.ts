import type * as Monaco from 'monaco-editor'

/** Registers the grey, Tab-to-accept suggestions. The editor calls this once after Monaco loads. */
export function registerInlineSuggestions(_monaco: typeof Monaco): Monaco.IDisposable {
  return { dispose: () => {} }
}
