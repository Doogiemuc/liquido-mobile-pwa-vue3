<template>
	<div>
		<h1 id="polly-create" class="page-title">
			{{ pollyHeaderTitle }}
		</h1>

		<polly 
			class="mb-4"
			:poll="poll">
		</polly>

		<!-- The bright info box is only for friends who arrive via the invite link, once the poll
		     exists (ELABORATION/VOTING/FINISHED). On this page (status NEW) only the admin who is
		     creating the poll can be here, so only the admin box below is shown. -->
		<div v-if="poll.status === 'ELABORATION'" class="alert liquido-info">
			{{ $t('PollInElaborationInfo') }}
		</div>
		<div v-if="poll.status == 'VOTING'" class="alert liquido-info mt-5">
			<liqui-loc-html tag="p" msg-key="PollInVotingInfo1" />
			<ol class='fa-ul'>
				<li><span class='fa-li'><i class='fas fa-person-booth'></i></span> <liqui-loc-html tag="span" msg-key="PollInVotingInfo2" /></li>
				<li><span class='fa-li'><i class='fas fa-check-circle'></i></span> {{ $t('PollInVotingInfo3') }}</li>
			</ol>
		</div>
		<div v-if="hasAlreadyVoted" class="alert liquido-info mt-3">
			{{ $t('YouAlreadyVoted') }}
		</div>
		<div v-if="poll.status === 'FINISHED'" class="alert liquido-info">
			{{ $t('PollIsFinishedInfo') }}
		</div>

		<!-- Extra info for the admin: shown on this start page, describing the whole Polly lifecycle -->
		<div v-if="poll.status === 'NEW'" class="alert alert-admin mt-5">
			<p>{{ $t('createPollIntro') }}</p>
			<ol class='fa-ul'>
				<li><span class='fa-li'><i class='fas fa-list-ul'></i></span> {{ $t('createPollStep1') }}</li>
				<li><span class='fa-li'><i class='fas fa-envelope-open-text'></i></span> {{ $t('createPollStep2') }}</li>
				<li><span class='fa-li'><i class='fas fa-sort-amount-down'></i></span> {{ $t('createPollStep3') }}</li>
				<li><span class='fa-li'><i class='fas fa-eye'></i></span> {{ $t('createPollStep4') }}</li>
				<li><span class='fa-li'><i class='fas fa-check-circle'></i></span> {{ $t('createPollStep5') }}</li>
			</ol>
		</div>
	</div>
</template>

<script>
/**
 * A Polly is a simple, easy to use component for a quick and private poll.
 * 
 * NO configuration. Only defaults!
 */
import { defineComponent } from 'vue'
//import liquidoInput from "@/components/liquido-input.vue"
import polly from '@/components/polly-vote.vue'
import api from "@/services/liquido-graphql-client.js"

export default defineComponent({
	name: "CreatePollPage",
	i18n: {
		messages: {
			"en": {
				"Polly": "Polly",
				"NewPolly": "New Polly",

				// This info is for the admin, shown on this start page while creating the Polly.
				"createPollIntro": "You are the admin of this Polly.",
				"createPollStep1": "Add the options you want to vote on here.",
				"createPollStep2": "When you start the vote, an invite link is sent to your friends. Everyone registers with a passkey — no complicated password, yet still secure.",
				"createPollStep3": "In LIQUIDO you don't just vote for one option — everyone ranks all the options in their own order of preference.",
				"createPollStep4": "You can see at any time who has already voted.",
				"createPollStep5": "When you close the vote, a clever algorithm calculates the option with the broadest approval among you.",

				"create": "Create"
			},
			"de": {
				"Polly": "Polly",
				"NewPolly": "Neues Polly",
				"PollInElaborationInfo": "Ok bin bereit. Du kannst die Abstimmung jetzt starten.",

				// This info is for voters and shown when polly is in voting
				"PollInVotingInfo1": "Willkommen bei <span class='liquido'></span>! Ein Polly ist eine einfache, anonyme und sichere Abstimmung.",
				"PollInVotingInfo2": "In <span class='liquido'></span> stimmst du nicht nur für einen Vorschlag, sondern du <b>sortierst alle</b> Vorschläge so wie du es möchtest. Mit deinem Favoriten ganz oben.",
				"PollInVotingInfo3": "Wenn euer Admin die Abstimmung abschließt, wird der Vorschlag mit der größten Zustimmung durch einen cleveren Algorithmus berechnet.",
				"YouAlreadyVoted": "Du hast bereits abgestimmt.",

				// This info is for the admin, and only shown to him, on this start page while creating the Polly.
				"createPollIntro": "Du bist der Admin dieses Pollys.",
				"createPollStep1": "Füge hier die Optionen hinzu, über die ihr abstimmen möchtet.",
				"createPollStep2": "Wenn du die Abstimmung startest, verschicke ich einen Einladungslink an deine Freunde. Jeder registriert sich ganz einfach mit einem Passkey – ganz ohne kompliziertes Passwort, aber trotzdem sicher.",
				"createPollStep3": "In LIQUIDO stimmt man nicht nur für eine Option, sondern jeder von euch bringt alle Optionen in seine persönliche Reihenfolge.",
				"createPollStep4": "Du kannst jederzeit sehen, wer schon abgestimmt hat.",
				"createPollStep5": "Wenn du die Abstimmung beendest, berechnet ein cleverer Algorithmus den Vorschlag mit der größten Zustimmung unter euch.",

				"PollIsFinishedInfo": "Diese Abstimmung ist abgeschlossen. Es können keine weiteren Stimmen mehr abgegeben werden.",
			}
		}
	},
	props: {
		initialPoll: { type: Object, required: false, default: undefined },
	},
	components: { polly },
	data() {
		return {
			hasAlreadyVoted: false,
			poll: {
				title: "Dummy Title for Testing",
				proposals: [
					{ id: Date.now(), title: "Some Title" },
					{ id: Date.now(), title: "Some Other Title which is very long to test this" },
				],
				status: "NEW",  // ELABORATION, VOTING, FINISHED
				//createdBy: undefined,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			}
		}
	},
	computed: {
		pollyHeaderTitle() {
			return this.poll && this.poll.status === "NEW" ? this.$t("NewPolly") : this.$t("Polly")
		},
		getInfoTextForPollStatus() {
			switch (this.poll.status) {
				case "ELABORATION":
					return this.$t('PollInElaborationInfo')
				case "FINISHED":
					return this.$t('PollIsFinishedInfo')
			}
			return ""
		},
	},
	watch: {
		pollyHeaderTitle() {
			this.$store.setHeaderTitle(this.pollyHeaderTitle)
		}
	},
	created() {
		if (this.initialPoll) {
			this.poll = this.initialPoll
		}
		// A Polly that is still being created has no id yet, so there is no ballot to ask the backend
		// for. Asking anyway sent pollId: null and the query died on "BigInteger!", which - being
		// uncaught - surfaced as the global "network error" popup on every visit to /polly/create.
		if (!this.poll.id) return
		api.getMyBallot(this.poll.id)
			.then(myBallot => {
				this.hasAlreadyVoted = myBallot !== undefined
			})
			.catch(err => console.warn("Cannot check whether the user already voted", err))
	},
	mounted() {
		this.$store.setHeaderTitle(this.pollyHeaderTitle)
		this.$store.setHeaderBackTarget({ name: "polls" })
		this.$root.scrollToTop()
		document.getElementById("pollTitle")?.focus()
	},
	methods: {
		proposalHasTitle(index) {
			return this.poll.proposals[index] &&
				this.poll.proposals[index].title &&
				this.poll.proposals[index].title.trim().length > 0
		},
		goBack() {
			this.$router.go(-1)
		},
		createNewPoll() {
			// See api.createPoll: the backend owns the runtime, so no dates are sent.
			return api.createPoll(this.poll.title)
				.then(createdPoll => {
					console.log("New poll created", createdPoll)
					this.$router.push({name: "showPoll", params: {pollId: createdPoll.id} })
				})
				.catch(err => console.warn("Cannot create new poll", err))
		},
	},
})
</script>



<style>

.alert-admin li {
	margin-bottom: 1rem;
}

.config-list {
	margin: 0;
  padding-left: 1.2em;
  list-style: none;
  text-indent: -1.2em;
}
</style>
