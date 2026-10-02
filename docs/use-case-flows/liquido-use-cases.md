# LIQUIDO Use Cases

This document describes LIQUIDO from an **end-user perspective**: who uses it, what they can do, and the
business rules behind it. The screens and the paths between them are drawn in
[liquido-screen-flow.mermaid](liquido-screen-flow.mermaid) (team polls) and [polly.mermaid](polly.mermaid)
(Polly) — open them in any Mermaid viewer, e.g. https://mermaid.live or the IntelliJ / VS Code plugin.
For the technical side see [liquido-architecture.md](../liquido-architecture.md).

The executable version of the main use cases is the end-to-end test `happy-case.cy.js`, described step
by step in [liquido-testing.md §6.3](../liquido-testing.md#63-the-happy-case-step-by-step).

---

## What LIQUIDO is for

LIQUIDO is for **teams that want to make decisions together, anonymously and fairly**. It is not a
survey tool. Two ideas drive every design decision:

**You do not vote for one option — you rank them.** A voter sorts the proposals they support into a
personal order of preference and simply leaves out the ones they don't support. The winner is
calculated with **Ranked Pairs**: every proposal is compared with every other one, and the winner is the
proposal that beats its rivals in head-to-head majorities. The practical effect, and the reason LIQUIDO
exists: the option **most people can live with** wins, even when two loud camps would otherwise deadlock.

So if you need an election where members can vote for more than one candidate — you already have that.
Just sort your favourite candidates to the top.

**Votes in LIQUIDO are always anonymous — provably so.** The server never links a ballot to a person.
Each voter gets a checksum back and can verify that their own ballot was counted, without anybody being
able to work backwards to who cast it.

## Actors

| Actor | Who that is |
|---|---|
| **Visitor** | Anyone who opens the app without being logged in |
| **Team admin** | Created a team. Creates polls and runs the voting phases. A user can be admin in one team and a plain member in another |
| **Team member** | Joined a team with an invite code. Adds and likes proposals (if allowed) and votes |
| **Polly creator** | Creates a quick Polly — no account, no team, identified only by a passkey on their device |
| **Polly guest** | Opens a Polly link from a friend and votes |

## The lifecycle at a glance

```
  Team                Poll                                        Vote
  ────                ────                                        ────
  Admin creates   →   Admin creates a poll with its first     →   Admin starts the voting phase
  a team              two proposals (a choice needs two)          (proposals freeze — nobody may
     ↓                        ↓                                    add or edit any more)
  Members join    →   Members add their own proposals             ↓
  via invite code     (only if the admin allowed it) and     →    Each member ranks the proposals
                      "like" the ones they support                and casts one anonymous ballot
                                                                   ↓
                                                              Admin finishes the phase →
                                                              Ranked Pairs computes the winner
```

A poll is always in exactly one of three phases: **ELABORATION** (collecting and discussing proposals),
**VOTING** (ballots are being cast) and **FINISHED** (the winner is known).

---

## Team use cases

### UC 1 — Register and create a team

- **Actor:** Visitor · **Screen:** `/welcome`
- **Flow:** enter a nickname → choose "create a new team" → team name, email and password → register a
  passkey if the device supports one (Face ID, fingerprint, device PIN; can be skipped) → the new team's home page.
- **Result:** a new team with the visitor as its **admin**. A welcome mail arrives with a link to confirm
  the email address (`/verifyEmail`); confirming is optional and never blocks anything.
- **Rules:** the email address is the person's identity. Founding a team grants the right to vote in it.

### UC 2 — Join a team

- **Actor:** Visitor or logged-in user · **Screen:** `/welcome?inviteCode=…`
- **Flow:** someone in the team shares its invite link or QR code (from the team page) → the visitor
  enters a nickname, email and password → optionally registers a passkey → the team's home page.
- **Rules:** a user can be a member of **several teams** and switch between them (UC 4). Joining a team
  grants the right to vote in *that* team. If the email is already registered, the app points to the login.

### UC 3 — Log in

- **Actor:** Visitor · **Screen:** `/login`
- **Ways in:**
  - **automatically** — a returning user stays logged in on their device;
  - **passkey** — one tap with Face ID, fingerprint or device PIN;
  - **email and password** — first the email, then "continue", then the password;
  - **email login link** — a one-time link by mail;
  - **Google** sign-in.
- **Forgot password:** `/forgotPassword` sends a reset link by mail; `/resetPassword` sets a new password.
- **Result:** the user lands on the home page of the team they used last.

### UC 4 — Switch team

- **Actor:** a member of more than one team · **Screen:** `/team`
- **Flow:** pick another team on the team page. The user may be admin in one team and member in another;
  what they may do follows the team they are in.

---

## Poll use cases

### UC 5 — Create a poll

- **Actor:** Team admin · **Screen:** `/polls/new`
- **Flow:** enter a title and **at least two proposals** (a choice needs two alternatives), each with a
  title, a description and an icon → decide whether **members may add their own proposals** → save.
- **Result:** a new poll in **ELABORATION**.
- **Rules:** only the admin creates polls. "Members may add proposals" is chosen at creation and **cannot
  be changed afterwards**.

### UC 6 — Discuss: add, edit, delete and like proposals

- **Actors:** Team admin, team members · **Screens:** `/polls/:id`, `/polls/:id/edit`
- While a poll is in **ELABORATION**:

| | Admin | Member |
|---|---|---|
| Rename the poll | ✅ | ❌ |
| Add a proposal | ✅ always | only if the poll allows member proposals |
| Edit a proposal | **own only** | **own only** |
| Delete a proposal | ✅ any | ❌ |
| Like a proposal | ✅ | ✅ |

- **Why the asymmetry:** an admin may take a proposal off the ballot, but may **not** rewrite what
  somebody else wrote. A removal is visible to its author; a silent edit is not.

### UC 7 — Start the voting phase

- **Actor:** Team admin · **Screen:** `/polls/:id`
- **Flow:** "start voting" → confirm the warning → optionally change how long the vote should run
  (7 days by default).
- **Result:** the poll is in **VOTING**. From now on **nobody can add, edit or delete proposals.**

### UC 8 — Cast a vote

- **Actor:** Team member (the admin votes too) · **Screen:** `/polls/:id/castVote`
- **Flow:** open the poll (a poll you haven't voted in yet opens the ballot directly) → drag the
  proposals you support into your preferred order, leave out the ones you don't → confirm.
- **Result:** the ballot is counted **anonymously**. The voter gets a **checksum** and can check at any
  time that exactly this ballot was counted.
- **Rules:** one ballot per member and poll, and **a cast vote is final** — it cannot be changed
  afterwards. (An early version of this document said voters could change their vote while the poll is
  running; that is no longer the case.)

### UC 9 — Finish the vote and see the winner

- **Actor:** Team admin; then everybody · **Screens:** `/polls/:id` or the ballot page, then `/polls/:id/winner`
- **Flow:** the admin finishes the voting phase (also possible straight from the ballot page, after a
  confirmation) → LIQUIDO calculates the winner.
- **Result:** the poll is **FINISHED**. The winner page shows the winning proposal and why it won: the
  pairwise comparisons, the duel matrix and the Ranked Pairs graph. If several proposals are tied, the
  page explains the tie instead of naming one winner.
- **Note:** the voting phase does not end automatically at its end date yet — the admin finishes it.

### Not in the app yet: delegation

Liquid democracy means you can hand your vote to a trusted **proxy**, who then votes for you (and, in a
chain, for everyone who delegated to them). The backend supports this already; the app has no screens
for it yet.

---

## Polly use cases

A **Polly** is the small sibling of a team poll: a quick question for friends ("where shall we go for
dinner?"). No account, no team, no email — identity is a passkey on your device. See
[polly.mermaid](polly.mermaid).

### UC 10 — Create and share a Polly

- **Actor:** Polly creator · **Screen:** `/polly`
- **Flow:** enter a question and some options → confirm with the device's passkey (one tap) → the Polly is
  **live immediately** → share its **one** link (share sheet, QR code or copy).
- **Rules:** there is no separate admin link. Whoever opens the link is recognised by their own passkey:
  the creator sees "edit" and "finish", everybody else sees a ballot. The creator's passkey is also their
  bookmark — "my pollys" lists everything it created.

### UC 11 — Vote in a Polly

- **Actor:** Polly guest (the creator can vote too) · **Screen:** `/polly/:publicId`
- **Flow:** open the link → the first time, register a passkey with one tap → sort the options, favourite
  on top → vote.
- **Rules:** one vote per passkey. A Polly ballot is **pseudonymous**, not anonymous like a team poll — the
  right trade-off among friends, the wrong one for a real election. The app makes this difference visible.

### UC 12 — Finish a Polly

- **Actor:** Polly creator · **Flow:** "finish" → the winner is calculated with the same Ranked Pairs
  algorithm as team polls and shown to everybody who opens the link.
- **Rules:** a Polly has only two phases, **VOTING** and **FINISHED** — no discussion phase and no start step.
