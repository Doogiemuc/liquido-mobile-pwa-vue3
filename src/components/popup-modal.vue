<template>
	<div :id="id"
		class="modal"
		tabindex="-1"
		data-bs-backdrop="static"
		data-keyboard="false"
		aria-labelledby="modalLabel"
		aria-hidden="true"
		:data-modaltype="myType"
	>
		<div class="modal-dialog" :class="{'modal-dialog-centered': centered}">
			<div class="modal-content shadow" :class="modalContentClass">
				<div class="modal-header">
					<slot name="modal-header">
						<i :class="headerIconClass" class="bounce-anim-icon"></i>
						<div class="header-icon-shadow bounce-anim-shadow">&nbsp;</div>
						<h1 v-if="myTitle" id="modalLabel" class="modal-title">{{ myTitle }}</h1>
						<button v-if="showHeaderClose" type="button" class="close" data-bs-dismiss="modal" aria-label="Close">
							<span aria-hidden="true">&times;</span>
						</button>
					</slot>
				</div>
				<div class="modal-body">
					<slot name="modal-body">
						<slot>{{ myMessage }}</slot>
					</slot>
				</div>
				<div class="modal-footer">
					<slot name="modal-footer">
						<button v-if="mySecondaryButtonText" id="modalSecondaryButton" type="button" class="btn btn-secondary flex-grow-1" @click="clickSecondary">
							{{ mySecondaryButtonText }}
						</button>
						<button id="modalPrimaryButton" type="button" class="btn btn-primary flex-grow-1" @click="clickPrimary">
							<i v-if="myPrimaryButtonIcon" class="me-2" :class="myPrimaryButtonIcon"></i>
							{{ myPrimaryButtonText }}
						</button>
					</slot>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
/**
 * Bootstrap modal for info, success, warning and error messages.
 * 
 * Use like this:
 * 
 * <popup-modal id="successModal" ref="successModal" type="success" :primaryButtonText="Ok" >
 *  <template #modal-body><div>Any HTML content</div></template>
 * </popup-modal>
 * 
 * And then open e.g. like this
 * this.$refs["successModal"].open()
 * 
 * Will emit an event "clickPrimary", when primary button is clicked
 */

import { Modal } from 'bootstrap'

const MODAL_TYPE = {
	PRIMARY: "primary",
	SUCCESS: "success",
	WARN: "warn",
	WARNING: "warning",
	DANGER: "danger",
	ERROR: "error",
	INFO: "info"
}

const OK_text = "Ok"

export default {
	name: "PopupModal",
	props: {
		id: { type: String, required: true },
		type: { type: String, required: false, default: MODAL_TYPE.INFO },
		showHeaderClose: { type: Boolean, required: false, default: false },
		centered: { type: Boolean, required: false, default: true },
		title: { type: String, required: false, default: "" },  // or HTML can be provided into the <slot modal-title>
		message: { type: String, required: false, default: "" },  // or HTML can be provided into the <slot modal-body>
		contentClass: { type: String, required: false, default: "" },
		primaryButtonIcon: { type: String, required: false, default: "" },
		primaryButtonText: { type: String, required: false, default: function() { return OK_text } },
		secondaryButtonText: { type: String, required: false, default: undefined },
	},
	emits: ["clickPrimary", "clickSecondary"],
	data() {
		return {
			// the (unmutuable!) props set the initial values. These data values are then used in templates and can be updated.
			myMessage: this.message,
			myTitle: this.title,
			myType: this.type,
			myPrimaryButtonIcon: this.primaryButtonIcon,
			myPrimaryButtonText: this.primaryButtonText,
			mySecondaryButtonText: this.secondaryButtonText,
			// optional callbacks provided by caller when showing the modal
			myPrimaryCallback: undefined,
			mySecondaryCallback: undefined,
			myModal: undefined  // reference to Bootstrap Modal instanace. Will be set in "mounted()"
		}
	},
	computed: {
		headerIconClass() {
			switch (this.myType) {
				case MODAL_TYPE.PRIMARY:
					return "far fa-check-circle header-icon header-icon-primary"
				case MODAL_TYPE.SUCCESS:
					return "far fa-check-circle header-icon header-icon-success"
				case MODAL_TYPE.WARN:
				case MODAL_TYPE.WARNING:
					return "fas fa-exclamation-circle header-icon header-icon-warn"
				case MODAL_TYPE.DANGER:
				case MODAL_TYPE.ERROR:
					return "fas fa-exclamation-circle header-icon header-icon-danger"
				default:  // MODAL_TYPE.INFO
					return "fas fa-info-circle header-icon header-icon-info"
			}
		},
		modalContentClass() {
			switch (this.myType) {
				case "primary":
					return "bg-primary text-white " + this.contentClass
				case "success":
					return "bg-success text-white " + this.contentClass
				case "warn":
				case "warning":
					return "bg-warning text-dark" + this.contentClass
				case "danger":
				case "error":
					return "bg-danger text-white" + this.contentClass
				default:
					return "liquido-modal-info " + this.contentClass
			}
		}
	},
	mounted() {
		this.myModal = new Modal(document.getElementById(this.id))
	},
	methods: {
		/** 
		 * Show the popup modal with a given message, title and type.
		 * @param msg {String} message to the user
		 * @param title {String} title or defaults to "Error"
		 * @pararm type {ENUM} type of modal: PRIMARY|INFO|SUCCESS|WARN|DANGER|ERROR
		 * @param primaryButtonText {String} optional text for primary button
		 * @param secondaryButtonText {String} optional text for secondary button
		 */
		showMsgTitle(msg, title, type = MODAL_TYPE.INFO, primaryButtonText = undefined, secondaryButtonText = undefined, primaryCallback = undefined, secondaryCallback = undefined) {
			this.myMessage = msg
			this.myTitle = title
			this.myType = type
			if (primaryButtonText !== undefined) this.myPrimaryButtonText = primaryButtonText
			this.mySecondaryButtonText = secondaryButtonText
			// store callbacks (may be undefined)
			this.myPrimaryCallback = primaryCallback
			this.mySecondaryCallback = secondaryCallback
			this.myModal.show()
		},
		showSuccess(msg, title, primaryButtonText = undefined, secondaryButtonText = undefined, primaryCallback = undefined, secondaryCallback = undefined) {
			this.showMsgTitle(msg, title, MODAL_TYPE.SUCCESS, primaryButtonText, secondaryButtonText, primaryCallback, secondaryCallback)
		},
		showError(msg, title, primaryButtonText = undefined, secondaryButtonText = undefined, primaryCallback = undefined, secondaryCallback = undefined) {
			this.showMsgTitle(msg, title, MODAL_TYPE.ERROR, primaryButtonText, secondaryButtonText, primaryCallback, secondaryCallback)
		},
		showInfo(msg, title, primaryButtonText = undefined, secondaryButtonText = undefined, primaryCallback = undefined, secondaryCallback = undefined) {
			this.showMsgTitle(msg, title, MODAL_TYPE.INFO, primaryButtonText, secondaryButtonText, primaryCallback, secondaryCallback)
		},
		showWarning(msg, title, primaryButtonText = undefined, secondaryButtonText = undefined, primaryCallback = undefined, secondaryCallback = undefined) {
			this.showMsgTitle(msg, title, MODAL_TYPE.WARNING, primaryButtonText, secondaryButtonText, primaryCallback, secondaryCallback)
		},
		/** Show with message passed via prop or slot */
		show() {
			this.myModal.show()
		},
		hide() {
			this.myModal.hide()
		},
		close() {   // be nice to your users :-) offer both "hide" and "close"
			this.myModal.hide()
		},
		toggle() {
			this.myModal.toggle()
		},
		clickPrimary() {
			// Always hide the modal first, then call the callback
			try { this.myModal.hide() } catch (e) { /* ignore */ }
			if (typeof this.myPrimaryCallback === 'function') {
				try { this.myPrimaryCallback() } catch (e) { console.error('popup-modal primary callback error', e) }
			}
			this.$emit("clickPrimary", this.id)
		},
		clickSecondary() {
			try { this.myModal.hide() } catch (e) { /* ignore */ }
			if (typeof this.mySecondaryCallback === 'function') {
				try { this.mySecondaryCallback() } catch (e) { console.error('popup-modal secondary callback error', e) }
			}
			this.$emit("clickSecondary", this.id)
		}

	},
}
</script>

<style>

.modal-content {
	.modal-header {
		border-bottom: none;   /* "Less is more in UI-design!" */
		height: 3rem;
	}
	.header-icon {
		z-index: 2020;
		position: absolute;
		text-align: center;
		top: -5rem;
		left: 0;
		right: 0;
		width: 6rem;
		margin: 0 auto;
		font-size: 6rem;
		border-radius: 50%;
	}

	/* 
	This is an unbelievable cool animated 3D shadow below the bouncing header icon. CSS @keyframes ftw :-) 
	The object that casts the shadow is a transparent oval.
	The actual shadow is well below the oval. So that the oval does not cover the shadow.
	The oval layer is behind the icon, but above the modal.
	*/
	.header-icon-shadow {
		z-index: 2010;
		position: absolute;
		top: -1rem;
		left: 0;
		right: 0;
		width: 5rem;
		height: 1rem;
		margin: 0 auto;
		background-color: rgba(0, 0, 0, 0);
		border-radius: 50%;
		box-shadow: -5px 1.5rem 10px 2px rgba(0, 0, 0, 0.5);
	}
	.header-icon-danger {
		color: darkred;
		background-color: #dc3545;
	}
	.header-icon-success {
		background-color: darkgreen;
	}
	.header-icon-info {
		color: var(--primary);
	}
	.header-icon-warn {
		color: darkgoldenrod;
	}
	.modal-footer {
		justify-content: center;
		border-top: none;
		.btn {
			width: 100%;
			border: none;
		}
	}

	/* Unbelievably clever 3D shadow bounce animation */
	.bounce-anim-icon {
		animation-direction: alternate-reverse;
		animation-duration: 1s;
		animation-iteration-count: infinite;
		animation-name: bounce-anim-icon;
		transition-timing-function: linear;
	}
	
	.bounce-anim-shadow {
		animation-direction: alternate-reverse;
		animation-duration: 1s;
		animation-iteration-count: infinite;
		animation-name: bounce-anim-shadow;
	}

	&.bg-primary .btn {
		background-color: grey;
	}
	&.bg-danger .btn {
		background-color: darkred;
	}
	&.bg-success .btn {
		background-color: darkgreen;
	}
	&.bg-warning .btn {
		background-color: darkgoldenrod;
	}
	&.liquido-modal-info {
		color: var(--primary);
		background-color: var(--liquido-info-background);
		border: 1px solid var(--liquido-info-border-color);
	}
	&.liquido-modal-info .modal-title,
	&.liquido-modal-info .modal-body {
		color: var(--primary);
	}

}

@keyframes bounce-anim-icon {
	from {
		transform: scale(1.0, 0.8) translateY(12%);
		animation-timing-function: linear;
	}
	25% {
		transform: scale(1.0, 1.0) translateY(0); 
		animation-timing-function: cubic-bezier(0.0, 0.5, 0.5, 1.0);
	}
	to  {
		transform: scale(1.0, 1.0) translateY(-20px);
		animation-timing-function: cubic-bezier(0.5, 0.0, 1.0, 0.5)
	}
}

@keyframes bounce-anim-shadow {
	from {
		transform: scaleX(1.0);
	}
	50%,
	to  {
		transform: scaleX(0.8)
	}
}

</style>
