<template>
	<div class="liquido-input">
		<label v-if="label" :for="id" :class="{ disabled: disabled }">
			{{ label }}
		</label>
		<input
			:id="id"
			:name="name"
			:value="modelValue"
			:class="validClass"
			:type="type"
			:placeholder="placeholder"
			:disabled="disabled"
			:required="required"
			:minLength="minLength"
			:maxLength="maxLength"
			:pattern="pattern"
			@input="onInput"
			@keyup="keyup"
			@blur="blur"
			class="form-control"
		>
		<div class="iconRight">
			<slot name="iconRight" />
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
 * 
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
	INVALID: 3,
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
		 * date|datetime-local|email|month|number|password|range|search|tel|text|time|url|week
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

		/** 
		 * In addition to the default "pattern" field supported by HTML5,
		 * you can provide a custom validation function that will be used to validate the input value.
		 * This will replace type, pattern, min- and max-length.
		 * Your function will receive the current value of the input element.
		 * It must return 
		 * - undefined when the input is "not validated yet" (state = null)
		 */
		validFunc: { type: Function, required: false, default: undefined },

	
	},
	emits: ["update:modelValue", "update:state", "keyup", "blur"],  // this event is emitted, when the value of the inner <input> changes.
	data() {
		return {
			/** Current state of the input field. See state "enum" */
			state: STATE.INIT,
			
			/** Function that will be used to validate the input value. */
			internalValidFunc: this.validFunc,
		}
	},
	computed: {


		/**
		 * Compute wether to add the is-valid or is-invalid pseudo class depending on the input's "state"
		 * If state == null, e.g. when the field was not validated at all yet, then no pseudo class is added.
		 */
		validClass() {
			return {
				"is-valid": this.state === STATE.VALID,
				"is-invalid": this.state === STATE.INVALID,  // bootstrap will then show red frame and icon at the right
				// all other states do not show any pseudo class
			}
		},

		showEmptyFeedback() {
			return this.state === STATE.INVALID && this.emptyFeedback && !this.modelValue
		},

		showInvalidFeedback() {
			return this.state === STATE.INVALID && this.invalidFeedback && this.modelValue && this.modelValue.length > 0
		},

		counterVal() {
			let len = this.modelValue ? this.modelValue.length : 0
			return len + "/" + this.maxlength
		},
		showCounterIfValid() {
			return this.showCounter && this.state === null
		}

		    //FIXME: Needs to be fixed for VUE3
		/**
		 * Connect all listeners from the parent directly to our INNER input element.
		 * https://vuejs.org/v2/guide/components-custom-events.html#Binding-Native-Events-to-Components
		 
		inputListeners: function () {
			let vm = this
			return Object.assign({},
				// We add all the listeners from the parent
				this.$listeners,
				// Then we can add custom listeners or override the
				// behavior of some listeners.
				{
					// This ensures that the component works with v-model
					input: function (event) {
						vm.$emit("input", event.target.value)
					},
					keyup: this.keyup,
					keydown: this.keydown,
					blur: this.blur,
				}
			)
		},
		*/
	},
	watch: {
		/** Watch internal state and publish it's value for parent components */
		"state": function() {
			this.$emit("update:state", this.state)
		}
	},
	created() {
		if (!this.internalValidFunc) this.internalValidFunc = this.defaultValidFunc
	},
	methods: {
		/**
		 * Check if the current value of the field is valid or not.
		 * This does not set any STATE, but only returns true or false.
		 * This is used by the defaultValidFunc and the custom validFunc.
		 * @param val the current value of the field
		 * @return true if the value is valid, false otherwise.
		 */
		defaultValidFunc(val) {
			if (this.modelValue && this.modelValue.length < this.minLength) return false
			if (this.modelValue && this.modelValue.length > this.maxLength) return false
			if (this.required && (!val || val.trim() === "" )) return false
			if (this.pattern) return new RegExp(this.pattern).test(val)
			switch (this.type.toLowerCase()) {
				case "email": return this.isValidEmail(val);
				case "mobilephone": return this.isValidMobilephone(val);
				case "number": return !isNaN(val);
				case "integer": return Number.isInteger(val);
				case "url": return this.isValidUrl(val);
				// type="password" must be validated through the pattern attribute, or a custom validFunc
				//TODO: DateInput, but that's another story! :-)
				default: return true
			}
		},
		isValidEmail(val) {
			return val && eMailRegEx.test(val)
		},
		isValidMobilephone(val) {
			return val && mobilephoneRegEx.test(val)
		},
		isValidUrl(val) {
			return val && urlRegEx.test(val)
		},

		/** 
		 * When DOM input event is fired on the inner HTML <input>, 
		 * then fire VUE update event, so that the parent component's value 
		 * can be updated. */
		onInput(evt) {
			this.$emit('update:modelValue', evt.target.value)
		},

		/** prevent entering more than maxlength digits for type="number". (For type="text" the browser does that) */
		keydown(evt) {
			if ((this.type === "number" || this.type === "integer") && 
					/[0-9]/.test(evt.key) && 
					this.modelValue && this.modelValue.length >= this.maxlength) 
			{
				evt.preventDefault()
				evt.stopPropagation()
				return false
			} else {
				this.$emit("keydown", evt) // let event bubble up
			}
		},

		keyup(evt) {
			this.validateField()
			this.$emit("keyup", evt) // let event bubble up (make it possible for parent component to also react to a @keyup event.)
		},

		blur(evt) {
			this.validateField(true) 
			this.$emit("blur", evt)
		},

		/**
		 * Validate the current value of the field by calling the internalValidFunc and then set state to VALID or INVALID.
		 * If the field is still in INIT state we only set it to VALID if it becomes valid. We do not set it to INVALID yet,
		 * becasue we don't want to show any error message while the user is still typing.
		 */
		validateField(force = false) {
			if (this.state === STATE.VALIDATING) return 		// don't validate again if already validating
			let previouState = this.state
			this.state = STATE.VALIDATING
			let result = this.internalValidFunc(this.modelValue)
			if (result === true) {
				this.state = STATE.VALID;
			} else if (result === false && (previouState !== STATE.INIT || force)) {
				this.state = STATE.INVALID;
			} else {
				this.state = STATE.INIT;
			}
		}

	}
}
</script>

<style lang="scss">
.liquido-input {
	position: relative;
	padding-top: 12px;  // need some space for the label
	
	input::placeholder {
		color: lightgrey
	}

	label {
		position: absolute;
		color: lightgrey;
		font-size: 12px;
		font-weight: normal;
		top: 3px;
		left: 10px;
		padding: 0 3px;
		background: white;
		border-radius: 5px;
		&.disabled {
			background-color: #e9ecef;
		}
	}

	.iconRight {
		position: absolute;
		top: 18px;
		right: 10px;
	}

	.counter {
		color: grey;
		position: absolute;
		top: 18px;
		right: 10px;
	}
}
</style>
