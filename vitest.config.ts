import { defineConfig } from 'vitest/config'

// Separate from vite.config.ts so unit tests don't spin up the Cloudflare plugin.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
  },
})
