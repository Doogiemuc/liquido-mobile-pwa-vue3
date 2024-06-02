<template>
	<div>
		<h2 id="poll-create" class="page-title">
			{{ $t("newPoll") }}
		</h2>

		<polly class="mb-4"></polly>

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

		<div class="alert alert-admin create-poll-info">
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
		this.store.setHeaderTitle(this.$t("newPoll"))
		this.store.setHeaderBackLink("/polls")
		this.$root.scrollToTop()
	},
	methods: {
		isPollTitleValid(val) {
			return val !== undefined && val !== null && val.trim().length >= config.pollTitleMinLength
		},
		goBack() {
			this.$router.go(-1)
		},
		clickCreateNewPoll() {
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
