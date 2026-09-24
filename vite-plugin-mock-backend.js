/**
 * Vite dev-middleware that answers the mock backend over real HTTP - see
 * mock-backend/liquido-mock-http-server.js's module doc comment for why (in short: so
 * cy.intercept()/cy.wait() in Cypress specs see mocked traffic exactly like they would the real
 * backend, and the same spec source works unmodified against either backend).
 *
 * Only active when config.mockBackend is true - checked per request, not at plugin-registration
 * time, so toggling config/config.development.js and restarting the dev server is all it takes.
 *
 * @param {String} configPath absolute path to config/config.<NODE_ENV>.js, computed by vite.config.js
 * the same way it already computes the "config" alias target. Passed in as an absolute path rather
 * than resolved here with a relative import: Vite bundles vite.config.js (and whatever it imports)
 * into a temp file under node_modules/.vite-temp/ to load it, which would silently break a relative
 * import from this file - a plain dynamic import of an absolute path has no such ambiguity.
 */
export default function mockBackendPlugin(configPath) {
	return {
		name: "liquido-mock-backend",
		configureServer(server) {
			server.middlewares.use(async (req, res, next) => {
				const config = (await import(configPath)).default
				if (!config.mockBackend) return next()

				// Loaded through Vite's own resolver (ssrLoadModule), not a plain import: the mock
				// backend itself uses the "config" and "@/..." aliases that only Vite's resolver
				// understands, and this also means editing it during `npm run dev` picks up changes
				// immediately, the same as any other Vite-served module.
				const { handleMockRequest } = await server.ssrLoadModule("/mock-backend/liquido-mock-http-server.js")
				const handled = await handleMockRequest(req, res)
				if (!handled) next()
			})
		},
	}
}
