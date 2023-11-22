<template>
	<header id="liquidoHeader">
		<div class="header-left" @click="clickBack">
			<a v-if="backLink" href="#">
				<i class="fas fa-angle-left" />
			</a>
		</div>
		<div class="header-center" @click="clickHeaderCenter">
			<div class="liquido-claim">
				<i class="fas fa-university" />&nbsp;
				<span class="liquido" />
			</div>
			<div v-if="title" class="center-title">
				<h2>{{ title }}</h2>
			</div>
		</div>
		<div class="header-right" @click="clickSearch">
			<i class="fas fa-search" />
		</div>
	</header>
</template>

<script>

export default {
	name: "LiquidoHeader",
	
	data() {
		return {
			title: undefined,
			backLink: undefined,
			showSearch: true,
			isSticky: false
		}
	},
	
	mounted() {
		document.getElementById("app").addEventListener("scroll", this.stickyHeader)
	},

	methods: {

		stickyHeader() {
			let header = document.getElementById("liquidoHeader")
			if (header != null && this.title != undefined) {
				let app = document.getElementById("app")
				if (this.isSticky === false && app.scrollTop > 20) {
					console.log("ADD transtion")
					this.isSticky = true
					header.classList.add("transition-header")
				} else if (this.isSticky === true && app.scrollTop < 20) {
					console.log("REMOVE transition")
					this.isSticky = false
					header.classList.remove("transition-header")
				}	
			}		
		},

		clickBack() {
			if (this.backLink === "BACK") this.$router.go(-1)
			else if (this.backLink) this.$router.push(this.backLink)
		},
		
		clickHeaderCenter() {
			//?????? what then?
		},

		clickSearch() {
			//TODO: show search bar
		}

	}
}
</script>

<style lang="scss" scoped>


#liquidoHeader {
	display: flex;
	position: fixed;
	left: 0;
	top: 0;
	width: 100%;
	height: $header-height;
	flex-direction: row;
	justify-content: space-between;
	z-index: 999;
	transition: all 0.5s;
	background-color: $header_bg;
	
	&.transition-header {
		//height: 2.5rem;
		.liquido-claim {
			top: -1.5rem !important;
		}
		.center-title {
			top: 50% !important;
			transform: translate(-50%, -50%) !important;
		}
	}
	
	.header-left {
		display: flex;
		align-items: center;
		font-size: 1.5rem;
		margin-left: 10px;
	}
	.header-center {
		flex-grow: 1;	
		text-align: center;
		
		position: relative;
		overflow: hidden;
		.liquido-claim {
			position: relative;
			top: 50%;
			transform: translateY(-50%);
			transition: top 0.5s;
			color: $primary;
			font-size: 1.5rem;
		}
		.center-title {
			position: absolute;
			top: 150%;
			left: 50%;
			width: 100%;
			transform: translateX(-50%);
			transition: top 0.5s;
		}
	}
	.header-right {
		display: flex;
		align-items: center;
		margin-right: 10px;
	}
	
}

</style>
