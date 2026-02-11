import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'crypto', 'stream', 'path', 'process', 'vm', 'os', 'url', 'fs'],
      globals: { Buffer: true, process: true },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 2500,
  },
  optimizeDeps: {
    exclude: ['@lightprotocol/hasher.rs'],
  },
})
