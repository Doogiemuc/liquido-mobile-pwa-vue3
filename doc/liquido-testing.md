# How to test LIQUIDO

There is a lot of setup and configuration for testing LIQUIDO.

## Preconditions and Requirements for LIQUIDO FRONTEND

The LIQUIDO progressive web application PWA **must** be expsed via HTTPs with a valid TLS certificate. Otherwise Keepass/WebAuthn doesn't work.
The LIQUIDO frontend must be able to reach the LIQUIDO Quarkus backend also via HTTPS. Again via a valid and trusted TLS certificate.
It must be accessible as https://liquido.local:3001

## Preconditions and Requirements for LIQUIDO BACKEND configuration

There are several possibilities how you can configure the frontend to access the backend. The TLS certificate for the frontend is configured in `vite.config.js`. If frontend and backend run on the same host/IP then you can directly configure the `LIQUIDO_API_URL` in `./config/config.development.js`. 

If the backend is running on another machine you can configure a path proxy in vite that forwards requests for you. Set `LIQUIDO_API_URL: '/graphql_proxy'` in `./config/config.development.js`. and configure a `target` in `vite.config.js`. Plus you'll most likely need to fiddle around with path reqrites a bit :-) In this setup the LIQUIDO frontend simply sends backend requests to the configured local PATH and the vite proxy then forwards to the actual LIQUIDO backend running somewhere else.

## Test locally on a PC or laptop

Testing locally is easier. Testing on a real device requires much more setup.

#### Start services

 * Start the LIQUIDO backend `mvn quakrus:dev`
 * Start the LIQUIDO frontend `npm run dev`
 * Open LIQUIDO in local browser. (Safari, Firefox, Chrome should all work just fine.)
 * Tip: Open developer tools in browser

#### Sanity checks

Everything HTTPS = HTTPS via TLS!

 * Navigate to https://backend.host:8443/graphql/schema.graphql  => This is necessary at least once, to make the browser accept the self-signed certificate
 * Navigate to https://backend.host:8443  -> should show some info about the API version
 * Navigate to https://frontend.host/
 * Check browser debug console -> no errors

# Remote testing on Safari for iOS

You can see the remote console output from Safari for iOS on your local Safari!
https://dev.to/nimajafari/remote-debugging-using-safari-on-ios-devices-with-macos-16p5 

I played around a lot with a mobile-debug-log.vue component to make the console.log available really locally on a device. This does work. But it's a crude hack to redefineConsoleMethods(). And you loose the "this" context and cannot see anymorefrom which file a log statement initially came from.

# Test PassKey / Webauthn

### Prerequesites / Requirements

 * Must servee frotnend and backend via HTTPS
 * Must server frontend and backend via a real hostname. Just a local IP won't work. => Configure liquido.local in your `/etc/hosts`
 * Hardware device must support WebAuthN (iOS Safari with Face ID, Chrome on Android with fingerprint, or desktop with platform authenticators)
 * 



# Automated tests

Every LIQUIDO use case is covered with an automated test.


### TODO: Tests to implement

 * Negative test cases
   * Cannot reach backend
	 * Device does not support Passkey
	 * Supported but cannot register Passkey (eg. wrong/different domain)