<template>
	<div :id="id"
		class="modal"
		tabindex="-1"
		data-backdrop="static"
		data-keyboard="false"
		aria-labelledby="modalLabel"
		aria-hidden="true"
	>
		<div class="modal-dialog" :class="{'modal-dialog-centered': centered}">
			<div class="modal-content" :class="modalContentClass">
				<div class="modal-header">
					<slot name="modal-header">
						<i :class="headerIconClass" class="bounce-anim-icon"></i>
						<div class="header-icon-shadow bounce-anim-shadow">&nbsp;</div>
						<h1 v-if="myTitle" id="modalLabel" class="modal-title">{{ myTitle }}</h1>
						<button v-if="showHeaderClose" type="button" class="close" data-dismiss="modal" aria-label="Close">
							<span aria-hidden="true">&times;</span>
						</button>
					</slot>
				</div>
				<div class="modal-body">
					<slot>{{ myMessage }}</slot>
				</div>
				<div class="modal-footer">
					<slot name="modal-footer">
						<button v-if="secondaryButtonText" id="modalSecondaryButton" type="button" class="btn btn-secondary flex-grow-1" @click="clickSecondary">{{ secondaryButtonText }}</button>
						<button id="modalPrimaryButton" type="button" class="btn btn-primary flex-grow-1" data-dismiss="modal" @click="clickPrimary">
							{{ primaryButtonText }}
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
 *  <div>Any HTML content</div>
 * </popup-modal>
 * 
 * And then open e.g. like this
 * this.$refs["successModal"].open()
 * 
 * Will emit an event "clickPrimary", when primary button is clicked
 */

import { Modal } from 'bootstrap'
let myModal

export default {
	name: "PopupModal",
	props: {
		id: { type: String, required: true },
		type: { type: String, required: false, default: "info" },
		showHeaderClose: { type: Boolean, required: false, default: false },
		centered: { type: Boolean, required: false, default: true },
		title: { type: String, required: false, default: "" },  // or HTML can be provided into the <slot modal-title>
		message: { type: String, required: false, default: "" },  // or HTML can be provided into the <slot modal-body>
		contentClass: { type: String, required: false, default: "" },
		primaryButtonText: { type: String, required: false, default: function() { return "Ok" } },
		secondaryButtonText: { type: String, required: false, default: undefined },
	},
	data() {
		return {
			// the (unmutuable!) props set the initial values. These data values are then used in templates and can be updated.
			myMessage: this.message,
			myTitle: this.title,
			myType: this.type
		}
	},
	computed: {
		headerIconClass() {
			switch (this.myType) {
				case "primary":
					return "far fa-check-circle header-icon header-icon-primary"
				case "success":
					return "far fa-check-circle header-icon header-icon-success"
				case "warn":
				case "warning":
					return "fas fa-exclamation-circle header-icon header-icon-warn"
				case "danger":
				case "error":
					return "fas fa-exclamation-circle header-icon header-icon-danger"
				default:
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
					return "bg-info text-white " + this.contentClass
			}
		}
	},
	mounted() {
		myModal = new Modal(document.getElementById(this.id), {
			backdrop: "static"
		})
	},
	methods: {
		/** Show the modal. Can optionally pass a message. */
		show(msg, title, type) {
			if (title) this.myTitle = title
			if (msg) this.myMessage = msg
			this.myType = type || "info"
			myModal.show()
		},
		showSuccess(msg, title) {
			this.show(msg, title, "success")
		},
		showError(msg, title) {
			this.show(msg, title, "error")
		},
		showInfo(msg, title) {
			this.show(msg, title, "info")
		},
		showWarning(msg, title) {
			this.show(msg, title, "warning")
		},
		hide() {
			myModal.hide()
		},
		close() {   // be nice to your callers :-) offer hide and close wording
			myModal.hide()
		},
		toggle() {
			myModal.toggle()
		},
		clickPrimary() {
			this.$emit("clickPrimary", this.id)
		},
		clickSecondary() {
			this.$emit("clickSecondary", this.id)
		}

	},
}
</script>

<style lang="scss" scoped>
.modal-content {
	.modal-header {
		border-bottom: none;   // "Less is more in UI-design!"
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
		color: $primary;
	}
	.header-icon-warn {
		color: darkgoldenrod;
	}
	.modal-footer {
		justify-content: center;
		border-top: none;
		.btn {
			//font-weight: bold;
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

	.bounce-anim-shadow {
		animation-direction: alternate-reverse;
		animation-duration: 1s;
		animation-iteration-count: infinite;
		animation-name: bounce-anim-shadow;
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

}



</style>
