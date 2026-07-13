<template>
	<footer ref="footer" class="liquido-footer" :class="{ 'footer-margin-bottom' : isHomeScreenPWA }">
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
					<button v-if="primaryText !== undefined" class="btn" type="button" :disabled="primaryDisabled"
						@click="$emit('primary')">
						{{ primaryText }}
					</button>
				</slot>
			</div>
			<div class="footer-icon-container" @click="$root.gotoPolls">
				<!-- div class="footer-icon"><i class="fas fa-balance-scale"></i></div> -->
				<!-- LIQUIDO Balance-scale icon for polls -->
				<svg xmlns="http://www.w3.org/2000/svg" 
					class="footer-svg-icon" 
				  viewBox="0 5 130 90"
					fill="none" 
					stroke="currentColor" 
					stroke-width="10" 
					stroke-linecap="round" 
					stroke-linejoin="round" 
					aria-hidden="true">
					<!-- central pivot and balance beam -->
					<circle cx="65" cy="20" r="10"/>
					<path d="M25 20 H55"/>
					<path d="M75 20 H105"/>
					<!-- path d="M65 0 V10"/ -->
					<!-- central vertical beam -->
					<path d="M65 30 V90"/>
					<!-- stand at the bottom -->
					<path d="M35 90 H90"/>
					<!-- path fill="currentColor" stroke="none" d="M25 105 V110 A10 10 0 0 1 30 95 H95 A10 10 0 0 1 105 100 V105 Z"/ -->
					<!-- left hanger and pan -->
					<path d="M25 20 L45 65 L5 65 Z"/>
					<path fill="currentColor" d="M5 65 A10 5 0 0 0 45 65 Z"/>
					<!-- right hanger and pan -->
					<path d="M105 20 L125 65 L85 65 Z"/>
					<path fill="currentColor" d="M85 65 A10 5 0 0 0 125 65 Z"/>
				</svg>
				<div class="footer-icon-title">Polls</div>
			</div>
		</div>
	</footer>
</template>

<script>
/**
 * A flexible navbar component shown at the bottom of many SEAF pages.
 * Each SEAF page can have it's own footer depending on UX and context.
 * This footer has two slots for icons on the left and right, 
 * and a primary action button in the middle.
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
			isHomeScreenPWA: this.$root.isHomeScreenPWA,
			iconSwitch: true
		}
	},
	mounted() {
	},
	methods: {
		
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
	border-top: 1px solid var(--light-border);
	box-shadow: 0 -5px 10px rgba(0, 0, 0, 0.1);
	z-index: 999;
}

/* 
 * This  is added when we are a web app on the iOS home screen. 
 * Normally one would do `margin-bottom: env(safe-area-inset-bottom);` But this adds too much space for our footer design.
 */
.footer-margin-bottom {
	margin-bottom: 15px;
}

.liquido-footer-info {
	width: 100%;
	flex-grow: 1;
	text-align: center;
	color: var(--liquido-info-color);
	font-size: var(--font-size-small);
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
	margin: 0;
	padding: 0;
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
	text-decoration: none;
	/* Need to manually adjust the vertical padding of the icons on the left and right, so that they look aligned with the main action button in the middle. */
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
	font-size: 1.8rem;
	color: var(--primary);
	height: 100%;
}

/* Custom stroke-based SVG icons in the footer scale with the icon font-size */
.footer-svg-icon {
	width: 2em;
	height: 1.40em;
	display: block;
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
