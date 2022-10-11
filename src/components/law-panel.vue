<template>
	<b-card :id="law.id" no-body class="law-panel" :class="{'collapse-law-panel' : collapsed}">
		<div class="d-flex">
			<div class="law-image">
				<i class="fas fa-fw" :class="'fa-' + law.icon" />
			</div>
			<div class="d-flex flex-column text-truncate">
				<h4 class="law-title">
					{{ law.title }}
				</h4>
				<div class="law-subtitle">
					<i class="far fa-clock" />&nbsp;{{ formatDate(law.createdAt) }}
					<i class="far fa-user" />&nbsp;{{ law.createdBy.name }}
					<div :class="{ supported: law.supportedByCurrentUser }" class="like-button">
						<i :class="{
								far: !law.supportedByCurrentUser,
								fas: law.supportedByCurrentUser,
							}"
							class="fa-thumbs-up"
						/>
						&nbsp;<span class="numLikes">{{ law.numSupporters }}</span>
					</div>
				</div>
			</div>
		</div>
		<div class="law-description" v-html="law.description"></div>
		<div class="drag-handle">
			<i class="fas fa-grip-vertical"></i>
		</div>
	</b-card>
</template>

<script>

// Law-panel is only used when single laws need to be shown in in cast-vote view! 
// All other views use poll-panel!

import dayjs from "dayjs"
import localizedFormat from 'dayjs/plugin/localizedFormat'
dayjs.extend(localizedFormat)

export default {
	name: "LawCard",
	props: {
		law: { type: Object, required: true },
		readOnly: { type: Boolean, required: false, default: false },
		collapse: { type: Boolean, required: false, default: false },  // initial value
	},
	data() {
		return {
			collapsed: this.collapse			// this.collapsed  will toggle the "collapse-law-panel" CSS class
		}
	},
	computed: {
		iconForLaw() {
			switch (this.law.status) {
				case "IDEA":
					return "far fa-lightbulb"
				case "PROPOSAL":
					return "far fa-file-alt"
				case "ELABORATION":
					return "far fa-comments"
				case "VOTING":
					return "fas fa-vote-yea"
				case "LAW":
					return "fas fa-balance-scale-left"
				case "DROPPED":
					return "far fa-window-close"
				case "RETENTION":
					return "fas fa-temperature-low"
				case "RETRACTED":
					return "fas fa-backspace"
				default:
					return "fas fa-university"
			}
		},
	},
	methods: {
		formatDate(dateVal) {
			return dayjs(dateVal).format("L")
		},
		toggleCollapse() {
			this.collapsed = !this.collapsed
		},
	},
}
</script>

<style lang="scss" scoped>
$proposal_img_size: 32px;

.law-panel {   // same as in poll-panel.vue
	height: 8rem;
	overflow: hidden;
	padding: 10px;
	transition: height 0.5s;
	&.collapse-law-panel {
		height: 18px + $proposal_img_size;
	}
	.law-title {
		margin-bottom: 0px;
		padding: 0;
		font-size: 14px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.law-subtitle {
		font-size: 10px;
		color: #bbb;
		margin-bottom: 5px;
	}
	.law-image {
		color: white;
		background-color: lightgray;
		border-radius: 50%;
		border: 1px solid lightgray;
		text-align: center;
		font-size: 1.2em;
		min-width: $proposal_img_size;
		max-width: $proposal_img_size;
		width: $proposal_img_size;
		min-height: $proposal_img_size;
		max-height: $proposal_img_size;
		height: $proposal_img_size;
		margin-right: 10px;
	}

	.law-description {
		font-size: 12px;
		overflow: hidden;
	}

	.like-button {
		display: inline;
		margin-left: 0.5rem;
	}
	.supported {
		color: green;
	}

	.drag-handle {
		position: absolute;
		right: 5px;
		bottom: 0px;
		opacity: 0.5;
	}
}

</style>
