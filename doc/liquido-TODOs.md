# TODOs

Do I need a tool for managing my own backlog? => No just, this .md file

# Design Decisions

 * Header that scrolls away? Or no header at all? Other native apps in modern iOS have the rounded bubbles with transparent background. I don't like this.


# Canaries for public instance

 * Let the happy case run against INT every 5 mins.  => From which host?

# [TEST] Write further Tests
 * Create a second team when already registered
 * Switch between own teams

# Technical Dept

 * Detail: Make all components pass the page-title into liquido-header via normal properties
 * OR Larger refactoring: Go through state store. Make rootApp include the header. (Do I have a header on all pages?)
               What about side scrolling? 

## Use Case features
 
### Registration

 * Verify a user's email
 * Verify phone number

### Login

 * Finally finalize the final login flow :-) Login via
   * Login via Email
	 * Google - DONE
	 * [Login with Apple](https://developer.apple.com/documentation/signinwithapple/configuring-your-webpage-for-sign-in-with-apple)
	 * Authy App: Need good docu and UX guide.
	 * SMS - Not possible due to costs :-(

#### Settings

 * Frontend shall load settings from the backend, e.g. poll- and proposalTitleMinLength.

Settings per Team
 * Can team members invite other team members?
 * Can team members create polls themselves?
 * How to tally a voting? Absolut majoritis or winning margins? 

Settings per poll
 * Can team members add their own proposals to a poll?   [done]


# LIQUIDO "small, medium and large"

There are three variants of liquido. A very fun small one, our standard web based mobile app and a (future planed) premium version

	 1. **Polly** (e.g. for kids): a super intelligent wobbling funny Polly
	 2. **Polls** with proposals and elections with candidates and a descriptions for each option
	 3. **Full blown** liqudid democracy **with delegations** to a proxy and more:

## Full blown LIQUIDO with ideas that need to get support

LIQUIDO premium  is a decentralized implementation of a new liquid, proxy voting, democratic voting system. It does not need any central authorizty. Comparable to the implementation of Bitcoin.

 * Ideas, that become proposals when they have enough supporters
 * Alternative ideas that can be suggested, and then become alternative proposals if they gather enough supporters.
 * Polls that can be started when there are at least two proposals. Open question: Who decides when to start a poll without a central authority? The majority (or min 2/3rd? -> config) of the  proposal creators say so? => that could mean we need a third to break a tie between only two.... mmhhh ... Maybe: a poll start at least n days after there are two proposals if the creators cannot decide.

## Code cleanup, small stuff
 
 * Timeout for backend requests
 * mobile-debug-log: Drag "L" handle. Configurable: at the right screen edge, drag'n'drop


## Bigger technical lifts

 * Refactor all components to Composition style API
 * Update i18n. See plans under doc/ai. Or implement our own loc(). Then date formatting is still a todo.
 * Three levels of polls,  Polly
 * Capacitorjs.com A cross platform native runtime for web apps.
 * split liquido-graphql-client.js  into authentication, cache-service and pure backend HTTP clients

# Deployment

# Database for free
 * https://supabase.com/
 

## Smaller fixes

 * Scroll to top: Do this with  https://router.vuejs.org/guide/advanced/scroll-behavior.html#Delaying-the-scroll     "scrollBehaviour" in router!!!
 * Test on real devices, eg. with https://www.browserstack.com/    => This does already work on real hardware locally.

# DONE - Implemented Features 

 * June 2026 - lot of improvements with AI: graphql mock, rest interfaces for sending mails
 * Juni 2026 - looot of work on login page. In the end decided on easy variant. Always show udername and password input field, instead of fancy UX animation, because of iOS autofill.
 * May 2026 - Remove all SCSS: CSS is enough -> performance improvement
 * May 2026 - A lot of reworks how Navbar works. Now have it on each individual page
 * May 2026 - Introduced UserHome with edit with only on AI prompt!
 * March 2026 - Really nice Design View Page with an overview of all mobile pages in the app
 * Dez 2025 - Keepass with WebAuthN - puh that was a big lift
 * Oct 2025 - Local MOCK for backend
 * Aug 2025 - Remove bootstrap-vue-3  use plain bootstrap (mainly only b-card and b-button)
 * Jan 2024 - Vue List transition for list if polls => Works again
 * ... see also git log ...
