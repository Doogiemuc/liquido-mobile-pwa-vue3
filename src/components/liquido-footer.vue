<template>
	<footer ref="footer" class="liquido-footer">
		<div v-if="infoText" class="liquido-footer-info">
			<slot name="info">
				<span v-if="infoText !== undefined">{{ infoText }}</span>
			</slot>
		</div>
		<div class="liquido-footer-actions">
			<slot name="left">
				<RouterLink to="/team" class="footer-icon-container" aria-label="Team">
					<div class="footer-icon"><i class="fas fa-users"></i></div>
					<div class="footer-icon-title">Team</div>
				</RouterLink>
			</slot>
			<div class="footer-center">
				<slot name="primary">
					<button v-if="primaryText !== undefined" class="btn btn-lg" type="button" :disabled="primaryDisabled"
						@click="$emit('primary')">
						{{ primaryText }}
					</button>
				</slot>
			</div>
			<RouterLink to="/polls" class="footer-icon-container" aria-label="Polls">
				<div class="footer-icon"><i class="fas fa-chart-pie"></i></div>
				<div class="footer-icon-title">Polls</div>
			</RouterLink>
		</div>
	</footer>
</template>

<script>
/**
 * A flexible navbar component shown at the bottom of many SEAF pages.
 * Each SEAF page can have it's own footer depending on UX and context.
 * This component provides a standard UI that can be reused
 * The footer has an info text and a primary action button.
 */
export default {
	name: "LiquidoFooter",
	props: {
		infoText: { type: String, default: undefined },
		primaryText: { type: String, default: undefined },
		primaryDisabled: { type: Boolean, default: false },
	},
	emits: ["primary"],
	data() {
		return {
			footerResizeObserver: null,
		}
	},
	mounted() {
		this.updateFooterHeight()
		this.footerResizeObserver = new ResizeObserver(() => this.updateFooterHeight())
		if (this.$refs.footer) this.footerResizeObserver.observe(this.$refs.footer)
	},
	beforeUnmount() {
		if (this.footerResizeObserver) {
			this.footerResizeObserver.disconnect()
			this.footerResizeObserver = null
		}
	},
	methods: {
		/**
		 * We track the height of the footer and dynamically set a CSS variable.
		 * This can then be used to add a padding at the bottom of the appContent, so that the page content
		 * can scroll up far enough, so that it is not hidden behind the fixed footer.
		 */
		updateFooterHeight() {
			if (!this.$refs.footer) return
			document.documentElement.style.setProperty("--navbar-bottom-height", `${this.$refs.footer.offsetHeight}px`)
		},
	},
}
</script>

<style>
.liquido-footer {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	display: flex;
	align-items: stretch;
	flex-direction: column;

	margin: 0;
	padding: 0;
	background: var(--header-bg);
	border-top: 1px solid var(--secondary);
	box-shadow: 0 -5px 10px rgba(0, 0, 0, 0.1);
	z-index: 999;
}

.liquido-footer-info {
	width: 100%;
	flex-grow: 1;
	text-align: center;
	color: var(--liquido-info-color);
	font-size: 0.8rem;
	line-height: 1.2;
	color: var(--secondary);
	padding: 0.5rem;
	p:last-child {
		margin-bottom: 0;
	}
}

.liquido-footer-actions {
	display: flex;
	align-items: center;
	flex-grow: 1;
	min-width: 0;
	padding: 0.25rem 0;
}

.footer-center {
	flex: 5 1 0;
	min-width: 0;
	button {
		display: block;
		/*flex-grow: 1;*/
		width: 100%;
		min-width: 0;
		white-space: nowrap;
		text-overflow: ellipsis;
		overflow: hidden;
	}
}

.footer-icon-container {
	display: flex;
	flex-direction: column;
	flex: 1 1 0;
	align-items: center;
	justify-content: center;
	color: var(--primary);
	font-size: 1.5rem;
	text-decoration: none;
	/* Need a bit of manual padding, so that the footer left and right links look aligned with the center main action button */
	padding: 0.5rem 0 0.2rem 0rem;  
	height: 100%;
	text-decoration: none;
	transition: background-color 0.2s;
}

.footer-icon {	
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	text-align: center;
	font-size: 2.0rem;
	color: var(--primary);
	height: 100%;
}

.footer-icon-title {
	font-size: 10px;
	text-decoration: none;
}

/*
.liquido-footer-actions .btn {
	flex-grow: 1;
}
	*/

</style>
