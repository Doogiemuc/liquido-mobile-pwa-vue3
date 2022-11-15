<template>
	<div>
		<h1 id="dev-login">{{ $t("DevLoginTitle") }}</h1>

		<div 
			v-if="devLoginErrorMessage" 
			id="devLoginErrorMessage"
			class="alert alert-danger mt-3"
			v-html="devLoginErrorMessage"
		></div>
	</div>
</template>

<script>
/**
 * Development login used for testing. Must provide correcct devLogin.token via query parameter.
 * When login is successfull, then user is forwarded to teamHome.
 */

import api from "@/services/liquido-graphql-client"

export default {
	i18n: {
		messages: {
			de: {
				DevLoginTitle: "DevLogin",
			}
		}
	},
	props: {
		email: { type: String, required: true },
		teamName: { type: String, required: true },
		token: {type: String, required: true }
	},
	data() {
		return {
			devLoginErrorMessage: undefined
		}
	},
	mounted() {
		api.devLogin(this.email, this.teamName, this.token).then((res) => {
			console.log("devLogin successfull.", res)
			this.$router.replace({name: "teamHome"})		// DevLogin navigates to team-home ! Tests rely on this!
		}).catch(err => {
			this.devLoginErrorMessage = JSON.stringify(err)
			console.error("DevLogin failed!", err)
		})
	},
	methods: {
		
	},
}
</script>

<style></style>
