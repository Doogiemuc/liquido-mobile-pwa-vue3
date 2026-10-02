import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from "path"
import mockBackend from './vite-plugin-mock-backend.js'

// TLS certificates
// Created with mkcert. The SANs must cover every name the app is reached by - the dev host name
// (quarkus.webauthn.origins in the backend must match it exactly), localhost, and the LAN IP:
//   mkcert -cert-file tls-certs/liquido-local-cert.pem -key-file tls-certs/liquido-local-key.pem \
//          shadow.fritz.box liquido.local localhost 127.0.0.1 ::1 192.168.178.10
// The LAN IP only matters for browsing by IP (e.g. a phone with no DNS). Reaching the app by
// hostname needs only the DNS:shadow.fritz.box entry, so a changed IP does not require a new cert.
// Run `mkcert -install` once per machine so the local CA is trusted (needs your password).
// Copy the same pair to the backend at src/main/resources/liquido-local-{cert,key}.pem.
const key = fs.readFileSync(path.resolve(__dirname, 'tls-certs/liquido-local-key.pem'), 'utf8');
const cert = fs.readFileSync(path.resolve(__dirname, 'tls-certs/liquido-local-cert.pem'), 'utf8');

// Which config/config.<name>.js the bare `config` import resolves to: NODE_ENV by default
// (development for `vite`, test for vitest), or LIQUIDO_CONFIG to override it - `npm run dev:mock`
// sets LIQUIDO_CONFIG=mock to serve the checked-in config.mock.js instead of config.development.js.
const configName = process.env.LIQUIDO_CONFIG || process.env.NODE_ENV

// Same target as the "config" alias below, but as an absolute path with its extension, for
// vite-plugin-mock-backend.js to dynamically import directly - see that file for why.
const configPath = path.join(__dirname, "config", "config." + configName + ".js")

// https://vitejs.dev/config/
export default defineConfig({
	server: {
		
		https: {													// serve frontend over HTTPS
			key: key,
      cert: cert
		},			    
		host: true, // "0.0.0.0",  				// "0.0.0.0" = listen on all adresses, incl. LAN and public adresses
		port: 3001,
		strictPort: true,    							// only use this port. Exit if not available
		//allowedHosts: ["localhost", "127.0.0.1"],
		// Works, but you loose the context/filename where the log came from.
		forwardConsole: {
			unhandledErrors: true,
			logLevels: ['debug', 'info', 'log', 'warn', 'error']
		},
		// No API proxy: the frontend calls the backend directly at config.LIQUIDO_API_URL, and the
		// backend allows the cross origin (quarkus.http.cors in application.properties). There used to
		// be a "/graphql_proxy" here for a backend on another machine; nothing used it any more.
		// If you ever need one again: https://vite.dev/config/server-options#server-proxy
	},
  plugins: [
    vue(),
		//mkcert()  -> we use real TLS certs
		mockBackend(configPath),   // answers config.mockBackend's traffic over real HTTP - see vite-plugin-mock-backend.js
  ],
  resolve: {
    alias: {
			// map @ to ./src   but imports MUST have file endings (.js or .vue) !
    	'@' : fileURLToPath(new URL('./src', import.meta.url)),

			// laod a specific config file per environment - see configName above
			'config': path.join(__dirname, "config/config."+configName)
    }
		
  },
	build: {
		sourcemap: true
	},
	/* DEPRECATED: We only use plain CSS
	css: {
    preprocessorOptions: {
      scss: {  //TODO: or SASS??
				// import global variables, eg. "$primary"
        additionalData: `@import "@/styles/_variables.scss";`  //BUGFIX: was prependData
      }
    }
	}
	*/
})
