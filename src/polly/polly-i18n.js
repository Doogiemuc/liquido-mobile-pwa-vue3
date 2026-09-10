/**
 * Texts for the Polly module.
 *
 * The app's i18n is liqui-loc (src/services/liqui-loc.js), not vue-i18n - main.js says so
 * explicitly: "Replaces vue-i18n". Rather than pushing polly strings into liqui-loc's global
 * table, this module keeps its own small table and only borrows the app's *current locale*
 * from liqui-loc's `locale` ref. That keeps Polly self-contained and still follows the app
 * language - the previous version hardcoded `const lang = "de"`.
 *
 * (An earlier version of this file read the locale from vue-i18n's useI18n() instead. That
 * plugin is never installed - liqui-loc replaced it - so useI18n() always threw and every
 * polly text silently fell back to English regardless of the app's actual language.)
 */

import { locale as appLocale } from "@/services/liqui-loc.js"

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
		ConfirmVoteTitle: "Cast your vote?",
		ConfirmVoteMessage: "You can only vote once in this polly - you won't be able to change your ballot afterwards.",
		ConfirmVoteButton: "Yes, cast my vote",
		Cancel: "Cancel",
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

		// shown to whoever opens the share link and is not the polly's owner
		FriendInfo: "You've been invited to this polly. Instead of picking just one option, you sort all of them into your preferred order — your favourite on top. One tap confirms your vote via passkey, no account or password needed. Once the creator finishes the polly, the option with the broadest support is calculated.",
	},
	de: {
		// creating
		PollyTitlePlaceholder: "Worüber wollt ihr entscheiden?",
		PollyTitleEmptyFeedback: "Bitte gib eine Frage ein (mindestens {minLength} Zeichen).",
		PollyTitleInvalidFeedback: "Bitte etwas länger, mindestens {minLength} Zeichen.",
		AddProposalPlaceholder: "Weitere Option hinzufügen",
		CreatePolly: "Erstellen",
		CreatePollyHint: "Das ist dein Polly. Stelle eine Frage über die ihr Abstimmen wollt und füge Antwortoptionen hinzu. Wenn du den Button klickst, erstellt dein Gerät dann einen biometrischen Passkey (Face-ID/Fingerprint). So wirst du zum Polly Admin - ganz ohne Passwort. Ich schicke dir den Link für deine Freunde auch per E-Mail.",

		// voting
		SortProposals: "Zieh deinen Favoriten nach oben",
		CastVote: "Abstimmen",
		ConfirmVoteTitle: "Stimme abgeben?",
		ConfirmVoteMessage: "Du kannst in diesem Polly nur einmal abstimmen – danach lässt sich deine Stimme nicht mehr ändern.",
		ConfirmVoteButton: "Ja, Stimme abgeben",
		Cancel: "Abbrechen",
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

		// shown to whoever opens the share link and is not the polly's owner
		FriendInfo: "Du wurdest zu diesem Polly eingeladen. Statt nur eine Option zu wählen, bringst du alle Optionen in deine bevorzugte Reihenfolge – deinen Favoriten ganz nach oben. Mit einem Tap bestätigst du per Passkey, ganz ohne Account oder Passwort. Wenn euer Admin die Abstimmung beendet, wertet ein intelligenter Algorithmus alle Ranglisten aus und ermittelt die Option, die insgesamt die größte Zustimmung erhalten hat.",
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
	return function t(key, params = {}) {
		const lang = (appLocale.value || FALLBACK).split("-")[0]
		const message = messages[lang]?.[key] ?? messages[FALLBACK][key]
		if (!message) {
			console.warn("Polly: missing translation for '" + key + "'")
			return key
		}
		return interpolate(message, params)
	}
}

export default messages
