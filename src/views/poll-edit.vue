<template>
	<div>
		<h1 id="poll-edit" class="page-title">
			{{ pageTitle }}
		</h1>

		<div v-if="loadError" class="alert alert-danger" v-html="loadError" />

		<template v-else-if="loaded">
			<poll-card-edit
				ref="pollCard"
				v-model:poll-title="pollTitle"
				class="shadow-sm"
				:rows="rows"
				:title-editable="canEditPollTitle()"
				:can-add-rows="createMode && canAddProposal()"
				:min-rows="createMode ? MIN_PROPOSALS : 0"
				:save-mode="createMode ? 'batch' : 'row'"
				:can-edit-row="canEditProposal"
				:can-delete-row="canDeleteProposal"
				@title-blur="saveTitleIfChanged"
				@save-row="savePersistedRow"
				@delete-row="confirmDeleteRow"
				@add-row="addRow"
				@remove-row="removeRow"
			/>

			<!-- Who may put options on the ballot. Only exists while the poll is being created:
			     the backend fixes this at creation time on purpose. -->
			<div v-if="createMode" class="form-check mt-4">
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

			<!-- Edit mode, and this member is not allowed to add anything. Say so instead of showing
			     an input field that the backend would refuse. -->
			<div v-if="!createMode && !canAddProposal()" id="onlyAdminAddsProposalsInfo" class="alert liquido-info mt-4">
				<p v-html="$t('PollInElaboration_OnlyAdminAddsProposals')" />
			</div>

			<div v-if="submitError" id="submitError" class="alert alert-danger mt-4" :data-error-code="submitErrorCode">
				<p v-html="submitError" />
			</div>

			<div v-if="createMode" class="page-subtitle mt-5">
				<ul class="fa-ul">
					<li class="mb-3"><span class="fa-li"><i class="fas fa-shield-alt"></i></span> {{ $t('votesAreAlwaysAnonymous') }}</li>
					<li class="mb-3"><span class="fa-li"><i class="fas fa-person-booth"></i></span> {{ $t('votesCannotBeChangedOnceCast') }}</li>
				</ul>
			</div>
		</template>

		<liquido-footer>
			<template #primary>
				<button
					v-if="createMode"
					id="createPollButton"
					type="button"
					class="btn btn-primary"
					:disabled="createPollButtonDisabled"
					@click="submitNewPoll"
				>
					<span v-if="saving" class="spinner-border spinner-border-sm" role="status">
						<span class="visually-hidden">{{ $t('Loading') }}</span>
					</span>
					<span v-else>
						{{ createdPollId ? $t('continueSaving') : $t('createPoll') }}
						<i class="fas fa-angle-double-right" />
					</span>
				</button>
				<button v-else id="backToPollButton" type="button" class="btn btn-primary" @click="gotoPoll">
					{{ $t('gotoPoll') }}
					<i class="fas fa-angle-double-right" />
				</button>
			</template>
		</liquido-footer>

		<popup-modal
			id="confirmDeleteModal"
			ref="confirmDeleteModal"
			type="warning"
			:title="$t('deleteProposalTitle')"
			:primary-button-text="$t('Delete')"
			:secondary-button-text="$t('Cancel')"
			@clickPrimary="deleteConfirmedRow"
		>
			<template #modal-body>
				<p>{{ $t('deleteProposalConfirm', {title: rowToDelete ? rowToDelete.title : ''}) }}</p>
			</template>
		</popup-modal>
	</div>
</template>

<script>
/**
 * Create a poll and its proposals on ONE page - and then keep editing it, on the same page.
 *
 * Two routes, one component, the same way proposal-add.vue serves add and edit:
 *
 *   /polls/new              createMode - no poll exists yet. Everything is local until the admin
 *                           presses the button once, then createPoll + one addProposal per row.
 *   /polls/:pollId/edit     the poll exists, so every change is its own mutation.
 *
 * A poll is editable ONLY while it is in ELABORATION. Once the admin starts it the ballot is frozen,
 * and this page redirects to poll-show.vue, which is already the right read-only view.
 *
 * Who may do what (mirrors PollService exactly - the backend refuses anything else):
 *
 *   edit the poll title   admin only
 *   add a proposal        admin always, members only when poll.membersCanAddProposals
 *   edit a proposal       its author only - the admin has NO override here
 *   delete a proposal     admin only, any proposal
 */
import pollCardEdit, { newRow } from "@/components/poll-card-edit.vue"
import liquidoFooter from "@/components/liquido-footer.vue"
import popupModal from "@/components/popup-modal.vue"
import config from "config"
import api from "@/services/liquido-graphql-client.js"
import log from "loglevel"

/** A poll needs two alternatives to be a choice at all. PollService.startVotingPhase enforces it. */
const MIN_PROPOSALS = 2

export default {
	i18n: {
		messages: {
			en: {},
			de: {
				createNewPoll: "Neue Abstimmung anlegen",
				editPoll: "Abstimmung bearbeiten",
				createPoll: "Abstimmung anlegen",
				continueSaving: "Weiter",
				gotoPoll: "Zur Abstimmung",

				// Per-poll setting, chosen here and not changeable later.
				membersCanAddProposals: "Teammitglieder dürfen Vorschläge hinzufügen",
				membersCanAddProposalsHint: "Wenn du das nicht aktivierst, legst nur du als Admin fest, worüber abgestimmt wird. Diese Einstellung kann später nicht mehr geändert werden.",
				PollInElaboration_OnlyAdminAddsProposals: "In dieser Abstimmung legt nur euer Admin die Vorschläge fest.",

				votesAreAlwaysAnonymous: "Abstimmungen sind immer anonym.",
				votesCannotBeChangedOnceCast: "Nachdem eine Stimme einmal abgegeben wurde, kann sie nicht mehr geändert werden.",

				deleteProposalTitle: "Vorschlag löschen",
				deleteProposalConfirm: "Soll der Vorschlag \"{title}\" wirklich gelöscht werden? Das kann nicht rückgängig gemacht werden.",

				cannotFindPoll: "<h4>Fehler</h4><hr/><p>Diese Abstimmung konnte nicht gefunden werden.</p>",
				pollCreatedButProposalFailed: "Die Abstimmung wurde angelegt, aber nicht alle Vorschläge konnten gespeichert werden. Bitte korrigiere den markierten Vorschlag und klicke dann auf \"Weiter\".",
				proposalSaveError: "Dieser Vorschlag konnte nicht gespeichert werden.",
				titleSaveError: "Der Titel konnte nicht gespeichert werden.",
				deleteError: "Der Vorschlag konnte nicht gelöscht werden.",
			},
		},
	},
	name: "PollEditPage",
	components: { pollCardEdit, liquidoFooter, popupModal },
	props: {
		// Only present on the "editPoll" route. Its presence is what selects edit mode.
		pollId: { type: String, required: false, default: undefined },
	},
	data() {
		return {
			MIN_PROPOSALS,
			poll: undefined,
			pollTitle: "",
			rows: [],
			membersCanAddProposals: false,
			// Set as soon as createPoll succeeded. Keeps a partially saved poll recoverable.
			createdPollId: undefined,
			// The title as the backend currently holds it, to tell a real rename from a no-op blur.
			savedPollTitle: undefined,
			saving: false,
			loaded: false,
			loadError: undefined,
			submitError: undefined,
			// The backend's LiquidoException code behind submitError. Rendered as a data attribute so
			// tests (and support) can tell WHICH failure this is without reading the translated text.
			submitErrorCode: undefined,
			rowToDelete: undefined,
		}
	},
	computed: {
		createMode() {
			return !this.pollId
		},
		pageTitle() {
			return this.createMode ? this.$t("createNewPoll") : this.$t("editPoll")
		},
		isElaboration() {
			return this.createMode || (this.poll && this.poll.status === "ELABORATION")
		},
		/**
		 * The poll these mutations act on. In edit mode that is the loaded poll; in create mode it
		 * only exists once createPoll has succeeded, which is the partial-failure state where the
		 * already saved rows become editable/deletable.
		 */
		mutationPollId() {
			return this.poll ? this.poll.id : this.createdPollId
		},
		createPollButtonDisabled() {
			if (this.saving) return true
			if (!this.isPollTitleValid(this.pollTitle)) return true
			if (this.rows.length < MIN_PROPOSALS) return true
			return !this.rows.every(row => this.rowIsValid(row))
		},
	},
	/**
	 * Decide BEFORE mounting whether this poll may be edited at all.
	 *
	 * The status check has to happen here rather than in created(): redirecting out of a promise
	 * after the component is already mounted leaves this view on screen on top of a half-finished
	 * page transition, and the user ends up looking at an empty page.
	 */
	beforeRouteEnter(to, from, next) {
		if (!to.params.pollId) {
			// /polls/new - nothing to load, but only the admin may create a poll. The backend refuses
			// createPoll for anybody else, so without this a member could fill the whole form in and
			// only find out when they press the button. polls.vue simply does not link here for them.
			//
			// Safe to decide synchronously: the global router guard awaits tryToAuthenticate(), and
			// api.isAuthenticated() requires both the cached team and the cached user, so isAdmin()
			// is never answering from a half-populated cache here.
			if (!api.isAdmin()) {
				log.info("Only the admin may create a poll. Redirecting to the list of polls.")
				return next({name: "polls", replace: true})
			}
			return next()
		}
		api.getPollById(to.params.pollId, true)
			.then(poll => {
				// The ballot is frozen once voting starts. poll-show.vue is already the right view.
				if (poll.status !== "ELABORATION") {
					next({name: "showPoll", params: {pollId: to.params.pollId}, replace: true})
				} else {
					next(vm => {
						vm.applyPoll(poll)
						vm.loaded = true
						vm.openRequestedRow()
					})
				}
			})
			.catch(err => {
				log.error("Cannot load poll(id=" + to.params.pollId + ")", err)
				next(vm => { vm.loadError = vm.$t("cannotFindPoll") })
			})
	},
	created() {
		if (this.createMode) {
			// A poll needs at least two alternatives, so start with two empty rows rather than making
			// the admin discover that rule later.
			this.rows = [newRow(), newRow()]
			this.loaded = true
		}
		this.$store.setHeaderTitle(this.pageTitle)
		if (!this.$store.headerBackTarget) {
			this.$store.setHeaderBackTarget(this.createMode ? {name: "polls"} : {name: "showPoll", params: {pollId: this.pollId}})
		}
	},
	mounted() {
		this.$root.scrollToTop()
	},
	methods: {
		/** The page owns the rows array. The card only edits what is inside a row. */
		addRow() {
			this.rows.push(newRow())
		},
		removeRow(row) {
			let index = this.rows.findIndex(r => r.key === row.key)
			if (index >= 0) this.rows.splice(index, 1)
		},

		/**
		 * These three read api.isAdmin(), which looks at two plain caches - nothing reactive. As
		 * computed properties they would latch whatever they saw on the very first render and never
		 * re-evaluate, so a cold cache at that moment would stick as "not an admin" for good. As
		 * methods they are recomputed on every render instead.
		 */
		userIsAdmin() {
			return api.isAdmin()
		},
		/**
		 * Only the admin may rename a poll, and only while it has not started.
		 *
		 * While CREATING one there is no poll yet and nothing to be admin of: the title is the first
		 * thing you type, and the backend already restricts createPoll to admins. Hiding the field
		 * here just leaves an empty card.
		 */
		canEditPollTitle() {
			if (this.createMode) return true
			return this.isElaboration && this.userIsAdmin()
		},
		/** The admin may always add. Members only when the admin opened this poll up. */
		canAddProposal() {
			if (!this.isElaboration) return false
			if (this.createMode) return true
			return this.userIsAdmin() || !!this.poll.membersCanAddProposals
		},

		isPollTitleValid(val) {
			return val !== undefined && val !== null && val.trim().length >= (config.pollTitleMinLength || 5)
		},
		rowIsValid(row) {
			let titleOk = !!row.title && row.title.trim().length >= (config.proposalTitleMinLength || 3)
			let descOk = !!row.description && row.description.trim().length >= (config.proposalDescriptionMinLength || 20)
			return titleOk && descOk
		},

		/**
		 * You may edit your OWN proposal. Deliberately no admin override - same rule as the backend.
		 *
		 * Never while creating: there the card is in "batch" mode, so an opened row would have no Save
		 * button, and submitNewPoll skips rows that already have an id. The edit would be silently
		 * lost. Rows saved during a partial failure are editable on the edit page afterwards.
		 */
		canEditProposal(row) {
			if (this.createMode || !this.isElaboration || !row.id) return false
			let currentUser = api.getCachedUser() || {}
			return !!row.createdBy && String(row.createdBy.id) === String(currentUser.id)
		},
		/** The admin may take any proposal off the ballot, but may not rewrite it. */
		canDeleteProposal(row) {
			return this.isElaboration && this.userIsAdmin() && !!row.id
		},

		// ==================== edit mode ====================

		/** Turn a poll from the backend into the card's rows, plus one empty row to add to it. */
		applyPoll(poll) {
			this.poll = poll
			this.pollTitle = poll.title
			this.savedPollTitle = poll.title
			let sorted = (poll.proposals || []).toSorted((p1, p2) => p1.createdAt.localeCompare(p2.createdAt))
			this.rows = sorted.map(prop => newRow({
				id: prop.id,
				title: prop.title,
				description: prop.description,
				icon: prop.icon || "atom",
				createdBy: prop.createdBy,
				numSupporters: prop.numSupporters,
				editing: false,
			}))
			if (this.canAddProposal()) this.rows.push(newRow())
		},

		/**
		 * poll-show.vue's pencil links here as ?edit=<proposalId>. Open that row straight away, so
		 * clicking the pencil lands you in the field rather than on a page you have to click again.
		 *
		 * Called once, on entering the page - NOT from applyPoll(). applyPoll runs again after every
		 * save, and re-reading the query there reopened the row the user had just saved, which also
		 * made it look like the poll had lost a proposal. Consuming the parameter (replacing the URL
		 * without it) keeps a later reload honest too: the row is open because you opened it, not
		 * because the address bar still says so.
		 */
		openRequestedRow() {
			const editId = this.$route.query.edit
			if (!editId) return
			const row = this.rows.find(r => String(r.id) === String(editId))
			if (row && this.canEditProposal(row)) this.startEditingRow(row)
			let query = Object.assign({}, this.$route.query)
			delete query.edit
			this.$router.replace({ query })
		},

		/** Same as the card's own pencil handler - see poll-card-edit.vue startEditing(). */
		startEditingRow(row) {
			row.savedTitle = row.title
			row.savedDescription = row.description
			row.savedIcon = row.icon
			row.touched = true
			row.error = undefined
			row.editing = true
		},

		// ==================== create mode: one submit ====================

		/**
		 * Create the poll, then add every row to it.
		 *
		 * Sequential on purpose: the backend refuses two proposals with the same title in one poll,
		 * and addProposal writes the updated poll into pollsCache on every call.
		 *
		 * The interesting case is a partial failure. Once createPoll succeeded the poll really exists,
		 * so we must not strand the admin: keep createdPollId, mark the rows that did make it, and let
		 * the button turn into "Weiter" which retries only what is left.
		 */
		async submitNewPoll() {
			this.saving = true
			this.submitError = undefined
			this.submitErrorCode = undefined
			this.rows.forEach(row => { row.error = undefined; row.errorCode = undefined })
			try {
				if (!this.createdPollId) {
					let created = await api.createPoll(this.pollTitle, this.membersCanAddProposals)
					this.createdPollId = created.id
					this.savedPollTitle = created.title
					log.info("New poll created", created)
				}
				for (const row of this.rows) {
					if (row.id) continue   // already saved by an earlier attempt
					row.saving = true
					try {
						let poll = await api.addProposal(this.createdPollId, row.title, row.description, row.icon)
						let saved = (poll.proposals || []).find(p => p.title === row.title)
						row.id = saved ? saved.id : undefined
						// Carry the server's view over, or the row renders as "von " with no author.
						row.createdBy = saved ? saved.createdBy : undefined
						row.numSupporters = saved ? saved.numSupporters : 0
						row.editing = false
					} finally {
						row.saving = false
					}
				}
				this.$router.push({name: "showPoll", params: {pollId: this.createdPollId}})
			} catch (err) {
				log.error("Cannot create poll with its proposals", err)
				let errorCode = err?.liquidoException?.liquidoErrorCode
				let failed = this.rows.find(row => !row.id)
				if (failed) {
					failed.error = this.$t("proposalSaveError")
					failed.errorCode = errorCode
				}
				this.submitErrorCode = errorCode
				this.submitError = this.createdPollId
					? this.$t("pollCreatedButProposalFailed")
					: this.$t("unexpectedError")
			} finally {
				this.saving = false
			}
		},

		// ==================== edit mode: one mutation per change ====================

		/**
		 * Save the title when the field is left. Only once the poll actually exists - while creating
		 * one it stays local until the submit. It does exist after a partial failure, though, and a
		 * rename typed there would otherwise be dropped on the retry.
		 */
		saveTitleIfChanged() {
			let pollId = this.mutationPollId
			if (!pollId) return
			let title = (this.pollTitle || "").trim()
			if (title === this.savedPollTitle || !this.isPollTitleValid(title)) return
			return api.updatePoll(pollId, title)
				.then(poll => {
					if (this.poll) this.poll = poll
					this.pollTitle = poll.title
					this.savedPollTitle = poll.title
				})
				.catch(err => {
					log.error("Cannot rename poll(id=" + pollId + ")", err)
					this.pollTitle = this.savedPollTitle   // put the stored title back
					this.$root.showError(this.$t("titleSaveError"), this.$t("Error"))
				})
		},

		/** Save one row: a new proposal when it has no id yet, otherwise an edit of your own. */
		savePersistedRow(row) {
			row.saving = true
			row.error = undefined
			let save = row.id
				? api.updateProposal(this.mutationPollId, row.id, row.title, row.description, row.icon)
				: api.addProposal(this.mutationPollId, row.title, row.description, row.icon)
			return save
				.then(poll => {
					this.applyPoll(poll)
				})
				.catch(err => {
					log.error("Cannot save proposal in poll(id=" + this.mutationPollId + ")", err)
					row.error = this.$t("proposalSaveError")
					row.errorCode = err?.liquidoException?.liquidoErrorCode
					this.redirectIfPollStarted()
				})
				.finally(() => {
					row.saving = false
				})
		},

		confirmDeleteRow(row) {
			this.rowToDelete = row
			this.$refs.confirmDeleteModal.show()
		},

		deleteConfirmedRow() {
			let row = this.rowToDelete
			this.rowToDelete = undefined
			if (!row || !row.id) return
			return api.deleteProposal(this.mutationPollId, row.id)
				.then(poll => {
					// In create mode the other rows are still unsaved drafts, so only drop this one.
					// Rebuilding from the poll would throw the rest of the admin's typing away.
					if (this.createMode) this.removeRow(row)
					else this.applyPoll(poll)
				})
				.catch(err => {
					log.error("Cannot delete proposal(id=" + row.id + ")", err)
					this.$root.showError(this.$t("deleteError"), this.$t("Error"))
					this.redirectIfPollStarted()
				})
		},

		/**
		 * A mutation can fail simply because the admin started the poll in another tab. Reload, and
		 * hand over to poll-show.vue when that is what happened.
		 */
		redirectIfPollStarted() {
			if (this.createMode) return Promise.resolve()   // a poll being created cannot have started
			return api.getPollById(this.pollId, true)
				.then(poll => {
					if (poll.status !== "ELABORATION") {
						this.$router.replace({name: "showPoll", params: {pollId: this.pollId}})
					}
				})
				.catch(() => { /* the original error was already reported */ })
		},

		gotoPoll() {
			this.$router.push({name: "showPoll", params: {pollId: this.pollId}})
		},
	},
}
</script>
