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

				<!-- Who may put options on the ballot. Off by default: the admin opts in deliberately. -->
				<div class="form-check mt-4">
					<input
						id="membersCanAddProposalsInput"
						v-model="membersCanAddProposals"
						class="form-check-input"
						type="checkbox"
					/>
					<label class="form-check-label" for="membersCanAddProposalsInput">
						{{ $t('membersCanAddProposals') }}
					</label>
					<div class="form-text">{{ $t('membersCanAddProposalsHint') }}</div>
				</div>

			</div>
		</div>

		<div class="alert alert-admin my-5">
			<p>{{ $t('createPollInfo1') }}</p>
			<ol class='fa-ul'>
				<li><span class='fa-li'><i class='fas fa-comments'></i></span> {{ $t('createPollInfo2') }} {{ $t('createPollInfo3') }}</li>
				<li><span class='fa-li'><i class='fas fa-person-booth'></i></span> <span v-html="$t('createPollInfo4')"></span></li>
				<li><span class='fa-li'><i class='fas fa-check-circle'></i></span> {{ $t('createPollInfo5') }}</li>
			</ol>
		</div>

		<liquido-footer>
			<template #primary>
				<button id="createPollButton" type="button" class="btn btn-lg w-100 btn-primary" 
				  :disabled="createPollButtonDisabled"
				  @click="clickCreateNewPoll">
					<span v-if="creating" class="spinner-border spinner-border-sm" role="status">
						<span class="visually-hidden">{{ $t('Loading') }}</span>
					</span>
					<span v-else>
						{{ $t("createPoll") }}
						<i class="fas fa-angle-double-right" />
					</span>
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

				// This info is for the admin, and only shown to him.
				createPollInfo1: "Du bist der Admin dieses Teams.",
				createPollInfo2: "Eine neue Abstimmung wird erst einmal debatiert.",
				createPollInfo3: "Du kannst festlegen ob Teammitglieder eigene Vorschläge hinzufügen dürfen oder nicht.",
				createPollInfo4: "Du, als Admin, startest die Abstimmung. In LIQUIDO stimmt man nicht nur für einen Vorschlag, sondern jeder im Team ordnet alle Vorschläge anonym in seine persönliche Reihenfolge.",
				createPollInfo5: "Wenn du die Abstimmung abschliest, wird der Vorschlag mit der größten Zustimmung durch einen cleveren Algorithmus berechnet.",

				pollTitle: "Titel der Abstimmung",
				pollTitleInvalid: "Titel ist zu kurz. Bitte mind. {minLen} Zeichen.",
				createPoll: "Abstimmung anlegen",

				// Per-poll setting, chosen here and not changeable later.
				membersCanAddProposals: "Teammitglieder dürfen Vorschläge hinzufügen",
				membersCanAddProposalsHint: "Wenn du das nicht aktivierst, legst nur du als Admin fest, worüber abgestimmt wird. Diese Einstellung kann später nicht mehr geändert werden."
			},
		},
	},
	name: "CreatePollPage",
	components: { liquidoInput, liquidoFooter },
	data() {
		return {
			pollTitle: "",
			// Off by default, matching the backend: the admin opts in deliberately.
			membersCanAddProposals: false,
			creating: false,
		}
	},
	computed: {
		createPollButtonDisabled() {
			return this.creating || !this.isPollTitleValid(this.pollTitle)
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
			this.creating = true
			return api.createPoll(this.pollTitle, this.membersCanAddProposals)
				.then(createdPoll => {
					log.info("New poll created", createdPoll)
					this.$router.push({name: "showPoll", params: { pollId: createdPoll.id } })
				})
				.catch(err => {
					console.error("Cannot create poll", err)
					this.$root.showError(this.$t('unexpectedError'), this.$t('Error'))
				})
				.finally(() => {
					this.creating = false
				})
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
