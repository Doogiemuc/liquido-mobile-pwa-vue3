<template>
	<div
		ref="cardRef"
		class="cvp-card card shadow-sm d-flex flex-row align-items-center user-select-none"
		:class="{
			'is-dragging': isDragging,
			'drop-before': isDragOver && isDragOver.top,
			'drop-after': isDragOver && isDragOver.bottom,
		}"
	>
		<!-- Ballot rows show the rank number, pool cards show the proposal icon. -->
		<div v-if="variant === 'ballot'" class="rank-circle">{{ rank }}</div>
		<div v-else class="proposal-icon">
			<i class="fas fa-fw" :class="'fa-' + (proposal.icon || 'lightbulb')" />
		</div>

		<div class="d-flex flex-column text-truncate flex-grow-1">
			<h4 class="cvp-title">{{ proposal.title }}</h4>
			<div class="cvp-subtitle">
				<span :class="{ supported: proposal.likedByCurrentUser }" class="d-inline">
					<i
						class="fa-thumbs-up"
						:class="{ far: !proposal.likedByCurrentUser, fas: proposal.likedByCurrentUser }"
					/>
					&nbsp;<span class="numLikes">{{ proposal.numSupporters }}</span>
				</span>
				<i class="far fa-user ms-2" />&nbsp;{{ proposal.createdBy && proposal.createdBy.name }}
			</div>
		</div>

		<!-- Remove (X) only on the ballot. Grip handle is a visual affordance (whole card drags). -->
		<button
			v-if="variant === 'ballot'"
			type="button"
			class="cvp-remove btn btn-link"
			:aria-label="removeLabel"
			@pointerdown.stop
			@click.stop="$emit('remove', proposal)"
		>
			<i class="fas fa-times" />
		</button>
		<div class="drag-handle" aria-hidden="true"><i class="fas fa-bars" /></div>
	</div>
</template>

<script setup>
import { ref, computed } from "vue"
import { makeDraggable } from "@vue-dnd-kit/core"

/**
 * A single draggable proposal card, used both in the ballot (ranked) and in the pool.
 * Wraps @vue-dnd-kit/core's makeDraggable — this must be its own component because a
 * composable cannot be called inside a parent's v-for loop.
 */
const props = defineProps({
	proposal: { type: Object, required: true },
	index: { type: Number, required: true },
	items: { type: Array, required: true }, // the source list this card belongs to
	variant: { type: String, default: "pool" }, // 'ballot' | 'pool'
	rank: { type: Number, default: 0 },
	disabled: { type: Boolean, default: false },
	removeLabel: { type: String, default: "Entfernen" },
})

defineEmits(["remove"])

const cardRef = ref(null)

// payload () => [index, items] lets the library's suggestSort() know this card's
// position and source array (identity-compared in the parent's drop handler).
const { isDragging, isDragOver } = makeDraggable(
	cardRef,
	{
		groups: ["proposals"],
		disabled: computed(() => props.disabled),
		// Start dragging after a small movement (mirrors the React PointerSensor distance of 4px).
		// The card sets `touch-action: none` in CSS so touch drags aren't treated as passive — this
		// fixes the "Unable to preventDefault inside passive event listener" intervention.
		activation: { distance: 4 },
	},
	() => [props.index, props.items]
)
</script>

<style scoped>
.cvp-card {
	position: relative;
	height: 4rem;
	margin-bottom: 0.5rem;
	padding: 0;
	border-radius: var(--liquido-border-radius);
	background: white;
	cursor: grab;
	overflow: hidden;
	/* Required by @vue-dnd-kit so touch drags aren't treated as passive (allows preventDefault).
	   Trade-off: disables touch-scroll while a finger rests on a card. For drag-from-handle-only
	   behaviour (keeps long lists scrollable) move this to .drag-handle and add dragHandle:'.drag-handle'. */
	touch-action: none;
	transition: box-shadow 0.12s ease, opacity 0.12s ease;
}

.cvp-card:active {
	cursor: grabbing;
}

/* Source element is dimmed while its clone floats in the drag overlay (like the React source). */
.cvp-card.is-dragging {
	opacity: 0.35;
}

/* Placement indicator: where the item would be inserted relative to this card. */
.cvp-card.drop-before {
	box-shadow: inset 0 3px 0 0 var(--primary);
}
.cvp-card.drop-after {
	box-shadow: inset 0 -3px 0 0 var(--primary);
}

.rank-circle {
	--rank-circle-size: 32px;
	flex: 0 0 auto;
	display: flex;
	align-items: center;
	justify-content: center;
	margin: 0 0.75rem;
	width: var(--rank-circle-size);
	height: var(--rank-circle-size);
	border-radius: 50%;
	background-color: var(--primary);
	color: white;
	font-size: 1rem;
	font-weight: bold;
	line-height: 1;
}

.proposal-icon {
	--proposal-icon-size: 32px;
	flex: 0 0 auto;
	margin: 0 0.75rem;
	width: var(--proposal-icon-size);
	height: var(--proposal-icon-size);
	line-height: var(--proposal-icon-size);
	border-radius: 50%;
	text-align: center;
	color: white;
	background-color: var(--proposal-icon-bg);
}

.cvp-title {
	color: var(--primary);
	margin-bottom: 0.4rem;
	padding: 0;
	font-size: 0.8rem !important;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cvp-subtitle {
	font-size: 10px;
	color: #bbb;
	margin-bottom: 0;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cvp-subtitle .supported {
	color: green;
}

.cvp-remove {
	flex: 0 0 auto;
	padding: 0.25rem 0.5rem;
	color: var(--secondary);
	text-decoration: none;
}
.cvp-remove:hover {
	color: var(--bs-danger, #dc3545);
}

.drag-handle {
	flex: 0 0 auto;
	padding-right: 0.75rem;
	opacity: 0.3;
}
</style>
