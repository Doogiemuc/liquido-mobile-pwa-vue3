/**
 * Ranked Pairs (Tideman method) lock-in algorithm, ported from the backend's
 * `org.liquido.vote.RankedPairVoting` / `ComparisonComparator` / `DirectedGraph` so that a client
 * can independently recompute a poll's winner(s) from the published duel matrix alone. This is
 * the same "universal verifiability" idea `PublishedTally` on the backend documents: the duel
 * matrix plus this algorithm is everything needed, no trust in the server's own winnerId required.
 *
 * @param {number[][]} duelMatrix square matrix, duelMatrix[i][j] = ballots preferring i over j.
 * @returns {{ edges: Array<{from:number,to:number,votes:number}>, winners: number[] }}
 *   `edges` is the locked-in directed graph (winner -> loser). `winners` are the graph's sources,
 *   i.e. nodes with no incoming edge. In nearly every real case there is exactly one.
 */
export function calcRankedPairsResult(duelMatrix) {
	const n = duelMatrix.length

	// TALLY: for each pair (i, j) keep only the winning side. Ties (equal votes both ways) are
	// discarded -- they don't affect the outcome.
	const comparisons = []
	for (let i = 0; i < n - 1; i++) {
		for (let j = i + 1; j < n; j++) {
			const votesIJ = duelMatrix[i][j]
			const votesJI = duelMatrix[j][i]
			if (votesIJ > votesJI) comparisons.push({ winner: i, loser: j, votes: votesIJ })
			else if (votesJI > votesIJ) comparisons.push({ winner: j, loser: i, votes: votesJI })
		}
	}

	// SORT: more winner-votes first; where equal, fewer loser-votes first.
	comparisons.sort((c1, c2) => {
		const supportDiff = c2.votes - c1.votes
		if (supportDiff !== 0) return supportDiff
		return duelMatrix[c1.loser][c1.winner] - duelMatrix[c2.loser][c2.winner]
	})

	// LOCK IN: add each comparison as a directed edge winner -> loser, unless that would close a
	// cycle (i.e. loser can already reach winner).
	const adjacency = Array.from({ length: n }, () => new Set())
	const reachable = (from, to) => {
		const visited = new Set()
		const stack = [from]
		while (stack.length > 0) {
			const current = stack.pop()
			if (visited.has(current)) continue
			visited.add(current)
			if (adjacency[current].has(to)) return true
			for (const neighbor of adjacency[current]) {
				if (!visited.has(neighbor)) stack.push(neighbor)
			}
		}
		return false
	}

	const edges = []
	for (const comparison of comparisons) {
		if (!reachable(comparison.loser, comparison.winner)) {
			adjacency[comparison.winner].add(comparison.loser)
			edges.push({ from: comparison.winner, to: comparison.loser, votes: comparison.votes })
		}
	}

	// WINNERS: the graph's sources, i.e. nodes with no incoming edge.
	const hasIncoming = new Set()
	for (const neighbors of adjacency) {
		for (const to of neighbors) hasIncoming.add(to)
	}
	const winners = []
	for (let i = 0; i < n; i++) {
		if (!hasIncoming.has(i)) winners.push(i)
	}

	return { edges, winners }
}
