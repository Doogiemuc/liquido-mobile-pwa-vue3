# LIQUIDO Mobile PWA

LIQUIDO - A modern aproach to liquid democracy.

This is a HTML5 based mobile application. A PWA - progressive web application.



## Layout / Design / UI / UX

No more fixed title at the top. Only the title of the page. Black on white.

Mobile menu bar at the bottom:
 * Home / Team 
 * Polls
 * Search (?)
 * Settings / About / UserProfile

Poll Detail page:
 * No menu bar at the bottom
 * Back sign at the top left
 * Add Proposal button OR
 * Big cast vote button



## TESTS

### Test Case: Register

 1. Register as new user                                 (welcome-chat.js -> liquido-atlas-client.js)
 2. Send anonymous REST reqest to /createNewTeam         
    Response contains { team user jwt }. 
 3. Store team and user in local cache.                  (welcome-chat.js -> local-cache.js)
 4.	Set jwt in liquido-atlas-client as HTTP HEADER       (welcome-chat.js -> liquido-atlas-client.js)




# How to setup vue repo from scratch

Create an empty directory and run

    npm create vue@latest

Install (answer yes) Vue Router, Vitest, End-2-End Test with Cypress and optionally ESLint and Prettier. Then do

    npm install axios bootstrap dayjs fontawesome gsap loglevel populating-cache vue-i18n vuedraggable

TODO: do i need vue-bootstrap


# Develop offline

TODOs

 * Load Bootstrap locally
 * Load Fontawesome locally
 * Mock backend or start it locally
 * ...





 # Further References

 # Very nice starter Template One Page Landing Page

  - Kudos to https://github.com/marvelapp/devices.css for their css only iOS mobile phone frame, that we adapt here.
  - Bootstrap https://bootstrapmade.com/demo/FlexStart/

 ## MongoDB Atlas & GraphQL

Very nice howto
 https://www.mongodb.com/developer/products/realm/graphql-easy/

