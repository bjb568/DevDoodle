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
- html: (folder) contains html templates used by server.js and buildpage serverlets
- http: (folder) content that is accessible thru https requests (via server.js)

## Running Locally

- Clone this repository
- If you want to use HTTP2/TLS, create a directory called `Secret` inside DevDoodle's parent directory and add the files: `devdoodle.net.key`, `devdoodle.net.crt`, and `devdoodle.net-geotrust.crt`, which you'll have to self-sign unless you have the real certs.
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