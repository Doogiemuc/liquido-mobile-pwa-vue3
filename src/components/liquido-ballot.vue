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
				<div class="card shadow-sm proposal-panel d-flex flex-row align-items-center user-select-none">
					<div class="rank-circle">{{ index + 1 }}</div>
					<div class="d-flex flex-column text-truncate flex-grow-1">
						<h4 class="proposal-title">{{ proposal.title }}</h4>
						<div class="proposal-subtitle">
							<span v-if="proposal.likedByCurrentUser" class="like-button liked"><i class="fas fa-heart"></i>&nbsp;<span class="numLikes">{{ proposal.numSupporters }}</span></span>
							<span v-else class="like-button"><i class="far fa-heart"></i>&nbsp;<span class="numLikes">{{ proposal.numSupporters }}</span></span>
							<div class="createdby-user">{{ createdByLabel }}&nbsp;{{ proposal?.createdBy?.name }}</div>
						</div>
					</div>
					<div v-if="showDragHandle" class="drag-handle" aria-hidden="true"><i class="fas fa-bars"></i></div>
				</div>
			</template>
		</draggable>
	</div>
</template>

<script>
import draggable from "vuedraggable"

export default {
	name: "LiquidoBallot",
	components: { draggable },
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
	background-color: var(--light-bg);
	border: 1px solid var(--light-border);
	border-radius: var(--liquido-border-radius);
}

.empty-slots-behind {
	position: absolute;
	top: var(--unit);
	bottom: 0;
	left: var(--unit);
	right: var(--unit);
	overflow: hidden;
}

.empty-slot,
.proposal-panel {
	height: 4rem;
	margin-bottom: 0.5rem;
}

.empty-slot {
	border: 1px dashed var(--secondary);
	border-radius: var(--liquido-border-radius);
	background-color: rgba(0, 0, 0, 0.02);
	color: rgba(0, 0, 0, 0.2);
}

.draggable {
	position: relative;
	min-height: calc(2 * (4rem + 0.5rem) + var(--unit));
	padding-bottom: var(--unit);
	z-index: 1;
}

.rank-circle {
	display: flex;
	align-items: center;
	justify-content: center;
	flex: 0 0 auto;
	width: 32px;
	height: 32px;
	margin: 0 0.75rem;
	border-radius: 50%;
	background-color: var(--primary);
	color: white;
}

.proposal-title {
	margin: 0;
	padding: 0;
	color: var(--primary);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.proposal-subtitle {
	display: flex;
	align-items: center;
	justify-content: space-between;
	font-size: 0.8rem;
	color: var(--secondary);
}

.liked {
	color: var(--primary);
}

.drag-handle {
	margin: 0 0.75rem;
	color: var(--secondary);
	opacity: 0.5;
}
</style>
