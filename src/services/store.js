import { reactive } from 'vue'
import EventBus from "@/services/event-bus"

/**
 * This is a very simple "state management store" for storing the current pages title.
 * The title will then be shown in the liquido-header.vue component, when the user scrolls upwards.
 * 
 * See https://vuejs.org/guide/scaling-up/state-management.html
 */
export const store = reactive({
  
	headerTitle: undefined,
	headerBackLink: undefined,
	pollStatusFilter: undefined,

  setHeaderTitle(newTitle) {
    this.headerTitle = newTitle
  },

	setHeaderBackLink(newBackLink) {
		this.headerBackLink = newBackLink
	},

	/**
	 * This is the central place to set the poll status filter.
	 * It will also emit an event to notify other components about the change.
	 * This is used by the bottom navbar to change the filter when the user clicks on an arrow.
	 * It is then read by the polls.vue component to filter the polls accordingly.
	 * @param {String} newFilter new filter value for the poll status filter
	 */
	setPollStatusFilter(newFilter) {
		//console.log("setPollStatusFilter to " + newFilter + " and emmitting event")
		this.pollStatusFilter = newFilter
		EventBus.emit(EventBus.Event.POLL_FILTER_CHANGED, newFilter)
	}
})
