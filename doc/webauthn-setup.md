# WebAuthn 2FA — Client-side setup & manual test

This document describes how to test the newly added WebAuthn client flow in the LIQUIDO PWA.

# Prerequisites - Frontend

 - Frontend and backend are hosted via HTTPS with valid TLS certificates.
 - config.<env>.js  has correct LIQUIDO_API_URL, eg. "https://macbookpro.fritz.box:8443",

# Prerequisites - Backend

The relying-party.id (rpId) in `application.properties` must match the domain of the frontend and backend! and also be in the list of allowed origins.
Origins must be listed with schmea, FQDN and port. 
And CORS must also be configured

````
# Quarkus WebAuthn configuration    
quarkus.webauthn.relying-party.name=LIQUIDO
quarkus.webauthn.relying-party.id=macbookpro.fritz.box
quarkus.webauthn.origins=https://macbookpro.fritz.box:3001,https://liquido.dynv6.net

# CORS
quarkus.http.cors.enabled=true
quarkus.http.cors.origins=/.*/
````

# Prerequisites - Browser on Device

 - A browser and device that supports WebAuthn (iOS Safari with Face ID, Chrome on Android with fingerprint, or desktop with platform authenticators).

# Manual test steps

1. Open the app in a WebAuthn-capable browser (mobile or desktop) and navigate to `/login`.
2. Enter a valid user's email and password and click the login button.
   - If the user is already enrolled for WebAuthn, a modal will appear prompting "Verify with Face ID / Touch ID". Follow the biometric prompt on your device.
   - If the user is not enrolled, the modal will show a "Register Face ID / Touch ID" button. Click it and follow the device prompt to enroll.
3. On successful WebAuthn verification/registration the server will return the final JWT, the client will store it and you will be redirected to the team home page.
4. If the browser/device does not support WebAuthn, the login will fall back to password-only (a warning will be shown). This is a permissive fallback for broad compatibility.

# Notes for developers

 - Credentials returned by the browser are sent directly to the backend verify endpoints; the client does not parse or validate the attestation/assertion — that is a server responsibility.
 - The client uses `@simplewebauthn/browser` for the ceremony orchestration.
 - Do not log raw credential objects to the console in production.

# Troubleshooting

 - If the biometric prompt does not appear, verify that the site is served over HTTPS and the browser/device supports platform authenticators.
 - For Cypress/e2e tests: automating platform WebAuthn is non-trivial. Consider mocking backend responses or using special test flags/dev-mode endpoints for testing.

