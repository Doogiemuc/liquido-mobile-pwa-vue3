# LIQUIDO Mobile PWA

LIQUIDO - A modern aproach to liquid democracy.

This is a HTML5 based mobile application. A PWA - progressive web application.

## TODOs

 - Test on real devices, eg. with https://www.browserstack.com/
 - 




## Layout, Design, UX/UI

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


### Footer

What sould be at the left and right?  Left: Team  and Right: Info  => What to show there?



## TESTS

### Test Case: Register

 1. Register as new user                                 (welcome-chat.js -> liquido-atlas-client.js)
 2. Send anonymous REST reqest to /createNewTeam         
    Response contains { team user jwt }. 
 3. Store team and user in local cache.                  (welcome-chat.js -> local-cache.js)
 4.	Set jwt in liquido-atlas-client as HTTP HEADER       (welcome-chat.js -> liquido-atlas-client.js)


# LIQUDIO Security 

For the TLS connection to the backend you need a certificate. For development we use a self signed cert. It is not that easy to make Safari on iOS to accept that cert:

 1. Download the .pem file directly
 2. Install the cert via iOS Settings
 3. Then under Settings -> General -> About -> Trust the cert root chain

Sometimes it is till necessary to open  https://backend.host:8443/graphql/schema.graphql  at the backend once and again click on "open website" in iOS.


# How to setup vue repo from scratch

If you *really* want to setup your repo. This is usefull for larger updates with breaking changes.

Create an empty directory and run

    npm create vue@latest

Install (answer yes) Vue Router, Vitest, End-2-End Test with Cypress and optionally ESLint and Prettier. Then do

    npm install axios bootstrap dayjs fontawesome gsap loglevel populating-cache vue-i18n vuedraggable

TODO: do i need vue-bootstrap => currently yes, mostly for <b-card>


# Develop offline

 * 


# TODOs

Larger new features I would like to implement ("Epics")

 * Everythign in one page with a super intelligent wobbling funny poll-pannel
 * Three levels of complexity
	 1. for kids: ONly one poll-panel with single line proposals (no description)
	 2. Polls (for laws) and Elections (for candidates) with descriptions
	 3. Full blown proxy voting


# DONE / New Features 

See also git log

  * Vue List transition for list if polls => Works again,  January 2024





 # Further References

 # Very nice starter Template One Page Landing Page

  - Kudos to https://github.com/marvelapp/devices.css for their css only iOS mobile phone frame, that we adapt here.
  - Bootstrap https://bootstrapmade.com/demo/FlexStart/

## MongoDB Atlas & GraphQL

Very nice howto
https://www.mongodb.com/developer/products/realm/graphql-easy/

