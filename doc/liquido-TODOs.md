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

Settings per Team
 * Can team members invite other team members?
 * Can team members create polls themselves?
 * Can team members add their own proposals to a poll?
 * How to tally a voting? Absolut majoritis or winning margins?

Do I need any setting per poll? Wouldn't know of any yet.

# Three level of polls

 * Three levels of polls:
	 1. Polly (e.g. for kids): a super intelligent wobbling funny Polly
	 2. Polls (with proposals/options) and Elections (with candidates) and descriptions for each option
	 3. Full blown liqudid proxy voting with delegations.

## Full blown LIQUIDO with ideas that need to get support

 * Ideas, that become proposals when they have enough supporters
 * Alternative ideas that can be suggested, and then become alternative proposals if they gather enough supporters.
 * Polls that can be started when there are at least two proposals.

## Code cleanup, small stuff
 
 * Timeout for backend requests
 * mobile-debug-log: Drag "L" handle. Configurable: at the right screen edge, drag'n'drop


## Bigger technical lifts

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
