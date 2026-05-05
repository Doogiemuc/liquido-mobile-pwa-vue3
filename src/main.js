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
if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
	log.enableAll()
}

import { createApp } from 'vue'
import 'bootstrap/dist/css/bootstrap.css'
import '@/styles/liquido.css'  		// global liquido styles and vars. MUST be imported AFTER bootstrap.css to OVERRIDE bootstraps defaults!
import RootApp from '@/root-app.vue'
import router from '@/services/router.js'
import { createI18n } from 'vue-i18n'
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
		YourPolls: "Eure Abstimmungen",
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
		Finished: "Abgeschlossen", // "Beendet" ?

	},
}

// Create VueI18n instance for translations.
const i18n = new createI18n({
	locale: "de",
	fallbackLocale: "de",
	warnHtmlInMessage: 'off', // disable of the Detected HTML in message
	silentFallbackWarn: true,
	//allowComposition: true, // you need to specify that!
	messages: globalTranslations
})

/*   for upgrading to vue-i18n v11 with Composition API
const i18n = new createI18n({
	legacy: false, // you must set `legacy: false`, to use Composition API
	locale: "de",
	fallbackLocale: "de",
	strictMessage: false,
	escapeHtml: true,						// escape HTML in localized strings, to avoid XSS attack. See https://vue-i18n.intlify.dev/guide/essentials/syntax.html#escaping
	escapeParameter: true,    // escape interplated parameters in localized strings, to avoid XSS attack. See https://vue-i18n.intlify.dev/guide/essentials/syntax.html#escaping	
	warnHtmlMessage: false,   // disable of the Deprecation warning for HTML message
	warnHtmlInMessage: 'off', // disable of the Detected HTML in message
	//fallbackWarn: false,
	missingWarn: false,
	//silentFallbackWarn: true,
	globalInjection: true,				// make $t() available in all components without importing i18n
	messages: globalTranslations
})
	*/

//TODO: sanity check config for required attributes

// Vue Root App
const rootApp = createApp({
	i18n,				// provide default translations for all components
	router,
	...RootApp, // merge these attributes into root-app.vue
	//render: (h) => h(App),
})

//MAYBE: It is possible to register components globally. https://vuejs.org/guide/components/registration.html#global-registration
//rootApp.component('globalComponent', globalComponent)

rootApp.config.globalProperties.$store = store // make store available in all components via this.$store
rootApp.use(router)
rootApp.use(i18n)
rootApp.mount("#app")