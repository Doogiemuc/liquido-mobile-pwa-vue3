<template>
	<div class="card shadow-sm proposal-panel d-flex flex-row align-items-center user-select-none">
		<!-- In the ballot a rank number is shown (pass :rank); in the available pool the proposal icon. -->
		<div v-if="rank > 0" class="rank-circle">
			{{ rank }}
		</div>
		<div v-else class="proposal-icon">
			<i class="fas fa-fw" :class="'fa-' + proposal.icon" />
		</div>

		<div class="d-flex flex-column text-truncate">
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
					{{ t('createdBy') }}&nbsp;{{ proposal?.createdBy?.name }}
				</div>
			</div>
		</div>

		<div class="drag-handle">
			<i class="fas fa-bars"></i>
		</div>
	</div>
</template>

<script setup>
/**
 * liquido-proposal.vue — a single proposal card used on the cast-vote page.
 * Extracted from cast-vote.vue and rendered in two contexts:
 *   - inside the ballot   → pass :rank (1-based) to show the rank number
 *   - the available pool  → omit :rank to show the proposal icon instead
 *
 * Composition API (<script setup>). vue-i18n runs in legacy mode where
 * getCurrentInstance().proxy.$t is not callable inside <script setup>, so we use a tiny
 * local t() helper with static German text (the app default locale), matching the pattern
 * in cast-vote-content.vue / Polly-vote.vue.
 */
defineProps({
	// the proposal to render (id, title, icon, numSupporters, likedByCurrentUser, createdBy…)
	proposal: { type: Object, required: true },
	// 1-based rank in the ballot. When > 0 the rank circle is shown instead of the icon.
	rank: { type: Number, default: 0 },
})

const messages = {
	createdBy: "von",
}

/** Minimal static stand-in for $t: looks up a German string and interpolates {params}. */
function t(key, params = {}) {
	const msg = messages[key]
	if (msg == null) return key
	return msg.replace(/\{(\w+)\}/g, (m, p) =>
		Object.prototype.hasOwnProperty.call(params, p) ? params[p] : m
	)
}
</script>

<style scoped>
/* Card styles extracted verbatim from cast-vote.vue, kept identical so both usages look
   unchanged. The two --polly-* custom properties are declared on .cast-vote-wrapper in the
   parent and inherit down; the fallbacks keep the card usable if rendered elsewhere. */
.proposal-panel {
	height: var(--polly-proposal-height, 4rem);
	margin-bottom: var(--polly-proposal-margin-bottom, 0.5rem);
	cursor: grab;
}

.proposal-title {
	color: var(--primary);
	margin: 0;
	padding: 0;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.proposal-subtitle {
	display: flex;
	align-items: center;
	justify-content: space-between;
	font-size: 0.8rem; /* Fixed as small. We also could have var(--font-size-small); */
	color: var(--secondary);
}

/* Ranking number at the left of a proposal in the ballot (replaces the proposal icon). */
.rank-circle {
	position: relative;
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
	font-family: var(--sans-serif-font);
	font-size: 1rem;
	line-height: 1;
	z-index: 30;
}

.proposal-icon {
	--proposal_icon_size: 32px;
	color: white;
	background-color: var(--proposal-icon-bg);
	margin: 0 0.75rem;
	border-radius: 50%;
	border: none;
	text-align: center;
	line-height: var(--proposal_icon_size);
	min-width: var(--proposal_icon_size);
	max-width: var(--proposal_icon_size);
	width: var(--proposal_icon_size);
	min-height: var(--proposal_icon_size);
	max-height: var(--proposal_icon_size);
	height: var(--proposal_icon_size);
}

.liked {
	color: var(--primary);
	cursor: default;
}

.drag-handle {
	color: var(--secondary);
	opacity: 0.5;
	margin: 0 10px;
}
</style>
