/**
 * Main entry point for LIQUIDO mobile app.
 */
import config from "config"  // This path is automatically mapped to an environment specific config file config/config.<env>.json  See vite.config.js

console.log("===================")
console.log("WELCOME to LIQUIDO!")
console.log("===================")
console.log("config.source   = "+config.configSource)
console.log("LIQUIDO_API_URL = "+config.LIQUIDO_API_URL)

import log from 'loglevel'
if (import.meta.env.MODE === "development" || import.meta.env.MODE === "test") {
	log.enableAll()
}

import { createApp } from 'vue'
import 'bootstrap/dist/css/bootstrap.css'
import '@/styles/liquido.css'  		// global liquido styles and vars. MUST be imported AFTER bootstrap.css to OVERRIDE bootstraps defaults!
import RootApp from '@/root-app.vue'
import router from '@/services/router.js'
import { createLoc, t as loc } from "@/services/liqui-loc.js"
import LiquiLocHtml from "@/components/liqui-loc-html.vue"
import { store } from "@/services/store.js"	

/** 
 * Global translations that are available to all components 
 * 
 * Capital translations also have a capital key, eg.  Cancel: "Cancel" both with capital 'C'.
 */
const globalTranslations = {
	en: {
		HelloWorld: "Hello world!",
		Ok: "Ok",
		Yes: "Yes",
		No: "No",
		Cancel: "Cancel",
	},
	de: {
		HelloWorld: "Hallo Welt!",
		Ok: "Ok",
		Yes: "Ja",
		No: "Nein",
		Menue: "Menü",
		Team: "Team",
		
		Save: "Speichern",
		Edit: "Bearbeiten",
		Send: "Senden",
		Delete: "Löschen",
		Cancel: "Abbrechen",
		Back: "Zurück",
		Search: "Suche",
		Warning: "Warnung",
		Attention: "Achtung",
		Error: "Fehler",
		Login: "Login",
		Loading: "Lade ...",

		// Singular and plural form
		Idea: "Idee",
		Ideas: "Ideen",
		Proposal: "Vorschlag",  // 'Wahlvorschlag' ist zu lang. 'Option' zu allgemein. 'Kandidat' wäre für Personenwahlen. 
		Proposals: "Vorschläge",
		// Entscheidung zur deutschen Übersetzung von Poll == "Abstimmung" !!!
		// Nein nicht "Wahl". Wir stimmen ab in LIQUIDO. Der Begriff "Wahl" passt eher zu einer Wahl von Kandidaten, also Personen.
		vote: "abstimmen",   // Verb
		Poll: "Abstimmung",
		Polls: "Abstimmungen",
		Law: "Regel",   // Gesetz? ... vielleicht irgendwann mal wenn die LIQUIDO Liquid Democracy Revolution erfolgreich war :-)
		Laws: "Regeln",

	
		newPoll: "Neue Abstimmung",
		allPolls: "Alle Abstimmungen",
		YourPolls: "Abstimmungen",
		pollTitle: "Titel der Abstimmung",
		pollInElaboration: "Neue Abstimmung",   // Im großen LIQUIDO: "Abstimmung zur Debatte"m denn das elaborierte Fremdwort "Debatte" macht den Eindruck den wir wollen.
		pollsInElaboration: "Neue Abstimmungen",
		pollInVoting: "Laufende Abstimmung",
		pollsInVoting: "Laufende Abstimmungen",
		finishedPoll: "Abgeschl. Abstimmung",   // Muss abkürzen, weil Titel der poll-show page sonst zu lang auf schmalen Phones
		finishedPolls: "Abgeschl. Abstimmungen",


		New: "Neu",									// Neue Abstimmung
		Elaboration: "Diskussion",	// Abstimmung die gerade debatiert wird. (Nur für großes LIQUIDO)
		InVoting: "Wahl läuft", 		// Abstimmung im Status "die Wahl läuft gerade" 
		Finished: "Abgeschlossen",  // "Beendet" ?
		User: "Profil",
		gotoPolls: "Abstimmungen",  // Link to /polls page  short!
		inviteNewMembers: "Teammitglieder einladen",
		SwitchTeam: "Team wechseln",   // only shown to users who are in more than one team
		TeamHome: "Team",
		JoinTeam: "Team beitreten",   // page title of join-team-v2.vue, also used as its header title

		// Global error messages 
		unexpectedError: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.",
		networkError: "Ein Netzwerkfehler ist aufgetreten. Bitte versuche es erneut.",
		

		// Need these translations here, because of an issue when upgrading vue-i18n
		// Or maybe it's even a good idea to have all translations in one place => NO its not!! :-)  => In LIQUIDO we want to have visual in place translation service per page

		// Polls page
		"noPollYet": "Es gibt noch keine Abstimmungen in eurem Team.",
		"noPollsMatchSearch": "Keine Abstimmungen passen zu deiner Suche.",
		"onlyAdminCanCreateNewPolls": "Nur du als Admin kannst neue Abstimmungen anlegen.",
		"createNewPoll": "Neu Abstimmung anlegen"
	},
}

/**
 * Localisation. See src/services/liqui-loc.js.
 *
 * Replaces vue-i18n: same globalTranslations catalogue, same component-local `i18n: { messages }`
 * option, same $t()/$tc() in templates - but it also works from <script setup> via useLoc(), which
 * vue-i18n's legacy mode could not do.
 */
const loc18n = createLoc({
	locale: "de",
	fallbackLocale: "de",
	messages: globalTranslations,
})

//TODO: sanity check config for required attributes

// Vue Root App
const rootApp = createApp({
	router,
	...RootApp, // merge these attributes into root-app.vue
	//render: (h) => h(App),
})

//MAYBE: It is possible to register components globally. https://vuejs.org/guide/components/registration.html#global-registration
//rootApp.component('globalComponent', globalComponent)

rootApp.config.globalProperties.$store = store // make store available in all components via this.$store
rootApp.use(router)
rootApp.use(loc18n)
// The one place message HTML is allowed. Registered globally so no view has to import it.
rootApp.component("liqui-loc-html", LiquiLocHtml)

/**
 * Global Vue error boundary.
 * Catches errors thrown in any component's lifecycle hook, render function, or watcher.
 * NEVER show backend error details to the user — only show a fixed, localized message.
 * rootInstance is set on mount() below; the handler fires lazily so it is always available.
 */
rootApp.config.errorHandler = (err, _instance, info) => {
	console.error("[Global Vue Error] in:", info, err)
	rootInstance?.showError?.(
		loc("unexpectedError"),
		loc("Error"),
		undefined, undefined,
		() => window.location.reload()
	)
}

// app.mount() returns the root component's public proxy (Vue 3 documented behaviour)
const rootInstance = rootApp.mount("#app")

// Catch unhandled Promise rejections (e.g. unawaited API calls without .catch())
window.addEventListener("unhandledrejection", (event) => {
	console.error("[Unhandled Promise Rejection]", event.reason)
	// NEVER forward backend error messages to the user — always show a fixed, localized message.
	rootInstance?.showError?.(
		loc("networkError"),
		loc("Error"),
		undefined, undefined,
		() => window.location.reload()
	)
	event.preventDefault() // suppress browser's default console error
})