/**
 * Event-bus is a very lightweight vuex.
 * Here we simply use the $emit functionality of Vue components.
 * Other components can fire events eg. `EventBus.emit(EventBus.LOGIN)`
 * and listeners can subscribe with `EventBus.on(EventBus.LOGIN, function(evt) { ... })
 */

 import Emitter from 'tiny-emitter'
 
 const eventBus = new Emitter()

// "enum" for event names (the keys are case insensitive.)
eventBus.Event = {
	LOGIN: "login",													// Fires after a successfull login. Event param is { team, polls, jwt }
	LOGOUT: "logout",												// Fires after logout is completed.
	POLLS_LOADED: "polls-loaded",  					// Fires when an array of polls was loaded from backend. Event param is the list of newly loaded polls
	POLL_LOADED: "poll-loaded",    					// One poll was loaded from the backend. Event param is that one poll
	SET_POLLS_FILTER: "set-polls-filter"		// Can be fired to set the filter on the polls page
}

export default eventBus
