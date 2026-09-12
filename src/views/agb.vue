<template>
	<div class="legal-page">
		<h1 id="agb-page" class="page-title">{{ $t("pageTitle") }}</h1>
		<p class="legal-stand">Stand: {{ stand }}</p>

		<article class="legal-content">
			<section>
				<h2>§1 Geltungsbereich</h2>
				<p>
					Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für die Nutzung von LIQUIDO, einer
					Web-Anwendung für liquide, anonyme Team-Entscheidungen (im Folgenden „LIQUIDO" oder „der
					Dienst"), angeboten von [PLATZHALTER: Name/Betreiber] (im Folgenden „wir" oder „Betreiber").
					Mit der Registrierung eines Kontos oder der Nutzung von LIQUIDO erkennst du diese AGB an.
				</p>
			</section>

			<section>
				<h2>§2 Leistungsbeschreibung</h2>
				<p>
					LIQUIDO ermöglicht es Teams, gemeinsam Entscheidungen zu treffen. Ein Team kann
					Abstimmungen mit mehreren Vorschlägen anlegen; die Mitglieder bringen ihre Präferenz per
					Rangfolge zum Ausdruck, und der Gewinner wird nach dem Verfahren „Ranked Pairs" ermittelt.
					Stimmen werden anonymisiert erfasst - Details dazu findest du in unserer
					<router-link :to="{ name: 'datenschutz' }">Datenschutzerklärung</router-link>.
				</p>
				<p>
					LIQUIDO wird derzeit unentgeltlich als nicht-kommerzielles Projekt betrieben. Ein Anspruch
					auf bestimmte Funktionen, deren dauerhafte Verfügbarkeit oder Weiterentwicklung besteht
					nicht.
				</p>
			</section>

			<section>
				<h2>§3 Registrierung und Nutzerkonto</h2>
				<p>
					Für die Nutzung von LIQUIDO ist ein Nutzerkonto erforderlich, bestehend mindestens aus
					Namen und E-Mail-Adresse sowie einem Passwort oder einem Passkey (biometrische
					Geräte-Anmeldung). Du bist verpflichtet, bei der Registrierung wahrheitsgemäße Angaben zu
					machen und deine Zugangsdaten geheim zu halten. Für Aktivitäten, die unter Verwendung
					deiner Zugangsdaten vorgenommen werden, bist du verantwortlich, sofern du deren Missbrauch
					nicht zu vertreten hast.
				</p>
				<p>
					Ein Team-Konto wird entweder durch das Anlegen eines neuen Teams (Administrator:in) oder
					durch den Beitritt zu einem bestehenden Team über einen Einladungscode begründet.
				</p>
			</section>

			<section>
				<h2>§4 Pflichten der Nutzer:innen</h2>
				<p>Bei der Nutzung von LIQUIDO verpflichtest du dich,</p>
				<ul>
					<li>keine rechtswidrigen, beleidigenden oder diskriminierenden Inhalte einzustellen,</li>
					<li>die Abstimmungsfunktion nicht zu manipulieren oder zu missbrauchen (z. B. durch
						Mehrfachkonten oder technische Eingriffe),</li>
					<li>keine Zugangsdaten anderer Personen ohne deren Zustimmung zu verwenden,</li>
					<li>den Dienst nicht so zu nutzen, dass Dritte oder die technische Infrastruktur des
						Dienstes beeinträchtigt werden.</li>
				</ul>
				<p>
					Bei Verstößen können wir einzelne Inhalte entfernen oder, bei schwerwiegenden oder
					wiederholten Verstößen, den Zugang zu deinem Konto sperren.
				</p>
			</section>

			<section>
				<h2>§5 Verfügbarkeit</h2>
				<p>
					Wir bemühen uns um eine möglichst unterbrechungsfreie Bereitstellung von LIQUIDO, können
					aber - insbesondere weil LIQUIDO als nicht-kommerzielles Projekt betrieben wird - keine
					bestimmte Verfügbarkeit garantieren. Wartungsarbeiten, technische Störungen oder Ausfälle
					sind möglich.
				</p>
			</section>

			<section>
				<h2>§6 Haftung</h2>
				<p>
					Wir haften unbeschränkt für Vorsatz und grobe Fahrlässigkeit sowie nach den Vorschriften
					des Produkthaftungsgesetzes, bei Verletzung von Leben, Körper oder Gesundheit sowie im
					Umfang einer von uns übernommenen Garantie.
				</p>
				<p>
					Für leicht fahrlässig verursachte Schäden haften wir nur bei der Verletzung einer
					wesentlichen Vertragspflicht (einer Pflicht, deren Erfüllung die ordnungsgemäße Nutzung von
					LIQUIDO überhaupt erst ermöglicht und auf deren Einhaltung du regelmäßig vertrauen darfst),
					begrenzt auf den vorhersehbaren, typischerweise eintretenden Schaden. Im Übrigen ist die
					Haftung für leichte Fahrlässigkeit ausgeschlossen. Das gilt insbesondere für Ergebnisse von
					Abstimmungen, die auf Grundlage der von den Teammitgliedern selbst eingegebenen Daten
					zustande kommen.
				</p>
			</section>

			<section>
				<h2>§7 Datenschutz</h2>
				<p>
					Informationen zur Verarbeitung personenbezogener Daten findest du in unserer
					<router-link :to="{ name: 'datenschutz' }">Datenschutzerklärung</router-link>, die
					Bestandteil dieser AGB ist.
				</p>
			</section>

			<section>
				<h2>§8 Kündigung und Löschung des Kontos</h2>
				<p>
					Du kannst die Nutzung von LIQUIDO jederzeit beenden. Zur Löschung deines Kontos und der
					damit verbundenen personenbezogenen Daten wende dich bitte an die unten genannte
					Kontaktadresse. Bereits anonymisiert erfasste Abstimmungsdaten (siehe
					<router-link :to="{ name: 'datenschutz' }">Datenschutzerklärung</router-link>) lassen sich
					dabei naturgemäß nicht mehr einer Person zuordnen und bleiben Teil des jeweiligen
					Abstimmungsergebnisses.
				</p>
			</section>

			<section>
				<h2>§9 Änderungen dieser AGB</h2>
				<p>
					Wir behalten uns vor, diese AGB mit Wirkung für die Zukunft zu ändern, etwa bei
					Weiterentwicklung von LIQUIDO oder aus rechtlichen Gründen. Über wesentliche Änderungen
					informieren wir registrierte Nutzer:innen in geeigneter Form (z. B. per E-Mail oder
					Hinweis in der Anwendung).
				</p>
			</section>

			<section>
				<h2>§10 Schlussbestimmungen</h2>
				<p>
					Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.
					Sollte eine Bestimmung dieser AGB unwirksam sein oder werden, bleibt die Wirksamkeit der
					übrigen Bestimmungen davon unberührt.
				</p>
			</section>

			<section>
				<h2>§11 Kontakt</h2>
				<p>
					[PLATZHALTER: Name]<br />
					[PLATZHALTER: Adresse]<br />
					E-Mail: [PLATZHALTER: E-Mail-Adresse]
				</p>
			</section>
		</article>

		<liquido-footer />
	</div>
</template>

<script>
import liquidoFooter from "@/components/liquido-footer.vue"

export default {
	name: "Agb",
	i18n: {
		messages: {
			de: { pageTitle: "Allgemeine Geschäftsbedingungen" },
			en: { pageTitle: "Terms and Conditions" },
		},
	},
	components: { liquidoFooter },
	data() {
		return {
			// Formatted once, not reactive - this page's content does not change while it is open.
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
