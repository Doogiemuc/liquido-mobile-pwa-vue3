import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from "path"

const key = fs.readFileSync(path.resolve(__dirname, 'tls-certs/liquido-TLS-key.pem'), 'utf8');
const cert = fs.readFileSync(path.resolve(__dirname, 'tls-certs/liquido-TLS-cert.pem'), 'utf8');

// https://vitejs.dev/config/
export default defineConfig({
	server: {
		
		https: {													// serve frontend over HTTPS. => but not on fly.io
			key: key,
      cert: cert
		},			    
		host: true, // "0.0.0.0",  				// "0.0.0.0" = listen on all adresses, incl. LAN and public adresses
		port: 3001,
		strictPort: true,    							// only use this port. Exit if not available
		allowedHosts: ["localhost", "127.0.0.1", ".fly.dev"],
		
		// Problems with Cross-origin resource sharing (CORS)? 
		// Either allow all origins in the backend (see application.properties)
		//   OR
		// Vue Dev serve can proxy API requests for you:
		// https://cli.vuejs.org/config/#devserver-proxy
		// https://github.com/http-party/node-http-proxy#options=
		// https://github.com/chimurai/http-proxy-middleware/blob/master/README.md
		
		proxy: {      							
			/*
			"^/q": {
				target: "https://localhost:8443",
				secure: false,
				changeOrigin: true,
				//TODO: cookieDomainRewrite: { "localhost:3001": "localhost:8443" }
			},
			*/
			"/graphql": {  		// Only proxy API requests. There are others, eg. Webservice "/ws" that sould stay
				
				//ignorePath: true,
				target: "https://192.168.178.134:8443",    			// the full matched path will be appended to this!
				//rewrite: (path) => path.replace(/^\/graphql/, '/liquido-api/v3'),
				//OLD: pathRewrite: { '^/liquido-api/v3' : '/' },   
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
	/*
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
