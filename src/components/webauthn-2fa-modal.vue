<template>
  <div class="modal">
		<div class="modal-dialog">
			<div class="modal-content">
				<div class="modal-header">
					<h5 class="modal-title">{{ title }}</h5>
					<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
				</div>
      </div>
      <div class="modal-body">

    		<p v-if="statusMessage" class="text-muted small">{{ statusMessage }}</p>

    		<div v-if="errorMessage" class="alert alert-danger">{{ errorMessage }}</div>
				
				<div v-if="!webauthnSupported" class="mt-3 alert alert-warning small">
					{{ $t('webauthnUnsupported') }}
				</div>
			</div>
			<div class="modal-footer">

				<div class="d-flex gap-2">
					<button v-if="mode === 'register'" class="btn btn-primary" :disabled="busy" @click="onRegister">
						<i class="fa-solid fa-fingerprint me-2"></i>
						{{ $t('webauthnRegisterPrompt') }}
					</button>

					<button v-if="mode === 'authenticate'" class="btn btn-primary" :disabled="busy" @click="onAuthenticate">
						<i class="fa-solid fa-user-check me-2"></i>
						{{ $t('webauthnAuthPrompt') }}
					</button>

					<button class="btn btn-outline-secondary ms-auto" :disabled="busy" @click="onCancel">{{ $t('Cancel') }}</button>
				</div>
			</div>
		</div>		
  </div>
</template>

<script>
import api from '@/services/liquido-graphql-client.js'
import * as webauthnService from '@/services/webauthn-service.js'

export default {
  name: 'Webauthn2faModal',
  props: {
    mode: { type: String, required: true }, // 'register' | 'authenticate'
    email: { type: String, required: true },
    name: { type: String, required: false },
    password: { type: String, required: false }
  },
  data() {
    return {
      busy: false,
      errorMessage: undefined,
      statusMessage: undefined,
      webauthnSupported: webauthnService.supportsWebAuthn()
    }
  },
  computed: {
    title() {
      return this.mode === 'register' ? this.$t('webauthnRegisterTitle') : this.$t('webauthnAuthTitle')
    }
  },
  methods: {
    async onRegister() {
      this.errorMessage = undefined
      if (!this.webauthnSupported) {
        this.errorMessage = this.$t('webauthnUnsupported')
        return
      }
      this.busy = true
      this.statusMessage = this.$t('webauthnStarting')
      try {
        const optionsResp = await api.getWebAuthnRegistrationOptions(this.email, this.name)
        const options = optionsResp.registrationOptions || optionsResp
        this.statusMessage = this.$t('webauthnWaitingForDevice')
        const credential = await webauthnService.startRegistrationFlow(options)
        // submit to server
        const verifyResp = await api.submitWebAuthnRegistration(credential)
        this.$emit('success', verifyResp)
      } catch (err) {
        console.error('WebAuthn register error', err)
        this.errorMessage = err && err.message ? err.message : this.$t('webauthnFailure')
        this.$emit('error', this.errorMessage)
      } finally {
        this.busy = false
        this.statusMessage = undefined
      }
    },

    async onAuthenticate() {
      this.errorMessage = undefined
      if (!this.webauthnSupported) {
        this.errorMessage = this.$t('webauthnUnsupported')
        return
      }
      this.busy = true
      this.statusMessage = this.$t('webauthnStarting')
      try {
        const optionsResp = await api.getWebAuthnAuthenticationOptions(this.email, this.password)
        // backend may indicate user needs registration
        if (optionsResp && optionsResp.needsRegistration) {
          // switch to register mode
          this.$emit('needs-registration')
          this.mode = 'register'
          return
        }
        const options = optionsResp.authenticationOptions || optionsResp
        this.statusMessage = this.$t('webauthnWaitingForDevice')
        const credential = await webauthnService.startAuthenticationFlow(options)
        const verifyResp = await api.submitWebAuthnAuthentication(credential)
        this.$emit('success', verifyResp)
      } catch (err) {
        console.error('WebAuthn authenticate error', err)
        this.errorMessage = err && err.message ? err.message : this.$t('webauthnFailure')
        this.$emit('error', this.errorMessage)
      } finally {
        this.busy = false
        this.statusMessage = undefined
      }
    },

    onCancel() {
      this.$emit('cancel')
    }
  }
}
</script>

<style scoped>
.webauthn-modal { max-width: 420px; margin: 1rem auto; }
</style>
