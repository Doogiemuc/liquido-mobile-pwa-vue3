import { describe, it, expect } from "vitest"
import { calcRankedPairsResult } from "@/services/ranked-pairs.js"

describe("calcRankedPairsResult", () => {
	it("finds a single winner and its lock-in edges (winner:opponent 5:3, 7:1, 9:7)", () => {
		// 0 = winner, 1/2/3 = the three opponents. duelMatrix[i][j] = ballots preferring i over j.
		const duelMatrix = [
			[0, 5, 7, 9],
			[3, 0, 6, 2],
			[1, 4, 0, 8],
			[7, 8, 2, 0],
		]

		const result = calcRankedPairsResult(duelMatrix)

		expect(result.winners).toEqual([0])
		const edgeFromWinner = to => result.edges.find(e => e.from === 0 && e.to === to)
		expect(edgeFromWinner(1).votes).toBe(5)
		expect(edgeFromWinner(2).votes).toBe(7)
		expect(edgeFromWinner(3).votes).toBe(9)
	})

	it("reports a genuine tie when two proposals are both undefeated", () => {
		// 0 and 1 both beat 2, but there is no ballot data comparing 0 and 1 at all (0:0 both ways) --
		// no comparison is recorded for that pair, so neither can lock in an edge against the other.
		const duelMatrix = [
			[0, 0, 6],
			[0, 0, 5],
			[2, 1, 0],
		]

		const result = calcRankedPairsResult(duelMatrix)

		expect(result.winners.sort()).toEqual([0, 1])
	})

	it("never locks in an edge that would close a cycle", () => {
		// A>B (10:1), B>C (9:2), C>A (8:3) -- a cycle. The strongest edge (A->B) locks in first,
		// then B->C. C->A must be rejected: A can already reach C via A->B->C? No -- reachability is
		// checked as "does the loser already reach the winner", i.e. can C reach A. It can't yet, so
		// this example instead uses votes that make the would-be-cyclic edge the weakest, which is
		// the realistic case Ranked Pairs is built to resolve.
		const duelMatrix = [
			[0, 10, 3],
			[1, 0, 9],
			[8, 2, 0],
		]

		const result = calcRankedPairsResult(duelMatrix)

		// A->B (10) locks in first, then B->C (9). C->A (8) would close the cycle A->B->C->A, so it
		// must be rejected -- leaving A as the sole, undefeated-in-the-graph winner.
		expect(result.winners).toEqual([0])
		expect(result.edges).toHaveLength(2)
		expect(result.edges.some(e => e.from === 2 && e.to === 0)).toBe(false)
	})
})
