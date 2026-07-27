<template>
	<div class="poll-winner-page">
		<!-- Celebration confetti. Canvas based effect adapted from
		     https://codepen.io/jonathanbell/pen/OvYVYw into the Vue lifecycle (see mounted/beforeUnmount). -->
		<canvas ref="confettiCanvas" class="confetti-canvas" aria-hidden="true"></canvas>

		<h1 id="poll-winner-page" class="page-title">{{ $t('pollWinnerPageTitle') }}</h1>

		<!-- Large trophy hero icon at the top of the page -->
		<div class="trophy-wrapper">
			<i class="fa-solid fa-trophy trophy-icon"></i>
		</div>

		<div v-if="loading" class="text-center my-4">
			<div class="spinner-border" role="status">
				<span class="visually-hidden">{{ $t('Loading') }}</span>
			</div>
		</div>

		<template v-else-if="poll && poll.id">
			<!-- The poll itself with expandable proposals -->
			<poll-card :poll="poll" :show-arrow-right="false" :show-proposals="true" :proposals-expanded="false" class="mb-4 shadow-sm" />

			<!-- The winning proposal, nicely highlighted. Only the winner is shown. -->
			<template v-if="winner">
				<h2 class="page-title mb-1">{{ $t('theWinnerIs') }}</h2>

				<div class="winner-proposal shadow">
					<div class="winner-badge">
						<i class="fas fa-crown"></i>&nbsp;{{ $t('winnerBadge') }}
					</div>
					<div class="winner-body">
						<div class="winner-icon">
							<i class="fas fa-fw" :class="'fa-' + (winner.icon || 'lightbulb')"></i>
						</div>
						<div class="winner-main">
							<h3 class="winner-title">{{ winner.title }}</h3>
							<div v-if="winner.description" class="winner-description" v-html="winner.description"></div>
							<div class="winner-footer">
								<span class="winner-likes"><i class="fas fa-heart"></i>&nbsp;{{ winner.numSupporters || 0 }}</span>
								<span v-if="winner.createdBy" class="winner-createdby">{{ $t('createdBy') }}&nbsp;{{ winner.createdBy.name }}</span>
							</div>
						</div>
					</div>
				</div>
			</template>

			<p v-else class="page-subtitle text-center mt-4">{{ $t('noWinner') }}</p>
		</template>

		<liquido-footer />
	</div>
</template>

<script>
import api from "@/services/liquido-graphql-client.js"
import pollCard from "@/components/poll-card.vue"
import liquidoFooter from "@/components/liquido-footer.vue"
import log from "loglevel"

export default {
	name: "PollWinner",
	i18n: {
		messages: {
			en: {
				pollWinnerPageTitle: "The Result",
				theWinnerIs: "And the winner is",
				winnerBadge: "Winner",
				noWinner: "There is no result for this poll yet.",
				createdBy: "by",
				Loading: "Loading...",
			},
			de: {
				pollWinnerPageTitle: "Das Ergebnis",
				theWinnerIs: "Und der Gewinner ist",
				winnerBadge: "Gewinner",
				noWinner: "Für diese Abstimmung gibt es noch kein Ergebnis.",
				createdBy: "von",
				Loading: "Lädt...",
			},
		},
	},
	components: { pollCard, liquidoFooter },
	props: {
		// The poll-winner page only receives the pollId and (re)loads the poll from the backend.
		pollId: { type: String, required: true },
	},
	data() {
		return {
			loading: true,
			poll: undefined,
		}
	},
	computed: {
		// The winning proposal of a FINISHED poll (or undefined while the poll is still running).
		winner() {
			return this.poll?.winner
		},
	},
	created() {
		this.loading = true
		this.$store.setHeaderTitle(this.$t("pollWinnerPageTitle"))
		this.$store.setHeaderBackTarget({ name: "polls" })

		api.getPollById(this.pollId, true)
			.then(poll => {
				this.poll = poll
			})
			.catch(err => log.warn("Cannot load poll for winner page, id=" + this.pollId, err))
			.finally(() => {
				this.loading = false
			})
	},
	mounted() {
		this.$root.scrollToTop()
		this.startConfetti()
	},
	beforeUnmount() {
		this.stopConfetti()
	},
	methods: {
		/**
		 * Start the raining confetti animation on the fullscreen canvas.
		 * Ported from https://codepen.io/jonathanbell/pen/OvYVYw and wrapped so that the
		 * requestAnimationFrame loop and the resize listener can be cleaned up on unmount.
		 */
		startConfetti() {
			const canvas = this.$refs.confettiCanvas
			if (!canvas) return
			const context = canvas.getContext("2d")

			let W = window.innerWidth
			let H = window.innerHeight
			canvas.width = W
			canvas.height = H

			const maxConfettis = 150
			const particles = []
			const possibleColors = [
				"DodgerBlue", "OliveDrab", "Gold", "Pink", "SlateBlue", "LightBlue", "Gold",
				"Violet", "PaleGreen", "SteelBlue", "SandyBrown", "Chocolate", "Crimson",
			]

			const randomFromTo = (from, to) => Math.floor(Math.random() * (to - from + 1) + from)

			function ConfettiParticle() {
				this.x = Math.random() * W
				this.y = Math.random() * H - H
				this.r = randomFromTo(11, 33)
				this.d = Math.random() * maxConfettis + 11
				this.color = possibleColors[Math.floor(Math.random() * possibleColors.length)]
				this.tilt = Math.floor(Math.random() * 33) - 11
				this.tiltAngleIncremental = Math.random() * 0.07 + 0.05
				this.tiltAngle = 0

				this.draw = function () {
					context.beginPath()
					context.lineWidth = this.r / 2
					context.strokeStyle = this.color
					context.moveTo(this.x + this.tilt + this.r / 3, this.y)
					context.lineTo(this.x + this.tilt, this.y + this.tilt + this.r / 5)
					return context.stroke()
				}
			}

			const draw = () => {
				this.confettiAnimationId = requestAnimationFrame(draw)
				context.clearRect(0, 0, W, H)
				for (let i = 0; i < maxConfettis; i++) {
					particles[i].draw()
				}
				for (let i = 0; i < maxConfettis; i++) {
					const particle = particles[i]
					particle.tiltAngle += particle.tiltAngleIncremental
					particle.y += (Math.cos(particle.d) + 3 + particle.r / 2) / 2
					particle.tilt = Math.sin(particle.tiltAngle - i / 3) * 15

					// If a confetti has fluttered out of view, bring it back above the viewport to re-fall.
					if (particle.x > W + 30 || particle.x < -30 || particle.y > H) {
						particle.x = Math.random() * W
						particle.y = -30
						particle.tilt = Math.floor(Math.random() * 10) - 20
					}
				}
			}

			this.confettiResizeHandler = () => {
				W = window.innerWidth
				H = window.innerHeight
				canvas.width = W
				canvas.height = H
			}
			window.addEventListener("resize", this.confettiResizeHandler, false)

			for (let i = 0; i < maxConfettis; i++) {
				particles.push(new ConfettiParticle())
			}
			draw()

			// After 1 s let the confetti fade out over 2 s, then stop the loop.
			this.confettiFadeTimer = setTimeout(() => {
				canvas.style.opacity = '0'
				this.confettiStopTimer = setTimeout(() => this.stopConfetti(), 1000)
			}, 2000)
		},

		// Stop the confetti animation and remove its resize listener (called on unmount).
		stopConfetti() {
			clearTimeout(this.confettiFadeTimer)
			clearTimeout(this.confettiStopTimer)
			if (this.confettiAnimationId) {
				cancelAnimationFrame(this.confettiAnimationId)
				this.confettiAnimationId = undefined
			}
			if (this.confettiResizeHandler) {
				window.removeEventListener("resize", this.confettiResizeHandler)
				this.confettiResizeHandler = undefined
			}
		},
	},
}
</script>

<style scoped>
.poll-winner-page {
	position: relative;
}

/* Fullscreen confetti overlay. pointer-events:none so it never blocks interaction. */
.confetti-canvas {
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	pointer-events: none;
	z-index: 1000;
	transition: opacity 1s ease;
}

/* Large trophy hero icon */
.trophy-wrapper {
	text-align: center;
	margin: var(--unit) 0 var(--two);
}

.trophy-icon {
	font-size: 5rem;
	color: #f5b301; /* gold */
	filter: drop-shadow(0 0.2rem 0.4rem rgba(0, 0, 0, 0.25));
	animation: trophy-pop 0.6s cubic-bezier(0.17, 0.89, 0.32, 1.28) both,
		trophy-bob 3s ease-in-out 0.6s infinite;
}

@keyframes trophy-pop {
	from { transform: scale(0) rotate(-25deg); opacity: 0; }
	to   { transform: scale(1) rotate(0deg); opacity: 1; }
}

@keyframes trophy-bob {
	0%, 100% { transform: translateY(0); }
	50%      { transform: translateY(-0.4rem); }
}

/* Highlighted winning proposal card */
.winner-proposal {
	position: relative;
	margin-top: var(--unit);
	background: linear-gradient(180deg, #fffdf5 0%, #ffffff 60%);
	border: 2px solid #f5b301;
	border-radius: var(--liquido-border-radius);
	overflow: hidden;
}

.winner-badge {
	background: linear-gradient(90deg, #f5b301, #ffcf40);
	color: #4a3500;
	font-family: var(--sans-serif-font);
	font-weight: 600;
	font-size: 0.75rem;
	text-transform: uppercase;
	letter-spacing: 0.12em;
	text-align: center;
	padding: 0.3rem;
}

.winner-body {
	display: flex;
	align-items: center;
	padding: var(--unit);
}

.winner-icon {
	flex: 0 0 auto;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 56px;
	height: 56px;
	margin-right: var(--unit);
	border-radius: 50%;
	background-color: #f5b301;
	color: white;
	font-size: 1.5rem;
	box-shadow: inset 0 0 0 3px rgba(255, 255, 255, 0.6);
}

.winner-main {
	flex: 1 1 auto;
	min-width: 0;
}

.winner-title {
	color: var(--primary);
	margin: 0 0 0.25rem;
}

.winner-description {
	color: var(--text-color);
	font-size: 0.9rem;
	margin-bottom: 0.5rem;
}

.winner-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	font-size: 0.8rem;
	color: var(--secondary);
}

.winner-likes {
	color: #e0245e; /* heart red */
}
</style>
