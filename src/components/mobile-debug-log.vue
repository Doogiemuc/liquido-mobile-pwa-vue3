<template>
	<!-- Mobile Debug Log - Expand by clicking on the "L"-Ribbon at the bottom -->
	<div class="mobile-debug-log" :class="{'collapsed': collapsed}">
		<div class="mobile-debug-icon" @click="collapsed = !collapsed">&Laplacetrf;</div>
		<div class="log-header">
			<div class="line-break-button" :class="{'active-button': lineBreak}" @click="lineBreak = !lineBreak">brk</div>
			<div class="show-all-cols" @click="showAllCols">all</div>
			<div class="filter">
				<input v-model="filterStr" type="text" class="filter-input" placeholder="Filter" />
			</div>
			<div class="clear-log" @click="clearLog">cls</div>
			<div class="show-last-row" :class="{'active-button': showLastRow}" @click="toggleShowLastRow">&#8582;</div>
		</div>
		<div id="log-entries-table-wrapper">
			<table class="log-entries-table">
				<thead>
					<td 
						v-for="col in shownColumns" 
						:key="col.key" 
						:class="getHeaderClass(col)" 
						:style="getHeaderStyle(col)"
						@click="clickHeader(col)"
					>
						{{ col.name }}
					</td>
				</thead>
				<tr v-for="(entry, idx) in filteredEntries" :key="entry.key" :class="getRowClass(entry, idx)">
					<td v-for="col in shownColumns" :key="col.key" :class="getCellClass(col, entry)">
						<span class="log-cell">{{ getColValue(col, entry) }}</span>
					</td>
				</tr>
				<tr v-if="filteredEntries.length === 0">
					<td :colspan="shownColumns.length" class="empty-log-icon">
						&bemptyv;
					</td>
				</tr>
			</table>
		</div>
	</div>
</template>

<script>
/**
 * Vue mobile-debug-log
 * 
 * This vue component can be used to show debug log entries on a mobile phone
 * where you do not have direct access to the browser's console.
 * 
 * <b>This module re-routes your console.log statements!</b>
 * Logs will still also be sent to the browser's console. And they will be shown in the drawer.
 *
 * Tap the small ribbon at the bottom of the screen to open the console drawer.
 */

// log levels
/* eslint-disable no-unused-vars */
const LEVEL = {
	SILENT: 5,
	ERROR:  4,
	WARN:   3,
	INFO:   2,
	LOG:    2,  // log == info
	DEBUG:  1,
	TRACE:  0,
	ALL:   -1
}

const LEVEL_NAMES = ["TRACE", "DEBUG", "INFO", "WARN", "ERROR", "SILENT"]

export default {
	name: "MobileDebugLog",
	data() {
		return {
			// Log view can be expanded and collapsed
			collapsed: true,

			// currently active filter (log message includes)
			filterStr: "",

			// automatically always scroll to the last bottom row into view
			showLastRow: true,

			// break long messages
			lineBreak: false,

			// maximum length of a log method before it will be truncated
			maxMessageLen: 200,

			// show every second line with an alternate color. (see getRowClass)
			alternatingRows: true,

			// Columns in the log. Each columns has a FIXED with, except the last one!
			// This is the only way to not let the table overflow its wrapper DIV.
			columns: [
				{ key: "timestamp", name: "sec", width: "40px", show: true },
				{ key: "level", name: "lvl", width: "40px", show: true },
				{ key: "message", name: "msg", width: undefined, show: true }
			],

			// Only log messages at or above this level will be shown (by default, show all)
			logLevel: LEVEL.ALL,

			// all entries in the log. Will be truncated to MAX_LOG_ENTRIES
			logEntries: [],

			// Maximum number of log lines to keep
			MAX_LOG_ENTRIES: 999,

			// when logging was started. Delta is shown in timestamp col
			startTime: Date.now(),
		}
	},
	computed: {
		shownColumns() {
			return this.columns.filter(col => col.show)
		},
		filteredEntries() {
			if (!this.filterStr) return this.logEntries
			return this.logEntries.filter(entry => {
				let str = this.toString(entry.message)
				return str.includes(this.filterStr)
			})
		}
	},
	created() {
		// when on mobile the redefine console.log methods (because there is no browser log on mobile)
		//if (process.env.NODE_ENV === "mobile") 
		//this.redefineConsoleMethods()
	},
	mounted() {
		this.debug("Mobile Debug log started.")
	},
	methods: {
		
		// =================== log methods =====================

		error(args) {
			this.logAtLevel(LEVEL.ERROR, args)
		},

		warn(args) {
			this.logAtLevel(LEVEL.WARN, args)
		},

		info(args) {
			this.logAtLevel(LEVEL.INFO, args)
		},

		log(args) { 				// this.log() is synonym for this.info()
			this.logAtLevel(LEVEL.INFO, args)
		},   

		debug(args) {
			this.logAtLevel(LEVEL.DEBUG, args)
		},

		trace(args) {
			this.logAtLevel(LEVEL.TRACE, args)
		},

		/** 
		 * Create a log message at the given level.
		 * The message will be shown in our mobile-debug-log drawer AND
		 * in the normal browser console.
		 * @param level log level as INT
		 * @param args log message (may be a string or an object that will be serialized when shown)
		 */
		logAtLevel(level, args) {
			if (!Number.isInteger(level)) level = LEVEL.INFO
			if (level < this.logLevel) return
			this.logEntries.push({
				timestamp: Math.round((Date.now() - this.startTime) / 1000),
				level: level,
				message: args
			})
			if (this.logEntries.length > this.MAX_LOG_ENTRIES) {
				this.logEntries.shift()
			}
			if (this.showLastRow)	this.scrollToBottom()
		},


		// ================== utility methods =================


		/**
		 * You CAN redefine the default console.log, console.debug, console.warn, ... methods,
		 * so that they will also log to the mobile-debug-log. All messages will still also
		 * appear in the browsers console (if you are in a browser).
		 * 
		 * But there are some caveats:
		 * - You will loose the information which module logged the original message. All messages will come from mobile-debug-log.vue
		 * - Be carefull, that no one else is also redefining these methods, e.g. the logLevel lib does this: https://github.com/pimterry/loglevel/issues/129
		 * 
		 * The alternative is to call the above this.log, this.info, ... methods direcdtly
		 */
		redefineConsoleMethods() {
			console.info("VUE mobile-debug-log mounted has overwritten console.log() functions.")
			let that = this;
			["trace", "debug", "info", "warn", "error", "log"].forEach(function(methodName) {
				let origMethod = console[methodName]
				console[methodName] = function(...args) {
					// log to our own mobile debugLog
					that.logAtLevel(LEVEL[methodName], args)
					// if console in this environment (browser/node/...) has this method, then also log to the original method
					if (origMethod !== undefined) origMethod(...args) 
				}
			})
			
		},

		/**
		 * Internally mobile-debug-log works with integer levels
		 * This is used to show the actual names of log levels in the drawer column.
		 */
		getLevelName(levelAsInt) {
			if (!Number.isInteger(levelAsInt)) return levelAsInt
			return LEVEL_NAMES[levelAsInt]
		},

		/** get display value for entry in col */
		getColValue(col, entry) {
			switch (col.key) {
				case "timestamp": 
					return entry.timestamp;
				case "level": 
					return this.getLevelName(entry.level)
				case "message": 
					return this.toString(entry.message)
				default:
					return ""
			}
		},

		/** 
		 * Convert val to a string in the same way as the browser does. 
		 * Truncate result to maxMessageLen
		 */
		toString(val) {
			let str = val
			if (Array.isArray(val)) {
				str = val.map(v => typeof v === "object" ? JSON.stringify(v) : v).join(" ")	
			}
			if (str.length > this.maxMessageLen) str = str.substr(0, this.maxMessageLen)+" ..."
			return str
		},


		clickHeader(col) {
			if (col.key === "timestamp" || col.key === "level") col.show = !col.show
		},

		showAllCols() {
			this.columns.forEach(col => col.show = true)
		},

		toggleShowLastRow() {
			this.showLastRow = !this.showLastRow
			if (this.showLastRow) this.scrollToBottom()
		},
		
		clearLog() {
			this.logEntries = []
		},

		/** this is automatically called when showLastRow is active */
		scrollToBottom() {
			this.$nextTick(() => {
				document.getElementById("log-entries-table-wrapper").scrollTop = 
					document.getElementById("log-entries-table-wrapper").scrollHeight
			})
		},
		
		/** Utility methods for layout */

		getHeaderClass(col) {
			return col.key
		},

		getHeaderStyle(col) {
			return col.width ? "width: "+col.width : ""
		},

		getRowClass(entry, idx) {
			let res = this.getLevelName(entry.level)
			if (this.alternatingRows && (idx % 2 === 0)) res += " alternate-row"
			return res
		},

		/* eslint-disable no-unused-vars */
		getCellClass(col, entry) {
			if (col.key === "message") {
				return col.key + " " + (this.lineBreak ? "line-break" : "no-wrap")
			} else { 
				return col.key
			}
		},
	},
}
</script>

<style lang="scss">
	.mobile-debug-log {
		z-index: 10000;
		display: flex;
		flex-direction: column;
		position: fixed;
		height: 80%;
		bottom: 0;
		color: white;
		background-color: black;
		transition: height 0.5s ease-in-out;
		box-shadow: 0px -3px 5px rgba(0,0,0,0.5);
		font-size: 12px;
		//font-family: 'Lucida Sans', 'Lucida Sans Regular', 'Lucida Grande', 'Lucida Sans Unicode', Geneva, Verdana, sans-serif;
		font-family: monospace;

		.mobile-debug-icon {
			position: absolute;
			top: -30px;
			left: calc(50% - 30px);
			width: 50px;
			height: 30px;
			cursor: pointer;
			color: black;
			background: #AAA;
			font-size: 25px;
			line-height: 30px;
			font-family: "Georgia", "Apple Symbols", serif;
			text-align: center;
			mix-blend-mode: difference;
			border-top-left-radius: 8px;
			border-top-right-radius: 8px;
			border-top: 1px solid rgba(0,0,0,0.5);
			border-left: 1px solid rgba(0,0,0,0.5);
			border-right: 1px solid rgba(0,0,0,0.5);
			box-shadow: 3px 3px 5px rgba(0,0,0,0.5);
		}

		.log-header {
			color: white;
			background-color: darkgrey;
			font-size: 14px;
			display: flex;
			flex-direction: row;
			justify-content: space-between;
			padding: 1px 10px;
			border-top: 1px solid rgba(0, 0, 0, 0.5);
		}

		.filter-input {
			display: block;
			padding: 0 0 0 0.25rem;
			margin: 0;
			background-color: #fff;
			background-clip: padding-box;
			border: none;
			border-radius: .25rem;
		}

		.active-button {
			color: green;
			font-weight: bold;
		}

		#log-entries-table-wrapper {
			overflow-x: hidden;
			overflow-y: scroll;
			width: 100%;
			flex-grow: 1;
		}

		.empty-log-icon {
			text-align: center;
			color: lightgrey;
			font-size: 20px;
			padding-top: 20px;
		}

		.log-entries-table {
			table-layout: fixed;
			width: 100%;
			margin-bottom: 20px;
			font-family: monospace;
			border-top: 1px solid black;
			thead {
				color: #666;
				background-color: lightgrey;
				font-weight: bold;
				font-size: 12px;
				.timestamp, .level {
					cursor: pointer;
				}
				td {
					text-align: center;
					padding: 2px 1px; 
				}
				td:not(:last-child) {
					border-right: 1px solid black;
				}
			}
			tr {
				/** pretty condensed. We want to show as much info as possible */
				line-height: 1.1;
			}
		}

		// format of columns
		.timestamp {
			text-align: right;
			overflow-x: hidden;
		}

		.alternate-row {
			background-color: #222;
		}
	}

	.mobile-debug-log.collapsed {
		height: 0;
		//top: 100%;
		box-shadow: none;
		.mobile-debug-icon {
			bottom: 0;
		}
	}

	.line-break {
		white-space: normal;
		//padding-left: 1em;
    //text-indent: -1em;
	}

	.no-wrap {
		white-space: nowrap;
		overflow-x: hidden;
		text-overflow: ellipsis;
	}

	.line-break-button, .show-all-cols, .show-last-row, .clear-log {
		cursor: pointer;
	}

	tr.error {
		color: red;
	}
	tr.info .level {
		color: lightskyblue;
	}
	tr.log .level {
		color: lightskyblue;
	}
	tr.warn .level {
		color: darkgoldenrod;
	}
	tr.debug .level{
		color: lightgray;
	}
	tr.trace {
		color: grey;
	}
</style>
