<template>
	<div>
		<h1 id="poll-create" class="page-title">
			{{ $t("newPoll") }}
		</h1>

		<div class="card">
			<div class="card-body">
				<span class="badge rounded-pill poll-status-pill elaboration-pill">{{ $t('New') }}</span>

				<liquido-input
					id="pollTitleInput"
					v-model="pollTitle"
					class="mt-2"
					:label="$t('pollTitle')"
					:valid-func="isPollTitleValid"
					:invalid-feedback="pollTitleInvalidFeedback"
					@blur="pollTitleValidated = true"
				>
				</liquido-input>
				
			</div>
		</div>

		<div class="alert alert-admin my-5">
			<div v-html="$t('createPollInfo')" />
		</div>

		<liquido-footer>
			<template #primary>
				<button type="button" class="btn btn-primary" 
				  :disabled="createPollButtonDisabled"
				  @click="clickCreateNewPoll">
					{{ $t("createPoll") }}
					<i class="fas fa-angle-double-right" />
				</button>
			</template>
		</liquido-footer>
	</div>
</template>

<script>
import config from "config"
import liquidoInput from "@/components/liquido-input.vue"
import liquidoFooter from "@/components/liquido-footer.vue"
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
					"<p><span class='liquido'></span> Abstimmung laufen durch drei Phasen:</p>"+
					"<p>(1) <i class='fas fa-comments'></i> Eine Abstimmung wird erst einmal diskutiert. Jeder aus deinem Team "+
					"kann in dieser Phase seinen eigenen Vorschlag hinzufügen.</p>" +
					"<p>(2) <i class='fas fa-person-booth'></i> Sobald die Abstimmung startet kann jeder im Team seine Stimme anonym abgeben.</p>" +
					"<p>(3) Nachdem die Abstimmung beendet wurde, ist das Wahlergebnis für alle sichtbar.",
				pollTitle: "Titel der Abstimmung",
				pollTitleInvalid: "Titel ist zu kurz. Bitte mind. {minLen} Zeichen.",
				createPoll: "Abstimmung anlegen"
			},
		},
	},
	name: "CreatePollPage",
	components: { liquidoInput, liquidoFooter },
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

<style>
.poll-footer {
	margin-top: var(--unit);
	font-size: 0.7rem;
	color: var(--secondary);
}
</style>
