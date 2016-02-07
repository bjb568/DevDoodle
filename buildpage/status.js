'use strict';
let spawn = require('child_process').spawn,
	fs = require('fs');
module.exports = o(function*(req, res, user) {
	if (req.url.pathname != '/status/') return errorNotFound(req, res, user);
	yield respondPage('Status', user, req, res, yield);
	res.write('<h1>DevDoodle Status</h1>');
	let child = spawn('git', ['rev-parse', '--short', 'HEAD']);
	res.write('<p class="green"><strong>Running</strong>, commit #');
	child.stdout.on('data', function(data) {
		res.write(data);
	});
	child.stdout.on('end', o(function*() {
		res.write('</p>');
		if (user.name) res.write('<p>You are logged in as <strong>' + user.name + '</strong></p>');
		else res.write('<p>You are not logged in</p>');
		res.write('<p>Current host header is <strong>' + req.headers.host + '</strong></p>');
		res.write('<code class="blk" id="socket-test">Connecting to socket…</code>');
		res.write(yield addVersionNonces('<script src="/a/sockettest.js"></script>', req.url.pathname, yield));
		res.end(yield fs.readFile('html/a/foot.html', yield));
	}));
});