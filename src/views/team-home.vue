<template>
	<div>
		<liquido-header ref="liquido-header"></liquido-header>
		<h1 
			id="team-home"
			:data-teamname="team.teamName"
			:data-username="currentUserName"
			class="page-title">
			{{ team.teamName }}
		</h1>

		<div id="teamIntro" class="alert liquido-info">
			<span v-html="$t('introYourTeam', { name: currentUserName })"></span>
		</div>

		<div v-if="pollsInVoting.length > 0">
			<h3>{{ $t('pollsInVoting') }}</h3>
			<div class="polls-in-voting-container" ref="pollsInVotingContainer" >
				<div v-for="poll in pollsInVoting" :key="poll.id" class="poll-card-wrapper user-select-none">
					<div class="poll-card card" @click="$root.gotoPoll(poll.id)">
						<div class="card-body d-flex flex-nowrap align-items-center">
							<div class="flex-grow-1">
								<div class="poll-eyebrow">
									<span v-if="poll.status === 'ELABORATION'" class="badge rounded-pill elaboration-pill">{{ $t('New') }}</span>
									<span v-if="poll.status === 'VOTING'" class="badge rounded-pill voting-pill">{{ $t('InVoting') }}</span>
									<span v-if="poll.status === 'FINISHED'" class="badge rounded-pill finished-pill">{{ $t('Finished') }}</span>
								<span class="poll-created-date">{{ $d(new Date(poll.createdAt), 'shortDate') }}</span>
								</div>
								<h2 class="poll-title">{{ poll.title }}</h2>
								<div class="poll-footer">
									<div v-if="poll.status=== 'ELABORATION'">
										<i class="far fa-lightbulb"></i>&nbsp;{{ $tc('numProposals', poll.proposals.length ) }}
									</div>
									<div v-if="poll.status === 'VOTING'">
										<i class="fas fa-person-booth"></i>&nbsp;{{ $tc('votes', poll.numBallots) }}
									</div>
									<div v-if="poll.status === 'FINISHED'">
										<i class="fas fa-check-circle"></i>&nbsp;{{ $t('finished') }}
									</div>
									
									<div v-if="poll.status === 'VOTING'"><i class="far fa-clock"></i>&nbsp;{{ $tc('daysLeft', daysLeft(poll) ) }}</div>
								</div>
							</div>
							<div class="flex-grow-0">
								<i class="fas fa-angle-right text-primary"></i>
							</div>
						</div>
					</div>
				</div>
			</div>
			
		</div>
	

		<h3>{{ $t('TeamMembers') }}</h3>
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

		<liquido-footer>
			<template #primary>
				<button id="gotoPollsButton" type="button" class="btn btn-lg w-100 btn-primary" @click="$root.gotoPolls">
					{{ $t("gotoPolls") }}
					<i class="fas fa-angle-double-right" />
				</button>
			</template>
		</liquido-footer>

	</div>
</template>

<script>
import config from "config"
import QRCode from "qrcode"
import liquidoHeader from "@/components/liquido-header.vue"
import liquidoFooter from "../components/liquido-footer.vue"
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
				TeamMembers: "Team members",
			},
			de: {
				introYourTeam: "Hallo {name} !<br/>Willkommen in deinem Team.",
				introForOneAdmin:
					"Du bist der Admin dieses Teams. Nur du kannst neue Abstimmungen erstellen.",
				
				pollsInVotingInfo: "In diesem Abstimmungen kannst du jetzt deine Stimme abgeben.",
				votes: "0 Stimmen | 1 Stimme | {n} Stimmen",
				daysLeft: "Wahl Abgeschlossen | ein Tag noch | noch {n} Tage",

				TeamMembers: "Teammitglieder",
				teamAdmins: "Team Admin | Team Admin | Team Admins",
				gotoPolls: "Alle eure Abstimmungen",
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
		datetimeFormats: {
			en: {
				shortDate: { year: 'numeric', month: '2-digit', day: '2-digit' },
			},
			de: {
				shortDate: { year: 'numeric', month: '2-digit', day: '2-digit' },
			},
		},
	},
	components: { liquidoInput, liquidoHeader, liquidoFooter },
	data() {
		return {
			team: {},
			statusMessage: undefined,
			passkeyLabel: undefined,
			touchStartX: 0,
			touchEndX: 0,
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
		pollsInVoting() {
			return api.getCachedPolls().filter(p => p.status === "VOTING")
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
		/** 
		 * How many days are left for voting?
		 * Always return at least "1" day, until poll is in VOTING.
		 */
		daysLeft(poll) {
			if (poll.votingEndAt && poll.status === "VOTING") {
				let end = new Date(poll.votingEndAt)
				let now = new Date()
				let diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
				return diff > 0 ? diff : 1
			} else {
				return 0
			}
		},

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
		},

		handleTouchStart(e) {
			this.touchStartX = e.changedTouches[0].screenX
		},

		handleTouchMove(e) {
			// Allow natural scrolling on touch devices
		},

		handleTouchEnd(e) {
			this.touchEndX = e.changedTouches[0].screenX
			const scrollContainer = this.$refs.pollsInVotingContainer
			if (!scrollContainer) return

			const threshold = 50 // minimum drag distance to scroll
			const diff = this.touchStartX - this.touchEndX

			if (Math.abs(diff) > threshold) {
				const scrollAmount = 300
				if (diff > 0) {
					// Swiped left, scroll right
					scrollContainer.scrollLeft += scrollAmount
				} else {
					// Swiped right, scroll left
					scrollContainer.scrollLeft -= scrollAmount
				}
			}
		}
	},
}
</script>

<style>

.secondary-text {
	color: var(--secondary);
	font-size: 0.8rem;
}	

.polls-in-voting-container {
	display: flex;
	flex-direction: row;
	flex-wrap: nowrap;
	margin: 1rem 0;
	gap: 1rem;
	overflow-x: auto;
	
	scroll-behavior: smooth;
	/* Hide scrollbar for Chrome, Safari and Opera */
	-ms-overflow-style: none;  /* IE and Edge */
	scrollbar-width: none;  /* Firefox */
	touch-action: pan-x;
	padding-right: 1rem;
}

/* Hide scrollbar for Chrome, Safari and Opera */
.polls-in-voting-container::-webkit-scrollbar {
	display: none;
}

/********** //TODO: extract an own component for a poll-card!  This duplicates what's in poll.vue! */
.poll-card-wrapper {
	min-width: 80%;
	height: 7rem;
	margin-bottom: 10px;
	/*transition: all 0.5s;*/
}

.poll-card {
	--iconSize: 40px;
	
	cursor: pointer;
	height: 100% !important;  /* bootstrap .card sets a height that we need to overwrite */
	border-radius: var(--liquido-border-radius);
	box-shadow: 0.1rem 0.1rem 0.25rem rgba(32, 32, 32, 0.2);

	.card-body{
		padding: 0 1rem;
	}

	.poll-eyebrow {
		font-size: 80%;
	}

	.elaboration-pill {
		background-color: var(--elaboration-bg);
	}
	.voting-pill {
		background-color: var(--voting-bg);
	}
	.finished-pill {
		background-color: var(--finished-bg);
	}

	.poll-created-date {
			float: right;
			color: var(--secondary);	
	}

	.poll-icon-elaboration, .poll-icon-voting {
		color: white;
		border-radius: 50%;
		text-align: center;
		font-size: var(--iconSize) * 0.5;
		line-height: var(--iconSize);
		min-width: var(--iconSize);
		max-width: var(--iconSize);
		width: var(--iconSize);
		min-height: var(--iconSize);
		max-height: var(--iconSize);
		height: var(--iconSize);
		margin: 0 10px 0 0;
	}

	.poll-icon-elaboration {
		background-color: var(--elaboration-bg);
	}

	.poll-icon-voting {
		background-color: var(--voting-bg);
	}

	.poll-icon-finished {
		font-size: var(--iconSize);
		color: var(--finished-bg);
		margin: 0 10px 0 0;
	}

	.poll-title {
		color: black;    /* poll-titles are black, proposal titles are --primary! */
		font-size: 1.2rem !important;  /* a bit smaller than normal h2 */
		margin: 0.5rem 0;
		display: -webkit-box;
		-webkit-line-clamp: 2;  /* max 2 lines */
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.poll-footer {
		display: flex;
		gap: 1rem;
		font-size: 80%;
		color: var(--secondary)
	}
}

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
