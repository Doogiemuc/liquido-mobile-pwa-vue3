# LIQUIDO

LIQUIDO - A modern aproach to liquid democracy.

http://www.liquido.vote

# LIQUIDO Frontend

This is the LIQUIDO frontend, a progressive web application (PWA) built with VUE.
This frontend communicates via a GraphQL API with the LIQUIDO quarkus backend.

# Disclaimer

This is a private hobby project. I've been working on this in my free time for nearly a decade. 
The honest goal of LIQUIDO is to never ever be finished. I use this project to learn.




# Layout, Design, UX/UI

### Header

Older version: No more fixed title at the top. Only the title of the page. Black on white.

LIQUIDO header, now with animated switch to show page title when user scrolls up

Mobile menu bar at the bottom:
 * Home / Team (or simply back?)
 * Polls
 * Search (where to put it?)
 * Settings / About / UserProfile

Is there enough horizontal space on small displays? Or have a burger menu at the top right?

Poll Detail page:
 * No menu bar at the bottom
 * Back sign at the top left
 * Add Proposal button OR
 * Big cast vote button

### UX/UI Footer

What sould be at the left and right?  Left: Team  and Right: Info  => What to show there?



# TESTING LIQUIDO

There are a lot of Cypress test. (Alternative tool: Playwright is also nice, but for now we'll stick with Cypress. An AI can migrate for me later :-)

See liquido-testing.md 




# LIQUDIO Security 

### TLS certificates

For the TLS connection to the backend you need a certificate. For development we use a self signed cert. It is not that easy to make Safari on iOS to accept that cert:

 1. Create a self-signed certificate with `mkcert -install`. On mac this also installs the certificate into the local trust store. See also https://github.com/FiloSottile/mkcert/blob/master/README.md#supported-root-stores 
 2. Download the .pem file directly in your phone.
 3. Install the cert via iOS Settings. -> General -> "Profile downloaded"
 4. Then under Settings -> General -> About -> Trust the cert root chain.
 5. In your iOS browser open https://backend.host:8443/graphql/schema.graphql and click on "open website". This is also necessary to trust the cert.




# Social Logins

## Google Login for LIQUIDO

We use the Oauth Authentication Code Flow.

Oauth Client IDs are configured in the Google Cloud Console:
https://console.cloud.google.com/auth/clients?project=liquido-vote

Very nice comparission of both Oauth Flows:
https://developers.google.com/identity/oauth2/web/guides/choose-authorization-model#oauth_20_flow_comparison 

Google OAuth
https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow#obtainingaccesstokens
https://developers.google.com/identity/oauth2/web/guides/how-user-authz-works 
https://developers.google.com/identity/protocols/oauth2/web-server#node.js_1  

## Passwordless.dev (by Bitwarden)

TODO



# Deploy

Build `npm run build`

## Deploy to fly.io

   fly launch  => setup a fly app and create a fly.toml   Configure [env] in there!
	 fly deploy  => remember to have all "dependencies" in package.json  ("devDependencies" are not installed in productin!)
	                creates a Dockerfile and pushes to registry.fly.io/liquido-frontend-fly

**Fly.io Links**

 * Liquido frontend on Fly.io - Web Management Console  https://fly.io/apps/liquido-frontend-fly
 * Watch server logs on Fly.io  https://fly.io/apps/liquido-frontend-fly/monitoring
 
https://liquido-frontend-fly.fly.dev/ 

## Deploy LIQUIDO Frontend to IONOS

Copy /dist with ForkLift, sFTP or rsync

Very nice article how to configure DynDNS with dynv6 and FritBox
https://nocksoft.de/tutorials/dyndns-fuer-ipv6-server-hinter-fritzbox-konfigurieren/


## Other possible hosters

  * AWS
	* serverless.com



# TODO: Larger new features I would like to implement ("Epics")
 
 * Timeout for backend requests
 * Capacitorjs.com A cross platform native runtime for web apps.
 * Everythign in one page with a super intelligent wobbling funny poll-pannel => Polly works
 * Three levels of complexity
	 1. for kids: ONly one poll-panel with single line proposals (no description)
	 2. Polls (for laws) and Elections (for candidates) with descriptions
	 3. Full blown proxy voting

# TODO: smaller fixes

 - Move Navbar bottom to polls.vue page and ONLY there!  <= IMPORTANT QUICK FIX!
 - Scroll to top: Do this with  https://router.vuejs.org/guide/advanced/scroll-behavior.html#Delaying-the-scroll     "scrollBehaviour" in router!!!
 - Need muuuuuch more tests for the polls filter at the bottom. When to show it?
 - Test on real devices, eg. with https://www.browserstack.com/    => This does already work on real hardware locally.

# DONE / New Features 

See also git log

 * Local MOCK for backend - October 2025
 * Remove bootstrap-vue-3  use plain bootstrap (mainly only b-card and b-button) - August 2025
 * Vue List transition for list if polls => Works again,  January 2024





 # Further References

 ### Very nice starter Template One Page Landing Page

  - Kudos to https://github.com/marvelapp/devices.css for their css only iOS mobile phone frame, that we adapt here.
  - Bootstrap https://bootstrapmade.com/demo/FlexStart/

### MongoDB Atlas & GraphQL

For some time in 2024 I played around with MongoDB. Very nice noSQL Db. Their functions also look interesting. 
This would be a completely different aproach of implementing a backend.
Very nice howto https://www.mongodb.com/developer/products/realm/graphql-easy/

# How to setup vue repo from scratch

Lost in dependency hell after an npm upgrad?
This is how to setup the repo with all its packages from scratch.

Create an empty directory and run

    npm create vue@latest

Install (answer yes) Vue Router, Vitest, End-2-End Test with Cypress and optionally ESLint and Prettier.

    npm install /* axios bootstrap dayjs fontawesome gsap loglevel populating-cache vue-i18n vuedraggable */
