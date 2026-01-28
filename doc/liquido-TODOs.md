# TODOs

## Use Case features
 
### Registration

 * Verify a user's email

### Login

 * Finally finalize the final login flow :-) Login via
   * Google - DONE
	 * Apple 
	 * Authy App
	 * SMS
 * Settings:
   * Can team members add their own proposals to a poll?

### Polls

 * Three levels of polls:
	 1. Polly (e.g. for kids): a super intelligent wobbling funny Polly
	 2. Polls (with proposals/options) and Elections (with candidates) and descriptions for each option
	 3. Full blown proxy voting

## Full blown liquido with ideas that need to get support

 * Ideas, that become proposals when they have enough supporters
 * Alternative ideas that can be suggested, and then become alternative proposals if they gather enough supporters.
 * Polls that can be started when there are at least two proposals.

## Code cleanup, security, ...
 
 * Timeout for backend requests
 * Move Navbar bottom to polls.vue page and ONLY there!  <= IMPORTANT QUICK FIX!   and add TESTS!
 * Capacitorjs.com A cross platform native runtime for web apps.
 * split liquido-graphql-client.js  into authentication, cache-service and pure backend HTTP client

## Smaller fixes

 * Remove all SCSS: CSS is enough -> performance improvement
 * Scroll to top: Do this with  https://router.vuejs.org/guide/advanced/scroll-behavior.html#Delaying-the-scroll     "scrollBehaviour" in router!!!
 * Test on real devices, eg. with https://www.browserstack.com/    => This does already work on real hardware locally.

# DONE - Implemented Features 

 * Dez 2025 - Keepass with WebAuthN - puh that was a big lift
 * Oct 2025 - Local MOCK for backend
 * Aug 2025 - Remove bootstrap-vue-3  use plain bootstrap (mainly only b-card and b-button)
 * Jan 2024 - Vue List transition for list if polls => Works again
 * ... see also git log ...
