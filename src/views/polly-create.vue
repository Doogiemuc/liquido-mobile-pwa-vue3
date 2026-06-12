<template>
	<div>
		<h1 id="polly-create" class="page-title">
			{{ pollyHeaderTitle }}
		</h1>

		<polly 
			class="mb-4"
			:poll="poll">
		</polly>

		<div v-if="poll.status === 'NEW'" class="alert liquido-info" v-html="$t('PollIsNewInfo')"></div>
		<div v-if="poll.status === 'ELABORATION'" class="alert liquido-info">
			{{ $t('PollInElaborationInfo') }}
		</div>
		<div v-if="poll.status == 'VOTING'" class="alert liquido-info mt-5">
			<p v-html="$t('PollInVotingInfo1')"></p>
			<ol class='fa-ul'>
				<li><span class='fa-li'><i class='fas fa-person-booth'></i></span> <span v-html="$t('PollInVotingInfo2')"></span></li>
				<li><span class='fa-li'><i class='fas fa-check-circle'></i></span> {{ $t('PollInVotingInfo3') }}</li>
			</ol>			
		</div>
		<div v-if="hasAlreadyVoted" class="alert liquido-info mt-3">
			{{ $t('YouAlreadyVoted') }}
		</div>
		<div v-if="poll.status === 'FINISHED'" class="alert liquido-info">
			{{ $t('PollIsFinishedInfo') }}
		</div>

		<!-- Extra info for the admin -->
		<div class="alert alert-admin mt-5">
			<p>{{ $t('createPollInfo1') }}</p>
			<ol class='fa-ul'>
				<li><span class='fa-li'><i class='fas fa-comments'></i></span> {{ $t('createPollInfo2') }} {{ $t('createPollInfo3') }}</li>
				<li><span class='fa-li'><i class='fas fa-person-booth'></i></span> <span v-html="$t('createPollInfo4')"></span></li>
				<li><span class='fa-li'><i class='fas fa-check-circle'></i></span> {{ $t('createPollInfo5') }}</li>
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
//import config from "config"
//import liquidoInput from "@/components/liquido-input.vue"
import polly from '@/components/polly.vue'
import api from "@/services/liquido-graphql-client.js"

export default defineComponent({
	name: "CreatePollPage",
	i18n: {
		messages: {
			"en": {
				"Polly": "Polly",
				"NewPolly": "New Polly",
				"createPollInfo1": "Polls go through three phases:",
				"createPollInfo2": "A new poll is first discussed.",
				"createPollInfo3": "You can decide whether team members are allowed to add their own proposals.",
				"createPollInfo4": "As an admin, you start the poll. In LIQUIDO, you don't just vote for one proposal, but everyone in the team anonymously ranks all proposals in their personal order.",
				"createPollInfo5": "When you finish the poll, the proposal with the most approval is calculated by a clever algorithm.",
				"createPollInfoForKids_NOT_USED_YET": "In LIQUIDO, you don't just choose one proposal, but everyone secretly ranks all proposals in the order they like them best.",
				"create": "Create"
			},
			"de": {
				"Polly": "Polly",
				"NewPolly": "Neues Polly",
				"PollIsNewInfo": "Willkommen bei <span class='liquido'></span>. Ein Polly ist eine einfache, anonyme und sichere Abstimmung. In  Füge hier die Vorschläge hinzu, über die ihr abstimmen wollt.",
				"PollInElaborationInfo": "Ok bin bereit. Du kannst die Abstimmung jetzt starten.",
				
				// This info is for voters and shown when polly is in voting
				"PollInVotingInfo1": "Willkommen bei <span class='liquido'></span>! Ein Polly ist eine einfache, anonyme und sichere Abstimmung.", 
				"PollInVotingInfo2": "In <span class='liquido'></span> stimmst du nicht nur für einen Vorschlag, sondern du <b>sortierst alle</b> Vorschläge so wie du es möchtest. Mit deinem Favoriten ganz oben.",
				"PollInVotingInfo3": "Wenn euer Admin die Abstimmung abschließt, wird der Vorschlag mit der größten Zustimmung durch einen cleveren Algorithmus berechnet.",
				"YouAlreadyVoted": "Du hast bereits abgestimmt.",	

				// This info is for the admin, and only shown to him.
				"createPollInfo1": "Du bist der Polly Admin:",
				"createPollInfo2": "Eine neue Abstimmung wird erst einmal debatiert.",
				"createPollInfo3": "Du kannst festlegen ob Teammitglieder eigene Vorschläge hinzufügen dürfen oder nicht.",
				"createPollInfo4": "Du, als Admin, startest die Abstimmung. In LIQUIDO stimmt man nicht nur für einen Vorschlag, sondern jeder im Team ordnet alle Vorschläge anonym in seine persönliche Reihenfolge.",
				"createPollInfo5": "Wenn du die Abstimmung abschliest, wird der Vorschlag mit der größten Zustimmung durch einen cleveren Algorithmus berechnet.",
				"createPollInfoForKids_NOT_USED_YET": "In LIQUIDO sucht man sich nicht nur einen Vorschlag aus, sondern jeder ordnet alle Vorschläge heimlich so, wie er sie am liebsten hat.",
				
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
				case "NEW":
					return this.$t('PollIsNewInfo')
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
		this.hasAlreadyVoted = api.getMyBallot(this.poll.id).then(myBallot => {
			return myBallot !== undefined
		})
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
