/**
 * Powerfull debugging locally on a mobile device
 * inside the browser.
 * 
 * See mobile-debug-log.vue for the frontend VUE component
 */


/* eslint-disable no-unused-vars */
function init() {
	
	window.onerror = (msg, url, line, col, err) => {
		const payload = { type: 'onerror', msg, url, line, col, stack: err?.stack, ts: Date.now() }
		console.error('PWA_CAPTURE', payload)
		localStorage.setItem('PWA_LAST_ERROR', JSON.stringify(payload))
	}
	window.onunhandledrejection = (ev) => {
		const payload = { type: 'unhandledrejection', reason: ev.reason, ts: Date.now() }
		console.error('PWA_CAPTURE', payload)
		localStorage.setItem('PWA_LAST_UNHANDLED_PROMISE', JSON.stringify(payload))
	}
}