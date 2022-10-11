import path from 'path'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, 'config/**'],
  },
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
			{ find: 'config', replacement: path.resolve(__dirname, './config/config.test.js') },

			/*
      { find: '@config', replacement: path.resolve(__dirname, './src/config') },
      { find: '@plugins', replacement: path.resolve(__dirname, './src/plugins') },
      { find: '@views', replacement: path.resolve(__dirname, './src/views') },
      { find: '@mixins', replacement: path.resolve(__dirname, './src/mixins') },
      { find: '@svg', replacement: path.resolve(__dirname, './src/svg') },
      { find: '@models', replacement: path.resolve(__dirname, './src/models') },
      { find: '@components', replacement: path.resolve(__dirname, './src/components') },
			*/
    ]
  }
})