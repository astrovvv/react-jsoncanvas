import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ReactJSONCanvas',
      formats: ['es', 'cjs'],
      fileName: format => `index.${format === 'es' ? 'js' : 'cjs'}`
    },
    rollupOptions: {
      external: ['react', 'react-dom', '@trbn/jsoncanvas'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          '@trbn/jsoncanvas': 'JSONCanvas'
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'styles.css'
          }
          return assetInfo.name || ''
        }
      }
    },
    sourcemap: true,
    target: 'esnext',
    minify: 'esbuild'
  },
  css: {
    modules: {
      localsConvention: 'camelCase'
    }
  }
})
