<template>
	<div>
		<h1 id="pollyPageTitle" class="page-title">
			{{ pageTitle }}
		</h1>

		<polly-vote :public-id="publicId" />
	</div>
</template>

<script>
/**
 * The page around a Polly - the simple, fun, cute little sibling of a LIQUIDO poll.
 *
 * One page serves both polly routes, because polly-vote.vue already switches on the polly's
 * state. The routes differ only in what they hand in:
 *
 *   /polly            -> no publicId, so an empty polly to write
 *   /polly/:publicId  -> the one shared link. Whoever opens it is identified by their passkey,
 *                        so the creator sees the admin buttons and everyone else gets a ballot.
 *                        There is no separate admin link and nothing secret in the URL.
 *
 * NO configuration. Only defaults!
 */
import { defineComponent } from 'vue'
import pollyVote from '@/components/polly-vote.vue'

export default defineComponent({
	name: "PollyPage",
	i18n: {
		messages: {
			"en": {
				"Polly": "Polly",
				"NewPolly": "New Polly",
			},
			"de": {
				"Polly": "Polly",
				"NewPolly": "Neues Polly",
			}
		}
	},
	components: { pollyVote },
	props: {
		/** Set for the share link. Undefined when writing a new polly. */
		publicId: { type: String, required: false, default: undefined },
	},
	computed: {
		pageTitle() {
			return this.publicId ? this.$t("Polly") : this.$t("NewPolly")
		},
	},
	watch: {
		pageTitle() {
			this.$store.setHeaderTitle(this.pageTitle)
		}
	},
	mounted() {
		this.$store.setHeaderTitle(this.pageTitle)
		this.$root.scrollToTop()
	},
})
</script>
