//
// Configuration for LIQUIDO mobile PWA in INT environment
//
import _ from "lodash"
import commonConfig from "./config.common.js"

let config = {
	LIQUIDO_API_URL: 'http://liquido-int-env.aws:8080/liquido-api/',  // will be proxied by Vue devServer. See vue.config.js
}

export default _.merge(commonConfig, config)