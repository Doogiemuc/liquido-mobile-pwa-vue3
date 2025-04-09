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
		https: {									// serve frontend over HTTPS
			key: key,
      cert: cert
		},			    
		host: "0.0.0.0",  				// "0.0.0.0" = listen on all adresses, incl. LAN and public adresses
		port: 3001,
		
		// Problems with Cross-origin resource sharing (CORS)? 
		// Either allow all origins in the backend (see application.properties)
		//   OR
		// Vue Dev serve can proxy API requests for you:
		// https://cli.vuejs.org/config/#devserver-proxy
		// https://github.com/http-party/node-http-proxy#options=
		// https://github.com/chimurai/http-proxy-middleware/blob/master/README.md
		/*
		proxy: {      							
			"^/q": {
				target: "https://localhost:8443",
				secure: false,
				changeOrigin: true,
				//TODO: cookieDomainRewrite: { "localhost:3001": "localhost:8443" }
			},
			"^/liquido-api/v3": {  		// Only proxy API requests. There are others, eg. Webservice "/ws" that sould stay
				pathRewrite: { '^/liquido-api/v3' : '/' },
				//ignorePath: true,
				target: "https://localhost:8443",    			// the matched path will be appended to this!
				secure: false   // allow self-signed backend certificate
				//ws: true,     // also proxy-websockets
				//changeOrigin: true
			}
		}
		*/
		
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
	css: {
    preprocessorOptions: {
      scss: {  //TODO: or SASS??
				// import global variables, eg. "$primary"
        additionalData: `@import "@/styles/_variables.scss";`  //BUGFIX: was prependData
      }
    }
	}
})
