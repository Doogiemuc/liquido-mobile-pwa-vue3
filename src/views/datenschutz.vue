<template>
	<div class="legal-page">
		<h1 id="datenschutz-page" class="page-title">{{ $t("pageTitle") }}</h1>
		<p class="legal-stand">Stand: {{ stand }}</p>

		<div class="legal-summary">
			<strong>Kurz gesagt:</strong> Wir speichern nur, was nötig ist, um dir LIQUIDO anzubieten -
			deinen Namen, deine E-Mail-Adresse und die Teams, in denen du Mitglied bist. Wir verkaufen
			deine Daten nicht und geben sie nicht zu Werbezwecken weiter. Deine Stimme bei einer
			Abstimmung ist anonym - selbst wir können sie nicht zu dir zurückverfolgen. Details dazu
			und zu allem anderen findest du weiter unten.
		</div>

		<article class="legal-content">
			<section>
				<h2>1. Verantwortlicher</h2>
				<p>
					Verantwortlich für die Datenverarbeitung im Sinne der Datenschutz-Grundverordnung (DSGVO)
					ist:
				</p>
				<p>
					[PLATZHALTER: Name]<br />
					[PLATZHALTER: Adresse]<br />
					E-Mail: [PLATZHALTER: E-Mail-Adresse]
				</p>
			</section>

			<section>
				<h2>2. Registrierung und Login</h2>
				<p>
					Wenn du ein Team erstellst oder einem Team beitrittst, erheben wir deinen (Spitz-)Namen,
					deine E-Mail-Adresse und entweder ein von dir gewähltes Passwort (nur als Hash
					gespeichert, niemals im Klartext) oder einen sogenannten Passkey.
				</p>
				<p>
					Ein Passkey ist eine biometrische Geräte-Anmeldung (z. B. Fingerabdruck oder
					Gesichtserkennung), technisch als „WebAuthn" bezeichnet. Dabei verlässt kein
					biometrisches Merkmal jemals dein Gerät - auf unseren Servern speichern wir ausschließlich
					einen kryptografischen öffentlichen Schlüssel, mit dem sich dein Gerät wiedererkennen
					lässt, niemals deinen Fingerabdruck oder dein Gesicht selbst.
				</p>
				<p>
					Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Erfüllung eines Vertrags bzw.
					vorvertragliche Maßnahmen, hier: die Bereitstellung deines Nutzerkontos).
				</p>
			</section>

			<section>
				<h2>3. Login mit Google</h2>
				<p>
					Als Alternative zu E-Mail und Passwort kannst du dich mit deinem Google-Konto anmelden
					("Google One Tap"). Dabei erhalten wir von Google deinen Namen und deine
					E-Mail-Adresse, um dein LIQUIDO-Konto zuzuordnen bzw. anzulegen. Diese Funktion nutzt du
					freiwillig; die Verarbeitung beruht auf deiner Einwilligung (Art. 6 Abs. 1 lit. a DSGVO),
					die du durch die aktive Nutzung des Google-Logins erteilst.
				</p>
				<p>
					Anbieter ist Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland. Es
					gilt die Datenschutzerklärung von Google:
					<a href="https://policies.google.com/privacy" target="_blank" rel="noopener">
						policies.google.com/privacy</a>. Google kann Daten auch in die USA übertragen; Google
					ist nach eigenen Angaben nach dem EU-US Data Privacy Framework zertifiziert.
				</p>
			</section>

			<section>
				<h2>4. Team- und Abstimmungsdaten</h2>
				<p>
					Innerhalb eines Teams verarbeiten wir die Daten, die zur Nutzung von LIQUIDO notwendig
					sind: den Teamnamen, wer Mitglied ist, sowie die von euch angelegten Abstimmungen und
					Vorschläge (Titel, Beschreibung, Ersteller:in). Diese Daten sind nur für Mitglieder des
					jeweiligen Teams einsehbar, nicht öffentlich.
				</p>
				<p>Rechtsgrundlage ist auch hier Art. 6 Abs. 1 lit. b DSGVO.</p>
			</section>

			<section>
				<h2>5. Anonymität deiner Stimme</h2>
				<p>
					Wenn du bei einer Abstimmung mitmachst, wird deine abgegebene Stimme (die Rangfolge
					deiner Präferenzen) technisch von deiner Person getrennt gespeichert. Anstelle deines
					Namens oder deiner E-Mail-Adresse wird ein Einweg-Prüfwert (kryptografischer Hash)
					verwendet, aus dem sich nicht auf deine Identität zurückschließen lässt. Deine Stimme
					selbst enthält keinerlei Verweis auf dein Nutzerkonto.
				</p>
				<p>
					Nach der Stimmabgabe erhältst du eine Quittung (Prüfsumme), mit der du selbst
					kontrollieren kannst, dass deine Stimme korrekt gezählt wurde - ohne dass jemand anderes
					daraus ableiten kann, wie du abgestimmt hast.
				</p>
			</section>

			<section>
				<h2>6. E-Mail-Versand</h2>
				<p>
					Wir versenden E-Mails, um deine Registrierung abzuschließen (Willkommens-E-Mail,
					E-Mail-Bestätigung) und um dir bei Bedarf einen Link zum Zurücksetzen deines Passworts
					zuzuschicken. Dafür nutzen wir einen E-Mail-Versanddienst
					([PLATZHALTER: Name des Versanddienstleisters]), der deine E-Mail-Adresse und den
					Nachrichteninhalt zum Versand verarbeitet (Art. 6 Abs. 1 lit. b DSGVO,
					Auftragsverarbeitung nach Art. 28 DSGVO).
				</p>
			</section>

			<section>
				<h2>7. Speicherung auf deinem Gerät</h2>
				<p>
					LIQUIDO verwendet keine Cookies. Um dich eingeloggt zu halten, speichert dein Browser
					lediglich ein Zugangs-Token (JWT) im sogenannten „localStorage" - einem Speicherbereich,
					der ausschließlich auf deinem eigenen Gerät liegt und nicht an uns übertragen wird, außer
					wenn du damit eine Anfrage an unseren Server stellst. Wir setzen keine Analyse- oder
					Tracking-Tools und keine Werbe-Cookies ein.
				</p>
			</section>

			<section>
				<h2>8. Speicherdauer</h2>
				<p>
					Wir speichern deine personenbezogenen Daten (Name, E-Mail-Adresse, Kontodaten), solange
					dein Nutzerkonto besteht. Nach Löschung deines Kontos (siehe unten) werden diese Daten
					gelöscht, soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen. Anonymisierte
					Abstimmungsdaten (siehe Abschnitt 5) enthalten von vornherein keinen Personenbezug mehr
					und bleiben Teil des jeweiligen Abstimmungsergebnisses.
				</p>
			</section>

			<section>
				<h2>9. Weitergabe an Dritte</h2>
				<p>
					Eine Weitergabe deiner Daten an Dritte erfolgt nur, soweit dies in dieser
					Datenschutzerklärung genannt ist (E-Mail-Versanddienst, optional Google beim
					Google-Login), gesetzlich vorgeschrieben ist, oder du ausdrücklich eingewilligt hast. Wir
					verkaufen deine Daten nicht.
				</p>
				<p>
					LIQUIDO wird auf Servern betrieben, die [PLATZHALTER: Serverstandort/Hosting-Anbieter
					ergänzen].
				</p>
			</section>

			<section>
				<h2>10. Deine Rechte</h2>
				<p>Du hast jederzeit das Recht auf:</p>
				<ul>
					<li>Auskunft über die von uns zu deiner Person gespeicherten Daten (Art. 15 DSGVO),</li>
					<li>Berichtigung unrichtiger Daten (Art. 16 DSGVO),</li>
					<li>Löschung deiner Daten (Art. 17 DSGVO),</li>
					<li>Einschränkung der Verarbeitung (Art. 18 DSGVO),</li>
					<li>Datenübertragbarkeit (Art. 20 DSGVO),</li>
					<li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO), sowie</li>
					<li>Widerruf einer erteilten Einwilligung mit Wirkung für die Zukunft (Art. 7 Abs. 3
						DSGVO), z. B. für den Google-Login.</li>
				</ul>
				<p>
					Wende dich dazu einfach an die unten genannte Kontaktadresse. Außerdem hast du das Recht,
					dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren.
				</p>
			</section>

			<section>
				<h2>11. Datensicherheit</h2>
				<p>
					Wir übertragen deine Daten verschlüsselt (TLS/HTTPS) und schützen unsere Systeme durch
					angemessene technische und organisatorische Maßnahmen gegen unbefugten Zugriff. Passwörter
					speichern wir ausschließlich als Hash, niemals im Klartext.
				</p>
			</section>

			<section>
				<h2>12. Änderungen dieser Datenschutzerklärung</h2>
				<p>
					Wir passen diese Datenschutzerklärung an, wenn sich die Datenverarbeitung in LIQUIDO
					ändert oder rechtliche Vorgaben dies erfordern. Es gilt immer die zum Zeitpunkt deines
					Besuchs aktuelle, auf dieser Seite veröffentlichte Fassung.
				</p>
			</section>

			<section>
				<h2>13. Kontakt</h2>
				<p>
					Bei Fragen zum Datenschutz oder zur Ausübung deiner Rechte erreichst du uns unter:
					[PLATZHALTER: E-Mail-Adresse]
				</p>
			</section>
		</article>

		<liquido-footer />
	</div>
</template>

<script>
import liquidoFooter from "@/components/liquido-footer.vue"

export default {
	name: "Datenschutz",
	i18n: {
		messages: {
			de: { pageTitle: "Datenschutzerklärung" },
			en: { pageTitle: "Privacy Policy" },
		},
	},
	components: { liquidoFooter },
	data() {
		return {
			stand: new Date().toLocaleDateString("de-DE", { year: "numeric", month: "long" }),
		}
	},
	created() {
		this.$store.setHeaderTitle(this.$t("pageTitle"))
		this.$store.setHeaderBackTarget({ name: "team" })
	},
}
</script>

<style scoped>
.legal-page {
	padding-bottom: var(--two);
}

.legal-stand {
	text-align: center;
	color: var(--secondary);
	font-size: 0.85rem;
	margin-top: -0.5rem;
	margin-bottom: var(--unit);
}

.legal-summary {
	background: var(--light-bg, #f5f7fa);
	border-left: 3px solid var(--primary);
	border-radius: var(--liquido-border-radius);
	padding: var(--unit);
	font-size: 0.9rem;
	line-height: 1.5;
	margin-bottom: var(--two);
}

.legal-content {
	color: var(--text-color);
	font-size: 0.95rem;
	line-height: 1.55;
}

.legal-content section {
	margin-bottom: var(--two);
}

.legal-content h2 {
	color: var(--primary);
	font-size: 1.1rem;
	margin-bottom: 0.5rem;
}

.legal-content p,
.legal-content ul {
	margin-bottom: 0.75rem;
}

.legal-content ul {
	padding-left: 1.25rem;
}
</style>
