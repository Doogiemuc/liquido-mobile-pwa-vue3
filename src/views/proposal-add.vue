<template>
	<div>
		<h2 id="addProposalTitle" class="page-title">
			{{ pageTitle }}
		</h2>

		<div class="card shadow-sm mb-5">
			<div class="card-body">
				<div class="card-title">
					{{ editMode ? $t("yourProposalEdit") : $t("yourProposal") }}
				</div>
				<liquido-input
					id="propTitle"
					ref="propTitle"
					v-model="proposal.title"
					name="propTitle"
					class="mb-3"
					:label="$t('title')"
					:valid-func="isProposalTitleValid"
					:invalid-feedback="$t('titleInvalid', {minChars: titleMinLength})"
					:max-length="500"
				/>

				<div class="description liquido-input mb-3">
					<label>
						{{ $t('proposalDescription') }}
					</label>
					<textarea
						id="propDescription"
						v-model="proposal.description"
						:class="descriptionValidClass"
						:placeholder="$t('describeYourProposal')"
						name="description"
						class="form-control"
						rows="3"
						@blur="validateDescription(true)"
						@keyup="validateDescription()"
					/>
					<div class="description-char-counter">
						{{ descriptionCharCounter }}
					</div>
					<div v-if="!descriptionState" class="invalid-feedback is-invalid">
						{{ $t("descriptionTooShort") }}
					</div>
				</div>
				
				<div class="d-flex mb-3">
					<div class="flex-fill">
						<liquido-input
							id="iconSearch"
							v-model="iconSearch"
							name="iconSearch"
							:placeholder="chosenIcon"
							:label="$t('ChooseIcon')"
							:max-length="100"
							:valid-func="isIconSearchValid"
							autocomplete="off"
							@blur="iconSearch=''"
						/>
					</div>
					<div class="chosen-icon">
						<i class="fas fa-fw" :class="'fa-' + chosenIcon" />
					</div>
				</div>				
			
				<div class="icon-chooser-wrapper mb-3">
					<div class="d-flex flex-wrap">
						<span v-for="faIconName in filteredIconList" :key="faIconName" class="icon-in-list">
							<i class="fas fa-fw" :class="getListIconClass(faIconName)" @click="chooseIcon(faIconName)" />
						</span>
						<p v-if="filteredIconList.length === 0" class="text-muted text-center">
							{{ $t('noIconsMatchSearch') }}
						</p>
					</div>
				</div>
			
				<div class="d-flex justify-content-between align-items-center">
					<span class="cancel-link" @click="goBack">{{ $t("Cancel") }}</span>
					<button
						id="saveProposalButton"
						:disabled="saveButtonDisabled"
						type="button"
						class="btn btn-primary"
						@click="saveProposal()"
					>
						{{ $t("Save") }}
					</button>
				</div>
			</div>
		</div>

		<div v-if="poll && poll.proposals && poll.proposals.length > 0">
			<p class="">{{ editMode ? $t('proposalsInPoll') : $t('previousProposalsInPoll') }}</p>
			<poll-card
				:poll="poll"
				:showArrowRight="false"
				:proposalsExpanded="true"
			/>
		</div>
		<div v-else class="alert mb-3">
			{{ $t('noProposalYet') }}
		</div>

		<liquido-footer>
			<template #primary>
				<button type="button" class="btn btn-primary" :disabled="saveButtonDisabled" @click="saveProposal">
					{{ $t("saveProposal") }}
				</button>
			</template>
		</liquido-footer>
	</div>
</template>

<script>

import pollCard from "@/components/poll-card.vue"
import liquidoInput from "@/components/liquido-input.vue"
import liquidoFooter from "../components/liquido-footer.vue"
import config from "config"
import api from "@/services/liquido-graphql-client.js"
import EventBus from "@/services/event-bus.js"
import faSolidIconsFree from "@/styles/fontawesome-solid-icons-free.json"  // List of free fontawesome icon names

export default {
	i18n: {
		messages: {
			en: {},
			de: {
				addProposal: "Vorschlag hinzufügen",
				editProposal: "Vorschlag bearbeiten",
				yourProposal: "Dein neuer Vorschlag",
				yourProposalEdit: "Dein Vorschlag",
				saveProposal: "Vorschlag speichern",
				title: "Titel",
				titleInvalid: "Titel zu kurz: Bitte mindestens {minChars} Zeichen!",
				proposalDescription: "Beschreibung",
				describeYourProposal: "Beschreibe deinen Vorschlag in ein paar Sätzen.",
				descriptionInfo: "(Mindestes {minChars} Zeichen)",
				descriptionTooShort: "Bitte beschreibe deinen Vorschlag etwas ausführlicher.",
				ChooseIcon: "Icon Wählen",
				noIconsMatchSearch: "Kein passendes Icon gefunden.",
				noProposalYet: "Dein Vorschlag ist der erste in dieser Abstimmung.",
				previousProposalsInPoll: "Bisherige Vorschläge in dieser Abstimmung:",
				proposalsInPoll: "Vorschläge in dieser Abstimmung:",
				createdSuccessfully: "Ok, dein Vorschlag wurde zur Abstimmung mit aufgenommen.",
				proposalAddError: "Es gab einen Fehler beim Hinzufügen deines Vorschlages.",
				updatedSuccessfully: "Ok, dein Vorschlag wurde geändert.",
				proposalUpdateError: "Es gab einen Fehler beim Ändern deines Vorschlages. Vielleicht wurde die Abstimmung inzwischen gestartet?",
				cannotFindProposal: "Dieser Vorschlag konnte nicht gefunden werden.",
				gotoPoll: "Zur Abstimmung",
			},
		},
	},
	components: { pollCard, liquidoInput, liquidoFooter },
	props: {
		pollId: { type: String, required: true },
		// Present only on the "editProposal" route. Then this page edits that existing proposal
		// instead of creating a new one. See router.js
		proposalId: { type: String, required: false, default: undefined },
	},
	data() {
		return {
			poll: {},
			proposal: {},
			titleMinLength: config.proposalTitleMinLength || 3,
			descriptionValidated: false,
			descriptionMinLength: config.proposalDescriptionMinLength || 10,
			descriptionState: null,
			iconSearch: "",
			chosenIcon: "atom",
			faIconList: faSolidIconsFree["fontawesome-solid-icons-free"],
		}
	},
	computed: {
		/** This page has two modes: add a new proposal, or edit one of your own. */
		editMode() {
			return !!this.proposalId
		},
		pageTitle() {
			return this.editMode ? this.$t("editProposal") : this.$t("addProposal")
		},
		descriptionCharCounter() {
			if (this.proposal.description) {
				return this.proposal.description.length + "/" + this.descriptionMinLength
			} else {
				return "0/"+this.descriptionMinLength
			}
		},		
		descriptionValidClass() {
			return {
				"is-valid": this.descriptionState === true,
				"is-invalid": this.descriptionState === false,
			} // status === null will set no class at all
		},
		filteredIconList() {
			return this.faIconList.filter(iconName => {
				let regex = new RegExp(this.iconSearch, "i")
				//console.log(iconName, this.iconSearch, "=>", iconName.match(regex))
				return iconName.match(regex) !== null  // case insensitive match
			})
		},
		saveButtonDisabled() {
			return !this.isProposalTitleValid(this.proposal.title) || !this.descriptionState
		},
	},
	created() {
		api.getPollById(this.pollId, true).then(poll => {
			this.poll = poll
			if (this.editMode) this.prefillFromExistingProposal()
		})
		this.$store.setHeaderTitle(this.pageTitle)
		this.$store.setHeaderBackTarget({name: "showPoll", params: {pollId: this.pollId} })
	},
	mounted() {
		this.$root.scrollToTop()
	},
	methods: {
		/** Proposal title must have a minimum length */
		isProposalTitleValid(val) {
			return val !== undefined && val !== null && val.trim().length >= this.titleMinLength
		},

		/** Make searach input field red, when search result is empty */
		isIconSearchValid() {
			return this.filteredIconList.length > 0
		},

		/** validate description. Only set to invalid, and show error message, if it description been valid before. */
		validateDescription(force = false) {
			if (this.proposal.description &&	this.proposal.description.trim().length >= this.descriptionMinLength) {
				this.descriptionState = true
			} else {
				if(force || this.descriptionState !== null ) this.descriptionState = false
			}
		},

		/** List of icons, selected one is emphasized */
		getListIconClass(iconName) {
			return { 
				["fa-" + iconName] : true, 
				"selected": iconName === this.chosenIcon
			}
		},

		/** 
		 * When user clicks on an icon it is selected as the chosen icon.
		 * The searchString is *not* altered here. So user can select other similar icons that match the search.
		 */
		chooseIcon(iconName) {
			this.chosenIcon = iconName
		},

		/**
		 * In edit mode: copy the existing proposal into the form.
		 * The proposal is looked up inside *this* poll - the backend does the same, and it also
		 * checks that you are its author. Here we only need enough to render the form.
		 */
		prefillFromExistingProposal() {
			let prop = (this.poll.proposals || []).find(p => String(p.id) === String(this.proposalId))
			if (!prop) {
				console.error("Cannot find proposal(id=" + this.proposalId + ") in poll(id=" + this.pollId + ")")
				this.$root.showError(this.$t('cannotFindProposal'), "")
				return
			}
			this.proposal = { title: prop.title, description: prop.description }
			this.chosenIcon = prop.icon || this.chosenIcon
			// The loaded description is already valid, so mark it valid right away.
			// Otherwise the save button stays disabled until the user touches the textarea.
			this.descriptionState = true
		},

		/** Save the proposal: create a new one, or update your own existing one. */
		saveProposal() {
			let save = this.editMode
				? api.updateProposal(this.poll.id, this.proposalId, this.proposal.title, this.proposal.description, this.chosenIcon)
				: api.addProposal(this.poll.id, this.proposal.title, this.proposal.description, this.chosenIcon)
			return save
				.then(() => {// Set up one-time listener before showing the modal
					EventBus.once(EventBus.Event.ROOT_POPUP_CLICK_PRIMARY, this.gotoPoll)
					this.$root.showSuccess(this.$t(this.editMode ? 'updatedSuccessfully' : 'createdSuccessfully'), "", this.$t('gotoPoll'))
				})
				.catch(err => {
					console.error(this.editMode ? "Cannot update proposal" : "Cannot add proposal", err)
					this.$root.showError(this.$t(this.editMode ? 'proposalUpdateError' : 'proposalAddError'), "")
				})
		},

		/** Called on successfull save. */
		gotoPoll() {
			this.$router.push({ name: "showPoll", params: { pollId: this.pollId } })
		},
		
		goBack() {
			this.$router.go(-1)
		},
	}

}
</script>

<style>


.invalid-feedback {
	margin-top: 0;
}

.description {
	position: relative;
}
.description-char-counter {
	color: grey;
	font-size: 0.8rem;
	position: absolute;
	right: 5px;
	bottom: 3px;
}

.icon-chooser-wrapper {
	overflow: hidden;
	overflow-y: scroll;
	max-height: 200px;
	border: 2px inset #EEE;
	border-radius: 5px;
}

.icon-in-list {
	color: var(--secondary);
	font-size: 1.5em;
	padding: 1px;
	.selected {
		color: var(--primary);
		border: 1px solid var(--primary);
		border-radius: 5px;
		padding: 2px;
	}
}
.chosen-icon {
	font-size: 2em;
	color: var(--primary);
	background-color: white;
	border: 1px solid #ced4da;
	border-radius: 0.25rem;
	padding: 0 0.25rem;
	margin-left: 0.5rem;
}

</style>
