/**
 * Texts for the Polly module.
 *
 * vue-i18n runs in legacy mode here and has no SFC custom-block plugin, so
 * `useI18n({ useScope: "local" })` throws inside <script setup>. Rather than pushing polly
 * strings into the global table in main.js, the module keeps its own small table and only
 * borrows the *current locale* from vue-i18n. That keeps Polly self-contained and still
 * follows the app language - the previous version hardcoded `const lang = "de"`.
 */

import { useI18n } from "vue-i18n"

const messages = {
	en: {
		// creating
		PollyTitlePlaceholder: "What shall we decide?",
		PollyTitleEmptyFeedback: "Please enter a question (at least {minLength} characters).",
		PollyTitleInvalidFeedback: "A bit longer please, at least {minLength} characters.",
		AddProposalPlaceholder: "Add another option",
		CreatePolly: "Create",
		CreatePollyHint: "Your device will ask you to confirm. That tap creates your polly and makes you its admin — no account, no password.",

		// voting
		SortProposals: "Drag your favourite to the top",
		CastVote: "Vote",
		AlreadyVoted: "You already voted. Thanks!",
		ThxForVoting: "Thanks for voting!",

		// admin
		Edit: "Edit",
		Save: "Save",
		FinishPolly: "Finish",
		Share: "Share",
		LinkCopied: "Link copied. Now send it to your friends!",
		NumBallots: "{count} votes so far",

		// finished
		PollyFinished: "Finished — {count} votes",
		Winner: "Winner",

		// trouble
		NeedPasskey: "Your device could not confirm. A polly needs a passkey (Face-ID, fingerprint or device PIN).",
		PollyNotFound: "This polly does not exist (any more).",
		CannotSave: "Sorry, that did not work. Please try again.",
		CannotEditAnymore: "Someone already voted, so the options cannot be changed any more.",
		NotOwner: "Only the person who created this polly can do that.",

		// honesty about the privacy model - a polly is not a LIQUIDO poll
		PrivacyNote: "A polly is private among friends. For a truly anonymous ballot, use a LIQUIDO poll.",
	},
	de: {
		// creating
		PollyTitlePlaceholder: "Worüber wollt ihr entscheiden?",
		PollyTitleEmptyFeedback: "Bitte gib eine Frage ein (mindestens {minLength} Zeichen).",
		PollyTitleInvalidFeedback: "Bitte etwas länger, mindestens {minLength} Zeichen.",
		AddProposalPlaceholder: "Weitere Option hinzufügen",
		CreatePolly: "Erstellen",
		CreatePollyHint: "Dein Gerät wird für dich einen biometrischen Passkey (Face-ID/Fingerprint) erstellen. So wirst du zum Polly Admin - ganz ohne Passwort. Ich schicke dir den Link für deine Freunde auch per E-Mail.",

		// voting
		SortProposals: "Zieh deinen Favoriten nach oben",
		CastVote: "Abstimmen",
		AlreadyVoted: "Du hast schon abgestimmt. Danke!",
		ThxForVoting: "Danke für deine Stimme!",

		// admin
		Edit: "Bearbeiten",
		Save: "Speichern",
		FinishPolly: "Beenden",
		Share: "Teilen",
		LinkCopied: "Link kopiert. Jetzt kannst du ihn deinen Freunden schicken!",
		NumBallots: "Bisher {count} Stimmen",

		// finished
		PollyFinished: "Beendet – {count} Stimmen",
		Winner: "Gewinner",

		// trouble
		NeedPasskey: "Dein Gerät konnte nicht bestätigen. Für ein Polly brauchst du einen Passkey (Face-ID, Fingerabdruck oder Geräte-PIN).",
		PollyNotFound: "Dieses Polly gibt es nicht (mehr).",
		CannotSave: "Sorry, das hat nicht geklappt. Bitte versuch es noch einmal.",
		CannotEditAnymore: "Es wurde schon abgestimmt, die Optionen lassen sich nicht mehr ändern.",
		NotOwner: "Das kann nur die Person, die dieses Polly erstellt hat.",

		// honesty about the privacy model - a polly is not a LIQUIDO poll
		PrivacyNote: "Ein Polly ist privat unter Freunden. Für eine wirklich anonyme Wahl nimm eine LIQUIDO Abstimmung.",
	},
}

const FALLBACK = "en"

/** Replace {placeholders} with the given params. */
function interpolate(message, params) {
	return message.replace(/\{(\w+)\}/g, (match, key) =>
		Object.prototype.hasOwnProperty.call(params, key) ? params[key] : match)
}

/**
 * Returns a `t(key, params)` bound to the app's current locale.
 * Call it once at the top of a <script setup> block.
 */
export function usePollyI18n() {
	let localeRef
	try {
		localeRef = useI18n().locale		// global scope - works in legacy mode
	} catch (e) {
		localeRef = undefined				// e.g. in a unit test without the i18n plugin
	}

	return function t(key, params = {}) {
		const lang = (localeRef?.value || FALLBACK).split("-")[0]
		const message = messages[lang]?.[key] ?? messages[FALLBACK][key]
		if (!message) {
			console.warn("Polly: missing translation for '" + key + "'")
			return key
		}
		return interpolate(message, params)
	}
}

export default messages
