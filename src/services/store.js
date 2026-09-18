import { reactive } from 'vue'

/**
 * This is a very simple "state management store" for storing the current pages title.
 * The title will then be shown in the liquido-header.vue component, when the user scrolls upwards.
 * 
 * See https://vuejs.org/guide/scaling-up/state-management.html
 */
export const store = reactive({
  
	headerTitle: undefined,
	headerBackTarget: undefined,
	headerRight: undefined,

	/**
	 * True while the welcome page's hero owns the LIQUIDO mark: its #liquidMark is then the only
	 * university icon on screen, and liquido-header.vue hides its own one and fades itself in
	 * along --hero-progress instead of being there from the start.
	 */
	heroMarkActive: false,

  setHeaderTitle(newTitle) {
    this.headerTitle = newTitle
  },

	setHeaderRight(content) {
		this.headerRight = content
	},

	clearHeaderRight() {
		this.headerRight = undefined
	},

	setHeroMarkActive(active) {
		this.heroMarkActive = active
	},

	/**
	 * Sets the target page for the back link at the left side of the header
	 * You MUST set this to a vue-router object!
	 * @param {Object} target  vue-router target e.g. {"name": "teams"}
	 */
	setHeaderBackTarget(target) {
		this.headerBackTarget = target
	},

})
