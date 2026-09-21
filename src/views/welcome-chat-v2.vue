<template>
	<div class="welcome-v2" :class="{ 'is-landing': phase === PHASE.LANDING }">

		<!-- Small, quiet way in for a returning visitor with no local JWT. Always available, on every
		     phase, same exception-path idea as welcome-chat.vue's .hero-login. -->
		<button id="welcomeV2LoginButton" class="hero-login" type="button" @click="goToLogin">
			{{ $t("loginLinkV2") }}
		</button>

		<div class="step-container">
			<Transition :name="transitionName">

				<!-- ================= LANDING ================= -->
				<section v-if="phase === PHASE.LANDING" key="landing" class="step step-landing">
					<div class="hero">

						<div class="hero-brand" aria-hidden="true">
							<i class="fas fa-university" />
							<span class="liquido" />
						</div>

						<div class="water-stage" aria-hidden="true">
							<div class="ambient-glow" />
							<div class="water-plane">
								<div class="water-shadow" />
								<span class="ripple ripple--a" />
								<span class="ripple ripple--b" />
							</div>
							<div class="droplet">
								<div class="droplet-inner" />
							</div>
						</div>

						<p class="headline" aria-hidden="true">
							<span class="cycle-word-box">
								<Transition name="word-fade">
									<span :key="currentWord" class="cycle-word" :class="{ 'is-liquide': currentWord === 'liquide' }">
										{{ currentWord }}
									</span>
								</Transition>
							</span>
							<span class="headline-fixed">{{ $t("headlineNoun") }}</span>
						</p>
						<p class="headline" aria-hidden="true">{{ $t("headlineSubline") }}</p>
						<span class="visually-hidden">{{ $t("headlineSrSentence") }}</span>
						<p class="page-subtitle hero-manifesto">{{ $t("heroManifesto") }}</p>
					</div>

					<div class="landing-cta">
						<button id="welcomeV2CreateTeamButton" type="button" class="btn btn-primary btn-lg w-100" @click="goToCreate">
							{{ $t("createTeamButton") }}
						</button>

						<button v-if="invite.team" id="welcomeV2JoinTeamButton" type="button" class="inline-link join-hint" @click="goToJoin">
							{{ $t("invitedByAdminV2", { adminName: invite.adminName, teamName: invite.teamName }) }}
						</button>
						<p v-else class="join-hint">
							{{ $t("joinHintPrefix") }}<button id="welcomeV2JoinTeamButton" type="button" class="inline-link" @click="goToJoin">{{ $t("joinTeamButton") }}</button>
						</p>
					</div>
				</section>

				<!-- ================= REGISTER (create or join) ================= -->
				<section v-else-if="phase === PHASE.REGISTER" key="register" class="step step-register">
					<h1 id="welcomeV2RegisterTitle" class="page-title">
						{{ path === "create" ? $t("createTeamTitle") : $t("joinTeamTitle") }}
					</h1>

					<div id="welcomeV2RegisterCard" class="card register-card m-3">
						<form class="card-body p-4" @submit.prevent="submitRegister">

							<div class="text-center mb-3">
								<i class="fas fa-people-group fa-3x" style="color: var(--primary)" />
							</div>
							<div class="text-center mb-3">
								<p>{{ path === "create" ? $t("createTeamIntro") : $t("joinTeamIntro") }}</p>
							</div>

							<liquido-input
									v-if="path === 'join'"
									id="welcomeV2InviteCodeInput"
									v-model="inviteCode"
									class="mb-2"
									:floating-label="true"
									:show-empty-as-error="false"
									type="text"
									name="inviteCode"
									:label="$t('inviteCodeLabel')"
									:placeholder="$t('inviteCodePlaceholder')"
									:max-length="inviteCodeLength"
									:invalid-feedback="$t('inviteCodeInvalid')"
									:empty-feedback="$t('inviteCodeInvalid')"
									:disabled="registering"
									required
									feedback-placeholder
									@blur="onInviteCodeBlur"
								/>

								<p v-if="path === 'join' && invite.team" id="welcomeV2RegisterGreeting" class="page-subtitle mb-3">
									{{ $t("invitedByAdminV2", { adminName: invite.adminName, teamName: invite.teamName }) }}
								</p>

								<liquido-input
									id="welcomeV2NicknameInput"
									v-model="nickname"
									class="mb-2"
									:floating-label="true"
									:show-empty-as-error="false"
									type="text"
									name="nickname"
									autocomplete="nickname"
									:label="$t('nickname')"
									:placeholder="$t('nicknamePlaceholder')"
									:min-length="usernameMinLength"
									:max-length="100"
									:invalid-feedback="$t('nicknameInvalid')"
									:empty-feedback="$t('nicknameInvalid')"
									:disabled="registering"
									required
									feedback-placeholder
								/>

								<liquido-input
									v-if="path === 'create'"
									id="welcomeV2TeamNameInput"
									v-model="teamName"
									class="mb-2"
									:floating-label="true"
									:show-empty-as-error="false"
									type="text"
									name="teamName"
									:label="$t('teamName')"
									:placeholder="$t('teamNamePlaceholder')"
									:min-length="6"
									:max-length="100"
									:invalid-feedback="$t('teamNameInvalid')"
									:empty-feedback="$t('teamNameInvalid')"
									:disabled="registering"
									required
									feedback-placeholder
								/>

								<liquido-input
									id="welcomeV2EmailInput"
									v-model="email"
									class="mb-2"
									:floating-label="true"
									:show-empty-as-error="false"
									type="email"
									name="email"
									autocomplete="email"
									:label="$t('YourEmail')"
									:placeholder="$t('emailPlaceholder')"
									:max-length="300"
									:invalid-feedback="$t('emailInvalid')"
									:empty-feedback="$t('emailInvalid')"
									:disabled="registering"
									required
									feedback-placeholder
								/>

								<liquido-input
									id="welcomeV2PasswordInput"
									v-model="password"
									class="mb-2"
									:floating-label="true"
									:show-empty-as-error="false"
									type="password"
									name="password"
									autocomplete="new-password"
									:label="$t('Password')"
									:placeholder="$t('passwordPlaceholder')"
									:min-length="minPasswordLength"
									:max-length="300"
									:invalid-feedback="$t('passwordTooShort', { minLength: minPasswordLength })"
									:empty-feedback="$t('passwordTooShort', { minLength: minPasswordLength })"
									:disabled="registering"
									required
									feedback-placeholder
								/>

								<button id="welcomeV2RegisterSubmitButton" type="submit" class="btn btn-primary w-100 mt-2"
									:disabled="registering || !formIsValid">
									<span v-if="registering" class="spinner-border spinner-border-sm me-2" role="status" />
									{{ path === "create" ? $t("createTeamButton") : $t("joinTeamButton") }}
								</button>

								<div v-if="formErrorKey === 'emailAlreadyRegistered'" id="welcomeV2RegisterError" class="alert alert-warning text-center mt-3"
									data-register-error-key="emailAlreadyRegistered">
									<small>
										{{ $t("emailAlreadyRegisteredPrefix") }}<router-link :to="{ name: 'login', query: loginLinkQuery }">{{ $t("emailAlreadyRegisteredLoginLink") }}</router-link>{{ path === "create" ? $t("emailAlreadyRegisteredSuffixCreate") : $t("emailAlreadyRegisteredSuffixJoin") }}
									</small>
								</div>
								<div v-else-if="formErrorKey === 'alreadyRegisteredCannotCreate'" id="welcomeV2RegisterError" class="alert alert-warning text-center mt-3"
									data-register-error-key="alreadyRegisteredCannotCreate">
									<small>
										{{ $t("alreadyRegisteredCannotCreatePrefix") }}<router-link :to="{ name: 'login', query: loginLinkQuery }">{{ $t("alreadyRegisteredCannotCreateLoginLink") }}</router-link>{{ $t("alreadyRegisteredCannotCreateSuffix") }}
									</small>
								</div>
								<div v-else-if="formErrorKey" id="welcomeV2RegisterError" class="alert alert-warning text-center mt-3"
									:data-register-error-key="formErrorKey">
									<small>{{ $t(formErrorKey) }}</small>
								</div>

						</form>
					</div>
				</section>

				<!-- ================= PASSKEY (skippable) ================= -->
				<section v-else-if="phase === PHASE.PASSKEY" key="passkey" class="step step-passkey">
					<div id="welcomeV2PasskeyCard" class="card passkey-card">
						<div class="card-body text-center">
							<i class="fas fa-fingerprint passkey-icon" />
							<h2>{{ $t("SetupPasskeyTitleV2") }}</h2>
							<p class="text-muted">{{ $t("SetupPasskeyInfoV2") }}</p>

							<template v-if="passkeySupported">
								<liquido-input
									id="welcomeV2PasskeyLabelInput"
									v-model="passkeyLabel"
									class="mb-3 text-start"
									:floating-label="true"
									:label="$t('PasskeyLabel')"
									:placeholder="$t('PasskeyLabelPlaceholder')"
									:min-length="3"
									:max-length="200"
									:invalid-feedback="$t('PasskeyLabelInvalid')"
									:disabled="settingUpPasskey || passkeyDone"
								/>
								<button id="welcomeV2SetupPasskeyButton" type="button" class="btn btn-primary w-100"
									:disabled="settingUpPasskey || passkeyDone" @click="setupPasskey">
									<span v-if="settingUpPasskey" class="spinner-border spinner-border-sm me-2" role="status" />
									<i v-else-if="passkeyDone" class="fas fa-check me-2" />
									<i v-else class="fas fa-fingerprint me-2" />
									{{ $t("PasskeySubmitButton") }}
								</button>
								<div v-if="passkeyErrorKey" id="welcomeV2PasskeyError" class="alert alert-warning text-center mt-3"
									:data-passkey-error-key="passkeyErrorKey">
									<small>{{ $t(passkeyErrorKey) }}</small>
								</div>
							</template>
							<p v-else data-qa="passkeyNotSupportedMessage" class="text-muted"><small>{{ $t("PasskeyNotSupported") }}</small></p>

							<button id="welcomeV2SkipPasskeyButton" type="button" class="btn btn-link w-100 mt-2" @click="skipPasskey">
								{{ $t("SkipForNow") }}
							</button>
						</div>
					</div>
				</section>

				<!-- ================= FIRST PROPOSAL (create-team path only) ================= -->
				<section v-else key="firstProposal" class="step step-first-proposal" :ref="scrollFirstProposalToTop">
					<div id="welcomeV2FirstProposalCard" class="card first-proposal-card text-center">
						<div class="card-body">
							<i class="fas fa-check-circle success-icon" />
							<h2>{{ $t("TeamCreatedTitle") }}</h2>
							<p class="text-muted">{{ $t("TeamCreatedInfo") }}</p>

							<button id="welcomeV2GotoTeamButton" type="button" class="btn btn-primary w-100" @click="gotoTeam">
								{{ $t("ContinueToTeam") }}
							</button>
							<button id="welcomeV2CreateFirstProposalButton" type="button" class="btn btn-outline-secondary w-100 mt-2"
								@click="gotoCreateFirstProposal">
								{{ $t("CreateFirstProposalButton") }}
							</button>
						</div>
					</div>
				</section>

			</Transition>
		</div>
	</div>
</template>


<script>
/*
 * Component-local translations, read by liqui-loc from $options.i18n - see the same pattern in
 * join-team-v2.vue. Kept in a plain <script> block alongside <script setup> below, since liqui-loc
 * reads these from the component options rather than from an <i18n> SFC block.
 *
 * The five cycling adjectives ("freie", "sichere", ...) are NOT here: they are German grammatical
 * inflections agreeing with the feminine plural noun "Abstimmungen", so they live as a plain JS
 * constant in the script below rather than as translatable strings - an English locale would need a
 * differently shaped sentence, not a word-for-word substitution.
 */
export default {
	i18n: {
		messages: {
			de: {
				loginLinkV2: "Log in",
				headlineNoun: "Abstimmungen",
				headlineSubline: "für alle",
				heroManifesto: "Jeder Tropfen zählt. Jede Stimme zählt. Eine kleine, bewusste Handlung wird zu einer anschwellenden Flut kollektiver Kraft.",
				headlineSrSentence: "Freie, sichere, anonyme, faire, liquide Abstimmungen für alle.",

				createTeamButton: "Neues Team erstellen",
				joinTeamButton: "Team beitreten",
				joinHintPrefix: "Einladungslink bekommen? ",
				invitedByAdminV2: "{adminName} hat dich eingeladen, Team „{teamName}“ beizutreten.",

				createTeamTitle: "Team erstellen",
				joinTeamTitle: "Team beitreten",
				createTeamIntro: "Erstelle dein LIQUIDO Team",
				joinTeamIntro: "Tritt einem bestehenden LIQUIDO Team bei",

				inviteCodeLabel: "Einladungscode",
				inviteCodePlaceholder: "Einladungscode",

				nickname: "Dein Spitzname",
				nicknamePlaceholder: "Spitzname",
				nicknameInvalid: "Bitte mindestens 3 Zeichen",
				teamName: "Name deines Teams",
				teamNamePlaceholder: "Teamname",
				teamNameInvalid: "Bitte mindestens 6 Zeichen",
				YourEmail: "Deine E-Mail",
				emailPlaceholder: "E-Mail",
				emailInvalid: "Ungültige E-Mail. Vielleicht nur vertippt?",
				Password: "Passwort",
				passwordPlaceholder: "Passwort",
				passwordTooShort: "Mindestens {minLength} Zeichen!",

				teamWithSameNameExists: "Diesen Teamnamen gibt es schon. Bitte wähle einen anderen.",
				emailAlreadyRegisteredPrefix: "Diese E-Mail-Adresse ist bereits registriert. Du musst dich erst ",
				emailAlreadyRegisteredLoginLink: "einloggen",
				emailAlreadyRegisteredSuffixCreate: ". Dann kannst du auch ein weiteres Team gründen.",
				emailAlreadyRegisteredSuffixJoin: ". Dann kannst du diesem Team beitreten.",
				alreadyRegisteredCannotCreatePrefix: "Du bist bereits registriert. Du kannst ein zweites Team gründen. Aber dazu musst du dich ",
				alreadyRegisteredCannotCreateLoginLink: "einloggen",
				alreadyRegisteredCannotCreateSuffix: ".",
				passwordTooWeak: "Dieses Passwort ist zu schwach. Bitte wähle ein längeres.",
				unexpectedError: "Bitte versuche es später noch einmal.",
				inviteCodeInvalid: "Dieser Einladungscode ist nicht mehr gültig.",

				SetupPasskeyTitleV2: "Schneller einloggen",
				SetupPasskeyInfoV2: "Mit einem Passkey kannst du dich das nächste Mal per Fingerabdruck oder Gesichtserkennung anmelden - ganz ohne Passwort.",
				PasskeyLabel: "Name für diesen Passkey",
				PasskeyLabelPlaceholder: "z.B. Mein iPhone",
				PasskeyLabelInvalid: "Bitte mindestens 3 Zeichen",
				PasskeySubmitButton: "Passkey einrichten",
				PasskeyNotSupported: "Dein Browser unterstützt leider keine Passkeys. Du kannst diesen Schritt überspringen und später ein Passwort benutzen.",
				passkeySetupFailed: "Der Passkey konnte nicht eingerichtet werden. Du kannst es noch einmal versuchen oder später fortfahren.",
				SkipForNow: "Später",

				TeamCreatedTitle: "Euer Team ist bereit",
				TeamCreatedInfo: "Möchtest du direkt einen ersten Vorschlag für eine Abstimmung anlegen? Du kannst das auch jederzeit später von eurer Teamseite aus tun.",
				ContinueToTeam: "Weiter zum Team",
				CreateFirstProposalButton: "Ersten Vorschlag erstellen",
			},
			en: {
			}
		}
	}
}
</script>


<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue"
import { useRouter } from "vue-router"
import log from "loglevel"
import config from "config"
import api from "@/services/liquido-graphql-client.js"
import webauthnService from "@/services/webauthn-service.js"
import { store } from "@/services/store.js"
import liquidoInput from "@/components/liquido-input.vue"

const props = defineProps({
	/** Invite code from the URL: /welcome?inviteCode=ABC12345 . May be missing. */
	inviteCodeQueryParam: { type: String, required: false, default: undefined }
})

const router = useRouter()

onMounted(() => store.setHeaderTitle(undefined))

// ========================================================================
// The cycling headline. Purely CSS-driven (see <style>) - this only owns
// the word index.
// ========================================================================

/**
 * German adjectives inflected to agree with "Abstimmungen" (fem. plural) - see the comment on the
 * i18n block above for why these are not translation keys.
 */
const ADJECTIVES = ["freie", "sichere", "anonyme", "faire", "liquide"]
// Matches the .droplet's drop-float CSS animation duration exactly (see <style> below), so a new
// adjective fades in right as the drop touches the water.
const WORD_INTERVAL_MS = 3200

const wordIndex = ref(0)
const currentWord = computed(() => ADJECTIVES[wordIndex.value])
let wordTimer

onMounted(() => {
	// Touch-down lands at the 50% mark of drop-float's cycle, not the 0%/100% boundary (gravity
	// pulls the fall and rise at different speeds - see the CSS comment on drop-float). Both timers
	// start at mount, so firing the first tick after only half a period, then settling into the
	// full period, keeps every later tick landing on a touch-down without an animationiteration
	// listener.
	wordTimer = setTimeout(() => {
		wordIndex.value = (wordIndex.value + 1) % ADJECTIVES.length
		wordTimer = setInterval(() => {
			wordIndex.value = (wordIndex.value + 1) % ADJECTIVES.length
		}, WORD_INTERVAL_MS)
	}, WORD_INTERVAL_MS / 2)
})
onUnmounted(() => {
	clearTimeout(wordTimer)
	clearInterval(wordTimer)
})

// ========================================================================
// The internal stepper. One phase is visible at a time; leaving/entering
// slides horizontally the same way root-app.vue slides between real pages
// (see .step-slide-* below), just driven locally instead of by the router.
// ========================================================================

const PHASE = Object.freeze({ LANDING: "LANDING", REGISTER: "REGISTER", PASSKEY: "PASSKEY", FIRST_PROPOSAL: "FIRST_PROPOSAL" })
const PHASE_ORDER = { LANDING: 0, REGISTER: 1, PASSKEY: 2, FIRST_PROPOSAL: 3 }

const phase = ref(PHASE.LANDING)
const path = ref(undefined)   // "create" | "join" - which LANDING button was pressed
const transitionName = ref("step-slide-left")

function goToPhase(nextPhase) {
	transitionName.value = PHASE_ORDER[nextPhase] >= PHASE_ORDER[phase.value] ? "step-slide-left" : "step-slide-right"
	phase.value = nextPhase
	// Unlike a real route change, switching phases never remounts anything, so a scroll position
	// picked up on the previous phase (e.g. a tall LANDING hero on a short viewport) would otherwise
	// carry over and tuck the new phase's heading under the fixed header.
	const appElem = document.getElementById("app")
	if (appElem) appElem.scrollTop = 0
}

/**
 * The app header's own back arrow drives navigation back to LANDING - there is no in-page back
 * link here. headerBackTarget usually holds a route object (see liquido-header.vue's clickLeft()),
 * but a function works too, which is what an internal-only "back" needs: there is no route to push.
 */
watch(phase, newPhase => {
	store.setHeaderBackTarget(newPhase === PHASE.REGISTER ? goBackToLanding : undefined)
}, { immediate: true })

/** Pull the liquidoErrorCode out of a rejected api call - same shape as join-team-v2.vue's helper. */
function getLiquidoErrorCode(err) {
	return err?.liquidoException?.liquidoErrorCode ?? err?.response?.data?.liquidoErrorCode
}

// ========================================================================
// LANDING
// ========================================================================

const EMAIL_REG_EX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,256}$/
const inviteCodeLength = config.inviteCodeLength
const INVITE_CODE_REG_EX = new RegExp(`^[A-Za-z0-9]{${inviteCodeLength}}$`)

/** Resolved team + inviter for a valid inviteCode. Stays { team: undefined } for no/invalid code. */
const invite = ref({ team: undefined, adminName: undefined, teamName: undefined })

onMounted(() => {
	if (props.inviteCodeQueryParam && props.inviteCodeQueryParam.trim() !== "") {
		loadInviteInfo(props.inviteCodeQueryParam.trim())
		// A link with an inviteCode means someone specifically set out to join a team - skip the
		// landing page's choice entirely and land them straight in the join form, code prefilled.
		goToJoin()
	}
})

/**
 * Resolve the inviteCode to a team + its admin's name, so "Team beitreten" can greet the visitor by
 * name before they commit to anything. Unlike join-team-v2.vue's dedicated error state, a failure
 * here stays silent - both on the landing screen (never shows the join button's greeting) and while
 * editing the invite code field in the join form (the field's own invalid-feedback covers that case).
 */
async function loadInviteInfo(code) {
	try {
		const team = await api.getTeamForInviteCode(code)
		const admin = team.members?.find(member => member.role === "ADMIN")
		invite.value = { team, adminName: admin?.user?.name || "Admin", teamName: team.teamName }
	} catch (err) {
		invite.value = { team: undefined, adminName: undefined, teamName: undefined }
		log.info("welcome-chat-v2: no usable invite code", err)
	}
}

function goToCreate() {
	path.value = "create"
	goToPhase(PHASE.REGISTER)
}

/**
 * The invite code passed in the URL is only ever a shortcut into this same form - joining always
 * happens here, never straight from the landing screen. Someone without a code (or with one that
 * did not resolve) can still click through and type it in by hand.
 */
function goToJoin() {
	path.value = "join"
	goToPhase(PHASE.REGISTER)
}

function goToLogin() {
	const query = {}
	if (props.inviteCodeQueryParam) query.inviteCode = props.inviteCodeQueryParam
	router.push({ name: "login", query })
}

function goBackToLanding() {
	formErrorKey.value = undefined
	goToPhase(PHASE.LANDING)
}

// ========================================================================
// REGISTER (create-team or join-team, same form, different fields/submit)
// ========================================================================

// Pre-filled from the URL when present - the query param is only ever a shortcut into this field,
// never a separate path, so someone without a link can type a code in here just the same.
const inviteCode = ref(props.inviteCodeQueryParam?.trim() || "")
const nickname = ref("")
const teamName = ref("")
const email = ref("")
const password = ref("")
const registering = ref(false)
const formErrorKey = ref(undefined)
// Set once createNewTeam rejects with TEAM_WITH_SAME_NAME_EXISTS. Forces a real edit to the team
// name - not just another click - before the button accepts a resubmit with the same name again.
const teamNameTaken = ref(false)
watch(teamName, () => { teamNameTaken.value = false })

const usernameMinLength = config.usernameMinLength
const minPasswordLength = config.minPasswordLength

const formIsValid = computed(() => {
	const baseValid = nickname.value.trim().length >= usernameMinLength &&
		EMAIL_REG_EX.test(email.value.trim()) &&
		password.value.length >= minPasswordLength
	if (!baseValid) return false
	if (path.value === "create") return teamName.value.trim().length >= 6 && !teamNameTaken.value
	return INVITE_CODE_REG_EX.test(inviteCode.value.trim())
})

/**
 * Where the "log in instead" link in the emailAlreadyRegistered error sends the visitor - carries
 * the email so login-page.vue can prefill it, and the inviteCode (if any) so joining can resume
 * right after login, same as join-team-v2.vue's goToLogin(prefillEmail).
 */
const loginLinkQuery = computed(() => {
	const query = { email: email.value.trim() }
	if (path.value === "join" && inviteCode.value.trim()) query.inviteCode = inviteCode.value.trim()
	return query
})

/** Re-validates whenever the invite code field changes, so the greeting stays in sync with typing. */
async function onInviteCodeBlur() {
	const code = inviteCode.value.trim()
	if (!INVITE_CODE_REG_EX.test(code)) {
		invite.value = { team: undefined, adminName: undefined, teamName: undefined }
		return
	}
	await loadInviteInfo(code)
}

async function submitRegister() {
	if (!formIsValid.value || registering.value) return
	registering.value = true
	formErrorKey.value = undefined
	try {
		if (path.value === "create") {
			const admin = { name: nickname.value.trim(), email: email.value.trim(), picture: "Avatar1.png" }
			await api.createNewTeam(teamName.value.trim(), admin, password.value)
		} else {
			const member = { name: nickname.value.trim(), email: email.value.trim(), picture: "Avatar1.png" }
			await api.joinTeam(inviteCode.value.trim(), member, password.value)
		}
		// Fire-and-forget: the user is already registered and logged in, so a slow or failing mail
		// server must not delay the next step.
		api.sendWelcomeMail().catch(err => log.warn("welcome-chat-v2: could not send welcome mail", err))
		// Default label so the field is never blank going into the PASSKEY step - the button below
		// isn't gated on the field's own validity, so an untouched (empty) label would otherwise sail
		// past the frontend and only fail once the backend rejects it, AFTER the real biometric
		// ceremony already completed. Same convention as team-home.vue's later "add a passkey" flow.
		if (!passkeyLabel.value) passkeyLabel.value = nickname.value.trim() + "-Passkey"
		goToPhase(PHASE.PASSKEY)
	} catch (err) {
		handleRegisterError(err)
	} finally {
		registering.value = false
	}
}

/**
 * No dynamic "is this email already registered" check while typing, unlike login-page.vue - this
 * form only finds out on submit, from the backend's actual answer. That answer decides everything
 * else here too: which field the visitor must fix before they can try again.
 */
function handleRegisterError(err) {
	log.info("welcome-chat-v2: cannot register", err)
	const code = getLiquidoErrorCode(err)
	if (path.value === "create" && code === api.err.TEAM_WITH_SAME_NAME_EXISTS) {
		teamNameTaken.value = true
		formErrorKey.value = "teamWithSameNameExists"
		return
	}
	switch (code) {
		case api.err.CANNOT_CREATE_TEAM_ALREADY_REGISTERED:
			// Edge case: this visitor already has an account (e.g. registered on another device or
			// browser), so has no local JWT here - the backend can tell from the email alone that an
			// account exists, but can't just add this team to it without them being logged in first
			// (that's the separate "add another team" flow). Rendered specially in the template, same
			// reasoning as emailAlreadyRegistered below.
			formErrorKey.value = "alreadyRegisteredCannotCreate"
			return
		case api.err.USER_EMAIL_EXISTS:
		case api.err.CANNOT_JOIN_TEAM_ALREADY_MEMBER:
		case api.err.CANNOT_JOIN_TEAM_ALREADY_ADMIN:
			// Rendered specially in the template - the message needs a real link to /login, not
			// just translated text (see the emailAlreadyRegistered* keys).
			formErrorKey.value = "emailAlreadyRegistered"
			return
		case api.err.PASSWORD_TOO_SHORT:
			formErrorKey.value = "passwordTooWeak"
			return
		case api.err.CANNOT_JOIN_TEAM_INVITE_CODE_INVALID:
			formErrorKey.value = "inviteCodeInvalid"
			return
		default:
			formErrorKey.value = "unexpectedError"
	}
}

// ========================================================================
// PASSKEY (skippable)
// ========================================================================

const passkeyLabel = ref("")
const settingUpPasskey = ref(false)
const passkeyDone = ref(false)
const passkeyErrorKey = ref(undefined)
const passkeySupported = ref(true)

onMounted(() => {
	passkeySupported.value = webauthnService.isWebAuthnSupported()
})

async function setupPasskey() {
	settingUpPasskey.value = true
	passkeyErrorKey.value = undefined
	try {
		// A headless Cypress browser has no authenticator, and navigator.credentials.create() just
		// hangs instead of failing fast, so by default take the same "failed" path a real ceremony
		// failure would take - same guard as the original welcome-chat.vue's setupPasskey(). The one
		// exception: a spec that has registered a Chrome DevTools Protocol virtual authenticator (see
		// setupVirtualAuthenticator() in happy-case.cy.js) sets window.__cypressWebAuthnAvailable
		// first, in which case the real call below genuinely succeeds against that authenticator.
		if (window.Cypress && !window.__cypressWebAuthnAvailable) {
			throw new Error("Passkey registration is not testable in Cypress")
		}
		await webauthnService.registerWebauthn(passkeyLabel.value)
		passkeyDone.value = true
		// Give the checkmark a moment on screen before sliding on, instead of jumping away the
		// instant the browser's own passkey dialog closes.
		setTimeout(continueAfterPasskey, 600)
	} catch (err) {
		log.info("welcome-chat-v2: passkey registration failed or was cancelled", err)
		passkeyErrorKey.value = "passkeySetupFailed"
	} finally {
		settingUpPasskey.value = false
	}
}

function skipPasskey() {
	continueAfterPasskey()
}

/**
 * api.isAdmin() is called directly here, NOT wrapped in a computed - it reads the JWT synchronously
 * and a computed would latch whatever it saw on its first evaluation (see liquido-mobile-pwa-vue3's
 * CLAUDE.md §5). A brand new admin (just created a team) gets the first-proposal step; a brand new
 * member (just joined) goes straight to their team.
 */
function continueAfterPasskey() {
	if (api.isAdmin()) {
		goToPhase(PHASE.FIRST_PROPOSAL)
	} else {
		router.push({ name: "team" })
	}
}

// ========================================================================
// FIRST PROPOSAL (create-team path only)
// ========================================================================

/**
 * Callback ref, called by Vue with the <section> once it's actually in the DOM (and again with
 * null right before it's removed). goToPhase() already resets #app's scrollTop synchronously
 * before this step's render, which is normally enough - but this step is reached via a 600ms
 * setTimeout after the WebAuthn passkey dialog closes (see continueAfterPasskey()), and a tall
 * PASSKEY step scrolled down beforehand left this landing scrolled too, the same reset run here
 * after the DOM has actually settled fixes it reliably.
 */
function scrollFirstProposalToTop(el) {
	if (!el) return
	const appElem = document.getElementById("app")
	if (appElem) appElem.scrollTop = 0
}

function gotoTeam() {
	router.push({ name: "team" })
}

function gotoCreateFirstProposal() {
	router.push({ name: "newPoll", query: { onboarding: 1 } })
}
</script>


<style scoped>

.welcome-v2 {
	--liquide-accent: #2569c9;
	position: relative;
	min-height: calc(100vh - var(--liquido-header-height) - env(safe-area-inset-top, 0px));
	display: flex;
	flex-direction: column;
}

/*
 * This page's own root IS #appContent (see root-app.vue), so it inherits the global
 * #app #appContent styling - including a padding-bottom reserved for liquido-footer.vue's fixed
 * nav bar (about 180px). This page has no footer, so that reserved space would otherwise just eat
 * into the "pin the CTA to the bottom" layout below. #app #appContent here matches the global
 * rule's specificity (two IDs) so this actually overrides it, rather than losing to a plain
 * class's lower specificity. The background itself needs no override - it's the app-wide gradient
 * by default (see #app in liquido.css).
 */
#app #appContent.welcome-v2 {
	padding-bottom: var(--unit);
}

.step-container {
	position: relative;
	flex: 1;
	display: flex;
	flex-direction: column;
}

.step {
	box-sizing: border-box;
	width: 100%;
	flex: 1;
	padding: 1.5rem 1.25rem 3rem;
}

/* ============ LANDING: the hero, with the CTA pinned to the bottom ============ */

/* .step is itself flex:1 inside .step-container (a flex column), so it already fills the full
   available height. Stacking .hero (flex:1, so it grows into whatever room is left) above
   .landing-cta (its natural size) is what settles the CTA at the very bottom instead of right
   under the tagline. */
.step-landing {
	display: flex;
	flex-direction: column;
}

/*
 * flex:1 fills whatever height .step-landing has. The negative margin-top on top of that reclaims
 * the space #appContent otherwise reserves for the app header (this phase has no use for it - its
 * own, bigger brand mark lives in .hero-brand instead; the header itself is hidden via the
 * unscoped <style> block below).
 *
 * This offset belongs here, on .hero, and deliberately not on .step-landing itself (which is what
 * the step-slide transition (see .step-slide-left-leave-active etc. below) actually
 * position:absolute's and slides). Applying it to .step-landing used to also change ITS OWN height
 * during the transition: while in normal flex flow, flex-grow expands an item to compensate a
 * negative margin so its far edge stays put, but that compensation stops working the moment the
 * transition's position:absolute takes the item out of flow, and swapping to an explicit height
 * (needed for a different fix - see .step-slide-left-leave-active) would fix the top edge but not
 * reproduce that compensation, so the two states disagreed on where the far edge sat and it jumped
 * when the transition started. .hero is a plain flex child of .step-landing throughout - untouched
 * by that position swap either way - so the same margin here never has two different states to
 * disagree between.
 */
.hero {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	text-align: center;
	margin-top: calc(-1 * var(--liquido-header-height));
}

/*
 * The brand mark lives here instead of in the app header while this phase is showing - the header
 * is removed outright while LANDING is active (see #rootApp:has(...) #liquidoHeader in the unscoped
 * <style> block below), so there is no double "LIQUIDO" on screen and no white bar over the gradient.
 */
.hero-brand {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 0.4rem;
	font-family: var(--serif-font);
	margin-bottom: 1.5rem;
	font-size: 3rem;
	color: var(--primary);
}
.hero-brand i {
	font-size: 1.1em;
}
.hero-brand .liquido:after {
	font-size: 1em;
	letter-spacing: 0.06em;
}

.hero-manifesto {
	max-width: 20rem;
	margin: 0.75rem auto 0;
}

/*
 * A drop, suspended above a tilted water surface, bobbing up and down - every time it touches
 * down, ripples spread outward from that point. Adapted from a reference mockup Robert supplied,
 * but re-timed and re-implemented for performance: the reference animated the ripples' width/height
 * directly (a layout property - expensive to animate continuously, forever, on a mobile device).
 * Everything here animates only transform/opacity, which the browser can composite on the GPU
 * without ever re-running layout, and the ripple keyframes are on the SAME 3.2s cycle as the drop's
 * float so they genuinely trigger at the moment of contact instead of drifting in and out of sync.
 */
.water-stage {
	position: relative;
	width: 15rem;
	height: 10rem;
	display: flex;
	align-items: center;
	justify-content: center;
	
}

.ambient-glow {
	position: absolute;
	width: 11rem;
	height: 11rem;
	border-radius: 50%;
	background: radial-gradient(circle, rgba(125, 195, 238, 0.35) 0%, rgba(214, 235, 250, 0) 70%);
	filter: blur(6px);
}

.water-plane {
	position: absolute;
	width: 13rem;
	height: 13rem;
	border-radius: 50%;
	transform: rotateX(56deg);
	background: radial-gradient(circle at 45% 45%, rgba(220, 240, 255, 0.7) 0%, rgba(168, 209, 236, 0.35) 40%, rgba(116, 178, 219, 0.12) 70%, rgba(116, 178, 219, 0.12) 100%);
	/*
	 * A separate mask for the outer fade, rather than relying on the color gradient's own falloff:
	 * that gradient is centered off-center (45%/45%, for a subtle light-source feel) and stays
	 * fully opaque at its own 100% stop, so its fade-to-nothing can't line up with the actual
	 * circular edge at every angle. A mask centered on the box itself fades to transparent exactly
	 * at that edge in every direction, uniformly, independent of where the color glow is centered.
	 */
	-webkit-mask-image: radial-gradient(circle farthest-side, black 0%, black 55%, transparent 100%);
	mask-image: radial-gradient(circle farthest-side, black 0%, black 55%, transparent 100%);
}

.water-shadow {
	position: absolute;
	left: 50%;
	top: 50%;
	width: 2.5rem;
	height: 2.5rem;
	border-radius: 50%;
	background: radial-gradient(circle, rgba(15, 41, 66, 0.25) 0%, rgba(42, 99, 140, 0.12) 45%, transparent 75%);
	/* Matches the touch-down (50%) keyframe below, since that is also .droplet's own resting pose
	   under prefers-reduced-motion - the drop shown at rest should look like it's actually resting
	   on the water, not floating with a half-size shadow. */
	transform: translate(-50%, -50%) scale(1);
	opacity: 0.7;
	animation: shadow-pulse 3.2s infinite;
}

/* Touch-down is at the 50% mark now (see drop-float below) - full and darkest exactly then,
   smallest and faintest while the drop is up at the top. Same asymmetric easing as the drop
   itself, so the shadow visibly "reacts" in step with it rather than just floating along. */
@keyframes shadow-pulse {
	0%, 100% { transform: translate(-50%, -50%) scale(0.65); opacity: 0.28; animation-timing-function: cubic-bezier(0.65, 0, 0.85, 0.35); }
	50%      { transform: translate(-50%, -50%) scale(1); opacity: 0.7; animation-timing-function: cubic-bezier(0.15, 0.65, 0.35, 1); }
}

/*
 * Fixed-size rings that only ever scale up and fade - never resized directly, so there is nothing
 * here for the browser to lay out or repaint frame to frame, only to composite. The soft glow
 * (outer + inset box-shadow) is what reads as "gradient" rather than a hard-edged circle; it costs
 * nothing extra per frame because it never changes on its own - only the ring's transform/opacity
 * animate, and the whole painted result (ring + its shadow) scales and fades together.
 */
.ripple {
	position: absolute;
	left: 50%;
	top: 50%;
	width: 1rem;
	height: 1rem;
	border-radius: 50%;
	border: 1.5px solid rgba(82, 160, 206, 0.65);
	box-shadow: 0 0 0.4rem rgba(78, 141, 184, 0.35), inset 0 0 0.3rem rgba(255, 255, 255, 0.4);
	transform: translate(-50%, -50%) scale(1);
	opacity: 0;
	animation: ripple-touch 3.2s ease-out infinite;
}
.ripple--b {
	animation-delay: 0.45s;
}

/* Touch-down (see drop-float below) lands at the 50% mark of the cycle, so the ring stays
   invisible through the fall and only starts expanding once the drop actually arrives. */
@keyframes ripple-touch {
	/* 0% and 49.9% are identical (both opacity 0), so there is nothing to interpolate through the
	   whole fall - without this, opacity ramping from 0% straight to 50% would fade the ring in
	   gradually starting the instant the drop leaves the top, well before it actually lands. */
	0%, 49.9% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
	50%       { transform: translate(-50%, -50%) scale(1); opacity: 0.75; }
	95%       { transform: translate(-50%, -50%) scale(11); opacity: 0; }
	100%      { transform: translate(-50%, -50%) scale(11); opacity: 0; }
}

/*
 * A true pointed teardrop (not just a rounded blob) needs one sharp corner, which border-radius
 * alone can't give a single box on its own axis - so this is a square with one corner left sharp
 * (border-radius: 50% 50% 50% 0), rotated 135deg to aim that corner straight up. Rotating the
 * whole box would also rotate its gradient and shading, so the actual gradient/highlight live on
 * an inner layer counter-rotated back to upright - oversized so its edges still fully cover the
 * outer shape's corners (a 45deg-rotated square only reaches its parent's edge midpoints, not its
 * corners, at 1:1 size). .droplet itself only ever positions/floats/clips; nothing about "what it
 * looks like" lives there.
 */
.droplet {
	position: absolute;
	left: 50%;
	top: 50%;
	width: 2.5rem;
	height: 2.5rem;
	overflow: hidden;
	border-radius: 50% 50% 50% 0;
	transform: translate(-50%, -50%) translateY(-1.25rem) rotate(135deg);
	animation: drop-float 3.2s ease-in-out infinite;
	z-index: 2;
}

.droplet-inner {
	position: absolute;
	left: 50%;
	top: 50%;
	width: 145%;
	height: 145%;
	transform: translate(-50%, -50%) rotate(-135deg);
	/* The highlight sits low, near the rounded bulge - not near the pointed tip. Physically that is
	   where a real drop's glossiest reflection would be anyway, and it keeps the thin tip solidly
	   in the darker part of the gradient instead of washing out against the pale background. */
	background: radial-gradient(circle at 42% 62%, #ffffff 0%, #cfe8f7 10%, #6fb1dc 32%, #2f6fa3 60%, #1d4f7d 100%);
	box-shadow:
		inset -0.3rem -0.45rem 0.7rem rgba(10, 35, 58, 0.35),
		inset 0.22rem 0.32rem 0.55rem rgba(255, 255, 255, 0.9);
}

/* The specular glint - what actually reads as "wet" rather than "painted shape". Sized/positioned
   in %, so it stays put on .droplet-inner regardless of the 145% enlargement above. */
.droplet-inner::before {
	content: "";
	position: absolute;
	top: 21%;
	left: 27%;
	width: 16%;
	height: 11%;
	border-radius: 50%;
	background: #ffffff;
	transform: rotate(-32deg);
	opacity: 0.9;
}

/*
 * -1.25rem is the drop's touch-down offset: with the point-up rotation, the visible tip sits above
 * the box's own center, so this is what makes the ROUNDED BOTTOM - not the center - the part that
 * reaches down to the water-plane's center. Confirmed against the rendered water-plane's actual
 * measured center, the same way the rest of this hero's sizing was tuned.
 *
 * Not a symmetric bob: gravity pulls the drop down faster as it falls (ease-in, set on the 0%
 * stop, governing 0%->50%) and it loses momentum coming back up (ease-out, set on the 50% stop,
 * governing 50%->100%) - a per-keyframe animation-timing-function, not one easing for the whole
 * animation. Touch-down is therefore at the 50% mark of each cycle, not the 0%/100% boundary -
 * the ripple and shadow-pulse keyframes above are timed to match, and so is the word-cycle
 * interval in the script below.
 */
@keyframes drop-float {
	0%   { transform: translate(-50%, -50%) translateY(-2.35rem) rotate(135deg); animation-timing-function: cubic-bezier(0.65, 0, 0.85, 0.35); }
	50%  { transform: translate(-50%, -50%) translateY(-1.25rem) rotate(135deg); animation-timing-function: cubic-bezier(0.15, 0.65, 0.35, 1); }
	100% { transform: translate(-50%, -50%) translateY(-2.35rem) rotate(135deg); }
}

.headline {
	display: flex;
	align-items: flex-end;
	justify-content: center;
	gap: 0.25em;
	margin: 0.25rem 0 0;
	font-family: var(--serif-font);
	font-size: clamp(1.4rem, 6.2vw, 2rem);
	color: var(--text-color);
}

.cycle-word-box {
	position: relative;
	display: inline-block;
	width: 7ch;
	height: 1.3em;
	overflow: hidden;
	text-align: right;
}

.cycle-word {
	position: absolute;
	right: 0;
	bottom: 0;
	white-space: nowrap;
}

.cycle-word.is-liquide {
	font-weight: 600;
	background-image: linear-gradient(100deg, var(--liquide-accent) 0%, #7fb8ff 45%, var(--liquide-accent) 90%);
	background-size: 220% 100%;
	background-position: 0% 0;
	-webkit-background-clip: text;
	background-clip: text;
	-webkit-text-fill-color: transparent;
	animation: liquide-shimmer 3.2s linear infinite;
}

@keyframes liquide-shimmer {
	from { background-position: 0% 0; }
	to   { background-position: 220% 0; }
}

.word-fade-enter-active,
.word-fade-leave-active {
	transition: opacity 0.65s ease, transform 0.65s ease, filter 0.65s ease;
}
.word-fade-enter-from {
	opacity: 0;
	transform: translateY(10px);
	filter: blur(3px);
}
.word-fade-leave-to {
	opacity: 0;
	transform: translateY(-10px);
	filter: blur(3px);
}

.headline-fixed {
	white-space: nowrap;
}

/*
 * Only one primary action here: registering and creating a new team is the only thing a genuinely
 * new visitor ever does on this page - anyone who already has an account is auto-logged-in by their
 * JWT and never sees it. Login (top right) and joining an existing team (this hint) are both real,
 * but deliberately secondary, so they stay small and quiet rather than competing for attention.
 */
.landing-cta {
	width: 100%;
	max-width: 22rem;
	margin: 2rem auto 0;
	text-align: center;
}

.join-hint {
	display: block;
	margin: 0.75rem 0 0;
	font-size: var(--font-size-small);
}
p.join-hint {
	color: var(--secondary);
}

.inline-link {
	padding: 0;
	border: 0;
	background: none;
	font: inherit;
	color: var(--primary);
	text-decoration: underline;
	text-decoration-color: var(--light-border);
	text-underline-offset: 3px;
	cursor: pointer;
}
.inline-link:hover,
.inline-link:focus-visible {
	text-decoration-color: var(--primary);
}

/* ============ Shared: the little "Login" way in, top right ============ */

.hero-login {
	position: fixed;
	top: env(safe-area-inset-top, 0px);
	right: 0;
	z-index: 10001;
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: var(--liquido-header-height);
	height: var(--liquido-header-height);
	padding: 0 var(--unit);
	border: 0;
	background: none;
	font-family: inherit;
	font-size: 1rem;
	font-weight: 600;
	color: var(--secondary);
	text-decoration: none;
	cursor: pointer;
}
.hero-login:hover {
	color: var(--primary);
}
.hero-login:focus-visible {
	outline: 2px solid var(--primary);
	outline-offset: -4px;
	border-radius: var(--liquido-border-radius);
}

/* ============ REGISTER ============ */

/* The card matches login-page.vue's loginCard: flush against the viewport edge with only its own
   m-3, not additionally boxed in by .step's horizontal padding. */
.step-register {
	padding-left: 0;
	padding-right: 0;
}

/* ============ PASSKEY / FIRST PROPOSAL ============ */

.passkey-icon,
.success-icon {
	font-size: 2.5rem;
	color: var(--primary);
	margin-bottom: 0.75rem;
}
.success-icon {
	color: var(--state-finished);
}

/* ============ The internal stepper's own slide, choreographed exactly like root-app.vue's
   real page transitions (see .slide-left-... / .slide-right-... in liquido.css) - just run locally,
   scoped to this component, instead of by the router. ============ */

.step-slide-left-enter-from,
.step-slide-right-leave-to {
	transform: translate(100%, 0);
}
.step-slide-left-leave-active,
.step-slide-right-leave-active {
	/* Taking the leaving step out of flow like this is what lets it and the entering step overlap
	   during the slide - but it also strips away the flex layout that normally gives .step its
	   height (.step is flex:1 inside .step-container; flex-grow only applies within flex flow).
	   Without an explicit height, the leaving step collapsed to its own content's natural height
	   the instant the transition started - visible as a sudden shrink right as the slide began.
	   height: 100% pins it back to .step-container's own (stable - see .step-container's flex:1 in
	   its own parent) height, matching what it had a moment earlier while still in flow. */
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
}
.step-slide-left-leave-to,
.step-slide-right-enter-from {
	transform: translate(-100%, 0);
}
.step-slide-left-enter-active,
.step-slide-left-leave-active,
.step-slide-right-enter-active,
.step-slide-right-leave-active {
	transition: transform 0.35s ease-in-out;
}

@media (prefers-reduced-motion: reduce) {
	.droplet { animation: none; }
	.water-shadow { animation: none; }
	.ripple { animation: none; opacity: 0; }
	.cycle-word.is-liquide { animation: none; }
	.word-fade-enter-active, .word-fade-leave-active { transition: opacity 0.2s ease; }
	.word-fade-enter-from, .word-fade-leave-to { transform: none; filter: none; }
	.step-slide-left-enter-active, .step-slide-left-leave-active,
	.step-slide-right-enter-active, .step-slide-right-leave-active { transition: opacity 0.2s ease; }
	.step-slide-left-enter-from, .step-slide-right-leave-to,
	.step-slide-left-leave-to, .step-slide-right-enter-from { transform: none; }
}

</style>

<!--
	Unscoped on purpose: #liquidoHeader and #app are #appContent's sibling and ancestor under
	#rootApp (see root-app.vue) - neither is a descendant of this component, so a normal
	<style scoped> rule could never reach them; Vue only attaches its scoping attribute to elements
	this component actually renders. :has() on their shared ancestor is what reaches them instead,
	without liquido-header.vue or the global #app rules needing to know this page exists.
-->
<style>
/* The LANDING phase has no use for the app header at all - see the comment on
   #app #appContent.welcome-v2.is-landing above. */
#rootApp:has(#appContent.welcome-v2.is-landing) #liquidoHeader {
	display: none;
}
</style>
