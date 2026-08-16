import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      // config/config.test.js is the MODE=test environment config, not a spec file. Its name
      // accidentally matches vitest's default include glob, so exclude the whole config dir.
      exclude: [...configDefaults.exclude, 'e2e/*', 'config/**'],
      root: fileURLToPath(new URL('./', import.meta.url))
    }
  })
)
