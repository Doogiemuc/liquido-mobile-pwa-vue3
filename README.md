# LIQUIDO

A modern approach to liquid democracy — <http://www.liquido.vote>

LIQUIDO helps **teams make decisions together, anonymously and fairly**.

- **You rank, you don't just pick.** Instead of voting for a single proposal or candidate, you sort the
  proposals into your personally preferred order. A clever algorithm (Ranked Pairs) then compares every
  proposal with every other one and finds the option that most of the team can live with — even when
  two loud camps would otherwise deadlock.
- **Your ballot is anonymous — provably.** The server never links a ballot to a person. Still, every
  voter gets a checksum and can verify that their own ballot was counted.
- **Teams and polls.** An admin creates a team and invites members with a code. Polls go through three
  phases: collecting and discussing proposals, voting, and the result.
- **Polly** — a quick poll for friends ("where shall we go for dinner?"): no account, no team, one link
  to share, secured by a passkey on your phone.

# liquido-mobile-pwa-vue3

This repository is the LIQUIDO **frontend**: a mobile web app (progressive web app, PWA) built with
Vue 3. It talks to the LIQUIDO backend ([liquido-backend-quarkus](https://github.com/Doogiemuc/liquido-backend-quarkus))
via a GraphQL API.

LIQUIDO is a private hobby project that has grown over nearly a decade — a place to learn and try out ideas.

## Documentation

| If you want to … | read |
|---|---|
| see what users can do with LIQUIDO, step by step | [docs/use-case-flows/liquido-use-cases.md](docs/use-case-flows/liquido-use-cases.md) |
| set up, run, build and deploy the app | [docs/README-tech.md](docs/README-tech.md) |
| understand how the frontend is built | [docs/liquido-architecture.md](docs/liquido-architecture.md) |
| run or write tests (frontend and backend) | [docs/liquido-testing.md](docs/liquido-testing.md) |
| work on it with an AI agent | [AGENTS.md](AGENTS.md) |
| understand the theory behind it: liquid democracy, anonymity, the voting algorithm | the backend's [whitepaper](https://github.com/Doogiemuc/liquido-backend-quarkus/blob/main/docs/liquido-whitepaper.md) and [Ranked Pairs explained](docs/ai/ranked-pair-voting-doc.md) |
