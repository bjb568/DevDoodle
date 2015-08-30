![DevDoodle logo](http://devdoodle.net/a/logo1.svg)

DevDoodle is a programmers' network where you can do tutorials, ask questions, and create and share your own programs! We're only in beta now, so some features are incomplete.

You can visit [here](http://devdoodle.net).

Before submitting a bug, try hard-reloading.

## Files

- essentials.js: `require()`d by front, buildpage
- front.js: default port 443 (changeable via command line argument), manages HTTPS, and by default sets up a redirect from HTTP on port 80 to HTTPS (on port 443)
- buildpage.js: default port 8000 (changeable via command line argument), dependancy front.js
- sockets.js: default port 81 (changeable via command line argument), handles secure web socket connections (`wss://`)
- html: (folder) contains dependancies used in front and buildpage
- http: (folder) content that is accessible thru http requests to front.js

## Running Locally

- Clone this repository
- Create a directory called `Secret` inside DevDoodle's parent and add the files: `devdoodle.net.key`, `devdoodle.net.crt`, and `devdoodle.net-geotrust.crt`, which you'll have to self-sign unless you have the real certs. In addition, create the file `devdoodleDB.key` which contains your mongodb database password for the user `DevDoodle`. Make sure your permissions are set right for this folder.
- Install a recent version of node and mongodb (run the mongod process (you must create a data directory, if it doesn't already exist)).
- `npm install`
- Run a mongo shell process and:

		> use DevDoodle
		> db.createUser({user: 'DevDoodle', pwd: 'YOUR-DB-PASSWORD', roles: [{role: 'readWrite', db: 'DevDoodle'}]})
- `node front.js` with sudo (or change it's port to ≥ 1024 via command line argument (e.g. `node front 1337`))
- `node buildpage.js`
- `node sockets.js` with sudo (changing port is not supported since port 81 is hard coded into client side javascript)

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

Dependancies:

    npm update
