# WebAuthn 2FA — Client-side setup & manual test

This document describes how to test the newly added WebAuthn client flow in the LIQUIDO PWA.

# Prerequisites

 - A browser and device that supports WebAuthn (iOS Safari with Face ID, Chrome on Android with fingerprint, or desktop with platform authenticators).
 - Backend WebAuthn endpoints available at `/q/webauthn/register/options`, `/q/webauthn/register/verify`, `/q/webauthn/authenticate/options`, `/q/webauthn/authenticate/verify` (the backend is already configured).

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

