import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  site: 'https://tryindent.in',
  output: 'static',
  vite: {
    plugins: [tailwindcss()]
  }
})
