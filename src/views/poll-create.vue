<template>
	<div>
		<h1 id="poll-create" class="page-title">
			{{ $t("newPoll") }}
		</h1>

		<b-card class="chat-bubble">
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
				<a class="cancel-link " @click="goBack">{{ $t("Cancel") }}</a>
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
		</b-card>

		<div class="alert alert-admin my-5">
			<div v-html="$t('createPollInfo')" />
		</div>
	</div>
</template>

<script>
import config from "config"
import liquidoInput from "@/components/liquido-input.vue"
import { store } from "@/services/store.js"
import api from "@/services/liquido-graphql-client.js"
import log from "loglevel"

export default {
	i18n: {
		messages: {
			en: {},
			de: {
				newPoll: "Neue Abstimmung anlegen",
				createPollInfo:
					"<p>Nur du als Admin kannst neue Abstimmungen erstellen. Abstimmung laufen durch drei Phasen:</p>"+
					"<p>(1) Eine Abstimmung wird erst einmal diskutiert (<i class='fas fa-comments'></i>). Jeder aus deinem Team "+
					"kann in dieser Phase seinen eigenen Wahlvorschlag (<i class='fas fa-vote-yea'></i>) hinzufügen.</p>" +
					"<p>(2) Wenn du die Wahlphase der Abstimmung startest, kann jeder im Team seine Stimme anonym abgeben. (<i class='fas fa-person-booth'></i>)</p>" +
					"<p>(3) Erst nachdem du die Wahlphase beendet hast, ist das Wahlergebnis für alle sichtbar.",
				pollTitle: "Titel der Abstimmung",
				pollTitleInvalid: "Titel ist zu kurz. Bitte mind. {minLen} Zeichen.",
				create: "Anlegen",
			},
		},
	},
	name: "CreatePollPage",
	components: { liquidoInput },
	data() {
		return {
			store,
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

</style>
