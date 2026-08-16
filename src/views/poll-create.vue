<template>
	<div>
		<h1 id="poll-create" class="page-title">
			{{ $t("createNewPoll") }}
		</h1>

		<div class="card">
			<div class="card-body">
				<div class="flex-grow-1 d-flex flex-column justify-content-between">

					<!-- similar to poll panel -->
					<div class="poll-eyebrow">
						<div class="poll-pill-group">
							<span class="badge rounded-pill text-bg-primary">{{ $t('New') }}</span>
						</div>
						<div class="num-proposals"><i class="far fa-lightbulb"></i>&nbsp;0</div>
					</div>

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
		</div>

		<div class="alert alert-admin my-5">
			<p>{{ $t('createPollInfo1') }}</p>
			<ol class='fa-ul'>
				<li class="mb-3"><span class='fa-li'><i class='fas fa-comments'></i></span> {{ $t('createPollInfo2') }} {{ $t('createPollInfo3') }}</li>
				<li class="mb-3"><span class='fa-li'><i class='fas fa-person-booth'></i></span> <span v-html="$t('createPollInfo4')"></span></li>
				<li class="mb-3"><span class='fa-li'><i class='fas fa-check-circle'></i></span> {{ $t('createPollInfo5') }}</li>
			</ol>
		</div>

		<div class="page-subtitle mt-5">
			<ul class='fa-ul'>
				<li class="mb-3"><span class='fa-li'><i class='fas fa-shield-alt'></i></span> {{ $t('votesAreAlwaysAnonymous') }}</li>
				<li class="mb-3"><span class='fa-li'><i class='fas fa-person-booth'></i></span>{{ $t('votesCannotBeChangedOnceCast') }} </li>
			</ul>
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
				createNewPoll: "Neue Abstimmung anlegen",

				// This info is for the admin, and only shown to him.
				createPollInfo1: "Du bist der Admin dieses Teams.",
				createPollInfo2: "Eine neue Abstimmung wird erst einmal debatiert.",
				createPollInfo3: "Du kannst festlegen ob Teammitglieder eigene Vorschläge hinzufügen dürfen oder nicht.",
				createPollInfo4: "Du, als Admin, startest die Abstimmung. In <span class='liquido'></span> stimmt man nicht nur für einen Vorschlag, sondern jeder im Team ordnet alle Vorschläge anonym in seine persönliche Reihenfolge.",
				createPollInfo5: "Wenn du die Abstimmung abschliest, wird der Vorschlag mit der größten Zustimmung durch einen cleveren Algorithmus berechnet.",

				pollTitle: "Titel der Abstimmung",
				pollRuntime: "Laufzeit der Abstimmung",
				days: "Tage",
				allowTeamMembersToAddProposals: "Teammitglieder können eigene Vorschläge hinzufügen",

				newlyCreatedPoll: "Neue Abstimmung",
				pollTitleInvalid: "Titel ist zu kurz. Bitte mind. {minLen} Zeichen.",
				// Per-poll setting, chosen here and not changeable later.
				membersCanAddProposals: "Teammitglieder dürfen Vorschläge hinzufügen",
				membersCanAddProposalsHint: "Wenn du das nicht aktivierst, legst nur du als Admin fest, worüber abgestimmt wird. Diese Einstellung kann später nicht mehr geändert werden.",
				createPoll: "Abstimmung anlegen",
				votesAreAlwaysAnonymous: "Abstimmungen sind immer anonym.",
				votesCannotBeChangedOnceCast: "Nachdem eine Stimme einmal abgegeben wurde, kann sie nicht mehr geändert werden.",
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
			pollRuntimeInDays: config.pollDefaultRuntimeDays || 7,
			allowAddProposals: false,
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

		/** Create a new poll with the given title and runtime */
		clickCreateNewPoll() {
			this.creating = true
			let pollStartDate = new Date()
			pollStartDate.setHours(0, 0, 0, 0) // start of today
			let pollEndDate = new Date(pollStartDate)
			pollEndDate.setDate(pollEndDate.getDate() + this.pollRuntimeInDays)
			pollEndDate.setHours(23, 59, 59, 999) // end of last day
			return api.createPoll(this.pollTitle, pollStartDate, pollEndDate, this.membersCanAddProposals)
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

.poll-eyebrow {
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
	width: 100%;
	font-size: var(--font-size-small);
}

.poll-pill-group {
	display: flex;
	align-items: center;
	gap: 0.35rem;
	min-width: 0;
}

.poll-runtime-days {
	width: 3rem;
	margin-left: 1rem;
	margin-right: 0.5rem;
}

.poll-footer {
	margin-top: var(--unit);
	color: var(--secondary);
	font-size: 0.8rem; /* needs to be smaller than our standard  var(---font-size-small);  0.9rem */
	color: var(--secondary);
}

.poll-progress-bar {
	width: 100%;
	height: 4px;
	margin-top: 0.25rem;
	background-color: #eee;
	z-index: 100;
	border-radius: 999px;
	
	.poll-progress-bar-inner {
		width: 80%;
		height: 4px;
		background-color: var(--state-voting);
		z-index: 101;
		border-radius: 999px;
	}
}
</style>


