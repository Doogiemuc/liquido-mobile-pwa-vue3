# English translation gaps

Generated during the liqui-loc migration. **No code change** — this is a worklist.

German is the only locale reachable today (`locale` is hardcoded `"de"` and there is no
language picker), so none of this is user-visible yet. It becomes visible the moment
`setLocale("en")` is called — which liqui-loc now makes a one-liner.

| Component | de | en | missing in en | orphaned in en |
|---|---:|---:|---|---|
| `src/components/poll-card-edit.vue` | 16 | 0 | 16 — `ChooseIcon`, `addAnotherProposal`, `awaitingStart`, `createdBy`… | — |
| `src/components/poll-card.vue` | 7 | 6 | 1 — `editProposal` | — |
| `src/components/polls-footer.vue` | 1 | 1 | — | — |
| `src/root-app.vue` | 4 | 0 | 4 — `BackendNotReachable`, `DEV_OpenGraphQL`, `NetworkOffline`, `cannotJoinInvitedTeam` | — |
| `src/views/cast-vote.vue` | 30 | 11 | 22 — `alreadyVotedButton`, `backToPolls`, `ballotIsVerified`, `castVoteBallotTitle`… | **3** — `castVote`, `castVoteTitle`, `dropProposalsHere` |
| `src/views/dev-login.vue` | 1 | 0 | 1 — `DevLoginTitle` | — |
| `src/views/forgot-password.vue` | 22 | 0 | 22 — `BackToLogin`, `ForgotPassword`, `NeedEmailToResetPassword`, `NewPassword`… | — |
| `src/views/join-team-v2.vue` | 20 | 19 | 2 — `alreadyRegistered1`, `alreadyRegistered2` | **1** — `alreadyRegistered` |
| `src/views/login-page.vue` | 28 | 26 | 2 — `loginWelcomeText1`, `loginWelcomeText2` | — |
| `src/views/login-via-sms.vue` | 15 | 15 | — | — |
| `src/views/not-found-page.vue` | 4 | 4 | — | — |
| `src/views/poll-create.vue` | 17 | 0 | 17 — `allowTeamMembersToAddProposals`, `createNewPoll`, `createPoll`, `createPollInfo1`… | — |
| `src/views/poll-edit.vue` | 17 | 0 | 17 — `PollInElaboration_OnlyAdminAddsProposals`, `cannotFindPoll`, `continueSaving`, `createNewPoll`… | — |
| `src/views/poll-show.vue` | 30 | 0 | 30 — `PollInElaboration_Admin`, `PollInElaboration_CanAddProposal`, `PollInElaboration_OnlyAdminAddsProposals`, `addProposal`… | — |
| `src/views/poll-winner.vue` | 6 | 6 | — | — |
| `src/views/proposal-add.vue` | 22 | 0 | 22 — `ChooseIcon`, `addProposal`, `cannotFindProposal`, `createdSuccessfully`… | — |
| `src/views/user-home.vue` | 21 | 21 | — | — |
| `src/views/verify-email.vue` | 6 | 0 | 6 — `gotoLogin`, `verifyEmailError`, `verifyEmailIsOptional`, `verifyEmailPending`… | — |
| `src/views/welcome-chat.vue` | 46 | 10 | 39 — `CreateNewTeam`, `InviteFriendsTitle`, `JoinTeam`, `JoinTeamFinished`… | **3** — `OkTeamCreatedSuccessfully`, `shareThisLink`, `tellInvitationCode` |

**Totals:** 313 German keys, 119 English — 194 short.

## Notes

- **`cast-vote.vue` first.** Its `en` and `de` key sets have diverged: it defines English
  keys no German key matches, so that English is unreachable — no call site asks for it.
- An `en` count of 0 means an empty `en: {}` block, or none at all.
- `daysLeft` was defined in both poll cards and never called. Deleted during the migration
  rather than carried over.
- Keys were deliberately NOT renamed or de-duplicated during the swap. Worth folding later:
  `createdBy` (4 files), `emailPlaceholder`/`emailInvalid` (4 files), `createPollInfo1..5`
  (2 files, with *different* German text).
