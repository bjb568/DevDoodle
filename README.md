![DevDoodle logo](http://devdoodle.net/a/logo1.svg)

[![Build Status](https://magnum.travis-ci.com/bjb568/DevDoodle.svg?token=dq95p9xxkoyhFzWyxURh&branch=master)](https://magnum.travis-ci.com/bjb568/DevDoodle)

DevDoodle is a programmers' network where you can do tutorials, ask questions, and create and share your own programs! We're only in beta now, so some features are incomplete.

You can visit [here](http://devdoodle.net).

Before submitting a bug, try hard-reloading.

## Files

- server.js: runs all HTTPS on port 443 (changeable via command line argument), and by default sets up a redirect from HTTP on port 80 to HTTPS (on port 443)
- api.js: required by server.js, manages POST requests to /api/*
- buildpage: (folder) contains serverlets required by server.js that manage GET requests
- html: (folder) contains html templates used by server.js and buildpage serverlets
- http: (folder) content that is accessible thru https requests (via server.js)
- sockets.js: default port 81 (changeable via command line argument), handles secure web socket connections (`wss://`)

## Running Locally

- Clone this repository
- If you want to use HTTPS, create a directory called `Secret` inside DevDoodle's parent directory and add the files: `devdoodle.net.key`, `devdoodle.net.crt`, and `devdoodle.net-geotrust.crt`, which you'll have to self-sign unless you have the real certs.
- Install a recent version of node and mongodb (run the mongod process (you must create a data directory, if it doesn't already exist)).
- `npm install`
- `node server` with sudo (or change it's port to ≥ 1024 via command line argument (e.g. `node server 1337`))
    - optional `--nossl` argument to run the server on http, port 80
    - optional `--no-ocsp-stapling` to turn off OCSP stapling for the SSL server
- `node sockets.js` with sudo (changing port is not supported since port 81 is hard-coded into client side javascript)
- verify everything is working at `https://localhost/status/` (or `https://localhost:1337/status/` for a custom port)

Apparently node processes don't need to run as root if you do this first (on Linux):

	sudo apt-get install libcap2-bin
	setcap 'cap_net_bind_service=+ep' /usr/bin/nodejs

To make Safari/OS X like the cert (and allow connecting with sockets), add the certs to Keychain Access and set it to Always Trust.

For reference, to update Node:

    sudo npm cache clean -f
    sudo npm install -g n
    sudo n stable

npm:

    sudo npm update -g npm

dependancies:

    npm update