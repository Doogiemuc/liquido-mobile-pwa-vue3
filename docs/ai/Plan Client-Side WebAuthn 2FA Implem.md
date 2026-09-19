## Plan: Client-Side WebAuthn 2FA Implementation (Required for All Users)

**Summary**: Implement WebAuthn as mandatory 2FA after email/password login using `@simplewebauthn/browser`. Users will complete password authentication first, then immediately be prompted to register or authenticate with biometric 2FA. If not yet registered for WebAuthn, they'll be guided through a quick setup flow before completing login.

### Steps

1. **Install `@simplewebauthn/browser` package** in `package.json` dependencies — handles all client-side credential ceremonies with automatic Base64URL encoding.

2. **Create `src/services/webauthn-service.js`** — clean wrapper around `@simplewebauthn/browser` with methods: `startRegistration(email, userName)`, `completeRegistration(credential)`, `startAuthentication(email)`, `completeAuthentication(credential)`. Handles ceremony orchestration and error cases.

3. **Extend [liquido-graphql-client.js](file:///Users/doogie/Coding/liquido/liquido-mobile-pwa-vue3/src/services/liquido-graphql-client.js)** with REST methods (lines after `loginWithAuthToken`): `getWebAuthnRegistrationOptions(email)`, `submitWebAuthnRegistration(credential)`, `getWebAuthnAuthenticationOptions(email)`, `submitWebAuthnAuthentication(credential)`. These call backend REST endpoints `/q/webauthn/register/*`, `/q/webauthn/authenticate/*` and return challenge/credential responses.

4. **Create `src/components/webauthn-2fa-modal.vue`** — modal component with two flows: **Registration** (shows "Register Face ID / Touch ID" button → triggers registration ceremony) and **Authentication** (shows "Verify with Face ID / Touch ID" button → triggers authentication ceremony). Displays status messages and error handling.

5. **Modify [login-page.vue](file:///Users/doogie/Coding/liquido/liquido-mobile-pwa-vue3/src/views/login-page.vue)** — after successful `loginWithEmailPassword()`: store email in session, show `webauthn-2fa-modal` with registration flow if user not yet enrolled, or authentication flow if already enrolled. Complete login only after 2FA succeeds by calling `api.login(team, user, jwt)`.

6. **Update [root-app.vue](file:///Users/doogie/Coding/liquido/liquido-mobile-pwa-vue3/src/root-app.vue)** — add `webauthnRegistered` reactive state to track enrollment status and pass to child components as needed.

### Further Considerations

1. **Backend response format validation**: Confirm backend returns `{ registrationOptions }` (with challenge, rp, user, pubKeyCredParams) for registration and `{ authenticationOptions }` (with challenge, allowCredentials) for authentication, and accepts `{ credentialResponse }` in POST callbacks.

2. **Registration vs Authentication flow**: Should the modal auto-detect if user is already registered (from backend response)? Or add a check method `api.isWebAuthnEnrolled(email)` first?

3. **Error recovery**: If browser doesn't support 2FA at all, then fall back to password-only. If 2FA fails (user cancels, credential error) then forward the user back to the login screen.

4. **Session persistence**: After successful 2FA, user should be logged in with my default JWT and it's expiry? Add a "Remember this device" option as a TODO comment in the code, but do not implement it yet.

5. **Localization**: Add i18n messages for WebAuthn UI (registration prompt, authentication prompt, success/error messages) — add the new translations to the [login-page.vue](file:///Users/doogie/Coding/liquido/liquido-mobile-pwa-vue3/src/views/login-page.vue) i18n block.