/**
 * Replacement for console.log on mobile phones
 */

// log levels
/* eslint-disable no-unused-vars */
const SILENT = 6
const ERROR = 5
const WARN  = 4
const INFO  = 3
const LOG = 2
const DEBUG = 1
const TRACE = 0
const ALL = -99

const LEVEL_NAMES = ["trace", "debug", "log", "info", "warn", "error"]

// === instance private fields ===

// IDs for each log entry
let idSequence = 0

// === module exports ===
export default {
	// log messages BELOW this level will not be shown (by default, show all)
	logLevel: ALL,

	// all entries in the log. Will be truncated to MAX_LOG_ENTRIES
	logEntries: [],

	// Maximum number of log lines to keep
	MAX_LOG_ENTRIES: 999,

	// when logging was started. Delta is shown in timestamp col
	startTime: Date.now(),

	error(args) {
		this.logAtLevel(ERROR, args)
	},

	warn(args) {
		this.logAtLevel(WARN, args)
	},

	info(args) {
		this.logAtLevel(INFO, args)
	},

	log(args) { 				// this.log() is synonym for this.info()
		this.logAtLevel(LOG, args)
	},   

	debug(args) {
		this.logAtLevel(DEBUG, args)
	},

	trace(args) {
		this.logAtLevel(TRACE, args)
	},

	/** 
	 * Create a log message at the given level.
	 * The message will be shown in our mobile-debug-log drawer AND
	 * in the normal browser console.
	 */
	logAtLevel(level, args) {
		if (!Number.isInteger(level)) {
			level = LEVEL_NAMES.indexOf(level)
		}
		if (level < this.logLevel) return
		this.logEntries.push({
			id: idSequence++,
			timestamp: Date.now() - this.startTime,
			level: level,
			message: args
		})
		if (this.logEntries.length > this.MAX_LOG_ENTRIES) {
			this.logEntries.shift()
		}
	},

	clearLog() {
		this.logEntries = []
	},

	getLevelName(levelAsInt) {
		if (!Number.isInteger(levelAsInt)) return levelAsInt
		return LEVEL_NAMES[levelAsInt]
	},

	// Be carefull that no one else is also doing this, e.g. logLevel does this: https://github.com/pimterry/loglevel/issues/129
	// AND you loose the information which module logged the message. Everything will come from mobile-debug-log.vue
	// Better call the this.info/debug/log/error methods directly.

	//This might be an interesting alternative clever hacky way of doing it:
	// https://stackoverflow.com/questions/9559725/extending-console-log-without-affecting-log-line?rq=1
	
	redefineConsoleMethods() {
		console.info("VUE mobile-debug-log has overwritten console.log() functions.")
		let that = this;
		LEVEL_NAMES.forEach(function(methodName) {
			let origMethod = console[methodName]
			console[methodName] = function(...args) {
				that.logAtLevel(methodName, args)
				if (origMethod !== undefined) origMethod(...args) // if console in this environment (browser/node/...) has this method
			}
		})
		
	}

}