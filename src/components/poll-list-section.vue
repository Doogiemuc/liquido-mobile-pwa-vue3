<template>
  <section
    class="poll-section"
    :class="{ empty: polls.length === 0 }"
  >
    <h2 class="poll-status-header">
      {{ title }}
      <span v-if="polls.length" class="badge rounded-pill poll-count">
        {{ polls.length }}
      </span>
    </h2>

    <!-- Poll list -->
    <transition-group
      name="poll-item"
      tag="div"
      class="poll-list"
    >
      <div
        v-for="(poll, index) in polls"
        :key="poll.id"
        class="poll-card-wrapper"
        :style="{ '--i': index }"
      >
        <poll-card
          class="shadow-sm"
          :poll="poll"
          @click="$emit('select', poll.id)"
        />
      </div>
    </transition-group>
  </section>
</template>

<script>
import PollCard from "@/components/poll-card.vue"

export default {
  name: "PollListSection",

  components: {
    PollCard
  },

  props: {
    title: {
      type: String,
      required: true
    },
    polls: {
      type: Array,
      default: () => []
    }
  }
}
</script>

<style scoped>
.poll-section {
	max-height: 2000px;
  opacity: 1;
  transform: translateY(0);
  overflow: hidden;
  transition: max-height 260ms ease, opacity 200ms ease, transform 200ms ease;
  will-change: transform, opacity, max-height;
}

.poll-section.empty {
	max-height: 0;
  opacity: 0;
  /*transform: translateY(-6px);*/
  pointer-events: none;
}

.poll-status-header {
	/*border-left: 3px solid var(--primary);*/
	position: relative;
	padding-left: 0.75rem;
}

.poll-status-header::before {
	content: "";
	position: absolute;
	left: 0.1rem;
	top: 0;
	bottom: 0;
	width: 3px;
	background: var(--state-voting);
	border-radius: 999px;
}

.poll-count {
	font-family: var(--sans-serif-font);
	font-weight: normal;
	color: var(--state-new);
  background-color: var(--state-new-bg);
}

/* layout */
.poll-list {
  display: flex;
  flex-direction: column;
}

/* card wrapper keeps layout stable for transitions */
.poll-card-wrapper {
  /* <==== THIS IS CRUCIAL !!!! YOU MUST DEFINE A FIXED HEIGHT FOR THE poll-card! Otherwise all list transition animations don't work. ========
     --poll-card-height is the height of the poll summary panel itself (the .card-body). The +2px
     adds the card's 1px top and bottom border on top of it, so that the panel really ends up
     --poll-card-height high here - exactly as tall as the one in poll-card-edit.vue. */
  height: calc(var(--poll-card-height) + 2px);
	margin-bottom: var(--unit);
}

/* --- ITEM TRANSITIONS, when filtered --- */

/* move animation (Vue FLIP internally) */
.poll-item-move {
  transition: transform 320ms cubic-bezier(0.2, 0, 0.2, 1);
}

/* enter/leave (very subtle) */
.poll-item-enter-active,
.poll-item-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

/* staggering list transition 
.poll-item-leave-active {
  transition-delay: calc(var(--i, 0) * 500ms);
}
	*/

/* entry state */
.poll-item-enter-from {
  opacity: 0;
  transform: translateY(-4px);

}

/* exit state */
.poll-item-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
