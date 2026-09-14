// Config for the "test" mode. config/config.*.js is gitignored (it may contain secrets) except
// this file and config.common.js: vitest.config.js requires this file to exist, because vitest
// defaults NODE_ENV to "test", so vite.config.js resolves the bare `config` import to
// config/config.test.js - and there are no credentials in here, so it is safe to check in.
//
// Unit tests want a backend-free run, so this defaults to the mock - unlike
// config.development.js.example, which defaults to a real local backend.

import common from "./config.common.js"

export default Object.assign({}, common, {
	configSource: "test",
	LIQUIDO_API_URL: "https://localhost:8443/graphql",
	mockBackend: true,
	mockPasskey: true,
})
