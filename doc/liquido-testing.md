# How to test LIQUIDO

There is a lot of setup and configuration for testing LIQUIDO.

## Preconditions for LIQUIDO FRONTEND

 * The LIQUIDO progressive web application PWA **must** be served via HTTPs with a valid TLS certificate.
 * Frontend must be able to reach the LIQUIDO Quarkus backend via HTTPS. Again with a valid and trusted TLS certificate.
 * Make sure that your certificates contains all required domains as SAN (subject alternative names)

## Additional requirements for WebAuthn

 * Frontend must be served on a real domain not just an IP address, Tip: Configure a domain in your local `/etc/hosts` or in your local DNS, e.g. `liquido.local`. 
 * That domain must be configured in backend `application-dev.properties`: `quarkus.webauthn.origins=https://liquido.local:3001`. With schema, domain and port!
 * And obviously your hardware device must support WebAuthN (iOS Safari with Face ID, Chrome on Android with fingerprint, or desktop with platform authenticators)

## Preconditions for LIQUIDO BACKEND configuration

There are several possibilities how you can configure the frontend to access the backend. The TLS certificate for the frontend is configured in `vite.config.js`. If frontend and backend run on the same host/IP then you can directly configure the `LIQUIDO_API_URL` in `./config/config.development.js`. 

If the backend is running on another machine you can configure a path proxy in vite that forwards requests for you. Set `LIQUIDO_API_URL: '/graphql_proxy'` in `./config/config.development.js`. and configure a `target` in `vite.config.js`. Plus you'll most likely need to fiddle around with path reqrites a bit :-) In this setup the LIQUIDO frontend simply sends backend requests to the configured local PATH and the vite proxy then forwards to the actual LIQUIDO backend running somewhere else.

# Test locally on a PC or laptop

Testing locally is easier. Testing on a real device requires much more setup.

## Start services

 * Start the LIQUIDO backend `mvn quakrus:dev`
 * Start the LIQUIDO frontend `npm run dev`
 * Open LIQUIDO in local browser. (Safari, Firefox, Chrome should all work just fine.)
 * Tip: Open developer tools in browser

# Remote testing on Safari for iOS

 * Navigate to https://backend.host:8443/graphql/schema.graphql  => This is necessary at least once, to make the browser accept the self-signed certificate
 * Navigate to https://backend.host:8443  -> should show some info about the LIQUIDO API version
 * Navigate to https://frontend.host/
 * Check browser debug console -> no errors

You must open all these URLs (incl the schema.graphql) at least once, and manually test Safari to trust these pages.

## Debugging with iOS Safari on a real device

You can see the remote console output from Safari for iOS on your local Safari!
https://dev.to/nimajafari/remote-debugging-using-safari-on-ios-devices-with-macos-16p5 

I played around a lot with a mobile-debug-log.vue component to make the console.log available really locally on a device. This does work. But it's a crude hack to redefineConsoleMethods(). And you loose the "this" context and cannot see anymorefrom which file a log statement initially came from.



# Automated tests

Every LIQUIDO use case is covered with an automated playwright test.

### TODO: Tests to implement

 * Negative test cases
   * Cannot reach backend
	 * Device does not support Passkey
	 * Supported but cannot register Passkey (eg. wrong/different domain)

