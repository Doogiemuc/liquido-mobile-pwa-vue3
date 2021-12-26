<template>
	<div>
		<h1 id="team-home" class="page-title">
			{{ team.teamName }}
		</h1>

		<div id="team-home-user-welcome" class="alert liquido-info mb-3">
			<p v-html="$t('introYourTeam', {name: currentUserName })"></p>
			<b-button
				id="gotoPollsButton"
				variant="primary"
				size="m"
				class="float-right mb-3"
				@click="gotoPolls()"
			>
				{{ $t("gotoPolls") }}
				<i class="fas fa-angle-double-right" />
			</b-button>
		</div>

		<div class="clearfix" />

		<b-card-group id="memberCards" class="mb-3" deck>
			<b-card v-for="admin in team.admins" :key="admin.id" :img-src="getImgUrl(admin.picture)" img-alt="Avatar" img-top>
				<i class="fas fa-shield-alt admin-shield"></i>
				<b-card-text class="text-center">
					<b>{{ admin.name }}</b>
				</b-card-text>
			</b-card>
			<b-card v-for="member in team.members" :key="member.id" :img-src="getImgUrl(member.picture)" img-alt="Avatar" img-top>
				<b-card-text class="text-center">
					{{ member.name }}
				</b-card-text>
			</b-card>
		</b-card-group>

		<div v-if="isAdmin" class="alert alert-admin">
			<i class="fas fa-shield-alt float-right"></i>
			<p v-html="$t('introForOneAdmin')"></p>
		</div>

		<b-card id="teamInfo">
			<template #header>
				<h2>{{ $t("inviteNewMembers") }}</h2>
			</template>
			<p>
				{{ $t("inviteLink") }}
				<a id="inviteLink" :href="inviteLinkURL" @click.prevent="shareLink()">
					{{ inviteLinkURL }}
					<i class="fas fa-external-link-alt" />
				</a>
			</p>
			<p>
				{{ $t("inviteCode") }}
				<b id="newTeamInviteCode">{{ team.inviteCode }}</b>
			</p>
			<p class="mb-0">{{ $t("qrCode") }}</p>
			<div class="text-center">
				<img id="qrCodeImg" src="" class="qr-code">
			</div>
		</b-card>

		<div class="text-center">
			<b-button
				id="logoutButton"
				variant="primary"
				size="s"
				class="mt-5"
				@click="clickLogout()"
			>
				{{ $t("logout") }}
			</b-button>
		</div>
	</div>
</template>

<script>
import config from "config"
import QRCode from "qrcode"
import api from "@/services/liquido-graphql-client"

export default {
	i18n: {
		messages: {
			en: {
				introYourTeam: "",
				teamAdmin: "Team admin | Team Admin | Team Admins",
				teamMembers: "Team members",
			},
			de: {
				introYourTeam: "Hallo <b>{name}</b>! Willkommen in deinem Team!",
				introForOneAdmin: 
					"Du bist der Admin dieses Teams. Nur du kannst neue Abstimmungen erstellen.",
				teamMembers: "Teammitglieder",
				teamAdmins: "Team Admin | Team Admin | Team Admins",
				gotoPolls: "Zu euren Abstimmungen",
				inviteNewMembers: "Teammitglieder einladen",
				inviteLink: "Einladunglink teilen:",
				inviteCode: "Einladungscode eingeben:",
				qrCode: "QR Code scannen:",
				logout: "Logout"
			},
		},
	},
	data() {
		return {
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
			this.$router.push({name: "polls"})
		},

		clickLogout() {
			api.logout()
			this.$router.push({name: "login"})  //TODO: Forward to a polite "byebye" page.
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

@media (min-width: 320px) {
	#memberCards {
		// Keep three columns down to 320px
		display: -ms-flexbox;
    display: -webkit-box;
    display: flex;
    -ms-flex-flow: row wrap;
    -webkit-box-orient: horizontal;
    -webkit-box-direction: normal;
    flex-flow: row wrap;
		justify-content: space-between;
		.card {
			width: 30%;
			max-width: 30%;
			min-width: 30%;
			margin: 0 0 20px 0;
			.card-body {
				padding: 5px;
			}
		}
	}
}

#teamInfo {
	.card-header {
		padding: 10px;
		h2 {
			font-size: 1.2rem;
			margin: 0;
		}
	}
	.card-body {
		padding: 10px;
	}
}
</style>
