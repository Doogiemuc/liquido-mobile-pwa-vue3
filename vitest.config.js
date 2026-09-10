import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      // 'config/*' is not optional: vitest defaults NODE_ENV to "test", so vite.config.js resolves
      // the bare `config` import to config/config.test.js - whose name also matches vitest's default
      // `**/*.test.js` include pattern. Without this exclude vitest tries to run the config file as
      // a suite and fails with "No test suite found".
      exclude: [...configDefaults.exclude, 'e2e/*', 'config/*'],
      root: fileURLToPath(new URL('./', import.meta.url))
    }
  })
)
