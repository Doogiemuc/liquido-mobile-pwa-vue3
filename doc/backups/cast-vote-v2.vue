<template>
	<!--
	  cast-vote-v2.vue — the routed page. It is intentionally thin: @vue-dnd-kit/core's
	  makeDraggable / makeDroppable must run in components *nested inside* <DnDProvider>
	  (they use provide/inject), so all the real logic lives in <cast-vote-content>.

	  The outer <div> is required: <router-view> passes id/class fallthrough attributes and
	  wraps the page in a <Transition>, both of which need a single element root. <DnDProvider>
	  renders a fragment (its slot + a teleported preview), so it can't be the root itself.
	-->
	<div>
		<DnDProvider>
			<cast-vote-content :poll-id="pollId" />
			<template #preview>
				<DragPreview />
			</template>
		</DnDProvider>
	</div>
</template>

<script setup>
import { DnDProvider, DragPreview } from "@vue-dnd-kit/core"
import CastVoteContent from "@/components/cast-vote-content.vue"

defineProps({
	// passed through from the route (/polls/:pollId/castVoteV2, props: true)
	pollId: { type: String, required: true },
})
</script>

<style>
/*
 * GLOBAL (not scoped): the drag overlay is teleported to the provider root / <body>, outside
 * this component's scoped DOM, so it cannot be targeted with scoped styles.
 * The library uses transform: translate3d() on `.dnd-kit-preview` itself for cursor tracking —
 * so we tilt/scale the cloned card (its child) instead, mirroring the React DragOverlay.
 */
.dnd-kit-preview {
	z-index: 2000;
	pointer-events: none;
}
.dnd-kit-preview > * {
	transform: rotate(2deg) scale(1.02);
	opacity: 1 !important;
	box-shadow: 0 0.75rem 1.5rem rgba(30, 58, 95, 0.3) !important;
	cursor: grabbing;
}
</style>
