import { reactive } from 'vue'
//import EventBus from "@/services/event-bus"

/**
 * This is a very simple "state management store" for storing the current pages title.
 * The title will then be shown in the liquido-header.vue component, when the user scrolls upwards.
 * 
 * See https://vuejs.org/guide/scaling-up/state-management.html
 */
export const store = reactive({
  
	headerTitle: undefined,
	headerBackLink: undefined,

  setHeaderTitle(newTitle) {
    this.headerTitle = newTitle
  },

	setHeaderBackLink(newBackLink) {
		this.headerBackLink = newBackLink
	},

})
