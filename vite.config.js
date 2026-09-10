import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from "path"

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
		

		// Problems with Cross-origin resource sharing (CORS)? 
		// Either allow all origins in the backend (see application.properties)
		//   OR
		// Vue Dev serve can proxy API requests for you:
		// https://cli.vuejs.org/config/#devserver-proxy
		// https://github.com/http-party/node-http-proxy#options=
		// https://github.com/chimurai/http-proxy-middleware/blob/master/README.md
		// https://mattslifebytes.com/2025/03/30/unbreaking-cookies-in-local-dev-with-vite-proxy/ 
		proxy: {      							
			"/graphql_proxy": {  		// Only proxy API requests. There are others, eg. Webservice "/ws" that sould stay		
				//ignorePath: true,
				target: "https://shadow.fritz.box:8443",    			// the full matched path will be appended to this!
				rewrite: (path) => path.replace(/^\/graphql_proxy/, '/'),  
				secure: false   // allow self-signed backend certificate
				//ws: true,     // also proxy-websockets
				//changeOrigin: true
			}
		}
		
		
	},
  plugins: [
    vue(),
		//mkcert()  -> we use real TLS certs
  ],
  resolve: {
    alias: {
			// map @ to ./src   but imports MUST have file endings (.js or .vue) !
    	'@' : fileURLToPath(new URL('./src', import.meta.url)),

			// laod a specific config file per environment
			'config': path.join(__dirname, "config/config."+process.env.NODE_ENV)  
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
