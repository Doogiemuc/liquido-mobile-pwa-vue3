<template>
	<div class="poll-winner-page">
		<!-- Celebration confetti. Canvas based effect adapted from
		     https://codepen.io/jonathanbell/pen/OvYVYw into the Vue lifecycle (see mounted/beforeUnmount). -->
		<canvas ref="confettiCanvas" class="confetti-canvas" aria-hidden="true"></canvas>

		<h1 id="poll-winner-page" class="page-title">{{ $t('pollWinnerPageTitle') }}</h1>

		<!-- Large trophy hero icon at the top of the page. Hidden when there is no single winner to celebrate. -->
		<div v-if="!isTie" class="trophy-wrapper">
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

			<!-- Ranked Pairs found more than one source with no path between them: a genuine tie.
			     Do not elect a winner automatically -- this reflects what the team actually voted for. -->
			<template v-if="isTie">
				<p id="pollTieExplanationText" class="page-subtitle text-center mt-4">{{ $t('tieExplanation') }}</p>
				<ul id="tiedProposalsList" class="tied-proposals-list">
					<li v-for="p in tiedProposalsList" :key="'tied-' + p.id" :data-tied-proposal-id="p.id">
						<i class="fas fa-fw" :class="'fa-' + (p.icon || 'lightbulb')"></i>&nbsp;{{ p.title }}
					</li>
				</ul>
			</template>

			<!-- The winning proposal, nicely highlighted. Only the winner is shown. -->
			<template v-else-if="winnerProposal">
				<h2 class="page-title mb-1">{{ $t('theWinnerIs') }}</h2>

				<div class="winner-proposal shadow">
					<div class="winner-badge">
						<i class="fas fa-crown"></i>&nbsp;{{ $t('winnerBadge') }}
					</div>
					<div class="winner-body">
						<div class="winner-icon">
							<i class="fas fa-fw" :class="'fa-' + (winnerProposal.icon || 'lightbulb')"></i>
						</div>
						<div class="winner-main">
							<h3 class="winner-title">{{ winnerProposal.title }}</h3>
							<div v-if="winnerProposal.description" class="winner-description" v-html="winnerProposal.description"></div>
							<div class="winner-footer">
								<span class="winner-likes"><i class="fas fa-heart"></i>&nbsp;{{ winnerProposal.numSupporters || 0 }}</span>
								<span v-if="winnerProposal.createdBy" class="winner-createdby">{{ $t('createdBy') }}&nbsp;{{ winnerProposal.createdBy.name }}</span>
							</div>
						</div>
					</div>
				</div>

				<!-- Plain-language pairwise breakdown: how the winner did against every other proposal. -->
				<div id="pairwiseBreakdown" class="pairwise-breakdown">
					<p>{{ $t('pairwiseIntro') }}</p>
					<ul id="pairwiseComparisonList">
						<li v-for="row in pairwiseRows" :key="'pairwise-' + row.letter"
							:data-opponent-letter="row.letter" :data-score-winner="row.scoreWinner" :data-score-opponent="row.scoreOpponent">
							{{ row.scoreWinner }}:{{ row.scoreOpponent }} {{ $t('against') }} ({{ row.letter }}) {{ row.title }}
						</li>
					</ul>
				</div>
			</template>

			<p v-else class="page-subtitle text-center mt-4">{{ $t('noWinner') }}</p>

			<!-- Full duel matrix (and, for a single winner, its lock-in graph) - collapsed by default,
			     so the page stays minimal until someone actually wants to check the count. -->
			<div v-if="showMoreDetailsToggle" class="more-details-wrapper">
				<button id="toggleMoreDetailsButton" type="button" class="more-details-toggle"
					:aria-expanded="showMoreDetails" @click="showMoreDetails = !showMoreDetails">
					{{ $t('moreDetailsToggle') }}&nbsp;<i class="fas" :class="showMoreDetails ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
				</button>

				<section v-if="showMoreDetails" id="moreDetailsSection" class="more-details-section">
					<h3 class="more-details-heading">{{ $t('duelMatrixTitle') }}</h3>
					<p>{{ $t('duelMatrixIntro') }}</p>

					<ul class="matrix-legend">
						<li v-for="(id, idx) in tally.proposalOrder" :key="'legend-' + id">
							<strong>{{ letterFor(idx) }}</strong>&nbsp;{{ proposalsById[id]?.title }}
						</li>
					</ul>

					<div class="table-responsive">
						<table id="duelMatrixTable" class="duel-matrix-table">
							<thead>
								<tr>
									<th></th>
									<th v-for="(id, colIdx) in tally.proposalOrder" :key="'colhead-' + id">{{ letterFor(colIdx) }}</th>
								</tr>
							</thead>
							<tbody>
								<tr v-for="(rowId, rowIdx) in tally.proposalOrder" :key="'row-' + rowId">
									<th>{{ letterFor(rowIdx) }}</th>
									<td v-for="(colId, colIdx) in tally.proposalOrder" :key="'cell-' + rowId + '-' + colId"
										:data-duel-row="rowIdx" :data-duel-col="colIdx">
										{{ rowIdx === colIdx ? '' : tally.duelMatrix[rowIdx][colIdx] }}
									</td>
								</tr>
							</tbody>
						</table>
					</div>

					<!-- Only for a single winner - too complex for mobile in the tie case, and there is no single root to draw. -->
					<template v-if="graphLayout">
						<h3 class="more-details-heading">{{ $t('rankedPairsGraphTitle') }}</h3>
						<svg id="rankedPairsGraph" :viewBox="`0 0 ${graphLayout.width} ${graphLayout.height}`" class="ranked-pairs-graph">
							<defs>
								<marker id="rankedPairsArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
									<path d="M0,0 L10,5 L0,10 z" class="graph-arrowhead" />
								</marker>
							</defs>
							<line v-for="(edge, idx) in graphLayout.edges" :key="'edge-' + idx"
								:x1="edge.x1" :y1="edge.y1" :x2="edge.x2" :y2="edge.y2"
								class="graph-edge" marker-end="url(#rankedPairsArrow)" />
							<g v-for="node in graphLayout.nodes" :key="'node-' + node.id" :data-graph-node-letter="node.letter">
								<circle :cx="node.x" :cy="node.y" r="18" class="graph-node-circle" :class="{ 'is-root': node.id === winnerIndex }" />
								<text :x="node.x" :y="node.y" class="graph-node-label">{{ node.letter }}</text>
							</g>
						</svg>
					</template>
				</section>
			</div>
		</template>

		<liquido-footer />
	</div>
</template>

<script>
import api from "@/services/liquido-graphql-client.js"
import { calcRankedPairsResult } from "@/services/ranked-pairs.js"
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
				pairwiseIntro: "Here's how the winner did in the pairwise comparisons:",
				against: "against",
				moreDetailsToggle: "More details ...",
				duelMatrixTitle: "Table of all duels",
				duelMatrixIntro: "This table shows every pairwise comparison: the proposal on the left was ranked higher than the proposal on top by this many of you.",
				rankedPairsGraphTitle: "Graph",
				tieExplanation: "There is no single winner: the proposals below have no clear preference between them in the pairwise comparisons. This is a normal outcome in Ranked Pairs and reflects exactly what you voted for -- no winner is picked automatically. Talk it through as a team, or vote again.",
			},
			de: {
				pollWinnerPageTitle: "Das Ergebnis",
				theWinnerIs: "Und der Gewinner ist",
				winnerBadge: "Gewinner",
				noWinner: "Für diese Abstimmung gibt es noch kein Ergebnis.",
				createdBy: "von",
				Loading: "Lädt...",
				pairwiseIntro: "So hat sich der Gewinner im paarweisen Vergleich geschlagen:",
				against: "gegen",
				moreDetailsToggle: "Mehr details ...",
				duelMatrixTitle: "Tabelle aller Duelle",
				duelMatrixIntro: "Diese Tabelle zeigt alle paarweisen Vergleiche: Der Vorschlag links wurde von so vielen von euch höher bewertet als der Vorschlag oben.",
				rankedPairsGraphTitle: "Graph",
				tieExplanation: "Es gibt kein eindeutiges Ergebnis: Zwischen den folgenden Vorschlägen besteht kein klares Vorher-Nachher in den paarweisen Vergleichen. Das ist bei Ranked Pairs normal und drückt genau das aus, was ihr abgestimmt habt. Es wird kein Gewinner automatisch bestimmt. Sprecht euch als Team ab, oder stimmt erneut ab.",
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
			// The published tally (duelMatrix, proposalOrder, ...) and the ranked-pairs result
			// recomputed from it client-side. Only fetched once the poll is FINISHED.
			tally: undefined,
			rankedPairsResult: undefined,
			showMoreDetails: false,
		}
	},
	computed: {
		proposalsById() {
			return Object.fromEntries((this.poll?.proposals || []).map(p => [p.id, p]))
		},
		// A genuine Ranked Pairs tie: more than one source with no path between them.
		// Deliberately independent of poll.winner -- the backend currently still picks one arbitrary
		// proposal as "the" winner even when there is a tie, which this page does not follow.
		isTie() {
			return !!this.rankedPairsResult && this.rankedPairsResult.winners.length > 1
		},
		winnerIndex() {
			return this.rankedPairsResult && this.rankedPairsResult.winners.length === 1
				? this.rankedPairsResult.winners[0]
				: null
		},
		winnerProposal() {
			if (this.winnerIndex === null || !this.tally) return undefined
			return this.proposalsById[this.tally.proposalOrder[this.winnerIndex]]
		},
		tiedProposalsList() {
			if (!this.isTie || !this.tally) return []
			return this.rankedPairsResult.winners
				.map(idx => this.proposalsById[this.tally.proposalOrder[idx]])
				.filter(Boolean)
		},
		pairwiseRows() {
			if (this.winnerIndex === null || !this.tally) return []
			return this.tally.proposalOrder
				.map((id, idx) => idx)
				.filter(idx => idx !== this.winnerIndex)
				.map(idx => ({
					letter: this.letterFor(idx),
					title: this.proposalsById[this.tally.proposalOrder[idx]]?.title,
					scoreWinner: this.tally.duelMatrix[this.winnerIndex][idx],
					scoreOpponent: this.tally.duelMatrix[idx][this.winnerIndex],
				}))
		},
		// The "Mehr details ..." toggle only makes sense once there is a tally with at least one
		// counted comparison. With zero ballots the matrix would be all zeros -- not worth showing.
		showMoreDetailsToggle() {
			return !!this.tally && !!this.rankedPairsResult && this.rankedPairsResult.winners.length > 0
		},
		// Layout for the lock-in graph SVG: nodes placed by "layer" (longest path from the winner),
		// edges trimmed to end at each node's circle rather than its center.
		graphLayout() {
			if (this.winnerIndex === null || !this.tally || !this.rankedPairsResult) return null
			const n = this.tally.proposalOrder.length
			const layers = this.computeGraphLayers(n, this.rankedPairsResult.edges, this.winnerIndex)
			const maxLayer = Math.max(...layers)
			const nodesByLayer = {}
			layers.forEach((layer, idx) => { (nodesByLayer[layer] = nodesByLayer[layer] || []).push(idx) })

			const width = 300
			const layerHeight = 70
			const nodeRadius = 18
			const nodes = []
			for (let layer = 0; layer <= maxLayer; layer++) {
				const idxs = nodesByLayer[layer] || []
				idxs.forEach((idx, pos) => {
					nodes.push({
						id: idx,
						letter: this.letterFor(idx),
						x: (width / (idxs.length + 1)) * (pos + 1),
						y: 26 + layer * layerHeight,
					})
				})
			}

			const nodeById = Object.fromEntries(nodes.map(node => [node.id, node]))
			const edges = this.rankedPairsResult.edges.map(edge => {
				const from = nodeById[edge.from]
				const to = nodeById[edge.to]
				const dx = to.x - from.x
				const dy = to.y - from.y
				const dist = Math.sqrt(dx * dx + dy * dy) || 1
				const gap = nodeRadius + 2
				return {
					x1: from.x + (dx / dist) * gap,
					y1: from.y + (dy / dist) * gap,
					x2: to.x - (dx / dist) * gap,
					y2: to.y - (dy / dist) * gap,
				}
			})

			return { width, height: 26 + (maxLayer + 1) * layerHeight, nodes, edges }
		},
	},
	created() {
		this.loading = true
		this.$store.setHeaderTitle(this.$t("pollWinnerPageTitle"))
		this.$store.setHeaderBackTarget({ name: "polls" })

		api.getPollById(this.pollId, true)
			.then(poll => {
				this.poll = poll
				if (poll?.status !== "FINISHED") return
				return api.getPublishedTally(this.pollId).then(tally => {
					this.tally = tally
					this.rankedPairsResult = calcRankedPairsResult(tally.duelMatrix)
					// Only celebrate a genuine single winner - never for a tie.
					if (this.rankedPairsResult.winners.length === 1) this.startConfetti()
				})
			})
			.catch(err => log.warn("Cannot load poll/tally for winner page, id=" + this.pollId, err))
			.finally(() => {
				this.loading = false
			})
	},
	mounted() {
		this.$root.scrollToTop()
	},
	beforeUnmount() {
		this.stopConfetti()
	},
	methods: {
		// A..Z, then a P<n> fallback -- a mobile team poll is never realistically going to have more
		// than 26 proposals, so this is a defensive fallback, not a real feature.
		letterFor(index) {
			return index < 26 ? String.fromCharCode(65 + index) : "P" + index
		},

		/**
		 * Layer every node by the longest path from the root along the locked-in edges (root = 0).
		 * The lock-in graph is guaranteed acyclic, so this relaxation loop always terminates.
		 */
		computeGraphLayers(n, edges, rootIndex) {
			const layer = new Array(n).fill(null)
			layer[rootIndex] = 0
			let changed = true
			while (changed) {
				changed = false
				for (const edge of edges) {
					if (layer[edge.from] === null) continue
					const candidate = layer[edge.from] + 1
					if (layer[edge.to] === null || candidate > layer[edge.to]) {
						layer[edge.to] = candidate
						changed = true
					}
				}
			}
			// A node the winner cannot reach at all (only possible with incomplete ballots) still
			// needs a position - fall back to layer 1 rather than leaving it unplaced.
			for (let i = 0; i < n; i++) if (layer[i] === null) layer[i] = 1
			return layer
		},

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

/* Pairwise breakdown list */
.pairwise-breakdown {
	margin-top: var(--unit);
	font-size: 0.9rem;
	color: var(--text-color);
}

.pairwise-breakdown ul {
	list-style: none;
	padding-left: 0;
	margin: 0.25rem 0 0;
}

.pairwise-breakdown li {
	margin-bottom: 0.3rem;
}

/* Tie edge case */
.tied-proposals-list {
	list-style: none;
	padding-left: 0;
	text-align: center;
	margin-top: var(--unit);
}

.tied-proposals-list li {
	margin-bottom: 0.4rem;
}

/* "Mehr details ..." toggle and its expandable content */
.more-details-wrapper {
	margin-top: var(--two);
}

.more-details-toggle {
	background: none;
	border: 1px solid var(--primary);
	color: var(--primary);
	border-radius: 999px;
	padding: 0.4rem 1rem;
	font-size: 0.85rem;
	display: inline-flex;
	align-items: center;
	gap: 0.4rem;
}

.more-details-section {
	margin-top: var(--unit);
}

.more-details-heading {
	color: var(--primary);
	font-size: 1rem;
	margin-top: var(--unit);
}

.matrix-legend {
	list-style: none;
	padding-left: 0;
	font-size: 0.85rem;
	margin-bottom: var(--unit);
}

.table-responsive {
	overflow-x: auto;
}

.duel-matrix-table {
	width: 100%;
	border-collapse: collapse;
	font-size: 0.85rem;
	text-align: center;
}

.duel-matrix-table th,
.duel-matrix-table td {
	border: 1px solid var(--secondary);
	padding: 0.3rem 0.5rem;
}

/* Ranked Pairs lock-in graph */
.ranked-pairs-graph {
	width: 100%;
	max-width: 320px;
	display: block;
	margin: 0 auto;
}

.graph-node-circle {
	fill: #ffffff;
	stroke: var(--secondary);
	stroke-width: 2;
}

.graph-node-circle.is-root {
	fill: #f5b301;
	stroke: #f5b301;
}

.graph-node-label {
	font-size: 0.7rem;
	font-weight: 600;
	text-anchor: middle;
	dominant-baseline: central;
}

.graph-edge {
	stroke: var(--secondary);
	stroke-width: 1.5;
}

.graph-arrowhead {
	fill: var(--secondary);
}
</style>
