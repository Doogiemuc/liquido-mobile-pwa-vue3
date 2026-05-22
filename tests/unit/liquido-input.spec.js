import { describe, test, expect, vi } from "vitest"
import { mount } from "@vue/test-utils"
import LiquidoInput, { STATE } from "@/components/liquido-input.vue"

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

describe("liquido-input async validFunc", () => {
	test("supports async validFunc and transitions to VALID", async () => {
		const validFunc = vi.fn(async (val) => val === "known@example.com")
		const wrapper = mount(LiquidoInput, {
			props: {
				id: "email",
				modelValue: "",
				validFunc,
			},
		})

		await wrapper.setProps({ modelValue: "known@example.com" })
		await flush()

		expect(wrapper.vm.state).toBe(STATE.VALID)
	})

	test("ignores stale async validator result", async () => {
		let firstResolve
		let secondResolve
		const validFunc = vi.fn((val) => {
			return new Promise(resolve => {
				if (val === "first@example.com") firstResolve = resolve
				if (val === "second@example.com") secondResolve = resolve
			})
		})

		const wrapper = mount(LiquidoInput, {
			props: {
				id: "email",
				modelValue: "",
				validFunc,
			},
		})

		await wrapper.setProps({ modelValue: "first@example.com" })
		await wrapper.setProps({ modelValue: "second@example.com" })

		firstResolve(false)
		secondResolve(true)
		await flush()
		await flush()

		expect(wrapper.vm.state).toBe(STATE.VALID)
	})
})
