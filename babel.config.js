console.log("======== Loading Babel config")

module.exports = {
  "presets": [
		"@babel/preset-env",               // https://babeljs.io/docs/en/babel-preset-env#targets contains https://babeljs.io/docs/en/babel-plugin-proposal-optional-chaining    foo?.bar
		"@vue/cli-plugin-babel/preset"
  ]
}
