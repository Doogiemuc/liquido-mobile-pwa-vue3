<template>
	<div>
		<liquido-header></liquido-header>

		<h1 class="page-title">{{ $t("pageTitle") }}</h1>

		<div class="card" id="notFoundCard">
			<div class="card-body">
				<div class="text-center mb-4">
					<i class="fas fa-compass fa-3x" style="color: var(--primary)"></i>
				</div>

				<p class="text-center">{{ $t("pageNotFound") }}</p>

				<div class="d-grid gap-2">
					<button
						@click="this.$router.push('/login')"
						class="btn btn-primary"
					>
						{{ $t("GoToLogin") }}
					</button>
					<button
						@click="this.$router.push('/welcome')"
						class="btn btn-secondary"
					>
						{{ $t("Register") }}
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import liquidoHeader from "@/components/liquido-header.vue"

export default {
	name: "NotFoundPage",
	i18n: {
		messages: {
			de: {
				pageTitle: "Seite nicht gefunden",
				pageNotFound: "Ups, sorry, es ist etwas schief gegangen. Hier solltest du nie landen.",
				GoToLogin: "Zum Login",
				Register: "Registrieren",
			},
			en: {
				pageTitle: "Page not found",
				pageNotFound: "The requested page could not be found.",
				GoToLogin: "Go to Login",
				Register: "Register",
			},
		},
	},
	components: { liquidoHeader },
	created() {
		this.$store.setHeaderTitle(this.$t("pageTitle"))
	},
};
</script>

<style>
#notFoundCard {
	margin-top: 2rem;
	margin-left: 1rem;
	margin-right: 1rem;
	.card-body {
		padding: 3rem 1.5rem;
	}
}
</style>
