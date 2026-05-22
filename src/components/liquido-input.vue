<template>
	<div class="liquido-input">

		<label v-if="label" :for="id" :class="{ disabled }">
			{{ label }}
		</label>

		<input ref="input" :id="id" :name="name" :value="modelValue" :class="validClass" :type="inputType"
			:placeholder="placeholder" :disabled="disabled" :required="required" :minlength="minLength" :maxlength="maxLength"
			:autocomplete="autocomplete" :pattern="pattern" class="form-control" @focus="onFocus" @input="onInput"
			@blur="onBlur" @keyup="$emit('keyup', $event)" @change="onChange" />

		<div class="iconRight">
			<slot name="iconRight" />
		</div>

		<!-- password eye icon that toggles -->
		<div v-if="type === 'password'" class="password-toggle" @mousedown.prevent="showPassword = true"
			@mouseup.prevent="showPassword = false" @mouseleave="showPassword = false"
			@touchstart.prevent="showPassword = true" @touchend.prevent="showPassword = false"
			@touchcancel.prevent="showPassword = false">

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
		modelValue: { type: String, required: false, default: undefined },

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

		/** Native HTML autocomplete hint, e.g. username/current-password/email */
		autocomplete: { type: String, default: undefined },

		/** Is input currently disabled */
		disabled: { type: Boolean, default: false },

		/** show a counter for number of characters until max-length, eg. "3/7" */
		showCounter: { type: Boolean, default: false },

		/** Is form value required? (default: false) If true then value must not be empty */
		required: { type: Boolean, default: false },

		/** Maximum character length of input */
		minLength: { type: Number, default: 0 },

		/** Maximum character length of input (default: 1024)*/
		maxLength: { type: Number, default: 1024 },

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
		}
	},

	computed: {

		/**
		 * Compute wether to add the is-valid or is-invalid pseudo class depending on the input's "state"
		 * If state == null, e.g. when the field was not validated at all yet, then no pseudo class is added.
		 */
		validClass() {
			return {
				"is-valid": this.state === STATE.VALID && !this.disabled,
				"is-invalid": this.state === STATE.INVALID,  // bootstrap will then show red frame and icon at the right
				// all other states do not show any pseudo class
			}
		},

		showEmptyFeedback() {
			return this.state === STATE.INVALID &&
				this.emptyFeedback &&
				!this.modelValue
		},

		showInvalidFeedback() {
			return this.state === STATE.INVALID &&
				this.invalidFeedback &&
				this.modelValue
		},

		showFeedbackPlaceholder() {
			return this.feedbackPlaceholder &&
				!this.showInvalidFeedback &&
				!this.showEmptyFeedback
		},

		counterVal() {
			const len = this.modelValue
				? this.modelValue.length
				: 0
			return `${len}/${this.maxLength}`
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

		onFocus() {
			if (!this.disabled) this.isEditing = true
		},

		onInput(evt) {
			if (!this.disabled) this.isEditing = true
			this.$emit("update:modelValue", evt.target.value)
		},

		onChange(evt) {
			if (!this.disabled) this.isEditing = true
			// Safari/iOS autofill may update on change without firing the expected input sequence.
			this.$emit("update:modelValue", evt.target.value)
			this.$emit("change", evt)
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

			if (this.required && (!val || val.trim() === ""))
				return false

			if (val && val.length < this.minLength)
				return false

			if (val && val.length > this.maxLength)
				return false

			if (this.pattern)
				return new RegExp(this.pattern).test(val)

			switch (this.type.toLowerCase()) {

				case "email":
					return eMailRegEx.test(val)

				case "mobilephone":
					return mobilephoneRegEx.test(val)

				case "number":
					return !isNaN(val)

				case "url":
					return urlRegEx.test(val)

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
}

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

	&.disabled {
		background-color: var(--subtle-bg);
	}
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

.liquido-input .form-control:disabled {
	background-color: var(--subtle-bg);
}
</style>
