<template>
	<div>
		<h1 id="team-home" class="page-title">
			{{ team.teamName }}
		</h1>

		<div id="team-home-user-welcome" class="card mb-3">
			<div class="card-body">
				<span v-html="$t('introYourTeam', { name: currentUserName })"></span>
			</div>
		</div>

		<button id="gotoPollsButton" class="btn btn-primary btn-lg w-100 mb-5" @click="gotoPolls()">
			{{ $t("gotoPolls") }}
			<i class="fas fa-angle-double-right" />
		</button>

		<div id="memberCards" class="row row-cols-3 g-2 mb-3">
			<div class="col" v-for="member in team.members" :key="member.user.id">
				<div class="card h-100">
					<img :src="getImgUrl(member.user.picture)" img-alt="Avatar" class="card-img-top" alt="Member Avatar"/>
					<i v-if="member.role == 'ADMIN'" class="fas fa-shield-alt admin-shield"></i>
					<div class="card-body member-name">
						{{ member.user.name }}
					</div>
				</div>
			</div>
		</div>

		<!-- TODO: make it configurable who can invite more team members. Only the admin? -->
		<div id="teamInfo" class="card">
			<h3 class="card-header text-center">
				{{ $t("inviteNewMembers") }}
			</h3>
			<div class="card-body text-center">
				<img id="qrCodeImg" src="" class="qr-code" />
				<a id="inviteLink" :href="inviteLinkURL" :data-invitecode="team.inviteCode" @click.prevent="shareLink()">
					<span v-html="$t('inviteLink', { inviteCode: team.inviteCode })"></span>
					<i class="fas fa-external-link-alt"></i>
				</a>
			</div>
		</div>

		<div v-if="isAdmin" class="alert alert-admin mt-5">
			<p v-html="$t('introForOneAdmin')"></p>
		</div>

		<button id="register2FAButton" 
			type="button" 
			class="btn btn-primary btn-lg w-100 text-center position-relative mt-5" 
			@click="register2FA">
			<i class="fa-solid fa-fingerprint position-absolute top-50 start-0 translate-middle ms-3"></i>
			<span class="text-center">{{ $t("registerKeepass") }}</span>
		</button>

		<div class="text-center">
			<button id="logoutButton" type="button" class="btn btn-outline-secondary mt-5" @click="clickLogout">
				{{ $t("logout") }}</button>
		</div>

	</div>
</template>

<script>
import config from "config"
import QRCode from "qrcode"
import api from "@/services/liquido-graphql-client.js"
import webauthnService from '@/services/webauthn-service.js'



//TODO: If there are more than 15 members in a team, then show a shorter list

export default {
	i18n: {
		messages: {
			en: {
				introYourTeam: "",
				teamAdmin: "Team admin | Team Admin | Team Admins",
				teamMembers: "Team members",
			},
			de: {
				introYourTeam: "Hallo {name} !<br/>Willkommen in deinem Team.",
				introForOneAdmin:
					"Du bist der Admin dieses Teams. Nur du kannst neue Abstimmungen erstellen.",
				teamMembers: "Teammitglieder",
				teamAdmins: "Team Admin | Team Admin | Team Admins",
				gotoPolls: "Zu euren Abstimmungen",
				inviteNewMembers: "Teammitglieder einladen",
				inviteLink: "Einladungscode:&nbsp;<b>{ inviteCode }</b>",
				qrCode: "QR Code scannen:",
				registerKeepass: "Keepass registrieren",
				logout: "Logout"
			},
		},
	},
	data() {
		return {
			team: {},
			statusMessage: undefined
		}
	},
	computed: {
		currentUserName() {
			let cachedUser = api.getCachedUser()
			return cachedUser ? cachedUser.name : ""
		},
		currentUserEmail() {
			let cachedUser = api.getCachedUser()
			return cachedUser ? cachedUser.email : ""
		},
		isAdmin() {
			return api.isAdmin()
		},
		teamHasPolls() {
			return api.getCachedPolls().length > 0
		},
		inviteLinkURL() {
			return config.inviteLinkPrefix + this.team.inviteCode
		},
	},
	created() {
		this.team = api.getCachedTeam()
	},
	mounted() {
		this.$store.setHeaderTitle(this.team ? this.team.teamName : this.$t('team'))
		this.$store.setHeaderBackLink(null)

		this.$root.scrollToTop()

		let QRcodeOpts = {
			scale: 10,
			/*
			errorCorrectionLevel: 'M',
			type: 'image/jpeg',
			quality: 0.3,
			margin: 1,
			*/
		}

		QRCode.toDataURL(this.inviteLinkURL, QRcodeOpts, function (err, url) {
			if (err) {
				console.warn("Cannot create QR code", err)
			} else {
				let img = document.getElementById("qrCodeImg")
				img.src = url
			}
		})
	},

	methods: {

		/**
		 * Register a new WebAuthn authenticator device.
		 * Only a logged user is allowed to do this for his own account!
		 */
		async register2FA() {
			console.log("register2FA")
			webauthnService.registerWebauthn()
		},
		

		getImgUrl(imgFile) {
			return config.avatarPath + "/" + imgFile
		},

		gotoPolls() {
			this.$router.push({ name: "polls" })
		},

		clickLogout() {
			api.logout()
			this.$router.push({ name: "login" })  //TODO: Forward to a polite "byebye" page.
		}
	},
}
</script>

<style>

.admin-shield {
	color: var(--primary);
	position: absolute;
	top: 5px;
	right: 5px;
}

#memberCards {	
	.card-body {
		text-align: center;
	}
}

</style>
