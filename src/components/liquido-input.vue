<template>
	<div class="liquido-input">

		<label v-if="label" :for="id" :class="{ disabled, 'floating-inside': labelIsInsideField }">
			{{ label }}
		</label>

		<input ref="input" :id="id" :name="name" :value="modelValue" :class="validClass" :type="inputType"
			:placeholder="inputPlaceholder" :disabled="disabled" :required="required" :minlength="minLength" :maxlength="maxLength" :min="min" :max="max"
			:autocomplete="autocomplete" :pattern="pattern" class="form-control" @focus="onFocus" @input="onInput"
			@blur="onBlur" @keyup="$emit('keyup', $event)" @change="onChange" />

		<div class="iconRight">
			<slot name="iconRight" />
		</div>

		<!-- Press and HOLD the eye to reveal the password. Releasing hides it again. Never a toggle. -->
		<div v-if="type === 'password'" class="password-toggle"
			@pointerdown.prevent="revealPassword"
			@pointerup="hidePassword"
			@pointercancel="hidePassword">

			<svg v-if="!showPassword" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"
				viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5
             c4.478 0 8.268 2.943 9.542 7
             -1.274 4.057-5.064 7-9.542 7
             -4.477 0-8.268-2.943-9.542-7z" />
			</svg>

			<svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24"
				stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19
             c-4.478 0-8.268-2.943-9.542-7
             a9.956 9.956 0 012.293-3.95M6.62 6.62
             A9.956 9.956 0 0112 5c4.478 0
             8.268 2.943 9.542 7
             a9.956 9.956 0 01-4.293 5.95M15 12
             a3 3 0 11-6 0 3 3 0 016 0z" />
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3l18 18" />
			</svg>

		</div>

		<div v-if="showCounterIfValid" class="counter">
			{{ counterVal }}
		</div>

		<div v-if="showInvalidFeedback" class="invalid-feedback">
			{{ invalidFeedback }}
		</div>

		<div v-if="showEmptyFeedback" class="invalid-feedback">
			{{ emptyFeedback }}
		</div>

		<div v-if="showFeedbackPlaceholder" class="invalid-feedback-placeholder">
			&nbsp;
			<!-- This div is only used to reserve space for the invalid feedback text, so that the input field does not jump up and down -->
		</div>

	</div>
</template>

<script>

/**
 * <h1>HTML5 compliant input field with input validation</h1>
 * 
 * Designing an input field is a much more delicate task than it seems at first sight. The best user experience is when the user 
 * doesn't even notice any distraction. The input field shall only show validation error messsages when really necessary.
 * 
 * <h3>Our liquido-input field can have one of the following states</h3
 * <li>INIT - the field has not been validated yet. No error message shown. It's model value is <pre>undefined</pre></li>
 * <li>VALIDATING - the field is currently being validated. A spinning wheel can be shown as long as the validation function is running.  TODO:</li>  
 * <li>VALID - the field has been validated and is valid. Show green checkmark icon and valid-feedback message.</li>
 * <li>INVALID - the field has been validated and is invalid. Show red cross icon and invalid-feedback message.</li>
 * 
 * <h3>You can choose when the fields value shall be validated</h3>
 * <li>on blur - when the field loses focus (default)</li>
 * <li>on keyup - when the user presses a key and releases it.</li>
 * 
 * <h3>When to validate the field?</h3>
 * An input field can validated when the user leaves the field (on blur) or when the user presses a key and releases it (on keyup).
 * There is one catch. When the user starts typing for the first time, then the partial value of only the first few characters is most likely not complettely valid yet.
 * But we do not want to show an error message yet. So we have the following rules:
 * <li>When the user starts typing, then the field is still in INIT state. No error message is shown.</li>
 * <li>When the value becomes valid for the first time, then the field is marked as valid and shown in green.
 * <li>When the user leaves the field, then it is <b>always</b> validated and the state is set to VALID or INVALID.</li>
 * <li>
 * If the user leaves the field for the first time, then the field is validated and the state is set to VALID or INVALID.
 * 
 * An error message will only be shown after a field has been validated.
 *
 * <h3>An empty field is not always a mistake</h3>
 * Pass <pre>:show-empty-as-error="false"</pre> on a required field to keep it looking untouched while it
 * is still empty. It stays INVALID - so a form cannot be submitted - but gets no red border and no
 * emptyFeedback. A non-empty but wrong value is still shown in red.
 *
 * <h3>Floating labels</h3>
 * With <pre>:floating-label="true"</pre> the label starts inside the field, looking like placeholder
 * text, and animates up onto the border on first focus. It never animates back. The placeholder prop
 * is ignored in that mode - the label already plays that role.
 *
 * <h3>Example Usage</h3> 
 *
 * <liquido-input v-model="postTitle" id="postTitleInput" label="Post title" :validFunc="isTitleValid"></liquido-input>
 */


// simple email validation
const eMailRegEx = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,256}$/

// simplified regular expresion for validating a URL (not necessarily http, could also be ftp://)
const urlRegEx = /[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/

// Very tolerant validation of mobilephonen number. With our without country prefix.
// https://stackoverflow.com/questions/123559/how-to-validate-phone-numbers-using-regex
// https://github.com/google/libphonenumber/blob/master/FALSEHOODS.md    :-)  https://github.com/jameslk/awesome-falsehoods
// If you need even more sophisticated validations, consider using validator-js
const mobilephoneRegEx = /\+?[0-9/\- ]{6,50}$/


/**
 * Is this value "nothing"? Only null, undefined and "" are.
 *
 * Deliberately NOT a falsy test. This component supports Number values as well as Strings, and the
 * number 0 is a perfectly good value - as is the string "0". A plain `!val` check reports both as an
 * empty field, which then makes a required field with a legitimate 0 in it fail validation.
 */
function isEmptyValue(val) {
	return val === undefined || val === null || val === ""
}

/** The value as text, for the length checks and the character counter. "" for an empty value. */
function asText(val) {
	return isEmptyValue(val) ? "" : String(val)
}

export const STATE = Object.freeze({
	INIT: 0,
	VALIDATING: 1,
	VALID: 2,
	INVALID: 3
})

export default {

	name: "LiquidoInput",

	props: {
		/** ID that will be set directly on the inner HTML <input> DOM element */
		id: { type: String, required: true },

		/** Vue3 reactive value that can be bound as v-model. NEW NAME "modelValue" IN VUE3!!! */
		modelValue: { type: null, required: false, default: undefined },

		/** 
		 * Type of the input: (default: text)
		 * test|password|date|datetime-local|email|month|number|password|range|search|tel|text|time|url|week
		 * liquido-input adds the type mobilephone, that validates mobilephone numbers (as good as locally possible).
		 * Will be set as "type" attribute of the inner input element that will be evaluated by modern browsers.
		 * https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input
		 */
		type: { type: String, required: false, default: "text" },

		/** Name for the input element (optional) */
		name: { type: String, default: "" },

		/** Label shown above the input element (optional) */
		label: { type: String, default: undefined },

		/** Placeholder text shown dimmed inside the input (optional) */
		placeholder: { type: String, default: undefined },

		/**
		 * Show the label INSIDE the field until it is first focused? (default: false)
		 *
		 * A floating label starts out looking exactly like placeholder text, sitting in the field. On
		 * the first focus it animates up into its resting position on the border and shrinks. That is
		 * a ONE-WAY trip: it never drops back in, not even after the user clears the field again. A
		 * label that bounced in and out on every focus would be far more distracting than useful, and
		 * once the user has seen the field there is nothing left to explain.
		 *
		 * While the label is still inside the field it IS the placeholder, so the `placeholder` prop is
		 * silently ignored to avoid printing two texts on top of each other. The prop itself stays
		 * available for ordinary (non-floating) fields, where a label and a placeholder say different
		 * things - e.g. label "Handynummer" with placeholder "+49 555 111111" to show the format.
		 */
		floatingLabel: { type: Boolean, default: false },

		/** Native HTML autocomplete hint, e.g. username/current-password/email */
		autocomplete: { type: String, default: undefined },

		/** Is input currently disabled */
		disabled: { type: Boolean, default: false },

		/** show a counter for number of characters until max-length, eg. "3/7" */
		showCounter: { type: Boolean, default: false },

		/** Is form value required? (default: false) If true then value must not be empty */
		required: { type: Boolean, default: false },

		/**
		 * Should an EMPTY value be shown to the user as an error? (default: true)
		 *
		 * Set this to false for a required field that the user simply has not filled in yet. The field
		 * still counts as INVALID - it still emits update:state INVALID, so a form gating its submit
		 * button on the field states stays un-submittable - but it is not painted red and no
		 * emptyFeedback is shown. Only the *view* changes, never the validity.
		 *
		 * This exists because "you have not typed anything yet" is not a mistake worth shouting about.
		 * A field the user has merely tabbed through should look untouched, not failed. An actually
		 * WRONG value (too short, malformed email, ...) is still shown in red as usual, because there
		 * the user did something they need to correct.
		 */
		showEmptyAsError: { type: Boolean, default: true },

		/**
		 * Minimum number of CHARACTERS (default: 0).
		 *
		 * Note the capitalisation: in a template this is `:min-length` or `:minLength`. An all-lowercase
		 * `:minlength` is neither, so Vue does not recognise it as a prop - it silently falls through
		 * onto the wrapper div and the limit never reaches the input. Same for maxLength.
		 */
		minLength: { type: Number, default: 0 },

		/** Maximum number of CHARACTERS (default: 1024). See the capitalisation note on minLength. */
		maxLength: { type: Number, default: 1024 },

		/**
		 * Minimum / maximum numeric VALUE, for type="number". Also set as the native min/max attributes.
		 *
		 * These are about the value, minLength/maxLength are about how many characters it is written
		 * with - a distinction the native attributes make too, where minlength/maxlength are ignored
		 * on a number input entirely.
		 */
		min: { type: Number, default: undefined },

		max: { type: Number, default: undefined },

		/** 
		 * Regular expression pattern for format of input for type=text|password|tel
		 * This is also directly interpreted by modern browsers.
		 * https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/pattern
		 */
		pattern: { type: String, default: undefined },

		/** Text to show below the input when value has been validated before and is invalid. (optional) */
		invalidFeedback: { type: String, default: undefined },

		/** You can set an extra message when the field is invalid and empty. */
		emptyFeedback: { type: String, default: undefined },

		/** Reserve space below the input field for the invalid/emptyFeedback text. */
		feedbackPlaceholder: { type: Boolean, default: false },

		validFunc: { type: Function }

	},

	emits: [
		"update:modelValue",
		"update:state",
		"keyup",
		"blur",
		"change"
	],

	data() {
		return {
			/** Current state of the input field. See state "enum" */
			state: STATE.INIT,

			/** Function that will be used to validate the input value. */
			internalValidFunc: this.validFunc,
			showPassword: false,
			isEditing: false,
			validationRunId: 0,

			/**
			 * Has a floatingLabel already moved out of the field? Latches to true and never back.
			 * Starts true when the field already has a value, because a label parked on top of existing
			 * text would be unreadable - that happens with a prefilled v-model and with browser autofill.
			 */
			hasFloated: !isEmptyValue(this.modelValue),
		}
	},

	computed: {

		/** A floatingLabel that has not been focused yet, i.e. still parked inside the input. */
		labelIsInsideField() {
			return this.floatingLabel && !!this.label && !this.hasFloated
		},

		/**
		 * A floating label stands in for the placeholder, so showing both would print two texts over
		 * each other. Only suppressed when there is actually a label to float.
		 */
		inputPlaceholder() {
			return this.floatingLabel && this.label ? undefined : this.placeholder
		},

		/**
		 * Is there no value at all? Deliberately the same falsy test the required check in
		 * defaultValidFunc() uses, so that "empty" means one single thing across this component.
		 */
		isEmpty() {
			return isEmptyValue(this.modelValue)
		},

		/**
		 * The field is invalid ONLY because it is still empty, and the caller asked us not to make a
		 * fuss about that. Suppresses the red border and the message - never the INVALID state itself.
		 */
		suppressEmptyError() {
			return this.isEmpty && !this.showEmptyAsError
		},

		/**
		 * Compute wether to add the is-valid or is-invalid pseudo class depending on the input's "state"
		 * If state == null, e.g. when the field was not validated at all yet, then no pseudo class is added.
		 */
		validClass() {
			return {
				"is-valid": this.state === STATE.VALID && !this.disabled,
				// Still INVALID in state, just not painted red - see suppressEmptyError.
				"is-invalid": this.state === STATE.INVALID && !this.suppressEmptyError,  // bootstrap will then show red frame and icon at the right
				// all other states do not show any pseudo class
			}
		},

		showEmptyFeedback() {
			return this.state === STATE.INVALID &&
				this.emptyFeedback &&
				this.isEmpty &&
				!this.suppressEmptyError
		},

		showInvalidFeedback() {
			return this.state === STATE.INVALID &&
				this.invalidFeedback &&
				!this.isEmpty
		},

		showFeedbackPlaceholder() {
			return this.feedbackPlaceholder &&
				!this.showInvalidFeedback &&
				!this.showEmptyFeedback
		},

		counterVal() {
			// Via asText, so a Number value counts its digits instead of reading "undefined/1024".
			return `${asText(this.modelValue).length}/${this.maxLength}`
		},

		showCounterIfValid() {
			return this.showCounter &&
				this.state === STATE.VALID
		},

		inputType() {
			if (this.type === "password" && this.showPassword)
				return "text"
			return this.type
		}

	},

	watch: {

		modelValue(newVal) {
			// A value can arrive without any focus - prefilled v-model, browser autofill, paste via the
			// context menu. The label has to get out of its way even though onFocus never ran.
			if (!isEmptyValue(newVal)) this.hasFloated = true
			this.validateField(false, newVal)
		},

		disabled(isDisabled) {
			if (isDisabled) this.isEditing = false
		},

		state() {
			this.$emit("update:state", this.state)
		}

	},

	created() {
		if (!this.internalValidFunc)
			this.internalValidFunc = this.defaultValidFunc
	},

	mounted() {

		// handle autofill after mount
		if (this.modelValue) {
			this.validateField(false, this.modelValue)
		}

	},

	methods: {
		applyValidationResult(result, previousState, force, runId) {
			// Ignore stale async validator responses.
			if (runId !== this.validationRunId) return

			if (result === true) {
				this.state = STATE.VALID
			}
			else if (
				result === false &&
				(previousState !== STATE.INIT || force)
			) {
				this.state = STATE.INVALID
			}
			else {
				this.state = STATE.INIT
			}
		},

		/**
		 * Reveal the password for as long as the eye is held down.
		 *
		 * Pointer events rather than separate mouse+touch handlers, because the important part is
		 * setPointerCapture: it guarantees this element receives the matching pointerup even if the
		 * user drifts off the icon - or off the window entirely - before letting go. Without capture,
		 * pointerup lands on whatever is under the cursor instead, the reveal is never undone, and the
		 * password stays on screen until the next click. That stuck state is exactly what made this
		 * read as a toggle.
		 *
		 * preventDefault stops the pointerdown from moving focus out of the input.
		 */
		revealPassword(evt) {
			// Reveal FIRST, so that a capture that cannot be established still shows the password.
			this.showPassword = true
			try {
				// Optional-chained for engines without pointer capture, e.g. jsdom in the unit tests.
				evt.currentTarget?.setPointerCapture?.(evt.pointerId)
			} catch (err) {
				// setPointerCapture THROWS NotFoundError when the id is not an active pointer - which
				// happens if the pointer was already released, and for synthetic events. Capture is only
				// a robustness measure here; failing to get it degrades to the old "released elsewhere
				// leaves it revealed" behaviour, which is not worth taking down the handler for.
				console.debug("liquido-input: could not capture pointer for password reveal", err)
			}
		},

		/** Hide it again on release, and on pointercancel - the browser fires that if the gesture is
		 *  interrupted, e.g. by switching away mid-press. */
		hidePassword() {
			this.showPassword = false
		},

		onFocus() {
			if (this.disabled) return
			this.isEditing = true
			// The one-way trip out of the field. Never set back to false anywhere.
			this.hasFloated = true
		},

		onInput(evt) {
			if (!this.disabled) this.isEditing = true
			this.emitValue(evt.target.value)
		},

		onChange(evt) {
			if (!this.disabled) this.isEditing = true
			// Safari/iOS autofill may update on change without firing the expected input sequence.
			this.emitValue(evt.target.value)
			this.$emit("change", evt)
		},

		/**
		 * Emit the new value, as a Number for type="number" and as a String otherwise.
		 *
		 * evt.target.value is ALWAYS a String, even on a number input. Emitting it raw means a parent
		 * that binds a Number gets a String back after the first keystroke, and its own comparisons
		 * (v === 0, v > 10) quietly start behaving differently.
		 */
		emitValue(raw) {
			if (this.type === "number" && raw !== "") {
				const num = Number(raw)
				// Number("") is 0, which would turn a cleared field into a real zero - hence the guard
				// above. A non-numeric leftover is passed through untouched rather than becoming NaN.
				this.$emit("update:modelValue", Number.isNaN(num) ? raw : num)
			} else {
				this.$emit("update:modelValue", raw)
			}
		},

		onBlur(evt) {
			this.isEditing = false
			this.validateField(true, evt.target.value)
			this.$emit("blur", evt)
		},

		validateField(force = false, val = this.modelValue) {
			const runId = ++this.validationRunId
			const previousState = this.state
			this.state = STATE.VALIDATING
			let result
			try {
				result = this.internalValidFunc(val)
			} catch (err) {
				console.warn("liquido-input validateField failed", err)
				this.applyValidationResult(false, previousState, force, runId)
				return
			}

			// Support async custom validators: validFunc may return Promise<boolean>.
			if (result && typeof result.then === "function") {
				const VALIDATION_TIMEOUT_MS = 3000
				result
					.then(asyncResult => {
						this.applyValidationResult(asyncResult === true, previousState, force, runId)
					})
					.catch(err => {
						console.warn("liquido-input async validFunc failed", err)
						this.applyValidationResult(false, previousState, force, runId)
					})
				setTimeout(() => {
					if (runId !== this.validationRunId) return
					if (this.state === STATE.VALIDATING) {
						console.warn("liquido-input async validFunc timed out after", VALIDATION_TIMEOUT_MS, "ms")
						this.applyValidationResult(false, previousState, force, runId)
					}
				}, VALIDATION_TIMEOUT_MS)
				return
			}

			this.applyValidationResult(result === true, previousState, force, runId)
		},

		defaultValidFunc(val) {
			// Keep in mind that val is not necessarily a string! It may be a Number.

			// An EMPTY field is valid exactly when it is not required. Getting this wrong in either
			// direction is expensive: returning false for an optional empty field means every typed
			// field (email, url, mobilephone) calls "nothing entered" a mistake, which is why callers
			// ended up writing their own isOptionalXValid() wrappers.
			if (isEmptyValue(val))
				return !this.required

			// From here on there IS a value. Measure lengths on its text form, so that a Number is
			// counted by its digits rather than reading `undefined` off a non-string.
			const text = asText(val)

			if (text.length < this.minLength)
				return false

			if (text.length > this.maxLength)
				return false

			// Numeric range. Separate from the length checks above on purpose - min/max constrain the
			// VALUE, minLength/maxLength constrain how many characters it is written with.
			if (this.min !== undefined || this.max !== undefined) {
				// text.trim(), not Number(val) alone: Number("  ") is 0, so a whitespace-only value would
				// otherwise sail past a min of 0 as if the user had typed a zero.
				const num = text.trim() === "" ? NaN : Number(text)
				if (Number.isNaN(num)) return false
				if (this.min !== undefined && num < this.min) return false
				if (this.max !== undefined && num > this.max) return false
			}

			if (this.pattern)
				// Anchored, because that is what the native `pattern` attribute does: the browser
				// compiles it as ^(?:...)$ and matches the WHOLE value. An unanchored test here would
				// call "abc123xyz" valid for pattern="[0-9]{3}" while the browser rejected it, so the
				// component and the browser would disagree about the same field.
				return new RegExp(`^(?:${this.pattern})$`).test(text)

			switch (this.type.toLowerCase()) {

				case "email":
					return eMailRegEx.test(text)

				case "mobilephone":
					return mobilephoneRegEx.test(text)

				case "number":
					// Two guards, both needed. Number.isNaN rather than the global isNaN, which coerces
					// its argument first; and an explicit blank check, because Number("  ") is 0 rather
					// than NaN, so whitespace alone would otherwise validate as the number zero.
					return text.trim() !== "" && !Number.isNaN(Number(text))

				case "url":
					return urlRegEx.test(text)

				default:
					return true
			}

		}

	}

}

</script>

<style>
.liquido-input {
	position: relative;
	padding-top: 12px;

	.form-control::placeholder {
		color: var(--secondary, #959cab);
		opacity: 0.5;
	}

	/*
	 * Floating label: sits in the wrapper's 12px top padding so it overlaps the input's top border.
	 *
	 * Written as a bare "label" because CSS nesting already prefixes it with .liquido-input. Writing
	 * ".liquido-input label" here instead compiles to ".liquido-input .liquido-input label" - a
	 * wrapper nested inside itself - which matches nothing, and the labels drop back to static and
	 * stack above their input.
	 *
	 * This block is deliberately NOT scoped, and the .liquido-input prefix is what makes that safe: a
	 * bare unscoped "label" would style every <label> in the app, including checkbox labels, which
	 * then jump to the top-left corner of their nearest positioned ancestor. Keeping it unscoped is
	 * what lets other components opt in by putting the class on their own markup - proposal-add.vue's
	 * description field does exactly that.
	 */
	label {
		position: absolute;
		color: grey;
		font-size: 12px;
		font-weight: normal;
		top: 3px;
		left: 10px;
		padding: 0 3px;
		background: white;
		border-radius: 5px;

		/*
		 * Only ever plays in one direction: .floating-inside is removed on first focus and never put
		 * back, so this animates the label OUT of the field exactly once. Transform rather than
		 * top/font-size because those two cannot be composited and would jitter on a phone.
		 */
		transform-origin: left center;
		transition:
			transform 0.15s ease-out,
			color 0.15s ease-out,
			opacity 0.15s ease-out,
			background-color 0.15s ease-out;

		/*
		&.disabled {
			background-color: var(--light-bg);
		}
		*/
	}

	/*
	 * A floatingLabel before its first focus: parked inside the field, dressed exactly like the
	 * placeholder it stands in for (same colour and opacity as .form-control::placeholder above), and
	 * with no white pill, since it is sitting on the input's background rather than over its border.
	 *
	 * scale(1.3333) takes the 12px resting label to the 16px of Bootstrap's .form-control, and the
	 * translateY drops it onto the input's text line. Both values are tuned to the real rendered
	 * metrics - if .form-control's font-size or padding ever change, re-measure them.
	 */
	label.floating-inside {
		transform: translateY(19px) scale(1.3333);
		color: var(--secondary, #959cab);
		opacity: 0.5;
		background: transparent;

		/*
		 * A label parked inside the field has to stay inside it. Without a cap a long label runs past
		 * the right edge, and on a password field it collides with the eye toggle.
		 *
		 * The cap is a PRE-transform width, because max-width applies to the untransformed box: the
		 * label is then scaled by 4/3, so a rendered budget of B px needs max-width: 0.75 * B. That is
		 * where the 75% comes from - it is 100% of the wrapper reduced by the same 4/3.
		 * Budget here: full width minus the 10px left offset and the input's ~12px right padding.
		 */
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: calc(75% - 17px);
	}

	/*
	 * A password field also has the eye toggle at right:2em, roughly 52px of occupied space all in.
	 * Only these fields pay for that reserve - :has() keeps every other field on the wider budget
	 * above, so nothing truncates earlier than it must.
	 */
	&:has(> .password-toggle) label.floating-inside {
		max-width: calc(75% - 56px);
	}

	.iconRight {
		position: absolute;
		top: 18px;
		right: 0;
		user-select: none;
	}

	.password-toggle {
		position: absolute;
		top: 17px;
		right: 2em;
		color: lightgrey;
		user-select: none;
		/* Holding the eye must reveal the password, not start scrolling the page on a touch screen.
		   This replaces the @touchstart.prevent the old mouse/touch handler pair relied on. */
		touch-action: none;
	}

	.counter {
		position: absolute;
		top: 18px;
		right: 10px;
		color: grey;
	}

	.invalid-feedback-placeholder {
		/* same as bootstraps invalid-feedback */
		width: 100%;
		margin-top: 0.25rem;
		font-size: 0.875em;
	}

	/*
	.liquido-input .form-control:disabled {
		background-color: var(--disabled-bg);
	}
	*/
}
</style>
