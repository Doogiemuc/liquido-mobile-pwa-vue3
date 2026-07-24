<template>
	<div class="the-ballot" :class="{ 'ballot-drag-over': isDraggingOver }">
		<div v-if="showEmptySlots" class="empty-slots-behind">
			<div v-for="index in proposalCount" :key="`empty-${index}`" class="empty-slot d-flex flex-row align-items-center user-select-none" aria-hidden="true">
				<div class="rank-circle">{{ index }}</div>
				<div class="d-flex"><p class="mb-0">{{ emptySlotTitle(index - 1) }}</p></div>
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
					:created-by-label="createdByLabel"
				/>
			</template>
		</draggable>

		<div v-if="showEmptySlots" class="proposals-counter">
			{{ proposals?.length }}/{{ proposalCount }}
		</div>
	</div>
</template>

<script>
import draggable from "vuedraggable"
import liquidoProposal from "@/components/liquido-proposal.vue"

export default {
	name: "LiquidoBallot",
	components: { draggable, liquidoProposal },
	props: {
		proposals: { type: Array, required: true },
		proposalCount: { type: Number, default: 0 },
		showEmptySlots: { type: Boolean, default: false },
		emptySlotTitle: { type: Function, default: () => "" },
		createdByLabel: { type: String, default: "von" },
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
	padding: var(--unit) var(--unit) 0;
	background-color: var(--ballot-bg);
	border: 1px solid var(--ballot-border);
	border-radius: var(--liquido-border-radius);
}

.proposals-counter {
	font-size: var(--font-size-small);
	color: rgba(0, 0, 0, 0.2);
	text-align: right;
	position: absolute;
	right: var(--unit);
	bottom: 0;
}

.empty-slots-behind {
	position: absolute;
	top: var(--unit);
	bottom: 0;
	left: var(--unit);
	right: var(--unit);
	overflow: hidden;
}

.draggable {
	position: relative;
	min-height: calc(2 * (4rem + 0.5rem) + var(--unit));
	padding-bottom: var(--unit);
	z-index: 1;
}

/* The proposal-panel, empty-slot, rank-circle, proposal-title, proposal-subtitle, liked and
   drag-handle styles are defined globally in src/styles/liquido.css and shared with liquido-proposal.vue. */
</style>
