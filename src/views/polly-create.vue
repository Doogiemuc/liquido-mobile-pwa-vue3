<template>
	<div>
		<h1 id="polly-create" class="page-title">
			{{ pollIsNew ? $t("NewPolly") : $t('Polly') }}
		</h1>

		<polly 
			class="mb-4"
			:poll="poll">
		</polly>

		<div v-if="poll.status != 'VOTING'" class="alert text-center">
			{{ getInfoTextForPollStatus }}
		</div>

		<div v-if="poll.status == 'VOTING'" class="alert alert-secondary">
			<p>{{ $t('PollInVotingInfo1') }}</p>
			<ol class='fa-ul'>
				
				<li><span class='fa-li'><i class='fas fa-person-booth'></i></span> <span v-html="$t('createPollInfo4')"></span></li>
				<li><span class='fa-li'><i class='fas fa-check-circle'></i></span> {{ $t('createPollInfo5') }}</li>
			</ol>			
		</div>


		<!-- 
		<h3>Einstellungen für diese Abstimmung</h3>
		<form class="mb-4 p-2">
			<div class="form-check">
				<input type="checkbox" class="form-check-input" id="allowAddProposal" checked>
				<label class="form-check-label" for="allowAddProposal">Teammitglieder können weitere Vorschläge hinzufügen.</label>
			</div>
			<div class="form-check">
				<input type="checkbox" class="form-check-input" id="allowChangeVote" checked>
				<label class="form-check-label" for="allowChangeVote">Eine einmal abgegebene Stimme kann noch geändert werden, solange die Abstimmung noch nicht geschlossen ist.</label>
			</div>
			<div class="text-end mt-3">
				<button @click="saveSettings" type="button" class="btn btn-primary btn-lg">
					<i class="far fa-floppy-disk"></i>&nbsp;&nbsp;{{ $t('SaveSettings') }}
				</button>
			</div>
		</form>
		-->

		<div class="alert alert-admin create-poll-info mt-5">
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
import { defineComponent } from 'vue'
//import config from "config"
import liquidoInput from "@/components/liquido-input.vue"
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
				"PollIsNewInfo": "Willkommen bei . Dies ist ein neues Polly. Füge einfach oben die Vorschläge hinzu, über die ihr abstimmen wollt.",
				"PollInElaborationInfo": "Ok bin bereit. Du kannst die Abstimmung jetzt starten.",
				"PollInVotingInfo1": "Ein Polly ist eine einfache, anonyme und private Abstimmung hier in LIQUIDO.", 
				"PollInVotingInfo2": "In LIQUIDO stimmst du nicht nur für einen Vorschlag, sondern du sortierst alle Vorschläge. Schiebe deinen Favoriten ganz nach oben. Bis zu dem Vorschlag dem du am wenigsten zustimmst ganz unten.",
				"PollIsFinishedInfo": "Diese Abstimmung ist abgeschlossen. Es können keine weiteren Stimmen mehr abgegeben werden.",
				"createPollInfo1": "Du bist dann der Admin dieser Abstimmungen.",
				"createPollInfo2": "Eine neue Abstimmung wird erst einmal debatiert.",
				"createPollInfo3": "Du kannst festlegen ob Teammitglieder eigene Wahlvorschläge hinzufügen dürfen.",
				"createPollInfo4": "Als Admin startest du die Abstimmung. In LIQUIDO stimmt man nicht nur für einen Vorschlag, sondern jeder im Team ordnet alle Vorschläge anonym in seine persönliche Reihenfolge.",
				"createPollInfo5": "Wenn du die Abstimmung abschliest, wird der Vorschlag mit der größten Zustimmung durch einen cleveren Algorithmus berechnet.",
				"createPollInfoForKids_NOT_USED_YET": "In LIQUIDO sucht man sich nicht nur einen Vorschlag aus, sondern jeder ordnet alle Vorschläge heimlich so, wie er sie am liebsten hat.",
				"create": "Erstellen"
			}
		}
	},
	setup(/*props*/) {
		/*
		console.log("usei18n setup")
		const { t } = useI18n()
		return { t }
		*/
	},
	components: { liquidoInput, polly },
	data() {
		return {
			poll: undefined,
		}
	},
	computed: {
		pollIsNew() {
			return this.poll && this.poll.status === "NEW"
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
		}
	},
	created() {
		this.poll = {
			title: "Dummy Title for Testing",
			proposals: [
				{ id: Date.now(), title: "Some Title" },
				{ id: Date.now(), title: "Some Other Title which is very long to test this" },
			],
			status: "NEW",  // ELABORATION, VOTING, FINISHED
			//createdBy: undefined,
			//createdAt: new Date().toISOString(),
			//updatedAt: new Date().toISOString(),
		}
	},
	mounted() {
		this.$store.setHeaderTitle(this.$t("NewPolly"))
		this.$store.setHeaderBackLink("/polls")
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
			return api.createPoll(this.pollTitle)
				.then(createdPoll => {
					console.log("New poll created", createdPoll)
					this.$router.push("/polls/" + createdPoll.id)
				})
				.catch(err => console.warn("Error", err))
		},
	},
})
</script>



<style lang="scss">
.cancel-link {
	font-size: 12px;
	//margin-left: 10px;
	color: var(--secondary);
	cursor: pointer;
}
.create-poll-info li {
	margin-bottom: 1rem;
}
</style>
