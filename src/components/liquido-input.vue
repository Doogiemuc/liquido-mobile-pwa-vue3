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
			:minlength="minlength"
			:maxlength="maxlength"
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
		<div v-if="invalidFeedback" class="invalid-feedback">
			{{ invalidFeedback }}
		</div>
	</div>
</template>

<script>
/**
 * <h1>HTML form Input field with input validation feedback</h1>
 * 
 * This input field can have one of three states:
 *  - null:  Value has not been validated yet. Will not show any validation error message yet.
 *  - false: Value is currently invalid. Marked in red and show invalid-feedback message
 *  - true:  Value has been validated and is valid. Marked in green and may show valid-feedback message
 *
 * The one and only delicate logic for validating an input field
 * =============================================================
 *
 * Goal: Only ever show an error message, when the field was successfully valid before at least once or the user tried to submit the field.
 * 
 * When the field is new or untouched, then do not show any error message.
 * When the field is focused for the first time and the content may still be invalid, then do not show an error message yet.
 * While the user types for the first time, then do not show any validation error yet.
 *
 * When the field becomes valid for the first time, then show green success feedback.
 * When the user submits the field, eg. by pressing enter (or "done" on the iOS keyboard), then validate the field and show validation feedback message red or green.
 * When the <b>field was validated before</b>, then update the validation feedback message according to the current value.
 *
 *
 * <h3>Example Usage</h3> 
 *
 * <liquido-input v-model="postTitle" id="postTitleInput" label="Post title" :validFunc="isTitleValid" validateOn="blur"></liquido-input>
 */

// simple email validation
const eMailRegEx = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,64}$/

// simplified regular expresion for validating a URL (not necessarily http, could also be ftp://)
const urlRegEx = /[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/

// Very tolerant validation of mobilephonen number. With our without country prefix.
// https://stackoverflow.com/questions/123559/how-to-validate-phone-numbers-using-regex
// https://github.com/google/libphonenumber/blob/master/FALSEHOODS.md    :-)  https://github.com/jameslk/awesome-falsehoods
const mobilephoneRegEx = /\+?[0-9/\- ]{6,50}$/

//if you need more, consider using validator-js  but for now we'd like to stay withaout ANY dependencies here.

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

		/** 
		 * Regular expression pattern for format of input for type=text|password|tel
		 * This is  also directly interpreted by modern browsers.
		 * https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/pattern
		 */
		pattern: { type: String, default: undefined },

		/** Is form value required? (default: false) */
		required: { type: Boolean, default: false },

		/** Maximum character length of input */
		minlength: { type: Number, default: 0 },

		/** Maximum character length of input (default: 1024)*/
		maxlength: { type: Number, default: 1024 },

		/** show a counter for number of characters until max-length, eg. "3/7" */
		showCounter: { type: Boolean, default: false },

		/** Text to show below the input when value has been validated before and is invalid. (optional) */
		invalidFeedback: { type: String, default: undefined },

		/** 
		 * For complete freedom you can provide your own validation function. 
		 * This will replace type, pattern, min- and max-length.
		 * Your function will receive the current value of the input element.
		 * It must return true|false
		 */
		validFunc: { type: Function, required: false, default: undefined },

		/**
		 * When to validate the current value. Default: after each keypress ("keyup")
		 */
		validateOn: { type: String, required: false, default: "keyup" }, //TODO: these could be arrays, e.g. validateOn: ["keyup", "blur"]

		/**
		 * When to force a validation that will show valid- or invalid-feedback message. (default: "blur")
		 * You can set this to "keyup", then the first keypress will immideately show a validation feedback message below the input.
		 */
		forceValidateOn: { type: String, required: false, default: "blur" },
	},
	emits: ["update:modelValue", "update:state", "keyup", "blur"],  // this event is emitted, when the value of the inner <input> changes.
	data() {
		return {
			/**
			 * 'state' can be one of
			 * null  - field has not been validated yet. -> Do not show an error message yet
			 * false - fields value is currently invlaid -> show error message
			 * true  - fields value is valid -> show field in green with checkmark
			 */
			state: null,
			internalValidFunc: this.validFunc
		}
	},
	computed: {
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

		/**
		 * Compute wether to add the is-valid or is-invalid pseudo class depending on the input's "state"
		 * If state == null, e.g. when the field was not validated at all yet, then no pseudo class is added.
		 */
		validClass() {
			return {
				"is-valid": this.state === true,
				"is-invalid": this.state === false,  // bootstrap will then show red frame and icon at the right
				// state === null will set no class at all
			}
		},
		counterVal() {
			let len = this.modelValue ? this.modelValue.length : 0
			return len + "/" + this.maxlength
		},
		showCounterIfValid() {
			return this.showCounter && this.state === null
		}
	},
	watch: {
		"state": function() {
			this.$emit("update:state", this.state)
		}
	},
	created() {
		if (!this.internalValidFunc) this.internalValidFunc = this.defaultValidFunc
	},
	methods: {
		defaultValidFunc(val) {
			if (this.modelValue && this.modelValue.length < this.minlength) return false
			if (this.modelValue && this.modelValue.length > this.maxlength) return false
			if (this.required && !val) return false
			switch (this.type.toLowerCase()) {
				case "email": return this.isValidEmail(val);
				case "mobilephone": return this.isValidMobilephone(val);
				case "number": return !isNaN(val);
				case "integer": return Number.isInteger(val);
				case "url": return this.isValidUrl(val)
				default: return true;
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

		/** by default validate field's value immideately on every keyup, ie. after a keypress */
		keyup(evt) {
			if (this.validateOn === "keyup") {
				this.validateField()
			}
			this.$emit("keyup", evt) // let event bubble up (make it possible for parent component to also reacht to a @keyup event.)
		},

		blur(evt) {
			if (this.forceValidateOn === "blur") {
				this.validateField(true)
			}
			this.$emit("blur", evt)
		},

		/**
		 * Validate the current value of the field with provided <pre>validFunc</pre> or according to <pre>type</pre> of input field
		 * If valid, then this.state will be set to true and field will be marked in green.
		 * If invalid and then mark the field as invalid but only if it was validated successfully before or parameter force is given as true.
		 * @param force enable error message when fields value is invalid
		 */
		validateField(force = false) {
			let valid = this.internalValidFunc(this.modelValue)	
			if (valid) {
				this.state = true
			} else {
				if (this.state !== null || force) this.state = false
			}
		},
	},
}
</script>

<style lang="scss">
.liquido-input {
	position: relative;
	padding-top: 12px;
	//margin-bottom: 1rem;
	label {
		position: absolute;
		color: #666;
		font-size: 0.8rem;
		font-weight: normal;
		top: 0;
		left: 5px;
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
