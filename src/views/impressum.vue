<template>
	<div class="legal-page">
		<h1 id="impressum-page" class="page-title">{{ $t("pageTitle") }}</h1>

		<article class="legal-content">
			<section>
				<h2>Angaben gemäß § 5 DDG (Digitale-Dienste-Gesetz)</h2>
				<p>
					[PLATZHALTER: Name]<br />
					[PLATZHALTER: Adresse]
				</p>
			</section>

			<section>
				<h2>Kontakt</h2>
				<p>
					E-Mail: [PLATZHALTER: E-Mail-Adresse]
				</p>
			</section>

			<section>
				<h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
				<p>
					[PLATZHALTER: Name]<br />
					[PLATZHALTER: Adresse]
				</p>
			</section>

			<section>
				<h2>Umsatzsteuer-ID / Registereintrag</h2>
				<p>
					LIQUIDO wird als privates, nicht-kommerzielles Projekt betrieben. Eine
					Umsatzsteuer-Identifikationsnummer nach § 27a UStG sowie ein Handels- oder
					Vereinsregistereintrag bestehen nicht.
				</p>
			</section>

			<section>
				<h2>Haftung für Inhalte</h2>
				<p>
					Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen Seiten
					nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als
					Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde
					Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige
					Tätigkeit hinweisen.
				</p>
				<p>
					Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den
					allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch
					erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei
					Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend
					entfernen.
				</p>
			</section>

			<section>
				<h2>Haftung für Links</h2>
				<p>
					Unser Angebot enthält gegebenenfalls Links zu externen Webseiten Dritter, auf deren
					Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine
					Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter
					oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der
					Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum
					Zeitpunkt der Verlinkung nicht erkennbar.
				</p>
				<p>
					Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete
					Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von
					Rechtsverletzungen werden wir derartige Links umgehend entfernen.
				</p>
			</section>

			<section>
				<h2>Urheberrecht</h2>
				<p>
					Die durch die Betreiber dieser Seiten erstellten Inhalte und Werke unterliegen dem
					deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der
					Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung
					des jeweiligen Autors bzw. Erstellers.
				</p>
			</section>

			<section>
				<h2>Streitschlichtung</h2>
				<p>
					Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:
					<a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener">
						ec.europa.eu/consumers/odr</a>. Wir sind zur Teilnahme an einem Streitbeilegungsverfahren
					vor einer Verbraucherschlichtungsstelle weder verpflichtet noch bereit.
				</p>
			</section>

			<section>
				<h2>Weitere Informationen</h2>
				<p>
					Informationen zur Verarbeitung personenbezogener Daten findest du in unserer
					<router-link :to="{ name: 'datenschutz' }">Datenschutzerklärung</router-link>, die
					Nutzungsbedingungen für LIQUIDO in unseren
					<router-link :to="{ name: 'agb' }">AGB</router-link>.
				</p>
			</section>
		</article>

		<liquido-footer />
	</div>
</template>

<script>
import liquidoFooter from "@/components/liquido-footer.vue"

export default {
	name: "Impressum",
	i18n: {
		messages: {
			de: { pageTitle: "Impressum" },
			en: { pageTitle: "Legal Notice" },
		},
	},
	components: { liquidoFooter },
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

.legal-content p {
	margin-bottom: 0.75rem;
}
</style>
