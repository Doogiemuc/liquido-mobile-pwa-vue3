<template>
	<div>
		<liquido-header ref="liquido-header"></liquido-header>
		<h1 id="poll-create" class="page-title">
			{{ $t("newPoll") }}
		</h1>

		<div class="card chat-bubble">
			<div class="card-body">
				
				<liquido-input
					id="pollTitleInput"
					v-model="pollTitle"
					class="mb-3"
					:label="$t('pollTitle')"
					:valid-func="isPollTitleValid"
					:invalid-feedback="pollTitleInvalidFeedback"
					@blur="pollTitleValidated = true"
				>
				</liquido-input>

				<div class="d-flex justify-content-between align-items-center mt-4 mb-2">
					<a class="cancel-link " @click="clickCancelOrBack">{{ $t("Cancel") }}</a>
					<button
						id="createPollButton"
						:disabled="createPollButtonDisabled"
						variant="primary"
						class="btn btn-primary"
						@click="clickCreateNewPoll()"
					>
						{{ $t("createPoll") }}
						<i class="fas fa-angle-double-right" />
					</button>
				</div>
			</div>
		</div>

		<div class="alert alert-admin my-5">
			<div v-html="$t('createPollInfo')" />
		</div>
	</div>
</template>

<script>
import config from "config"
import liquidoInput from "@/components/liquido-input.vue"
import liquidoHeader from "@/components/liquido-header.vue"
import api from "@/services/liquido-graphql-client.js"
import log from "loglevel"

export default {
	i18n: {
		messages: {
			en: {},
			de: {
				newPoll: "Neue Abstimmung anlegen",
				//TODO: Improve Translation: Nicht "Wahlphase", sondern einfach nur "Abstimmung starten"  ?
				createPollInfo:
					"<p>Nur du als Admin kannst neue Abstimmungen erstellen. Abstimmung laufen durch drei Phasen:</p>"+
					"<p>(1) Eine Abstimmung wird erst einmal diskutiert (<i class='fas fa-comments'></i>). Jeder aus deinem Team "+
					"kann in dieser Phase seinen eigenen Vorschlag (<i class='fas fa-vote-yea'></i>) hinzufügen.</p>" +
					"<p>(2) Wenn du die Wahlphase der Abstimmung startest, kann jeder im Team seine Stimme anonym abgeben. (<i class='fas fa-person-booth'></i>)</p>" +
					"<p>(3) Erst nachdem du die Wahlphase beendet hast, ist das Wahlergebnis für alle sichtbar.",
				pollTitle: "Titel der Abstimmung",
				pollTitleInvalid: "Titel ist zu kurz. Bitte mind. {minLen} Zeichen.",
				createPoll: "Abstimmung anlegen",
			},
		},
	},
	name: "CreatePollPage",
	components: { liquidoInput, liquidoHeader },
	data() {
		return {
			pollTitle: "",
		}
	},
	computed: {
		createPollButtonDisabled() {
			return !this.isPollTitleValid(this.pollTitle)
		},
		pollTitleInvalidFeedback() {
			return this.$t("pollTitleInvalid", {minLen: config.pollTitleMinLength})
		}
	},
	mounted() {
		this.$store.setHeaderTitle(this.$t("newPoll"))
		// we normally go back to polls page, except when headerBackTarget was already set from welcome-chat.vue
		console.log("poll-create mounted, headerBackTarget:", this.$store.headerBackTarget)
		if (!this.$store.headerBackTarget) {
			this.$store.setHeaderBackTarget({name: "polls"}) 
		}
		this.$root.scrollToTop()
	},
	methods: {
		isPollTitleValid(val) {
			return val !== undefined && val !== null && val.trim().length >= config.pollTitleMinLength
		},
		
		/** 
		 * Go back to list of polls. 
		 * Keep in mind that user might come directly from welcome-chat.vue
		 */
		clickCancelOrBack() {
			this.$root.gotoPolls()
		},

		/** Create a new poll with the given title */
		clickCreateNewPoll() {
			return api.createPoll(this.pollTitle)
				.then(createdPoll => {
					log.info("New poll created", createdPoll)
					this.$router.push({name: "showPoll", params: { pollId: createdPoll.id } })
				})
				//TODO: error handling for createPoll: show global popup error message
				.catch(err => console.warn("Cannot create poll", err))
		},
	},
}
</script>

<style lang="scss">

</style>
