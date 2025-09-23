<template>
	<div>
		<h1 id="polly-create" class="page-title">
			{{ $t("newPolly") }}
		</h1>

		<polly 
			class="mb-4"
			:poll="poll">
		</polly>

		<!-- 
		<h3>Einstellungen für diese Abstimmung</h3>
		<form class="mb-4 p-2">
			<div class="form-check">
				<input type="checkbox" class="form-check-input" id="allowAddProposal" checked>
				<label class="form-check-label" for="allowAddProposal">Teammitglieder können weitere Vorschläge hinzufügen.</label>
			</div>
			<div class="form-check">
				<input type="checkbox" class="form-check-input" id="allowChangeVote" checked>
				<label class="form-check-label" for="allowChangeVote">Eine einmal abgegebene Stimme kann noch geändert werden, solange die Abstimmung noch nicht geschlossen ist.</label>
			</div>
			<div class="text-end mt-3">
				<button @click="savePoll" :disabled="!pollIsValid" type="button" class="btn btn-primary btn-lg">
					<i class="far fa-floppy-disk"></i>&nbsp;&nbsp;{{ $t('Save') }}
				</button>
			</div>
		</form>
		-->

		<div class="alert alert-admin create-poll-info mt-5">
			<p>{{ $t('createPollInfo1') }}</p>
				<ol class='fa-ul'>
					<li><span class='fa-li'><i class='fas fa-comments'></i></span> {{ $t('createPollInfo2') }} {{ $t('createPollInfo3') }}</li>
					<li><span class='fa-li'><i class='fas fa-person-booth'></i></span> <span v-html="$t('createPollInfo4')"></span></li>
					<li><span class='fa-li'><i class='fas fa-check-circle'></i></span> {{ $t('createPollInfo5') }}</li>
				</ol>
		</div>
	</div>
</template>

<script>
import config from "config"
import liquidoInput from "@/components/liquido-input.vue"
import polly from '@/components/polly.vue'
import api from "@/services/liquido-graphql-client.js"
import log from "loglevel"

export default {
	i18n: {
		messages: {
			en: {},
			de: {
				newPolly: "Neues Polly",
				createPollInfo1: "Abstimmungen laufen durch drei Phasen:",
				createPollInfo2: "Eine neue Abstimmung wird erst einmal debatiert.",
				createPollInfo3: "Du kannst festlegen ob Teammitglieder eigene Wahlvorschläge hinzufügen dürfen.",
				createPollInfo4: "Als Admin startest du die Abstimmung. In LIQUIDO stimmt man nicht nur für <em>einen</em> Vorschlag, " +
				  "sondern jeder im Team ordnet <em>alle</em> Vorschläge anonym in seine persönliche Reihenfolge.",
				// Oder für Schulkinder :-)  "In LIQUIDO sucht man sich nicht nur einen Vorschlag aus, sondern jeder ordnet alle Vorschläge heimlich so, wie er sie am liebsten hat."
				createPollInfo5: "Wenn du die Wahlphase abschliest, wird das Wahlergebnis mit einem cleveren Algorithmus berechnet.",
				pollTitle: "Titel der Abstimmung",
				pollTitleInvalid: "Titel ist zu kurz. Bitte mind. {minLen} Zeichen.",
				create: "Erstellen",
			},
		},
	},
	name: "CreatePollPage",
	components: { liquidoInput, polly },
	data() {
		return {
			poll: undefined,
			pollTitle: "",
			pollIsValid: false,
		}
	},
	computed: {
		createPollButtonDisabled() {
			return !this.isPollTitleValid(this.pollTitle)
		},
		pollTitleInvalidFeedback() {
			return this.$t("pollTitleInvalid", {minLen: config.pollTitleMinLength})
		},
	},
	created() {
		this.poll = {
			title: "Dummy Title for Testing",
			proposals: [
				{ id: Date.now(), title: "Some Title" },
				{ id: Date.now(), title: "Some Other Title which is very long to test this" },
			],
			//status: "NEW",  // discussion, voting, closed
			//createdBy: undefined,
			//createdAt: new Date().toISOString(),
			//updatedAt: new Date().toISOString(),
		}
	},
	mounted() {
		this.$store.setHeaderTitle(this.$t("newPoll"))
		this.$store.setHeaderBackLink("/polls")
		this.$root.scrollToTop()
		document.getElementById("pollTitle")?.focus()
		
	},
	methods: {
		proposalHasTitle(index) {
			return this.poll.proposals[index] &&
				this.poll.proposals[index].title &&
				this.poll.proposals[index].title.trim().length > 0
		},
		pollIsValidUpdate(params) {
			console.log("pollIsValidUpdate", params)
		},
		isPollTitleValid(val) {
			return val !== undefined && val !== null && val.trim().length >= config.pollTitleMinLength
		},
		goBack() {
			this.$router.go(-1)
		},
		createNewPoll() {
			return api.createPoll(this.pollTitle)
				.then(createdPoll => {
					log.info("New poll created", createdPoll)
					this.$router.push("/polls/" + createdPoll.id)
				})
				.catch(err => console.warn("Error", err))
		},
	},
}
</script>

<style lang="scss">
.cancel-link {
	font-size: 12px;
	//margin-left: 10px;
	color: $secondary;
	cursor: pointer;
}
.create-poll-info li {
	margin-bottom: 1rem;
}
</style>
