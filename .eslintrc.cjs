/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution')

module.exports = {
  root: true,
  'extends': [
    'plugin:vue/vue3-essential',
    'eslint:recommended',
    '@vue/eslint-config-prettier/skip-formatting'
  ],
	rules: {
		'vue/multi-word-component-names': 'off'
	},
  overrides: [
    {
      // Cypress specs. They run in a browser, so plugin:cypress/recommended is what supplies cy,
      // Cypress and the mocha globals.
      //
      // This used to say 'cypress/e2e/**', a path that does not exist in this repo - the specs live
      // in tests/e2e/specs - so the override had never applied to anything and the whole tests tree
      // linted as plain browser code.
      files: [
        'tests/e2e/**/*.{cy,spec}.{js,ts,jsx,tsx}'
      ],
      'extends': [
        'plugin:cypress/recommended'
      ],
      globals: {
        // Cypress' bundler shims process.env into the browser bundle. Declare just that, rather
        // than env:node, which would also promise fs and module - neither of which exists there.
        process: 'readonly'
      },
      rules: {
        // OFF deliberately, and not because it is noisy: it contradicts this repo's own documented
        // idiom. CLAUDE.md section 3 requires `.scrollIntoView().should('be.visible')` for anything
        // below the fold on the 375x667 viewport, and that is exactly the shape this rule rejects.
        // Switching it on the day the override started matching would also have meant rewriting 27
        // chains inside happy-case.cy.js - the primary regression test - for a style preference.
        // Worth revisiting as its own piece of work, with the suite runnable to prove each rewrite.
        'cypress/unsafe-to-chain-command': 'off'
      }
    },
    {
      // Node-side files: the Cypress config files, the shared base config, and the vitest specs,
      // which really do run in Node and really do have process.env.
      files: [
        'cypress.config*.js',
        'tests/*.js',
        'tests/unit/**/*.js'
      ],
      env: { node: true }
    }
  ],
  parserOptions: {
    ecmaVersion: 'latest'
  }
}
