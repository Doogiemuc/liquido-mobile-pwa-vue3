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

/**
 * showEmptyAsError only ever changes what the user SEES. The field's validity is untouched, which is
 * the whole point: a form gating its submit button on the emitted state must still refuse to submit.
 */
describe("liquido-input showEmptyAsError", () => {

	/** Mount a required field and blur it, which is what forces validation of an untouched field. */
	const mountAndBlur = async (props = {}) => {
		const wrapper = mount(LiquidoInput, {
			props: {
				id: "nickname",
				modelValue: "",
				required: true,
				emptyFeedback: "Bitte ausfüllen",
				invalidFeedback: "Zu kurz",
				...props,
			},
		})
		await wrapper.find("input").trigger("blur")
		await flush()
		return wrapper
	}

	test("by default an empty required field IS shown as an error", async () => {
		const wrapper = await mountAndBlur()

		expect(wrapper.vm.state).toBe(STATE.INVALID)
		expect(wrapper.find("input").classes()).toContain("is-invalid")
		expect(wrapper.text()).toContain("Bitte ausfüllen")
	})

	test("with showEmptyAsError=false the field is still INVALID", async () => {
		const wrapper = await mountAndBlur({ showEmptyAsError: false })

		// The state must NOT soften - this is what keeps a form un-submittable.
		expect(wrapper.vm.state).toBe(STATE.INVALID)
		expect(wrapper.emitted("update:state").at(-1)).toEqual([STATE.INVALID])
	})

	test("with showEmptyAsError=false the input gets no red border and no message", async () => {
		const wrapper = await mountAndBlur({ showEmptyAsError: false })

		const input = wrapper.find("input")
		expect(input.classes()).not.toContain("is-invalid")
		expect(input.classes()).not.toContain("is-valid")   // neutral, not green either
		expect(wrapper.text()).not.toContain("Bitte ausfüllen")
	})

	test("showEmptyAsError=false still shows a NON-empty wrong value as an error", async () => {
		// The suppression is only about emptiness. A value the user actually typed and got wrong is
		// still their mistake to correct, so it stays red.
		const wrapper = await mountAndBlur({ showEmptyAsError: false, minLength: 5 })
		await wrapper.setProps({ modelValue: "abc" })
		await flush()

		expect(wrapper.vm.state).toBe(STATE.INVALID)
		expect(wrapper.find("input").classes()).toContain("is-invalid")
		expect(wrapper.text()).toContain("Zu kurz")
	})

	test("showEmptyAsError=false goes green once a valid value is entered", async () => {
		const wrapper = await mountAndBlur({ showEmptyAsError: false })
		await wrapper.setProps({ modelValue: "Robert" })
		await flush()

		expect(wrapper.vm.state).toBe(STATE.VALID)
		expect(wrapper.find("input").classes()).toContain("is-valid")
	})

	test("clearing the field again returns it to the quiet INVALID look", async () => {
		const wrapper = await mountAndBlur({ showEmptyAsError: false })
		await wrapper.setProps({ modelValue: "Robert" })
		await flush()
		await wrapper.setProps({ modelValue: "" })
		await flush()

		expect(wrapper.vm.state).toBe(STATE.INVALID)
		expect(wrapper.find("input").classes()).not.toContain("is-invalid")
	})
})

/**
 * A floating label starts inside the field, standing in for the placeholder, and moves out on first
 * focus. The move is one-way on purpose - a label that dropped back in whenever the field was emptied
 * would flicker at the user for no benefit.
 */
describe("liquido-input floatingLabel", () => {

	const mountInput = (props = {}) => mount(LiquidoInput, {
		props: {
			id: "nickname",
			label: "Dein Spitzname",
			placeholder: "z.B. Robert",
			modelValue: "",
			...props,
		},
	})

	const isInside = wrapper => wrapper.find("label").classes().includes("floating-inside")

	test("without the flag the label never sits inside, and the placeholder is used as normal", () => {
		const wrapper = mountInput()

		expect(isInside(wrapper)).toBe(false)
		expect(wrapper.find("input").attributes("placeholder")).toBe("z.B. Robert")
	})

	test("with the flag the label starts inside the field and replaces the placeholder", () => {
		const wrapper = mountInput({ floatingLabel: true })

		expect(isInside(wrapper)).toBe(true)
		// Rendering both would print two texts on top of each other.
		expect(wrapper.find("input").attributes("placeholder")).toBeUndefined()
	})

	test("first focus moves the label out of the field", async () => {
		const wrapper = mountInput({ floatingLabel: true })

		await wrapper.find("input").trigger("focus")

		expect(isInside(wrapper)).toBe(false)
		expect(wrapper.vm.hasFloated).toBe(true)
	})

	test("it never drops back in, even after the field is cleared again", async () => {
		const wrapper = mountInput({ floatingLabel: true })
		await wrapper.find("input").trigger("focus")
		await wrapper.setProps({ modelValue: "Robert" })
		await wrapper.find("input").trigger("blur")
		await flush()

		await wrapper.setProps({ modelValue: "" })   // user deleted everything again
		await wrapper.find("input").trigger("blur")
		await flush()

		expect(isInside(wrapper)).toBe(false)
	})

	test("a field that already has a value starts floated, so the label never covers the text", () => {
		// Prefilled v-model. Without this the label would render on top of the existing value.
		const wrapper = mountInput({ floatingLabel: true, modelValue: "Robert" })

		expect(isInside(wrapper)).toBe(false)
		expect(wrapper.vm.hasFloated).toBe(true)
	})

	test("a value arriving without any focus still floats the label (browser autofill)", async () => {
		const wrapper = mountInput({ floatingLabel: true })
		expect(isInside(wrapper)).toBe(true)

		// Autofill sets the value without the field ever being focused.
		await wrapper.setProps({ modelValue: "autofilled@example.com" })
		await flush()

		expect(isInside(wrapper)).toBe(false)
	})

	test("floatingLabel without a label leaves the placeholder alone", () => {
		// Nothing to float, so there is nothing standing in for the placeholder either.
		const wrapper = mountInput({ floatingLabel: true, label: undefined })

		expect(wrapper.find("input").attributes("placeholder")).toBe("z.B. Robert")
	})
})

/**
 * The eye on a password field is a HOLD, not a toggle: the password is visible only while the pointer
 * is down. The subtle part is releasing somewhere else - see the setPointerCapture test.
 */
describe("liquido-input password reveal", () => {

	const mountPassword = () => mount(LiquidoInput, {
		props: { id: "pwd", type: "password", modelValue: "GeheimesPasswort" },
	})

	const inputType = wrapper => wrapper.find("input").attributes("type")

	test("the password is hidden until the eye is pressed", () => {
		const wrapper = mountPassword()
		expect(inputType(wrapper)).toBe("password")
	})

	test("holding the eye reveals it, releasing hides it again", async () => {
		const wrapper = mountPassword()
		const eye = wrapper.find(".password-toggle")

		await eye.trigger("pointerdown")
		expect(inputType(wrapper)).toBe("text")

		await eye.trigger("pointerup")
		expect(inputType(wrapper)).toBe("password")
	})

	test("an interrupted gesture hides it too", async () => {
		const wrapper = mountPassword()
		const eye = wrapper.find(".password-toggle")

		await eye.trigger("pointerdown")
		// The browser fires pointercancel when the gesture is taken away, e.g. switching apps mid-press.
		await eye.trigger("pointercancel")

		expect(inputType(wrapper)).toBe("password")
	})

	test("the pointer is captured, so a release anywhere still hides the password", async () => {
		// This is the whole reason for pointer events here. Without capture, pointerup is delivered to
		// whatever sits under the cursor, the reveal is never undone, and the password stays on screen
		// until the next click - which is what made the eye behave like a toggle.
		const wrapper = mountPassword()
		const eye = wrapper.find(".password-toggle")
		const captured = []
		eye.element.setPointerCapture = id => captured.push(id)

		await eye.trigger("pointerdown", { pointerId: 42 })

		expect(captured).toEqual([42])
	})

	test("a non-password field has no eye at all", () => {
		const wrapper = mount(LiquidoInput, { props: { id: "nick", type: "text", modelValue: "" } })
		expect(wrapper.find(".password-toggle").exists()).toBe(false)
	})
})

/**
 * The component accepts Number values as well as Strings. The trap throughout is that a plain falsy
 * test reports the number 0 as an empty field.
 */
describe("liquido-input Number and String values", () => {

	const mountInput = (props = {}) => mount(LiquidoInput, {
		props: { id: "amount", modelValue: "", ...props },
	})

	test("the number 0 is a value, not an empty field", async () => {
		const wrapper = mountInput({ type: "number", required: true, modelValue: 0 })
		await wrapper.find("input").trigger("blur")
		await flush()

		expect(wrapper.vm.isEmpty).toBe(false)
		expect(wrapper.vm.state).toBe(STATE.VALID)
	})

	test("the string \"0\" is a value too", async () => {
		const wrapper = mountInput({ required: true, modelValue: "0" })
		await wrapper.find("input").trigger("blur")
		await flush()

		expect(wrapper.vm.state).toBe(STATE.VALID)
	})

	test("a field holding 0 starts with its floating label already out of the way", () => {
		// !!0 is false, so a falsy check would park the label on top of the zero.
		const wrapper = mountInput({ type: "number", modelValue: 0, floatingLabel: true, label: "Anzahl" })
		expect(wrapper.find("label").classes()).not.toContain("floating-inside")
	})

	test("an optional empty field is VALID; a required empty one is not", async () => {
		const optional = mountInput({ type: "email", modelValue: "" })
		await optional.find("input").trigger("blur")
		await flush()
		expect(optional.vm.state).toBe(STATE.VALID)

		const mandatory = mountInput({ type: "email", modelValue: "", required: true })
		await mandatory.find("input").trigger("blur")
		await flush()
		expect(mandatory.vm.state).toBe(STATE.INVALID)
	})

	test("minLength / maxLength count characters, of a Number too", async () => {
		const wrapper = mountInput({ type: "number", minLength: 3, modelValue: 42 })
		await wrapper.find("input").trigger("blur")       // force validation, as a real blur would
		await flush()
		expect(wrapper.vm.state).toBe(STATE.INVALID)      // "42" is only 2 chars

		await wrapper.setProps({ modelValue: 421 })
		await flush()
		expect(wrapper.vm.state).toBe(STATE.VALID)
	})

	test("min / max constrain the numeric VALUE, not its length", async () => {
		const wrapper = mountInput({ type: "number", min: 10, max: 20, modelValue: 5 })
		await wrapper.find("input").trigger("blur")
		await flush()
		expect(wrapper.vm.state).toBe(STATE.INVALID)

		await wrapper.setProps({ modelValue: 15 })
		await flush()
		expect(wrapper.vm.state).toBe(STATE.VALID)

		await wrapper.setProps({ modelValue: 25 })
		await flush()
		expect(wrapper.vm.state).toBe(STATE.INVALID)
	})

	test("min / max are forwarded to the native input attributes", () => {
		const wrapper = mountInput({ type: "number", min: 10, max: 20 })
		expect(wrapper.find("input").attributes("min")).toBe("10")
		expect(wrapper.find("input").attributes("max")).toBe("20")
	})

	test("a number input emits a Number, not the raw String", async () => {
		const wrapper = mountInput({ type: "number" })
		const input = wrapper.find("input")
		input.element.value = "42"
		await input.trigger("input")

		expect(wrapper.emitted("update:modelValue").at(-1)).toEqual([42])
	})

	test("clearing a number input emits \"\", never 0", async () => {
		// Number("") is 0, so a naive conversion would turn a cleared field into a real zero.
		const wrapper = mountInput({ type: "number", modelValue: 42 })
		const input = wrapper.find("input")
		input.element.value = ""
		await input.trigger("input")

		expect(wrapper.emitted("update:modelValue").at(-1)).toEqual([""])
	})

	test("a text input still emits a String", async () => {
		const wrapper = mountInput({ type: "text" })
		const input = wrapper.find("input")
		input.element.value = "123"
		await input.trigger("input")

		expect(wrapper.emitted("update:modelValue").at(-1)).toEqual(["123"])
	})

	test("the character counter shows digits for a Number instead of undefined", () => {
		const wrapper = mountInput({ type: "number", modelValue: 1234, maxLength: 10 })
		expect(wrapper.vm.counterVal).toBe("4/10")
	})

	test("pattern is anchored, exactly like the native pattern attribute", async () => {
		const wrapper = mountInput({ pattern: "[0-9]{3}", modelValue: "abc123xyz" })
		await wrapper.find("input").trigger("blur")
		await flush()
		// Unanchored this would match somewhere inside and wrongly pass, disagreeing with the browser.
		expect(wrapper.vm.state).toBe(STATE.INVALID)

		await wrapper.setProps({ modelValue: "123" })
		await flush()
		expect(wrapper.vm.state).toBe(STATE.VALID)
	})

	test("whitespace is not a number", async () => {
		// Number("  ") is 0, not NaN, so a whitespace-only value must be rejected explicitly or it
		// validates as the number zero.
		//
		// Checked through validateField() rather than by blurring: a native number input sanitises its
		// own value, so the DOM has already turned "  " into "" before any blur handler sees it. The
		// value can still arrive programmatically, and validateField(force, val) is public API - it is
		// what proposal-add.vue calls through a ref.
		const wrapper = mountInput({ type: "number" })

		wrapper.vm.validateField(true, "  ")
		await flush()
		expect(wrapper.vm.state).toBe(STATE.INVALID)

		wrapper.vm.validateField(true, "42")
		await flush()
		expect(wrapper.vm.state).toBe(STATE.VALID)
	})
})
