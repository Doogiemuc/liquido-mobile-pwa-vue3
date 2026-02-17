<template>
	<footer ref="footer" class="liquido-footer">
		<div class="liquido-footer-info">
			<slot name="info">
				<span v-if="infoText">{{ infoText }}</span>
			</slot>
		</div>
		<div class="liquido-footer-actions">
			<slot name="primary">
				<button class="btn btn-lg" type="button" :disabled="primaryDisabled" @click="$emit('primary')">
					{{ primaryText }}
				</button>
			</slot>
		</div>
	</footer>
</template>

<script>
export default {
	name: "LiquidoFooter",
	props: {
		infoText: { type: String, default: "" },
		primaryText: { type: String, default: "OK" },
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
	flex-direction: column;
	gap: 0.5rem;
	padding: 1rem;
	background: var(--header-bg);
	border-top: 1px solid var(--secondary);
	box-shadow: 0 -5px 10px rgba(0, 0, 0, 0.1);
	z-index: 999;
}

.liquido-footer-info {
	text-align: center;
	color: var(--liquido-info-color);
	font-size: 0.8rem;
	line-height: 1.2;
	color: var(--secondary);
}

.liquido-footer-actions {
	display: flex;
	justify-content: center;
}

</style>
