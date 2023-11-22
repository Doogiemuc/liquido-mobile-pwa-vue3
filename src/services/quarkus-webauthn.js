/*
	* Base64URL-ArrayBuffer
	* https://github.com/herrjemand/Base64URL-ArrayBuffer
	*
	* Copyright (c) 2017 Yuriy Ackermann <ackermann.yuriy@gmail.com>
	* Copyright (c) 2012 Niklas von Hertzen
	* Licensed under the MIT license.
	*/
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
// Use a lookup table to find the index.
const lookup = new Uint8Array(256);


for (let i = 0; i < chars.length; i++) {
	lookup[chars.charCodeAt(i)] = i;
}

const bufferToBase64 = function (arraybuffer) {
	const bytes = new Uint8Array(arraybuffer);

	let i;
	let len = bytes.length;
	let base64url = '';

	for (i = 0; i < len; i += 3) {
		base64url += chars[bytes[i] >> 2];
		base64url += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
		base64url += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
		base64url += chars[bytes[i + 2] & 63];
	}

	if ((len % 3) === 2) {
		base64url = base64url.substring(0, base64url.length - 1);
	} else if (len % 3 === 1) {
		base64url = base64url.substring(0, base64url.length - 2);
	}

	return base64url;
}

const base64ToBuffer = function (base64string) {
	if (base64string) {

		let bufferLength = base64string.length * 0.75;

		let len = base64string.length;
		let i;
		let p = 0;

		let encoded1;
		let encoded2;
		let encoded3;
		let encoded4;

		let bytes = new Uint8Array(bufferLength);

		for (i = 0; i < len; i += 4) {
			encoded1 = lookup[base64string.charCodeAt(i)];
			encoded2 = lookup[base64string.charCodeAt(i + 1)];
			encoded3 = lookup[base64string.charCodeAt(i + 2)];
			encoded4 = lookup[base64string.charCodeAt(i + 3)];

			bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
			bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
			bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
		}

		return bytes.buffer;
	}
}

// WebAuthn client library
class WebAuthn { 

  /*
   * WebAuthn
   *
   * Copyright (c) 2020 Paulo Lopes <pmlopes@gmail.com>
   * Licensed under the Apache 2 license.
   */

  constructor(options) {
    this.registerPath = options.registerPath;
    this.loginPath = options.loginPath;
    this.callbackPath = options.callbackPath;
    // validation
    if (!this.callbackPath) {
      throw new Error('Callback path is missing!');
    }
  }

  registerOnly(user) {
    const self = this;
    if (!self.registerPath) {
      return Promise.reject('Register path missing form the initial configuration!');
    }
    return fetch(self.registerPath, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(user || {})
    })
      .then(res => {
        if (res.status === 200) {
          return res;
        }
        throw new Error(res.statusText);
      })
      .then(res => res.json())
      .then(res => {
        res.challenge = base64ToBuffer(res.challenge);
        res.user.id = base64ToBuffer(res.user.id);
        if (res.excludeCredentials) {
          for (let i = 0; i < res.excludeCredentials.length; i++) {
            res.excludeCredentials[i].id = base64ToBuffer(res.excludeCredentials[i].id);
          }
        }
        return res;
      })
      .then(res => navigator.credentials.create({publicKey: res}))
      .then(credential => {
          return {
            id: credential.id,
            rawId: bufferToBase64(credential.rawId),
            response: {
              attestationObject: bufferToBase64(credential.response.attestationObject),
              clientDataJSON: bufferToBase64(credential.response.clientDataJSON)
            },
            type: credential.type
          };
      })
			.catch(err => {
				console.log("registerOnly Error", err)
			});
  }

  register(user) {
		console.log("Register222")
    const self = this;
    return self.registerOnly(user)
      .then(body => {
				console.log("Register Body 1", body)
        return fetch(self.callbackPath, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        })
      })
      .then(res => {
				console.log("register res 2", res)
        if (res.status >= 200 && res.status < 300) {
          return res;
        }
				console.log("register error " + JSON.stringify(res))
        throw new Error(res.statusText);
      });
		
  }

  login(user) {
    const self = this;
    return self.loginOnly(user)
      .then(body => {
        return fetch(self.callbackPath, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body),
        })
      })
      .then(res => {
        if (res.status >= 200 && res.status < 300) {
          return res;
        }
        throw new Error(res.statusText);
      });
  }

  loginOnly(user) {
    const self = this;
    if (!self.loginPath) {
      return Promise.reject('Login path missing from the initial configuration!');
    }
    return fetch(self.loginPath, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(user)
    })
      .then(res => {
        if (res.status === 200) {
          return res;
        }
        throw new Error(res.statusText);
      })
      .then(res => res.json())
      .then(res => {
        res.challenge = base64ToBuffer(res.challenge);
        if (res.allowCredentials) {
          for (let i = 0; i < res.allowCredentials.length; i++) {
            res.allowCredentials[i].id = base64ToBuffer(res.allowCredentials[i].id);
          }
        }
        return res;
      })
      .then(res => navigator.credentials.get({publicKey: res}))
      .then(credential => {
        return {
            id: credential.id,
            rawId: bufferToBase64(credential.rawId),
            response: {
              clientDataJSON: bufferToBase64(credential.response.clientDataJSON),
              authenticatorData: bufferToBase64(credential.response.authenticatorData),
              signature: bufferToBase64(credential.response.signature),
              userHandle: bufferToBase64(credential.response.userHandle),
            },
            type: credential.type
          };
      })
  }

}

export default WebAuthn