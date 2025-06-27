import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Explicitly define environment variables for injection
    'import.meta.env.VITE_AZURE_OPENAI_ENDPOINT': JSON.stringify(process.env.VITE_AZURE_OPENAI_ENDPOINT),
    'import.meta.env.VITE_AZURE_OPENAI_API_KEY': JSON.stringify(process.env.VITE_AZURE_OPENAI_API_KEY),
    'import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT': JSON.stringify(process.env.VITE_AZURE_OPENAI_DEPLOYMENT),
    'import.meta.env.VITE_BACKEND_API_URL': JSON.stringify(process.env.VITE_BACKEND_API_URL),
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom']
        }
      }
    }
  },
  server: {
    port: 3000,
    host: true
  }
}) 