 <template>
	<header id="liquidoHeader" :class="{ 'transition-header': isSticky, 'hero-mark-active': heroMarkActive }">
		<div class="header-top-row">
			<div class="header-left" @click="clickLeft">
				<button v-if="headerBackTarget" class="header-action-btn header-action-btn--left" type="button" @click.stop="clickLeft" aria-label="Back">
					<i class="fas fa-angle-left" />
				</button>
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
			<div class="header-right" :click-right="clickRight">
				<button v-if="isMockBackend" id="mockResetButton" class="mock-reset-button" type="button" @click.stop="resetMockState" title="Reset mock state" aria-label="Reset mock state">M</button>
				<slot name="header-right" />
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
		isMockBackend() {
			return !!config.mockBackend
		},
		headerTitle() {
			return this.pageTitle ?? this.$store.headerTitle
		},
		/**
		 * True while the welcome page's hero owns the LIQUIDO mark. The header then starts out
		 * completely transparent and materialises while the user scrolls - see the CSS below.
		 */
		heroMarkActive() {
			return this.$store.heroMarkActive
		},

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
			EventBus.emit(EventBus.Event.CLICK_HEADER_RIGHT)
		},

		resetMockState() {
			try {
				sessionStorage.removeItem("LIQUIDO_MOCK_STATE")
				window.location.reload()
			} catch (err) {
				console.warn("Cannot reset mock state", err)
			}
		},

	}
}
</script>

<style>


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
	/*border-bottom: 0.5px solid var(--light-border);*/
	
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
			min-width: var(--liquido-header-height);
			width: var(--liquido-header-height);
			min-height: var(--liquido-header-height);
			padding: 0 0.25rem;
			font-size: 25px;
		}

		.header-left > *, .header-right > * {
			display: flex;
			align-items: center;
			justify-content: center;
			width: calc(var(--liquido-header-height) * 0.6);
			height: calc(var(--liquido-header-height) * 0.6);
			border: 0;
			border-radius: 50%;
			background: rgba(0, 0, 0, 0.07);
			color: var(--header-color);
			font-size: 1.2rem;
			cursor: pointer;
			padding: 0;
		}

		.header-left > *:hover, .header-right > *:hover,
		.header-left > *:focus-visible, .header-right > *:focus-visible {
			background: rgba(0, 0, 0, 0.12);
			outline: none;
		}

		.mock-reset-button {
			background: transparent;
			border: none;
			box-shadow: none;
			color: #c40000;
			font-weight: 800;
			font-size: 1.35rem;
			line-height: 1;
			padding: 0;
			cursor: pointer;
		}

		.mock-reset-button:hover,
		.mock-reset-button:focus-visible {
			color: #920000;
			outline: none;
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

/**
 * While the welcome page's hero is on screen there is deliberately NO header yet: it starts fully
 * transparent and materialises as the visitor scrolls, in step with the LIQUIDO mark flowing up
 * into it. --hero-progress (0 .. 1) is written onto <html> by welcome-chat.vue's renderLiquidMark().
 *
 * The header's own icon stays invisible for the whole ride, because welcome-chat's #liquidMark IS
 * the icon the user sees - so nothing is ever swapped and nothing can flicker at the end. It keeps
 * its layout box (opacity, not display), and it has to: that box is exactly where the mark aims.
 */
#liquidoHeader.hero-mark-active {
	background: rgba(255, 255, 255, calc(0.82 * var(--hero-progress, 1)));
	-webkit-backdrop-filter: saturate(180%) blur(calc(20px * var(--hero-progress, 1)));
	backdrop-filter: saturate(180%) blur(calc(20px * var(--hero-progress, 1)));

	.liquido-claim i {
		opacity: 0;
	}

	/* The wordmark only joins in once the mark is nearly home, and slides the last few pixels
	   towards it - as if the icon pulled it along. */
	.liquido-claim .liquido {
		display: inline-block;
		opacity: calc((var(--hero-progress, 1) - 0.55) / 0.45);
		transform: translateX(calc((1 - var(--hero-progress, 1)) * -0.6rem));
	}
}

/* In PWA standalone mode: extend header under the status bar / Dynamic Island */
.is-pwa #liquidoHeader {
	padding-top: env(safe-area-inset-top);
	min-height: calc(var(--liquido-header-height) + env(safe-area-inset-top));
}

</style>
