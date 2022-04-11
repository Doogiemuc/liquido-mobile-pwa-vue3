/**
 * Event-bus is a very lightweight VUEX.
 * Here we simply use tiny-emitter as a global event bus.
 * Other components can fire events eg. `EventBus.emit(EventBus.Event.LOGIN)`
 * and listeners can subscribe with `EventBus.on(EventBus.Event.LOGIN, function(evt) { ... })
 */

 import Emitter from 'tiny-emitter'
 
 const eventBus = new Emitter()

// "enum" for event names (the keys are case insensitive.)
eventBus.Event = {
	LOGIN: "login",													// Fires after a successfull login. Event param is { team, polls, jwt }
	LOGOUT: "logout",												// Fires after logout is completed.
	POLLS_LOADED: "polls-loaded",  					// Fires when an array of polls was loaded from backend. Event param is the list of newly loaded polls
	POLL_LOADED: "poll-loaded",    					// One poll was loaded from the backend. Event param is that one poll
	POLL_FILTER_CHANGED: "polls-filter-changed"	// Fired by navbar-bottom, when user clicked on filter
}

export default eventBus


//MAYBE: This could also be implemented with the new VUE3 provide/inject mechanism: https://v3.vuejs.org/guide/component-provide-inject.html