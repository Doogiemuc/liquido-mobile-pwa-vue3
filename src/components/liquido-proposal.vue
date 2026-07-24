<template>
	<div class="card shadow-sm proposal-panel d-flex flex-row align-items-center user-select-none">
		<!-- In the ballot a rank number is shown (pass :rank); in the available pool the proposal icon. -->
		<div v-if="rank > 0" class="rank-circle">
			{{ rank }}
		</div>
		<div v-else class="proposal-icon">
			<i class="fas fa-fw" :class="'fa-' + proposal.icon" />
		</div>

		<div class="d-flex flex-column text-truncate flex-grow-1">
			<h4 class="proposal-title">
				{{ proposal.title }}
			</h4>
			<div class="proposal-subtitle">
				<span v-if="proposal.likedByCurrentUser" class="like-button liked">
					<i class="fas fa-heart"></i>&nbsp;<span class="numLikes">{{ proposal.numSupporters }}</span>
				</span>
				<span v-else class="like-button">
					<i class="far fa-heart"></i>&nbsp;<span class="numLikes">{{ proposal.numSupporters }}</span>
				</span>
				<div class="createdby-user">
					{{ createdByLabel }}&nbsp;{{ proposal?.createdBy?.name }}
				</div>
			</div>
		</div>

		<div v-if="showDragHandle" class="drag-handle" aria-hidden="true">
			<i class="fas fa-bars"></i>
		</div>
	</div>
</template>

<script setup>
/**
 * liquido-proposal.vue — a single proposal card ("proposal panel").
 * Rendered in two contexts:
 *   - the available proposals pool (cast-vote.vue) → omit :rank to show the proposal icon
 *   - inside the ballot (liquido-ballot.vue)       → pass :rank (1-based) to show the rank number
 *
 * All styling lives globally in src/styles/liquido.css (shared with liquido-ballot.vue).
 * The "created by" label is supplied by the parent (createdByLabel prop) so this component
 * needs no i18n of its own — handy since vue-i18n's legacy $t is not callable in <script setup>.
 */
defineProps({
	// the proposal to render (id, title, icon, numSupporters, likedByCurrentUser, createdBy…)
	proposal: { type: Object, required: true },
	// 1-based rank in the ballot. When > 0 the rank circle is shown instead of the icon.
	rank: { type: Number, default: 0 },
	// whether to show the drag handle on the right (e.g. hidden for a read-only ballot).
	showDragHandle: { type: Boolean, default: true },
	// label in front of the creator's name, e.g. "von" / "by". Parent supplies the i18n string.
	createdByLabel: { type: String, default: "von" },
})
</script>

<!-- All proposal-panel styles (card, title, subtitle, rank-circle, proposal-icon, liked,
     drag-handle) are defined globally in src/styles/liquido.css and shared with liquido-ballot.vue. -->
