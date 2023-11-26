import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from "path"

// https://vitejs.dev/config/
export default defineConfig({
	server: {
		//https: true,					  //serve frontend over HTTPS
		host: "0.0.0.0",  				// listen on localhost(127.0.0.1) and any local IP (192.168.*.*)
		port: 3001,
		

		/*
		// Problems with CORS? Vue Dev serve can proxy API requests for your: https://cli.vuejs.org/config/#devserver-proxy
		//https://github.com/http-party/node-http-proxy#options=
		proxy: {      							
			"^/liquido-api/v3": {  		// Only proxy API requests. There are others, eg. Webservice "/ws" that sould stay
				pathRewrite: {'^/liquido-api/v3' : '/'},
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
        additionalData: `@import "@/styles/_variables.scss";`  //BUGFIX: was  prependData
      }
    }
	}
})
