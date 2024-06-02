<template>
	<div>
		<h2 id="poll-create" class="page-title">
			{{ $t("newPoll") }}
		</h2>

		<polly 
			class="mb-4"
			v-model:isValid="pollIsValid"
			@savePoll="createNewPoll">
		</polly>

		<h3>Einstellungen für diese Abstimmung</h3>
		<form class="mb-4 p-2 user-select-none">
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

		<!-- b-card class="chat-bubble input-bubble mb-4">
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

			<div class="d-flex justify-content-between align-items-center">
				<span class="cancel-link" @click="goBack">{{ $t("Cancel") }}</span>
				<b-button
					id="createPollButton"
					:disabled="createPollButtonDisabled"
					variant="primary"
					class="float-end"
					@click="clickCreateNewPoll()"
				>
					{{ $t("create") }}
					<i class="fas fa-angle-double-right" />
				</b-button>
			</div>
		</b-card -->

		<div class="alert alert-admin create-poll-info mt-5">
			<i class="fas fa-circle-info float-end"></i>
			<p>{{ $t('createPollInfo1') }}</p>
				<ol class='fa-ul'>
					<li><span class='fa-li'><i class='fas fa-comments'></i></span> {{ $t('createPollInfo2') }} {{ $t('createPollInfo3') }}</li>
					<li><span class='fa-li'><i class='fas fa-person-booth'></i></span> {{ $t('createPollInfo4') }}</li>
					<li><span class='fa-li'><i class='fas fa-check-circle'></i></span> {{ $t('createPollInfo5') }}</li>
				</ol>
		</div>
	</div>
</template>

<script>
import config from "config"
import liquidoInput from "@/components/liquido-input.vue"
import polly from '@/components/polly.vue'
import { store } from "@/services/store.js"
import api from "@/services/liquido-graphql-client.js"
import log from "loglevel"

export default {
	i18n: {
		messages: {
			en: {},
			de: {
				newPoll: "Neue Abstimmung anlegen",
				createPollInfo1: "Abstimmungen laufen durch drei Phasen:",
				createPollInfo2: "Eine neue Abstimmung wird erst einmal diskutiert.",
				createPollInfo3: "Du kannst festlegen ob Teammitglieder ihre eigenen Wahlvorschläge hinzufügen können.",
				createPollInfo4: "Wenn du die Wahlphase der Abstimmung startest, kann jeder im Team seine Stimme anonym abgeben.",
				createPollInfo5: "Nachdem du die Wahlphase beendet hast, ist das Wahlergebnis für alle sichtbar.",
				pollTitle: "Titel der Abstimmung",
				pollTitleInvalid: "Titel ist zu kurz. Bitte mind. {minLen} Zeichen.",
				create: "Anlegen",
			},
		},
	},
	name: "CreatePollPage",
	components: { liquidoInput, polly },
	data() {
		return {
			store,
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
	mounted() {
		this.store.setHeaderTitle(this.$t("newPoll"))
		this.store.setHeaderBackLink("/polls")
		this.$root.scrollToTop()
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
