// Config for the backend-free e2e run: `npm run test:e2e:mock` (and `npm run dev:mock`) start the dev
// server with LIQUIDO_CONFIG=mock, which makes vite.config.js resolve the bare `config` import to this
// file instead of config.development.js. Checked in like config.test.js - there are no credentials in
// here - so that a fresh clone can run the e2e suite without creating any config file first.
//
// Every backend call is answered by the mock backend, over real HTTP, by the Vite dev-middleware in
// mock-backend/ - see mock-backend/liquido-mock-http-server.js.

import common from "./config.common.js"

export default Object.assign({}, common, {
	configSource: "mock",
	// Never called in mock mode: liquido-graphql-client.js points axios at the dev server's own origin
	// instead. Set anyway, because the client refuses to start without one.
	LIQUIDO_API_URL: "https://localhost:3002/graphql",
	mockBackend: true,
	mockPasskey: false,
	showDebugLog: false,
})
