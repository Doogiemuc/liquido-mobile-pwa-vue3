<template>
	<div>
		<h1 id="verify-email" class="page-title">
			{{ $t("verifyEmailTitle") }}
		</h1>

		<div v-if="state === 'verifying'" id="verifyEmailPending" class="alert liquido-info">
			<span class="spinner-border spinner-border-sm" role="status">
				<span class="visually-hidden">{{ $t('Loading') }}</span>
			</span>
			&nbsp;{{ $t("verifyEmailPending") }}
		</div>

		<div v-else-if="state === 'verified'" id="verifyEmailSuccess" class="alert liquido-info">
			<p><i class="fas fa-check-circle" />&nbsp;<span v-html="$t('verifyEmailSuccess')" /></p>
			<p v-if="verifiedEmail" class="page-subtitle">{{ verifiedEmail }}</p>
		</div>

		<!--
			Deliberately NO "resend" button here. Nobody is logged in on this page, and the token is
			invalid, so it identifies no one - a resend would need an anonymous "mail this address"
			endpoint, which is a way to make LIQUIDO mail strangers on request. The resend lives on the
			team page instead, where the caller is authenticated. Here we just point at the login.
		-->
		<div v-else id="verifyEmailError" class="alert alert-danger" :data-error-code="errorCode">
			<p><i class="fas fa-exclamation-circle" />&nbsp;<span v-html="$t('verifyEmailError')" /></p>
		</div>

		<div class="page-subtitle mt-4">
			<p>{{ $t("verifyEmailIsOptional") }}</p>
		</div>

		<!-- No Team/Polls icons: this page is opened from a mail by someone who is not logged in, so
		     both would only bounce them to the login. The space is kept so the button keeps its width. -->
		<liquido-footer hide-nav-icons>
			<template #primary>
				<button id="verifyEmailGotoLoginButton" type="button" class="btn btn-primary" @click="gotoLogin">
					{{ $t("gotoLogin") }}
					<i class="fas fa-angle-double-right" />
				</button>
			</template>
		</liquido-footer>
	</div>
</template>

<script>
/**
 * Confirm an email address from the link in the welcome mail.
 *
 * Reached anonymously at /verifyEmail?verifyToken=... - the user clicks it in their mail client,
 * where they are not logged in, so the route is public.
 *
 * This deliberately does NOT log anybody in. Confirming an address grants nothing; it flips a flag.
 * The magic-link login is a separate flow with its own token ("emailToken" on the login page), and
 * the two must never be confused - see VerifyEmailRequest in the backend. From here the user signs
 * in normally, which is what the footer button is for.
 */
import liquidoFooter from "@/components/liquido-footer.vue"
import loginAPI from "@/services/login-rest-client.js"
import log from "loglevel"

export default {
	i18n: {
		messages: {
			en: {},
			de: {
				verifyEmailTitle: "E-Mail-Adresse bestätigen",
				verifyEmailPending: "Einen Moment, deine E-Mail-Adresse wird bestätigt ...",
				verifyEmailSuccess: "<b>Danke!</b> Deine E-Mail-Adresse ist jetzt bestätigt.",
				verifyEmailError: "Dieser Link ist leider nicht (mehr) gültig. Vielleicht hast du ihn schon einmal benutzt?"
					+ "<br/><br/>Melde dich einfach an. Falls deine Adresse noch nicht bestätigt ist, findest du auf deiner "
					+ "Team-Seite einen Hinweis, über den ich dir einen neuen Link schicken kann.",
				verifyEmailIsOptional: "Die Bestätigung ist freiwillig. Du kannst LIQUIDO auch ohne sie ganz normal benutzen.",
				gotoLogin: "Zum Login",
			},
		},
	},
	name: "VerifyEmailPage",
	components: { liquidoFooter },
	props: {
		// From the query string of the link in the welcome mail. Named verifyToken, NOT emailToken:
		// that one belongs to the magic-link login and would auto-log the visitor in.
		verifyToken: { type: String, required: false, default: undefined },
	},
	data() {
		return {
			state: "verifying",   // verifying | verified | failed
			verifiedEmail: undefined,
			errorCode: undefined,
		}
	},
	created() {
		this.$store.setHeaderTitle(this.$t("verifyEmailTitle"))
		if (!this.verifyToken) {
			this.state = "failed"
			return
		}
		loginAPI.verifyEmail(this.verifyToken)
			.then(res => {
				this.verifiedEmail = res && res.email
				this.state = "verified"
			})
			.catch(err => {
				log.error("Cannot verify email address", err)
				this.errorCode = err?.response?.data?.liquidoException?.liquidoErrorCode
				this.state = "failed"
			})
	},
	mounted() {
		this.$root.scrollToTop()
	},
	methods: {
		gotoLogin() {
			this.$router.push({ name: "login" })
		},
	},
}
</script>
