<template>
	<b-card :id="law.id" no-body class="law-panel" :class="{'collapse-law-panel' : collapsed}">
		<div class="d-flex">
			<div>
				<img :src="'https://picsum.photos/seed/' + law.id + '/100'" alt="Law image" class="law-image">
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
						&nbsp;{{ law.numSupporters }}
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
import moment from "moment"

export default {
	name: "LawCard",
	props: {
		law: { type: Object, required: true },
		readOnly: { type: Boolean, required: false, default: false },
		collapse: { type: Boolean, required: false, default: false },  // initial value
	},
	data() {
		return {
			collapsed: this.collapse  // switch for classes
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
	mounted() {
		//if (!this.expanded) this.toggleCollapse()
	},
	methods: {
		formatDate(dateVal) {
			return moment(dateVal).format("L")
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
		border-radius: 5px;
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
