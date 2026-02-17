<template>
	<div>
		<liquido-header ref="liquido-header"></liquido-header>
		<h1 id="team-home" class="page-title">
			{{ team.teamName }}
		</h1>

		<div class="alert liquido-info">
			<span v-html="$t('introYourTeam', { name: currentUserName })"></span>
		</div>

		<div class="pollsInVotingShortcut">
			<h3>{{ $t('pollsInVoting') }}</h3>
			
	 
		</div>

		<button id="gotoPollsButton" class="btn btn-primary btn-lg w-100 mb-5" @click="gotoPolls">
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

		<div v-if="isAdmin" class="alert alert-admin mt-3">
			<p v-html="$t('introForOneAdmin')"></p>
		</div>

		

		<div id="setupPasskeyCard" class="card mt-3">
			<h3 class="card-header text-center" v-html="$t('LiquidoIsSave')"></h3>
			<div v-if="userHasWebauthn" class="card-body">
				<p v-html="$t('PasskeyAvailable')" />
			</div>
			<div v-if="!userHasWebauthn" class="card-body">
				<p v-html="$t('SetupPasskeyInfo')"></p>
				<!-- liquido-input
					id="passkeyInput"
					ref="passkeyInput"
					v-model="passkeyLabel"
					class="mb-3"
					:label="$t('PasskeyLabel')"
					:minlength="3"
					:maxlength="200"
					:invalid-feedback="$t('PasskeyLabelInvalid')"
				/-->
				<button
					id="setupPasskeyButton"
					class="btn btn-primary d-flex align-items-center float-end w-100"
					type="button"
					@click="setupPasskey()"
				>
					<i class="fas fa-fingerprint" />
					<span class="flex-grow-1 text-center">{{ $t("SetupPasskeyButton") }}</span>
					<span v-if="userHasWebauthn" style="color: #0E0;">
						<i class="fa-solid fa-check"></i>
					</span>
				</button>
			</div>
		</div>

		<div class="text-center">
			<button id="logoutButton" type="button" class="btn btn-outline-secondary mt-5" @click="clickLogout">
				{{ $t("logout") }}</button>
		</div>

	</div>
</template>

<script>
import config from "config"
import QRCode from "qrcode"
import liquidoHeader from "@/components/liquido-header.vue"
import liquidoInput from "@/components/liquido-input.vue"
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

				// Setup a passkey
				LiquidoIsSave: "<span class='liquido'></span> ist sicher!",
				SetupPasskeyInfo: "<p>Um sicherzustellen, dass niemand deine Stimme missbrauchen kann, richte hier einen Passkey ein. Künftig kannst du dich damit schnell und sicher per Fingerabdruck, Face-ID oder Geräte-PIN einloggen.</p>" +
					"<p>Keine Sorge, dein Passkey bleibt auf deinem Gerät. Es werden keine biometrischen Daten gespeichert oder übertragen.</p>",
				PasskeyLabel: "Passkey Name",  // the label of the input field
				PasskeyLabelInvalid: "Bitte mindestens 3 Zeichen!",
				SetupPasskeyButton: "Passkey registrieren",
				PasskeyAvailable: "Sehr gut, du hast deinen Passkey registriert und kannst dich damit schnell und sicher per Fingerabdruck, Face-ID oder Geräte-PIN einloggen.",

				logout: "Logout"
			},
		},
	},
	components: { liquidoInput, liquidoHeader },
	data() {
		return {
			team: {},
			statusMessage: undefined,
			passkeyLabel: undefined
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
		userHasWebauthn() {
			let cachedUser = api.getCachedUser()
			return cachedUser?.hasWebauthn
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
		this.$store.setHeaderBackTarget(null)
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
				if (img) img.src = url
			}
		})
	},

	methods: {
		gotoPolls() {
			this.$router.push({ name: "polls" })
		},

		/**
		 * Register a new WebAuthn authenticator device.
		 * Only a logged user is allowed to do this for his own account!
		 */
		async setupPasskey() {
			if (!this.passkeyLabel) this.passkeyLabel = this.currentUserName + "-Passkey"
			webauthnService.registerWebauthn(this.passkeyLabel).then(res => {
				api.getCachedUser().hasWebauthn = true
				console.log("setupPasskey SUCCESSFULL")
			}).catch(err => {
				this.$root?.$refs?.mobileDebugLogRef?.info("setupPasskey: ERROR")
				this.$root?.$refs?.mobileDebugLogRef?.info(err)
				console.log("setupPasskey ERROR", err)
			})
		},

		getImgUrl(imgFile) {
			return config.avatarPath + "/" + imgFile
		},

		clickLogout() {
			api.logout()
			this.$router.push({ name: "login" })  //TODO: Forward to a polite "byebye" page.
		},

		async shareLink() {
			if (navigator.share) {
				try {
					await navigator.share({
						title: "LIQUIDO Einladung",
						text: this.$t('inviteNewMembers'),
						url: this.inviteLinkURL,
					});
				} catch (error) {
					console.error('Error sharing', error);
				}
			} else {
				// Fallback for browsers that don't support Web Share API
				try {
					await navigator.clipboard.writeText(this.inviteLinkURL);
					this.$root.showSuccess('Invitation link copied to clipboard!');
				} catch (err) {
					console.error('Failed to copy: ', err);
				}
			}
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
