![DevDoodle logo](http://devdoodle.net/a/logo1.svg)

[![Build Status](https://magnum.travis-ci.com/bjb568/DevDoodle.svg?token=dq95p9xxkoyhFzWyxURh&branch=master)](https://magnum.travis-ci.com/bjb568/DevDoodle)

DevDoodle is a programmers' network where you can do tutorials, ask questions, and create and share your own programs! We're only in beta now, so some features are incomplete.

You can visit [here](http://devdoodle.net).

Before submitting a bug, try hard-reloading.

## Files

- server.js: main server script that itself handles non-API POST requests and requires all other pieces
- config.js: configuration options for server.js
- api.js: required by server.js, manages POST requests to /api/*
- buildpage: (folder) contains serverlets required by server.js that manage GET requests
- sockets.js: required by server.js, handles socket (`ws:` or `wss:`) connections
- socket: (folder) contains socket serverlets required by sockets.js
- html: (folder) contains html templates used by server.js and buildpage serverlets
- http: (folder) content that is accessible thru https requests (via server.js)

## Running Locally

- Clone this repository
- If you want to use HTTP2/TLS, create a directory called `Secret` inside DevDoodle's parent directory and add the files: `devdoodle.net.key`, `devdoodle.net.crt`, and `devdoodle.net-chain.crt`, which you'll have to self-sign unless you have the real certs.
- If you want to be able to use GitHub logins, create a file in `Secret` called `github-auth.json` and add the auth information from GitHub like this:

		{
			"clientID": "00000000000000000000",
			"clientSecret": "0000000000000000000000000000000000000000"
		}
- Install a recent version of node and mongodb (run the mongod process (you must create a data directory, if it doesn't already exist)).
- `npm install`
- Modify `config.js` to your liking
- `node server` (by default runs on ports 80 and 443 so requires `sudo`)
- verify everything is working at `https://localhost/status/` (or `https://localhost:1337/status/` for a custom port)

Apparently node processes don't need to run as root if you do this first (on Linux):

	sudo apt-get install libcap2-bin
	sudo setcap 'cap_net_bind_service=+ep' /usr/local/bin/node

To make Safari/OS X like the cert (and allow connecting with sockets), add the certs to Keychain Access and set it to Always Trust.

For reference, to update Node:

	sudo npm cache clean -f
	sudo npm install -g n
	sudo n stable

npm:

	sudo npm update -g npm

dependancies:

	npm update

## Certs

DevDoodle uses [Let's Encrypt](https://letsencrypt.org) certs. These certs last 90 days. HPKP is cached for 30 days. Since there should always be 2 available valid certs, a new one must be generated every 45 days. The certs should be switched 31 days after the new one is generated.

2016-06-29 — 2016-09-27 Last cert  
2016-08-13 — 2016-11-11 Current cert  
2016-09-27 — 2016-12-26 Next cert  
2016-11-11 — 2017-02-09 Next next cert

Certificate renewal is done with:

	certbot certonly --cert-path ...

Certs are in `/etc/letsencrypt/live`.

To generate the hash [for HPKP](https://developer.mozilla.org/en-US/docs/Web/Security/Public_Key_Pinning):

	openssl x509 -in my-certificate.crt -pubkey -noout | openssl rsa -pubin -outform der | openssl dgst -sha256 -binary | openssl enc -base64