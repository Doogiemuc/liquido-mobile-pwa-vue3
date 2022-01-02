<template>
	<div>
		<h2 id="addProposalTitle" class="page-title">
			{{ $t("addProposal") }}
		</h2>

		<div v-if="!poll.proposals || poll.proposals.length == 0" class="alert liquido-info mb-3">
			<i class="fas fa-info-circle float-end" />
			<p v-html="$t('noProposalYet', {pollTitle: poll.title})" />
		</div>

		<div v-if="poll && poll.proposals && poll.proposals.length > 0">
			<poll-panel
				:poll="poll"
				:collapse="true"
				:read-only="true"
				class="shadow-sm mb-3"
			/>
		</div>

		<div class="card input-bubble shadow-sm mb-3">
			<div class="card-header">
				{{ $t("yourProposal") }}
			</div>
			<div class="card-body">
				<liquido-input
					id="propTitle"
					v-model="proposal.title"
					name="propTitle"
					class="mb-3"
					:label="$t('title')"
					:valid-func="isProposalTitleValid"
					:invalid-feedback="$t('titleInvalid', {minChars: titleMinLength})"
					:maxlength="500"
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
				
				<div class="d-flex">
					<div class="flex-fill">
						<liquido-input
							id="iconSearch"
							v-model="iconSearch"
							name="iconSearch"
							:placeholder="chosenIcon"
							:label="$t('ChooseIcon')"
							:maxlength="100"
							:valid-func="isIconSearchValid"
							autocomplete="off"
							@blur="iconSearch=''"
						/>
					</div>
					<div class="chosen-icon">
						<i class="fas fa-fw" :class="'fa-' + chosenIcon" />
					</div>
				</div>				
			</div>
			<ul class="list-group list-group-flush icon-list">
				<li class="list-group-item">
					<span v-for="faIconName in filteredIconList" :key="faIconName" class="icon-in-list">
						<i class="fas fa-fw" :class="getListIconClass(faIconName)" @click="chooseIcon(faIconName)" />
					</span>
					<p v-if="filteredIconList.length === 0" class="text-muted text-center">
						{{ $t('noIconsMatchSearch') }}
					</p>
				</li>
			</ul>
			<div class="card-body">
				<div class="d-flex justify-content-between align-items-end">
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

		<popup-modal
			id="proposalSuccessfullyAddedModal"
			ref="proposalSuccessfullyAddedModal"
			type="success"
			:message="$t('createdSuccessfully')"
		>
			<template #modal-footer>
				<button id="modalPrimaryButton" type="button" class="btn btn-primary flex-grow-1" data-dismiss="modal" @click="gotoPoll">
					{{ $t('gotoPoll') }}
					<i class="fas fa-angle-double-right" />
				</button>
			</template>
		</popup-modal>
		
		<popup-modal 
			id="proposalAddErrorModal"
			ref="proposalAddErrorModal"
			type="error"
			:message="$t('proposalAddError')"
		/>
	</div>
</template>

<script>
import pollPanel from "../components/poll-panel"
import liquidoInput from "../components/liquido-input"
import popupModal from "@/components/popup-modal"
import api from "@/services/liquido-graphql-client"
import faSolidIconsFree from "@/styles/fontawesome-solid-icons-free.json"  // List of free fontawesome icon names

export default {
	i18n: {
		messages: {
			en: {},
			de: {
				addProposal: "Vorschlag zur Abstimmung hinzufügen",
				yourProposal: "Dein neuer Vorschlag",
				title: "Titel",
				titleInvalid: "Titel zu kurz: Bitte mindestens {minChars} Zeichen!",
				proposalDescription: "Beschreibung",
				describeYourProposal: "Beschreibe deinen Wahlvorschlag in wenigen Sätzen.",
				descriptionInfo: "(Mindestes {minChars} Zeichen)",
				descriptionTooShort: "Bitte beschreibe deinen Vorschlag etwas ausführlicher.",
				ChooseIcon: "Icon Wählen",
				noIconsMatchSearch: "Kein passendes Icon gefunden.",
				noProposalYet: "Die Abstimmung '{pollTitle}' enthält bisher noch keine Wahlvorschläge. Dein Vorschlag wird der Erste sein.",
				createdSuccessfully: "Ok, dein Vorschlag wurde zur Abstimmung mit aufgenommen.",
				proposalAddError: "Es gab einen Fehler beim Hinzufügen deines Vorschlages.",
				gotoPoll: "Zur Abstimmung",
			},
		},
	},
	components: { pollPanel, liquidoInput, popupModal },
	props: {
		pollId: { type: String, required: true },
	},
	data() {
		return {
			poll: {},
			proposal: {},
			titleMinLength: 10,
			descriptionValidated: false,
			descriptionMinLength: 20,
			descriptionState: null,
			iconSearch: "",
			chosenIcon: "atom",
			faIconList: faSolidIconsFree["fontawesome-solid-icons-free"],
		}
	},
	computed: {
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
		api.getPollById(this.pollId, true).then(poll => this.poll = poll)
	},
	mounted() {	},
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

		/** Save newly added proposal in backend. */
		saveProposal() {
			api.addProposal(this.poll.id, this.proposal.title, this.proposal.description, this.iconName)
				.then(() => this.$refs["proposalSuccessfullyAddedModal"].show())
				.catch(err => {
					console.error("Cannot add proposal", err)
					this.$refs["proposalAddErrorModal"].show()
				})
		},

		/** Called on successfull save. */
		gotoPoll() {
			this.$router.push("/polls/" + this.poll.id)
		},
		
		goBack() {
			this.$router.go(-1)
		},
	}

}
</script>

<style lang="scss">
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

.icon-chooser {
	text-align: center;
	width: 3em;
}
.icon-for-proposal {
	font-size: 1.5em;
}
.icon-list {
	max-height: 200px;
	overflow-y: scroll;
	.list-group-item {
		padding: 10px;
		background-color: $input-bg;
	}
}
.icon-in-list {
	color: #666;
	font-size: 1.5em;
	padding: 0 3px;
	.selected {
		color: $primary;
	}
}
.chosen-icon {
	font-size: 2em;
	color: $primary;
	background-color: white;
	background-color: #fff;
	border: 1px solid #ced4da;
	border-radius: 0.25rem;
	padding: 0 0.25rem;
	margin-left: 0.5rem;
}

.cancel-link {
	font-size: 12px;
	color: $secondary;
	cursor: pointer;
}
</style>
