<template>
	<div class="poll-card-edit card border-opacity-25" data-poll-status="ELABORATION">

		<!-- Summary. Deliberately the same eyebrow / title / footer as poll-card.vue, so that what you
		     edit here looks like what you will get. Only the title swaps to an input field. -->
		<div class="card-body">
			<div class="poll-eyebrow">
				<div class="poll-pill-group">
					<span class="badge rounded-pill poll-status-pill elaboration-pill">{{ $t('New') }}</span>
				</div>
				<div class="num-proposals">
					<i class="far fa-lightbulb"></i>&nbsp;{{ proposalCount }}
				</div>
			</div>

			<liquido-input
				v-if="titleEditable"
				id="pollTitleInput"
				:model-value="pollTitle"
				:label="$t('pollTitle')"
				:valid-func="isPollTitleValid"
				:invalid-feedback="$t('pollTitleInvalid', {minLen: pollTitleMinLength})"
				:max-length="255"
				@update:model-value="val => $emit('update:pollTitle', val)"
				@blur="$emit('title-blur')"
			/>
			<h2 v-else class="poll-title">{{ pollTitle }}</h2>

			<div class="poll-footer d-flex justify-content-between">
				<span>{{ $tc('numProposals', proposalCount) }}</span>
				<span>{{ $t('awaitingStart') }}</span>
			</div>
		</div>

		<ul class="list-group list-group-flush proposal-list">
			<li
				v-for="(row, index) in rows"
				:key="row.key"
				class="list-group-item proposal-row"
				:data-proposal-id="row.id"
				:data-row-state="row.editing ? 'editing' : 'saved'"
				:class="{editing: row.editing, 'has-error': !!row.error}"
			>
				<!-- The icon circle. While editing it is a button that opens the picker. -->
				<button
					v-if="row.editing"
					:id="'proposalIconButton-' + index"
					type="button"
					class="proposal-icon proposal-icon-button"
					:title="$t('ChooseIcon')"
					@click="openIconPicker(row)"
				>
					<i class="fas fa-fw" :class="'fa-' + row.icon"></i>
				</button>
				<div v-else class="proposal-icon">
					<i class="fas fa-fw" :class="'fa-' + row.icon"></i>
				</div>

				<div class="proposal-body flex-grow-1">
					<!-- ============ editing ============ -->
					<template v-if="row.editing">
						<liquido-input
							:id="'proposalTitleInput-' + index"
							v-model="row.title"
							class="mb-2"
							:label="$t('proposalTitle')"
							:valid-func="isProposalTitleValid"
							:invalid-feedback="$t('titleInvalid', {minChars: titleMinLength})"
							:max-length="500"
						/>

						<div class="description liquido-input">
							<label :for="'proposalDescriptionInput-' + index">{{ $t('proposalDescription') }}</label>
							<textarea
								:id="'proposalDescriptionInput-' + index"
								v-model="row.description"
								class="form-control"
								rows="3"
								:class="descriptionValidClass(row)"
								:placeholder="$t('describeYourProposal')"
								@blur="row.touched = true"
							/>
							<div class="description-char-counter">
								{{ (row.description || '').length }}/{{ descriptionMinLength }}
							</div>
							<div v-if="row.touched && !isDescriptionValid(row)" class="invalid-feedback is-invalid">
								{{ $t('descriptionTooShort') }}
							</div>
						</div>

						<div v-if="row.error" class="row-error" data-qa="proposalRowError" :data-error-code="row.errorCode">
							<i class="fas fa-exclamation-circle"></i>&nbsp;{{ row.error }}
						</div>

						<!-- Nothing to show while creating a poll with only the two required rows, so do
						     not reserve the space for it. -->
						<div v-if="saveMode === 'row' || rows.length > minRows" class="row-actions">
							<!-- In "row" mode each row is saved on its own, because the poll already exists.
							     In "batch" mode the page saves everything at once, so there is nothing here
							     but the option to drop a row again. -->
							<template v-if="saveMode === 'row'">
								<span v-if="row.id" class="cancel-link" @click="cancelRow(row)">{{ $t('Cancel') }}</span>
								<button
									:id="'saveProposalButton-' + index"
									type="button"
									class="btn btn-sm btn-primary ms-auto"
									:disabled="!isRowValid(row) || row.saving"
									@click="$emit('save-row', row)"
								>
									<span v-if="row.saving" class="spinner-border spinner-border-sm" role="status">
										<span class="visually-hidden">{{ $t('Loading') }}</span>
									</span>
									<span v-else>{{ $t('Save') }}</span>
								</button>
							</template>
							<button
								v-else-if="rows.length > minRows"
								:id="'removeProposalButton-' + index"
								type="button"
								class="btn btn-sm btn-link text-secondary ms-auto"
								:title="$t('removeProposal')"
								@click="$emit('remove-row', row)"
							>
								<i class="fas fa-trash-alt"></i>
							</button>
						</div>
					</template>

					<!-- ============ saved, read only ============ -->
					<template v-else>
						<h3 class="proposal-title">{{ row.title }}</h3>
						<div class="proposal-description">{{ row.description }}</div>
						<div class="proposal-subtitle">
							<span class="like-button">
								<i class="far fa-heart"></i>&nbsp;<span class="numLikes">{{ row.numSupporters || 0 }}</span>
							</span>
							<span
								v-if="canEditRow(row)"
								:id="'editProposalButton-' + index"
								class="edit-button"
								:title="$t('editProposal')"
								@click="startEditing(row)"
							>
								<i class="fas fa-pencil-alt"></i>
							</span>
							<span
								v-if="canDeleteRow(row)"
								:id="'deleteProposalButton-' + index"
								class="delete-button"
								:title="$t('deleteProposal')"
								@click="$emit('delete-row', row)"
							>
								<i class="fas fa-trash-alt"></i>
							</span>
							<span class="createdby-user">
								{{ $t('createdBy') }}&nbsp;{{ row.createdBy && row.createdBy.name }}
							</span>
						</div>
					</template>
				</div>
			</li>

			<li v-if="canAddRows" class="list-group-item add-row">
				<button id="addProposalRowButton" type="button" class="btn btn-link" @click="$emit('add-row')">
					<i class="fas fa-plus"></i>&nbsp;{{ $t('addAnotherProposal') }}
				</button>
			</li>
		</ul>

		<!-- Icon picker. Same searchable FontAwesome grid that proposal-add.vue uses. -->
		<popup-modal
			id="iconPickerModal"
			ref="iconPickerModal"
			:title="$t('ChooseIcon')"
			:primary-button-text="$t('Ok')"
		>
			<template #modal-body>
				<div class="d-flex align-items-center mb-3">
					<input
						id="iconSearchInput"
						v-model="iconSearch"
						type="text"
						class="form-control"
						autocomplete="off"
						:placeholder="$t('ChooseIcon')"
					/>
					<div class="chosen-icon">
						<i class="fas fa-fw" :class="'fa-' + (iconPickerRow ? iconPickerRow.icon : 'atom')"></i>
					</div>
				</div>
				<div class="icon-chooser-wrapper">
					<div class="d-flex flex-wrap">
						<span v-for="faIconName in filteredIconList" :key="faIconName" class="icon-in-list">
							<i class="fas fa-fw" :class="getListIconClass(faIconName)" @click="chooseIcon(faIconName)" />
						</span>
						<p v-if="filteredIconList.length === 0" class="text-muted text-center">
							{{ $t('noIconsMatchSearch') }}
						</p>
					</div>
				</div>
			</template>
		</popup-modal>
	</div>
</template>

<script>
/**
 * An editable poll card - poll-card.vue in edit mode.
 *
 * This is deliberately a separate component and not a mode of poll-card.vue: that one pins its
 * proposals to --proposal-height, because its list animations go jumpy without a fixed height.
 * A variable number of proposal rows with input fields cannot live inside that. The summary panel
 * on top however does share --poll-card-height with poll-card.vue - see the <style> block.
 *
 * The component renders and validates. It never talks to the backend - the page above it owns all
 * persistence and passes the permissions in, so the same card serves the admin creating a poll and a
 * member adding one proposal.
 *
 * A row is:
 *   {
 *     key,             // stable client side key for v-for. NOT the proposal id.
 *     id,              // proposal id, or undefined while the row has never been saved
 *     title, description, icon,
 *     createdBy, numSupporters,       // only on rows that came back from the backend
 *     editing,         // true => render input fields, false => render it like poll-card.vue does
 *     touched,         // has the description been blurred? Used to delay the "too short" message
 *     saving, error    // per row feedback while the page persists it
 *   }
 *
 * Rows are mutated in place. They are objects owned by the parent's reactive data, so v-model on
 * row.title reaches the parent - the same pattern Polly-vote.vue uses. Adding or removing a row
 * emits "rows-changed" so the parent can react to the count.
 */
import liquidoInput from "@/components/liquido-input.vue"
import popupModal from "@/components/popup-modal.vue"
import config from "config"
import faSolidIconsFree from "@/styles/fontawesome-solid-icons-free.json"

const DEFAULT_ICON = "atom"
let nextRowKey = 1

/**
 * Build a row for the card. Exported so the page can seed the card before the component exists,
 * and so the row shape is defined in exactly one place. Same pattern as liquido-input.vue's STATE.
 */
export function newRow(fields = {}) {
	return Object.assign({
		key: nextRowKey++,
		id: undefined,
		title: "",
		description: "",
		icon: DEFAULT_ICON,
		editing: true,
		touched: false,
		saving: false,
		error: undefined,
	}, fields)
}

export default {
	i18n: {
		messages: {
			en: {},
			de: {
				// Same wording as poll-card.vue, so the editable card reads like the finished one.
				numProposals: "0 Vorschläge | 1 Vorschlag | {n} Vorschläge",
				awaitingStart: "wird bald gestartet",
				createdBy: "von",

				pollTitle: "Titel der Abstimmung",
				pollTitleInvalid: "Titel ist zu kurz. Bitte mind. {minLen} Zeichen.",

				proposalTitle: "Titel des Vorschlags",
				titleInvalid: "Titel zu kurz: Bitte mindestens {minChars} Zeichen!",
				proposalDescription: "Beschreibung",
				describeYourProposal: "Beschreibe deinen Vorschlag in ein paar Sätzen.",
				descriptionTooShort: "Bitte beschreibe deinen Vorschlag etwas ausführlicher.",

				addAnotherProposal: "Vorschlag hinzufügen",
				removeProposal: "Diesen Vorschlag wieder entfernen",
				editProposal: "Deinen Vorschlag bearbeiten",
				deleteProposal: "Diesen Vorschlag löschen",

				ChooseIcon: "Icon wählen",
				noIconsMatchSearch: "Kein passendes Icon gefunden.",
			},
		},
	},
	name: "PollCardEdit",
	components: { liquidoInput, popupModal },
	props: {
		/** The poll's title. Use v-model:poll-title when titleEditable is true. */
		pollTitle: { type: String, default: "" },
		/** The rows to render. Mutated in place - see the note in the component docs. */
		rows: { type: Array, required: true },
		/** May the title be edited? Only the admin may, and only while the poll is in ELABORATION. */
		titleEditable: { type: Boolean, default: true },
		/** Show the "add another proposal" button? */
		canAddRows: { type: Boolean, default: true },
		/** How many rows must remain. Below this the trash button disappears. */
		minRows: { type: Number, default: 0 },
		/**
		 * "batch" - the page submits everything at once (creating a poll), so rows carry no Save button.
		 * "row"   - the poll already exists, so every row is saved on its own.
		 */
		saveMode: { type: String, default: "batch" },
		/** May this saved row be edited? Defaults to no, because the author check lives in the page. */
		canEditRow: { type: Function, default: () => false },
		/** May this saved row be deleted? */
		canDeleteRow: { type: Function, default: () => false },
	},
	emits: ["update:pollTitle", "title-blur", "save-row", "delete-row", "add-row", "remove-row"],
	data() {
		return {
			pollTitleMinLength: config.pollTitleMinLength || 5,
			titleMinLength: config.proposalTitleMinLength || 3,
			descriptionMinLength: config.proposalDescriptionMinLength || 20,
			iconSearch: "",
			iconPickerRow: undefined,
			faIconList: faSolidIconsFree["fontawesome-solid-icons-free"],
		}
	},
	computed: {
		/**
		 * How many proposals this poll will have. In "batch" mode every row is a proposal waiting to
		 * be created. In "row" mode the poll already exists, and the trailing empty row is just the
		 * affordance to add one - counting it would claim a proposal that is not there.
		 */
		proposalCount() {
			if (this.saveMode === "batch") return this.rows.length
			return this.rows.filter(row => !!row.id).length
		},
		filteredIconList() {
			return this.faIconList.filter(iconName => {
				let regex = new RegExp(this.iconSearch, "i")
				return iconName.match(regex) !== null
			})
		},
	},
	methods: {
		isPollTitleValid(val) {
			return val !== undefined && val !== null && val.trim().length >= this.pollTitleMinLength
		},
		isProposalTitleValid(val) {
			return val !== undefined && val !== null && val.trim().length >= this.titleMinLength
		},
		isDescriptionValid(row) {
			return !!row.description && row.description.trim().length >= this.descriptionMinLength
		},
		isRowValid(row) {
			return this.isProposalTitleValid(row.title) && this.isDescriptionValid(row)
		},
		descriptionValidClass(row) {
			if (!row.touched) return {}   // say nothing until the field has been left once
			return {
				"is-valid": this.isDescriptionValid(row),
				"is-invalid": !this.isDescriptionValid(row),
			}
		},

		/**
		 * Cancel out of an editing row. A row that was already saved snaps back to its stored values;
		 * a row that never existed is simply dropped.
		 */
		cancelRow(row) {
			if (!row.id) {
				this.$emit("remove-row", row)
				return
			}
			row.title = row.savedTitle
			row.description = row.savedDescription
			row.icon = row.savedIcon
			row.editing = false
			row.touched = false
			row.error = undefined
		},
		/** Remember the stored values so Cancel can restore them, then switch the row to inputs. */
		startEditing(row) {
			row.savedTitle = row.title
			row.savedDescription = row.description
			row.savedIcon = row.icon
			row.touched = true       // an already saved proposal is valid, so show its state right away
			row.error = undefined
			row.editing = true
		},

		openIconPicker(row) {
			this.iconPickerRow = row
			this.iconSearch = ""
			this.$refs.iconPickerModal.show()
		},
		chooseIcon(iconName) {
			if (this.iconPickerRow) this.iconPickerRow.icon = iconName
		},
		getListIconClass(iconName) {
			return {
				["fa-" + iconName]: true,
				"selected": this.iconPickerRow && iconName === this.iconPickerRow.icon,
			}
		},
	},
}
</script>

<style scoped>
/* Unlike poll-card.vue this card must GROW: it holds input fields and a variable number of rows.
   So there is deliberately no --proposal-height here, and no max-height transition on the list. */
.poll-card-edit {
	height: auto;
	border-radius: var(--liquido-border-radius);
	border-color: rgba(0, 0, 0, 0.1);
}

/* The summary part on top is the exception: it must look exactly like poll-card.vue, same global
   --poll-card-height, same flex column, so that what you edit here is what you will get. */
.poll-card-edit .card-body {
	padding: var(--unit);
	height: var(--poll-card-height);
	display: flex;
	flex-direction: column;
	justify-content: space-between;
}

.poll-card-edit .poll-title {
	color: var(--text-color);
	font-weight: normal;
	margin: 0;
	padding: 0;
	display: -webkit-box;
	line-clamp: 2;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

/*
 * Bootstrap finishes a card's list-group through `.card > .list-group:first-child` / `:last-child`:
 * it drops the borders the list inherits from the card, and rounds the card's bottom corners.
 * NEITHER selector matches here - the summary .card-body comes first, and the icon-picker modal
 * renders as the card's last child. So we got the inherited 1px borders doubling up (a 2px divider
 * under the summary panel, a stray hairline above the card's own bottom border), and the last row's
 * opaque white background painted square corners over the card's rounded ones. Do it by hand.
 */
.poll-card-edit .proposal-list {
	border-top-width: 0;      /* .proposal-row brings its own 1px divider */
	border-bottom-width: 0;   /* the card's own border already closes the list */
}

/* Round whatever ends up last - the "add proposal" row while creating, else the last proposal.
   overflow: hidden clips the full-width button inside .add-row to the same arc. */
.poll-card-edit .proposal-list > .list-group-item:last-child {
	border-bottom-left-radius: calc(var(--liquido-border-radius) - 1px);
	border-bottom-right-radius: calc(var(--liquido-border-radius) - 1px);
	overflow: hidden;
}

.poll-card-edit .proposal-row {
	display: flex;
	align-items: flex-start;
	gap: 0.75rem;
	padding: var(--unit);
	border: none;
	border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.poll-card-edit .proposal-row.has-error {
	background-color: var(--bs-danger-bg-subtle);
}

.poll-card-edit .proposal-icon {
	flex: 0 0 auto;
	width: 2.5rem;
	height: 2.5rem;
	border-radius: 50%;
	background-color: var(--proposal-icon-bg);
	color: white;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1.4rem;
	padding: 0;
}

/* The icon doubles as the picker button while a row is being edited. */
.poll-card-edit .proposal-icon-button {
	border: 1px solid transparent;
	cursor: pointer;
}

.poll-card-edit .proposal-icon-button:hover {
	border-color: var(--primary);
}

.poll-card-edit .proposal-body {
	display: flex;
	flex-direction: column;
	min-width: 0;   /* let the title's ellipsis work inside the flex row */
}

.poll-card-edit .proposal-title {
	color: var(--primary);
	margin: 0 0 0.5rem 0;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.poll-card-edit .proposal-description {
	font-size: var(--font-size-small);
	color: var(--text-color);
	display: -webkit-box;
	line-clamp: 3;
	-webkit-line-clamp: 3;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.poll-card-edit .proposal-subtitle {
	display: flex;
	align-items: center;
	font-size: var(--font-size-small);
	color: var(--secondary);
	margin-top: 0.5rem;
}

.poll-card-edit .proposal-subtitle .like-button,
.poll-card-edit .proposal-subtitle .edit-button,
.poll-card-edit .proposal-subtitle .delete-button {
	padding: 1px 6px;
	border-radius: 5px;
}

.poll-card-edit .proposal-subtitle .edit-button,
.poll-card-edit .proposal-subtitle .delete-button {
	cursor: pointer;
}

.poll-card-edit .proposal-subtitle .edit-button:hover {
	color: var(--primary);
}

.poll-card-edit .proposal-subtitle .delete-button:hover {
	color: var(--bs-danger);
}

.poll-card-edit .proposal-subtitle .createdby-user {
	margin-left: auto;
}

/* Description textarea, borrowed from proposal-add.vue */
.poll-card-edit .description {
	position: relative;
}

.poll-card-edit .description-char-counter {
	color: grey;
	font-size: 0.8rem;
	position: absolute;
	right: 5px;
	bottom: 3px;
}

.poll-card-edit .row-error {
	color: var(--bs-danger);
	font-size: var(--font-size-small);
	margin-top: 0.5rem;
}

.poll-card-edit .row-actions {
	display: flex;
	align-items: center;
	margin-top: 0.5rem;
	min-height: 2rem;
}

.poll-card-edit .cancel-link {
	color: var(--secondary);
	cursor: pointer;
	text-decoration: underline;
}

.poll-card-edit .add-row {
	border: none;
	border-top: 1px solid rgba(0, 0, 0, 0.08);
	padding: 0;
	text-align: center;
}

.poll-card-edit .add-row .btn {
	width: 100%;
	color: var(--primary);
	text-decoration: none;
	padding: 0.75rem;
}

/* Icon picker inside the modal, borrowed from proposal-add.vue */
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
	cursor: pointer;
}

.icon-in-list .selected {
	color: var(--primary);
	border: 1px solid var(--primary);
	border-radius: 5px;
	padding: 2px;
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
