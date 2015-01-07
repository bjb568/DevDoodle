![DevDoodle logo](http://devdoodle.net/a/logo1.png)

DevDoodle is a programmers' network where you can do tutorials, ask questions, and create and share your own programs! We're only in beta now, so some features are incomplete.

You can visit [here](http://devdoodle.net).

Before submitting a bug, try hard-reloading.

## Files

- essentials.js: `require()`d by front, buildpage
- front.js: default port 80 (changeable via command line argument), manages HTTP
- buildpage.js: default port 8000 (changeable via command line argument), compliments front.js
- sockets.js: default port 81 (changeable via command line argument), handles web socket connections
- html: (folder) contains dependancies used in front and buildpage
- http: (folder) content that is accessible thru http requests to front.js

## Running Locally

- Clone this repository
- Install a recent version of node and mongodb (run the mongod process (you must create a data directory, if it doesn't already exist)).
- Run a mongo shell process and:

		> use DevDoodle
		> db.createUser({user: 'DevDoodle', pwd: 'KnT$6D6hF35^75tNyu6t', roles: [{role: 'readWrite', db: 'DevDoodle'}]})
- `node front.js` with sudo (or change it's port to ≥ 1024 via command line argument (e.g. `node front 1337`))
- `node buildpage.js`
- `node sockets.js` with sudo (changing port is not supported since port 81 is hard coded into client side javascript)
