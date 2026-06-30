<template>
	<header id="liquidoHeader" :class="[headerClass, { 'transition-header': isSticky }]">
		<div class="header-top-row">
			<div class="header-left" @click="clickLeft">
				<i v-if="headerBackTarget" class="fas fa-angle-left" />
			</div>
			<div class="header-center" @click="clickHeaderCenter">
				<div class="liquido-claim">
					<i class="fas fa-university" />&nbsp;
					<span class="liquido" />
				</div>
				<div class="center-title">
					<h1>{{ headerTitle }}</h1>
				</div>
			</div>
			<div class="header-right">
				<slot
					name="header-right"
					:click-right="clickRight"
					:toggle-menu="toggleMenu"
					:show-menu="showMenu"
				/>
			</div>
		</div>
	</header>
</template>

<script>
import EventBus from "@/services/event-bus.js"
import config from "config"



/** 
 * When the page is scrolled up this number of pixels, then the LIQUIDO claim
 * will scroll up out of view and the title will appear in the header.
 * This should roughly equal to the empty padding+margin above the title on the page.
 */
const scrollAfterPx = 55

export default {
	name: "LiquidoHeader",
	props: {
		pageTitle: {
			type: String,
			default: undefined,
		},
	},
	data() {
		return {
			showMenu: false,
			isSticky: false,
		}
	},
	
	mounted() {
		// Add a scroll listener to dynamically fade the header text up and down when user scrolls
		this.onAppScroll = this.stickyHeader.bind(this)
		this.scrollElem = this.getScrollElem()
		this.scrollElem?.addEventListener("scroll", this.onAppScroll, { passive: true })
		window.addEventListener("scroll", this.onAppScroll, { passive: true })
		this.stickyHeader()
	},

	computed: {
		headerBackTarget() {
			return this.$store.headerBackTarget
		},
		headerTitle() {
			//TODO: can all components pass this as prop? => Yes if liquido-header.vue is part of the page. NO if liquido-header becomes a global component in rootApp again.
			return this.pageTitle ?? this.$store.headerTitle
		},
		// If backend is mocked, then make header red
		headerClass() {
			return (config.mockBackend) ? "liquidoMockHeader" : ""
		}
	},

	watch: {
		// Drive the external .page-title class reactively instead of via classList.add/remove
		isSticky(sticky) {
			const el = document.getElementsByClassName("page-title")[0]
			if (el) el.classList.toggle("transition-page-title", sticky)
		},
	},

	beforeUnmount() {
		this.scrollElem?.removeEventListener("scroll", this.onAppScroll)
		window.removeEventListener("scroll", this.onAppScroll)
	},

	methods: {

		/*  @deprecated   we have a fixed header! 
		updateHeaderHeight() {
			if (!this.$el) return
			console.log("updateHeaderHeight: header height is now " + this.$el.offsetHeight + "px")
			document.documentElement.style.setProperty("--header-height", `${this.$el.offsetHeight}px`)
		},
		*/

		getScrollElem() {
			let app = document.getElementById("app")
			return app || document.scrollingElement || document.documentElement
		},

		getScrollTop() {
			let app = document.getElementById("app")
			if (app != null && app.scrollTop > 0) return app.scrollTop
			return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0
		},

		/**
		 * Called on scroll. Sets isSticky which drives both the header's own class
		 * (via :class binding) and the external .page-title class (via the isSticky watcher).
		 */
		stickyHeader() {
			this.isSticky = !!this.headerTitle && this.getScrollTop() > scrollAfterPx
		},

		clickLeft() {
			if (this.$store.headerBackTarget === "BACK") {
				console.log("router: going BACK")
				this.$router.go(-1)
			}
			else if (this.$store.headerBackTarget) this.$router.push(this.$store.headerBackTarget)
		},
		
		clickHeaderCenter() {
			EventBus.emit(EventBus.Event.CLICK_HEADER_CENTER)
		},

		clickRight() {
			this.toggleMenu()
		},

		toggleMenu() {
			this.showMenu = !this.showMenu
		}

	}
}
</script>

<style>

/*
.liquidoMockHeader {
	background-color: darkred !important;
}
	*/

#liquidoHeader {
	position: fixed;
	left: 0;
	top: 0;
	display: flex;
	flex-direction: column;
	justify-content: center;
	width: 100%;
	/* TODO: Header has a fixed height. I am currently only using header-row-two in cast-vote-vue  => does min-height work here? */
	min-height: var(--liquido-header-height);
	color: var(--header-color);
	background: rgba(255, 255, 255, 0.82);
	-webkit-backdrop-filter: saturate(180%) blur(20px);
	backdrop-filter: saturate(180%) blur(20px);
	z-index: 9999; 			/* make sure the header is on top of everything */
	border-bottom: 0.5px solid rgba(0, 0, 0, 0.15);
	
	/**
		* When user scrolls, slide the LIQUIDO claim out towards the top
		* and let the center-title slide in from the bottom.
		*/
	&.transition-header {
		.liquido-claim {
			top: -1.5rem !important;
		}
		.center-title {
			top: 50% !important;
			transform: translate(-50%, -50%) !important;
			padding: 0;
			margin: 0;
			h1 {
				margin: 0;
				padding: 0;
			}
		}
	}

	.header-top-row {
		display: flex;
		flex-direction: row;
		justify-content: space-between;	
		padding: 0;
				
		.header-left, .header-right {
			color: var(--header-color);
			display: flex;
			align-items: center;
			text-align: center;
			justify-content: center;
			font-size: 25px;
			width: var(--liquido-header-height); /* square click area */
			.fa-angle-left {
				display: flex;
				align-items: center;
				justify-content: center;
				width: 2rem;
				height: 2rem;
				background: rgba(0, 0, 0, 0.07);
				border-radius: 50%;
				font-size: 1.1rem;
				cursor: pointer;
			}
		}
		.header-back-link {
			display: flex;
			align-items: center;
			justify-content: center;
			text-align: center;
			color: white;
			cursor: pointer;
			width: var(--liquido-header-height);  /* square click area */
			height: 100%;
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
				font-size: 1.5rem;
			}
			.center-title {
				position: absolute;
				top: 150%;
				left: 50%;
				width: 100%;
				transform: translateX(-50%);
				transition: top 0.5s;
				padding: 0;
				margin: 0;
				h1, h2 { 
					margin: 0;
					padding: 0;
				}
			}
		}
	}
	
}

/* In PWA standalone mode: extend header under the status bar / Dynamic Island */
.is-pwa #liquidoHeader {
	padding-top: env(safe-area-inset-top);
	min-height: calc(var(--liquido-header-height) + env(safe-area-inset-top));
}

</style>
