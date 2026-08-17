<template>
	<div>

		<h1 id="joinTeamPage" class="page-title">{{ $t("JoinTeam") }}</h1>

		<!-- (1) Checking the inviteCode from the URL. -->
		<div v-if="pageState === PAGE.LOADING" id="joinTeamLoading" class="text-center my-5">
			<span class="spinner-border" style="color: var(--primary)" role="status"></span>
			<p class="text-muted mt-3">{{ $t("Loading") }}</p>
		</div>

		<!--
			(2) Dead end. Either there was no inviteCode at all, or it was invalid.
			There is nothing to fill in here, so we don't show the form. The only way forward is the login page below.
		-->
		<div v-else-if="pageState === PAGE.ERROR" id="joinTeamError" class="m-3">
			<div id="joinTeamErrorMessage" class="alert alert-warning" :data-join-team-error-key="pageErrorKey">
				{{ $t(pageErrorKey) }}
			</div>
		</div>

		<!-- (3) Valid inviteCode: greet the new member and let them register into the team. -->
		<div v-else id="joinTeamCard" class="card loginCard m-3">
			<form id="joinTeamForm" class="card-body p-4" autocomplete="on" @submit.prevent="submitJoinTeamForm">

				<div class="text-center mb-3">
					<i class="fas fa-people-group fa-3x" style="color: var(--primary)"></i>
				</div>

				<!--
					Team name and admin name come from the backend, so they are interpolated as plain text.
					Never v-html here - a team name is user generated content.
				-->
				<h2 id="joinTeamTeamName" class="join-team-name text-center">{{ teamName }}</h2>
				<p id="joinTeamGreeting" class="text-center text-muted">{{ $t("invitedByAdmin", { adminName }) }}</p>

				<!-- Nickname -->
				<liquido-input
					id="joinTeamNicknameInput"
					v-model="nickname"
					type="text"
					name="nickname"
					autocomplete="nickname"
					:label="$t('nickname')"
					:placeholder="$t('nicknamePlaceholder')"
					:min-length="usernameMinLength"
					:max-length="100"
					:invalid-feedback="$t('nicknameInvalid')"
					:empty-feedback="$t('nicknameInvalid')"
					:disabled="joining"
					required
					feedback-placeholder
				/>

				<!-- Email -->
				<liquido-input
					id="joinTeamEmailInput"
					v-model="email"
					type="email"
					name="email"
					autocomplete="email"
					:label="$t('YourEmail')"
					:placeholder="$t('emailPlaceholder')"
					:max-length="300"
					:invalid-feedback="$t('emailInvalid')"
					:empty-feedback="$t('emailInvalid')"
					:disabled="joining"
					required
					feedback-placeholder
				/>

				<!-- Password -->
				<liquido-input
					id="joinTeamPasswordInput"
					v-model="password"
					type="password"
					name="password"
					autocomplete="new-password"
					:label="$t('Password')"
					:placeholder="$t('passwordPlaceholder')"
					:min-length="minPasswordLength"
					:max-length="300"
					:invalid-feedback="$t('passwordTooShort', { minLength: minPasswordLength })"
					:empty-feedback="$t('passwordTooShort', { minLength: minPasswordLength })"
					:disabled="joining"
					required
					feedback-placeholder
				/>

				<button id="joinTeamButton" type="submit" class="btn btn-primary w-100 text-center mt-3"
					:disabled="joining || !formIsValid">
					<span v-if="joining" class="spinner-border spinner-border-sm me-2" role="status"></span>
					{{ $t("JoinTeamButton") }}
				</button>

				<!-- Recoverable error: the user can correct their input and submit again. -->
				<div v-if="formErrorKey" id="joinTeamFormError" class="alert alert-warning text-center mt-3"
					:data-join-team-error-key="formErrorKey">
					<small>{{ $t(formErrorKey) }}</small>
				</div>

			</form>
		</div>

		<!--
			Offered in every state except while loading: an invalid invite link is a dead end that needs a way out,
			and someone who already has an account should log in instead of registering a second time.
		-->
		<div v-if="pageState !== PAGE.LOADING" class="text-center text-muted mt-5">
			<p>{{ $t("alreadyRegistered") }}</p>
			<button id="loginButton" type="button" class="btn btn-outline-secondary" @click="goToLogin">
				{{ $t("Login") }}
			</button>
		</div>

	</div>
</template>


<script>
/*
 * Page local translations. They have to live in a plain <script> block rather than in <script setup>,
 * because vue-i18n still runs in legacy mode here (see main.js), where component local messages are an
 * Options API option. Both blocks are merged into one component by the SFC compiler.
 *
 * Consequence for <script setup> below: the local $t only exists in the template. So the script never
 * translates anything itself - it stores i18n *keys* in pageErrorKey / formErrorKey and the template
 * resolves them.
 */
export default {
	i18n: {
		messages: {
			de: {
				invitedByAdmin: "{adminName} hat dich in sein LIQUIDO Team eingeladen.",
				nickname: "Dein Spitzname",
				nicknamePlaceholder: "Spitzname",
				nicknameInvalid: "Bitte mindestens 3 Zeichen",
				YourEmail: "Deine E-Mail",
				emailPlaceholder: "E-Mail",
				emailInvalid: "Ungültige E-Mail. Vielleicht nur vertippt?",
				Password: "Passwort (min. 10 Zeichen)",
				passwordPlaceholder: "Passwort",
				passwordTooShort: "Mindestens {minLength} Zeichen!",
				JoinTeamButton: "Team beitreten",
				alreadyRegistered: "Bist du bereits bei LIQUIDO registriert?",

				// Errors
				noInviteCodeError: "Willkommen bei LIQUIDO! Um einem Team beizutreten, brauchst du eine Einladung. Klicke auf den Link, den du per E-Mail bekommen hast. Dann geht's weiter.",
				inviteCodeInvalid: "Tut mir leid, dieser Einladungscode ist ungültig. Bitte überprüfe den Link oder frag deinen Team-Admin nach einer neuen Einladung.",
				emailAlreadyRegistered: "Diese E-Mail ist schon bei LIQUIDO registriert. Bitte logge dich ein.",
				passwordTooWeak: "Dieses Passwort ist zu schwach. Bitte wähle ein längeres.",
				cannotJoinTeam: "Der Beitritt hat leider nicht geklappt. Bitte versuche es noch einmal.",
			},
			en: {
				invitedByAdmin: "{adminName} invited you to this team. Register to join.",
				nickname: "Your nickname",
				nicknamePlaceholder: "Nickname",
				nicknameInvalid: "Please enter a nickname with at least 3 characters.",
				YourEmail: "Your email",
				emailPlaceholder: "E-Mail",
				emailInvalid: "Invalid email. Maybe a typo?",
				Password: "Password",
				passwordPlaceholder: "Password",
				passwordTooShort: "Your password needs at least {minLength} characters.",
				JoinTeamButton: "Join team",
				alreadyRegistered: "Already registered with LIQUIDO?",

				// Errors
				noInviteCodeError: "Welcome to LIQUIDO! You need an invitation to join a team. Please click the link you received by email.",
				inviteCodeInvalid: "Sorry, this invite code is invalid. Please check the link or ask your team admin for a new invitation.",
				emailAlreadyRegistered: "This email is already registered with LIQUIDO. Please log in instead.",
				passwordTooWeak: "This password is too weak. Please choose a longer one.",
				cannotJoinTeam: "Could not join the team. Please try again.",
			}
		}
	}
}
</script>


<script setup>
import { ref, computed, onMounted, nextTick } from "vue"
import { useRouter } from "vue-router"
import { useI18n } from "vue-i18n"
import log from "loglevel"
import config from "config"
import api from "@/services/liquido-graphql-client.js"
import { store } from "@/services/store.js"
import liquidoInput from "@/components/liquido-input.vue"

const props = defineProps({
	/** Invite code from the URL: /join-v2?inviteCode=ABC12345 . May be missing - see PAGE.ERROR. */
	inviteCodeQueryParam: { type: String, required: false, default: undefined }
})

const router = useRouter()
// The GLOBAL composer, i.e. the translations from main.js. Component local messages are not reachable
// from <script setup> in legacy mode - which is why only the header title is translated here.
const { t } = useI18n()

/** The three things this page can show. Exactly one of them at a time. */
const PAGE = Object.freeze({
	LOADING: "LOADING",   // validating the inviteCode
	FORM: "FORM",         // inviteCode is valid, team is loaded, user may register
	ERROR: "ERROR",       // dead end, we only offer the way to the login page
})

const EMAIL_REG_EX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,256}$/
/** An inviteCode is exactly config.inviteCodeLength alphanumeric characters. */
const INVITE_CODE_REG_EX = new RegExp(`^[A-Za-z0-9]{${config.inviteCodeLength}}$`)

const pageState = ref(PAGE.LOADING)
/** i18n key of the terminal error. Only read while pageState === PAGE.ERROR. */
const pageErrorKey = ref(undefined)
/** i18n key of a recoverable error, shown inside the form. */
const formErrorKey = ref(undefined)

const team = ref(undefined)
const nickname = ref("")
const email = ref("")
const password = ref("")
const joining = ref(false)

// Exposed to the template so that the input constraints and their error messages cannot drift apart.
const usernameMinLength = config.usernameMinLength
const minPasswordLength = config.minPasswordLength

const teamName = computed(() => team.value?.teamName || "")

const adminName = computed(() => {
	const firstAdmin = team.value?.members?.find(member => member.role === "ADMIN")
	return firstAdmin?.user?.name || "Admin"
})

/**
 * Validate here as well as in the liquido-input fields. The fields decide when to show a red frame,
 * this decides whether the button may be pressed at all - the two answer different questions and the
 * field state is not readable from here without wiring up a ref per input.
 */
const formIsValid = computed(() =>
	nickname.value.trim().length >= usernameMinLength &&
	EMAIL_REG_EX.test(email.value.trim()) &&
	password.value.length >= minPasswordLength
)

onMounted(() => {
	store.setHeaderTitle(t("JoinTeam"))
	loadTeamForInviteCode()
})

/** An inviteCode that fails this can never exist, so it is not worth a backend call. */
function isInviteCodeSyntaxValid(code) {
	return typeof code === "string" && INVITE_CODE_REG_EX.test(code.trim())
}

/**
 * Pull the liquidoErrorCode out of a rejected api call.
 * It arrives in one of two shapes: graphQlQuery rejects with the GraphQL response body (which carries
 * `liquidoException`), while a transport level failure rejects with an axios error (`response.data`).
 * Returns undefined for anything else, e.g. a network outage, which is what makes it useful:
 * "no error code" means "we never got an answer from the backend".
 */
function getLiquidoErrorCode(err) {
	return err?.liquidoException?.liquidoErrorCode ?? err?.response?.data?.liquidoErrorCode
}

/** Switch the page to its terminal error state. */
function failPage(errorKey) {
	pageErrorKey.value = errorKey
	pageState.value = PAGE.ERROR
}

/**
 * Validate the inviteCode from the URL and load the team behind it.
 *
 * There are three ways this can fail, and the last two MUST look identical to the user - our error
 * message must not tell an attacker whether a guessed invite code happens to exist:
 *   1. no inviteCode in the URL at all       -> "you need an invitation"
 *   2. inviteCode has the wrong syntax       -> generic "invite code invalid", without a backend call
 *   3. backend does not know the inviteCode  -> the very same generic "invite code invalid"
 */
async function loadTeamForInviteCode() {
	const inviteCode = props.inviteCodeQueryParam

	if (!inviteCode || inviteCode.trim() === "") {
		log.info("join-team: no inviteCode in URL")
		return failPage("noInviteCodeError")
	}

	if (!isInviteCodeSyntaxValid(inviteCode)) {
		log.info("join-team: inviteCode in URL has an invalid syntax")
		return failPage("inviteCodeInvalid")
	}

	try {
		team.value = await api.getTeamForInviteCode(inviteCode.trim())
		pageState.value = PAGE.FORM
		await nextTick()
		document.getElementById("joinTeamNicknameInput")?.focus()
	} catch (err) {
		// A backend that answers "unknown code" and a backend that does not answer at all are two
		// different problems for the user: the first is permanent, the second is worth retrying.
		if (getLiquidoErrorCode(err) === undefined) {
			log.error("join-team: cannot reach backend to check inviteCode", err)
			return failPage("cannotJoinTeam")
		}
		log.info("join-team: backend does not know this inviteCode")
		failPage("inviteCodeInvalid")
	}
}

/** Register the new user and join them into the team. On success they land on their new team's home page. */
async function submitJoinTeamForm() {
	if (!formIsValid.value || joining.value) return
	joining.value = true
	formErrorKey.value = undefined

	const newMember = {
		name: nickname.value.trim(),
		email: email.value.trim(),
		picture: "Avatar1.png",   //TODO: let the user pick an avatar later
		// No mobilephone: it is optional in LIQUIDO and no longer collected anywhere in the UI.
		// Omit the key rather than sending "" - the backend now normalises a blank number to null on
		// write, but omitting it is what this page means, and it keeps the payload honest.
	}

	try {
		await api.joinTeam(props.inviteCodeQueryParam.trim(), newMember, password.value)
		router.push({ name: "team" })
	} catch (err) {
		handleJoinTeamError(err)
	} finally {
		joining.value = false
	}
}

function handleJoinTeamError(err) {
	log.info("join-team: cannot join team", err)
	switch (getLiquidoErrorCode(err)) {

		// The code was still good when the page loaded, so it was revoked in the meantime. Nothing
		// the user can fix in this form -> back to the dead end state.
		case api.err.CANNOT_JOIN_TEAM_INVITE_CODE_INVALID:
			return failPage("inviteCodeInvalid")

		// These three all mean "you already have an account", so they get the same advice: log in.
		case api.err.USER_EMAIL_EXISTS:
		case api.err.CANNOT_JOIN_TEAM_ALREADY_MEMBER:
		case api.err.CANNOT_JOIN_TEAM_ALREADY_ADMIN:
			formErrorKey.value = "emailAlreadyRegistered"
			return

		case api.err.PASSWORD_TOO_SHORT:
			formErrorKey.value = "passwordTooWeak"
			return

		default:
			formErrorKey.value = "cannotJoinTeam"
	}
}

function goToLogin() {
	router.push({ name: "login" })
}
</script>


<style scoped>
.join-team-name {
	color: var(--primary);
	font-size: 1.5rem;
	font-weight: 600;
	margin-bottom: 0.25rem;
}
</style>
