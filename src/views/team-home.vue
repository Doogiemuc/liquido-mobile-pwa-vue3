<template>
	<div>
		<h1 id="team-home" class="page-title">
			{{ team.teamName }}
		</h1>

		<div id="team-home-user-welcome" class="alert liquido-info mb-3">
			<p v-html="$t('introYourTeam', { name: currentUserName })"></p>

		</div>

		<button id="gotoPollsButton" class="btn btn-primary btn-lg w-100 mb-5" @click="gotoPolls()">
			{{ $t("gotoPolls") }}
			<i class="fas fa-angle-double-right" />
		</button>

		<div id="memberCards" class="row row-cols-3 g-2 mb-3">
			<div class="col" v-for="member in team.members" :key="member.user.id">
				<b-card :img-src="getImgUrl(member.user.picture)" img-alt="Avatar" img-top class="h-100">
					<i v-if="member.role == 'ADMIN'" class="fas fa-shield-alt admin-shield"></i>
					<b-card-text>
						{{ member.user.name }}
					</b-card-text>
				</b-card>
			</div>
		</div>

		<!-- TODO: make it configurable who can invite more team members. Only the admin? -->
		<div id="teamInfo" class="card">
			
			<div class="card-body text-center">
				<h3 class="card-title">
					{{ $t("inviteNewMembers") }}
				</h3>
				<img id="qrCodeImg" src="" class="qr-code" />
				<a id="inviteLink" :href="inviteLinkURL" :data-invitecode="team.inviteCode" @click.prevent="shareLink()">
					<span v-html="$t('inviteLink', { inviteCode: team.inviteCode })"></span>
					<i class="fas fa-external-link-alt"></i>
				</a>
			</div>
		</div>

		<div v-if="isAdmin" class="alert alert-admin mt-5">
		<i class="fas fa-shield-alt float-end"></i>
		<p v-html="$t('introForOneAdmin')"></p>
	</div>

	<div class="text-center">
		<button id="logoutButton" type="button" class="btn btn-outline-secondary mt-5" @click="clickLogout">{{ $t("logout")
			}}</button>
	</div>

	</div>
</template>

<script>
import config from "config"
import QRCode from "qrcode"
import { store } from "@/services/store.js"
import api from "@/services/liquido-graphql-client.js"

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
				logout: "Logout"
			},
		},
	},
	data() {
		return {
			store,
			team: {}
		}
	},
	computed: {
		currentUserName() {
			let cachedUser = api.getCachedUser()
			return cachedUser ? cachedUser.name : ""
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
		this.store.setHeaderTitle(this.team ? this.team.teamName : this.$t('team'))
		this.store.setHeaderBackLink(null)

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

<style lang="scss">
.team-home {
	background-color: white;
}

.admin-shield {
	color: $primary;
	position: absolute;
	top: 5px;
	right: 5px;
}


#memberCards {
	width: 100%;

	.card-body {
		margin: 0;
		padding: 0;
		text-align: center;
	}
}



#teamInfo {
}
</style>
