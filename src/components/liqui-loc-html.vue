<script>
/**
 * Render a translated message that CONTAINS HTML.
 *
 * This is the only place in LIQUIDO where message markup is allowed. `$t()` returns plain text and
 * Vue escapes it on render, which is what makes interpolating a user's name safe everywhere else -
 * so `v-html="$t(...)"` is forbidden, and this component replaces it.
 *
 * Usage:
 *   <liqui-loc-html msg-key="welcome" tag="div" class="card-body" />
 *   <liqui-loc-html msg-key="hasInviteCodeForTeam" :params="{ adminName, teamName: team.teamName }" />
 *
 * Any attribute that is not a prop (class, id, ...) falls through to the rendered element, so ids
 * the e2e suite relies on - #onlyAdminAddsProposalsInfo and friends - keep working.
 *
 * <h2>Order of operations, and why</h2>
 *
 *   1. resolve the raw message (which may contain hand-written HTML)
 *   2. ESCAPE each parameter value
 *   3. interpolate the escaped values into the raw message
 *   4. sanitise the result
 *
 * Escaping in step 2 is what matters: parameters carry user-supplied text - team names, nicknames -
 * and escaping them first means they land as literal characters and can never contribute markup.
 * Sanitising in step 4 is the backstop for a mistake in a hand-written message. Doing it in the
 * other order would let a team called "<b>x</b>" render as bold.
 *
 * <h2>Why a render function and not a template</h2>
 *
 * A template would need `<component :is="tag" v-html="html" />`, which trips
 * vue/no-v-text-v-html-on-component - a rule worth keeping, since v-html on a real component would
 * silently discard its content. h() with innerHTML expresses "this is an element, fill it" directly
 * and needs no suppression.
 */
import { h } from "vue"
import { translate } from "@/services/liqui-loc.js"
import { escapeHtml, sanitizeHtml } from "@/services/liqui-loc-sanitize.js"

export default {
	name: "LiquiLocHtml",
	props: {
		/** Message key. Named msgKey, not key - "key" is reserved by Vue. */
		msgKey: { type: String, required: true },
		/** Values for {placeholders}. Escaped before they are substituted. */
		params: { type: Object, default: undefined },
		/** Element to render. A span by default so it can sit inline inside a sentence. */
		tag: { type: String, default: "span" },
	},
	computed: {
		html() {
			// $options.i18n of the PARENT, not of this component: the message belongs to whoever wrote
			// the markup. $parent is the component whose template contains this tag.
			const localMessages = this.$parent?.$options?.i18n?.messages
			const escaped = this.params
				? Object.fromEntries(Object.entries(this.params).map(([k, v]) => [k, escapeHtml(v)]))
				: undefined
			return sanitizeHtml(translate(this.msgKey, escaped, localMessages))
		},
	},
	render() {
		// Single root element, so Vue merges $attrs (class, id, ...) onto it automatically.
		return h(this.tag, { innerHTML: this.html })
	},
}
</script>
