/**
 * VUE CLI configuration file
 * https://cli.vuejs.org/guide/
 */

const path = require("path")

module.exports = {
	devServer: {
		port: 3001,   // Port for frontend when developing.
		proxy: {      // Problems with CORS? Vue Dev serve can proxy API requests for your: https://cli.vuejs.org/config/#devserver-proxy
			"/liquido-api/v3": {
				target: "http://localhost:8080",    // the matched path will be appended to this!
				//ws: true,
				//changeOrigin: true
			}
		}
	},
  css: {
    loaderOptions: {
      sass: {
        prependData: `@import "@/styles/_variables.scss";`
      }
    }
  },
  configureWebpack: {
    resolve: {
      alias: {
        // make the file /config/config.<NODE_ENV>.js available as "import config from 'config'"
        // https://stackoverflow.com/questions/30030031/passing-environment-dependent-variables-in-webpack
        "config": path.join(__dirname, "config/config."+process.env.NODE_ENV)
      }
    }
  }
}