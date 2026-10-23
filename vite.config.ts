import { cloudflare } from '@cloudflare/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The app lives in frontend/; wrangler.toml, local D1 state and dist/ stay at the repo root.
export default defineConfig({
  root: 'frontend',
  build: { outDir: '../dist', emptyOutDir: true },
  plugins: [
    react(),
    cloudflare({ configPath: '../wrangler.toml', persistState: { path: '../.wrangler/state' } }),
  ],
})
