import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      buffer: 'buffer',
    },
  },
  optimizeDeps: {
    include: ['buffer', 'eventemitter3'],
    exclude: ['rpc-websockets'],
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    commonjsOptions: {
      exclude: ['rpc-websockets'],
    },
  },
}) 