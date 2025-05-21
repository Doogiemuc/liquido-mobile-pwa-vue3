import { reactive } from 'vue'

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
		console.log("===== Setting title to " + newTitle)
    this.headerTitle = newTitle
  },

	setHeaderBackLink(newBackLink) {
		this.headerBackLink = newBackLink
	},

	//TODO: handle this state here!
	setPollStatusFilter(newFilter) {
		console.log("setPollStatusFilter to " + newFilter)
		this.pollStatusFilter = newFilter
	}
})
