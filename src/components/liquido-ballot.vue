<template>
	<div class="card the-ballot" :class="{ 'ballot-drag-over': isDraggingOver }">
		<div class="card-body pb-0">
			<div class="ballot-header">
				<h2 class="ballot-title mt-0">{{ $t('yourBallot') }}</h2>
				<p class="page-subtitle ">{{ $t('castVoteSubtitle') }}</p>
			</div>

			<!-- The empty slots are positioned absolutely behind the draggable. This wrapper is their
				positioning context, so that they stay aligned with the draggable below the optional header. -->
			<div class="ballot-slots">
				<div v-if="showEmptySlots" class="empty-slots-behind">
					<div v-for="index in proposalCount" :key="`empty-${index}`" class="empty-slot d-flex flex-row align-items-center user-select-none" aria-hidden="true">
						<div class="proposal-icon">{{ index }}</div>
						<div class="d-flex"><p class="mb-0">{{ index === 1 ? $t('favoriteDropTargetInfo') : $t('emptySlotNumber', { n: index }) }}</p></div>
					</div>
				</div>

				<draggable
					:id="draggableId"
					v-model="ballot"
					class="draggable ballot-draggable"
					group="proposals"
					item-key="id"
					animation="500"
					swap-threshold="0.60"
					:move="move"
					@end="$emit('drag-end')"
					:disabled="!interactive || disabled"
					:can-scroll-x="false"
				>
					<template #item="{ element: proposal, index }">
						<liquido-proposal
							:proposal="proposal"
							:rank="index + 1"
							:show-drag-handle="showDragHandle"
							:created-by-label="$t('createdBy')"
						/>
					</template>
				</draggable>
			</div>

			<!-- div v-if="showEmptySlots" class="proposals-counter">
				{{ proposals?.length }}/{{ proposalCount }}
			</div -->
		</div>
	</div>
</template>

<script>
import draggable from "vuedraggable"
import liquidoProposal from "@/components/liquido-proposal.vue"

export default {
	name: "LiquidoBallot",
	i18n: {
		messages: {
			en: {
				yourBallot: "Your ballot",
				castVoteSubtitle: "Drag the proposals into the slots.",
				favoriteDropTargetInfo: "Slot 1 - your favorite proposal",
				emptySlotNumber: "Slot {n} - empty",
				createdBy: "by",
			},
			de: {
				yourBallot: "Dein Stimmzettel",
				castVoteSubtitle: "Sortiere die Vorschläge in die Slots.",
				favoriteDropTargetInfo: "Slot 1 - dein Lieblingsvorschlag",
				emptySlotNumber: "Slot {n} - leer",
				createdBy: "von",
			},
		},
	},
	components: { draggable, liquidoProposal },
	props: {
		proposals: { type: Array, required: true },
		proposalCount: { type: Number, default: 0 },
		showEmptySlots: { type: Boolean, default: false },
		interactive: { type: Boolean, default: false },
		disabled: { type: Boolean, default: false },
		showDragHandle: { type: Boolean, default: true },
		isDraggingOver: { type: Boolean, default: false },
		move: { type: Function, default: undefined },
		draggableId: { type: String, default: undefined },
	},
	emits: ["update:proposals", "drag-end"],
	computed: {
		ballot: {
			get() { return this.proposals },
			set(proposals) { this.$emit("update:proposals", proposals) },
		},
	},
}
</script>

<style scoped>

.the-ballot {
	position: relative;
}

.ballot-header {
	text-align: center;
}

.ballot-title {
	font-weight: 800;
}


.proposals-counter {
	font-size: var(--font-size-small);
	color: rgba(0, 0, 0, 0.2);
	text-align: right;
	position: absolute;
	right: var(--unit);
	bottom: 0;
}

/* Positioning context for .empty-slots-behind. Its height comes from the draggable alone,
   so the ballot still grows with the number of proposals dropped into it. */
.ballot-slots {
	position: relative;
}

.empty-slots-behind {
	position: absolute;
	inset: 0;
	overflow: hidden;
	z-index: 0;
}

/* Empty placeholder slot in the ballot: a proposal panel with no content yet.
   Dimmed and dashed, styled to read on the bluish --ballot-bg. */
.empty-slot {
	/** --cast-vote-proposal-height is defined in parent component cast-vote.vue */
	height: var(--cast-vote-proposal-height, 4rem);
	margin-bottom: var(--cast-vote-proposal-margin-bottom, 0.5rem);
	padding: 0 var(--half);
	border: 1px dashed var(--secondary);
	border-radius: var(--liquido-border-radius);
	background-color: rgba(0, 0, 0, 0.02); /* just a tiny little bit darker */
	color: var(--secondary);

	.proposal-icon {
		border: 1px solid var(--tertiary);
		background-color: transparent;
		color: var(--secondary);
	}
}

.ballot-draggable {
	position: relative;
	min-height: calc(2 * (4rem + 0.5rem) + var(--two));
	padding-bottom: var(--unit);
	z-index: 1;
}

/* The proposal-panel, proposal-icon, proposal-title, proposal-subtitle, liked and drag-handle
	styles are defined globally in src/styles/liquido.css and shared with liquido-proposal.vue.
	Empty-slot styling is local to this component because empty slots are only rendered here. */
</style>
