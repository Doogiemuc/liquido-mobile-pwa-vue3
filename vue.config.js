/**
 * VUE CLI configuration file
 * https://cli.vuejs.org/guide/
 */

const path = require("path")

/**
 * @type {import('@vue/cli-service').ProjectOptions}
 */
module.exports = {
	publicPath: process.env.NODE_ENV === 'int'   //TODO: can I load this from config.<env>.js file to have it in one place?
    ? '/liquido-mobile'    			// 'if you set this to a subdir, eg. /liquido-mobile', then you MUST also change BASE_URL in config.<env>.js
    : '/',
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
	pwa: {
    themeColor: '#FFF'  // https://forum.vuejs.org/t/vue-cli-3-where-i-change-theme-color-for-address-bar/29951/7 .   *sic*
  },
  css: {
    loaderOptions: {
      sass: {
        additionalData: `@import "@/styles/_variables.scss";`  //BUGFIX: was  prependData
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
    },
		/*
		plugins: [
			new webpack.DefinePlugin({
				PRODUCTION: JSON.stringify(process.env.NODE_ENV === 'production'),
				// prevent console warning from vue-i18n:  https://stackoverflow.com/questions/66140411/you-are-running-the-esm-bundler-build-of-vue-i18n-it-is-recommended-to-configur
				__VUE_I18N_FULL_INSTALL__: true,
        __VUE_I18N_LEGACY_API__: false,
        __INTLIFY_PROD_DEVTOOLS__: false,
			})
		]
		*/
  }
}