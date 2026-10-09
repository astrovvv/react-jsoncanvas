import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname),
  build: {
    outDir: 'example-dist'
  },
  resolve: {
    alias: {
      '@astrov/react-jsoncanvas': resolve(__dirname, 'src/index.ts')
    }
  },
  server: {
    port: 3000,
    open: true
  }
})
