/**
 * Main entry point for LIQUIDO mobile app.
 */

console.log("===================")
console.log("WELCOME to LIQUIDO!")
console.log("===================")

import config from "config"  // This path is automatically mapped to an environment specific config file config/config.<env>.json  See vite.config.js
import log from 'loglevel'
if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
	log.enableAll()
	console.log("NODE_ENV="+process.env.NODE_ENV+"   LIQUIDO configuration:\n", config)
}

import { createApp } from 'vue'
import RootApp from '@/root-app.vue'
import router from '@/services/router.js'
import BootstrapVue3 from 'bootstrap-vue-3'
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue-3/dist/bootstrap-vue-3.css'
import { createI18n } from 'vue-i18n'

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
		Law: "Regel",
		Laws: "Regeln",

		newPoll: "Neue Abstimmung",
		allPolls: "Alle Abstimmungen",
		YourPolls: "Eure Abstimmungen",
		pollTitle: "Titel der Abstimmung",
		pollInElaboration: "Abstimmung zur Debatte",   // Oder einfacher: Neue Abstimmung? Aber das elaborierte Fremdwort "Debatte" macht den Eindruck den wir wollen.
		pollsInElaboration: "Abstimmungen zur Debatte",
		pollInVoting: "Laufende Abstimmung",
		pollsInVoting: "Laufende Abstimmungen",
		finishedPoll: "Abgeschl. Abstimmung",   // Muss abkürzen, weil Titel der poll-show page sonst zu lang auf schmalen Phones
		finishedPolls: "Abgeschl. Abstimmungen",

		Elaboration: "Diskussion",	
		InVoting: "Wahl läuft", 		// Abstimmung im Status "die Wahl läuft gerade"
		Finished: "Abgeschlossen",

		NetworkOffline: "Du bist offline. Bitte schalte dein WLAN ein.",
		BackendNotReachable: "Ich kann den LIQUIDO Server gerade nicht erreichen. Bitte versuche es später noch einmal.",
	},
}

// Create VueI18n instance for translations.
const i18n = new createI18n({
	locale: "de",
	fallbackLocale: "de",
	warnHtmlInMessage: 'off', // disable of the Detected HTML in message
	silentFallbackWarn: true,
	messages: globalTranslations
})

//TODO: sanity check config for required attributes

// Vue Root App
const rootApp = createApp({
	i18n,				// provide default translations for all components
	router,
	...RootApp, // merge these attributes into root-app.vue
	//render: (h) => h(App),
})

rootApp.use(router)
rootApp.use(BootstrapVue3)
rootApp.use(i18n)
rootApp.mount("#app")