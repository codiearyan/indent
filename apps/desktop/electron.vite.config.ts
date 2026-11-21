import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { version } from './package.json'

const shared = { '@shared': resolve('src/shared') }

export default defineConfig({
  main: { resolve: { alias: shared } },
  preload: { resolve: { alias: shared } },
  renderer: {
    resolve: {
      alias: {
        ...shared,
        '@': resolve('src/renderer/src'),
        // monaco-vim imports the editor by its old file paths, which this version no longer has.
        'monaco-editor/esm/vs': 'monaco-editor'
      }
    },
    plugins: [react(), tailwindcss()],
    define: { __APP_VERSION__: JSON.stringify(version) }
  }
})
