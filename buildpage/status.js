'use strict';
var spawn = require('child_process').spawn;
module.exports = function(req, res, user) {
	if (req.url.pathname == '/status/') {
		respondPage('Status', user, req, res, function() {
			res.write('<h1>DevDoodle Status</h1>');
			var child = spawn('git', ['rev-parse', '--short', 'HEAD']);
			res.write('<p class="green"><strong>Running</strong>, commit #');
			child.stdout.on('data', function(data) {
				res.write(data);
			});
			child.stdout.on('end', function() {
				res.write('</p>');
				if (user) res.write('<p>You are logged in as <strong>' + user.name + '</strong></p>');
				else res.write('<p>You are not logged in</p>');
				res.write('<p>Current host header is <strong>' + req.headers.host + '</strong></p>');
				res.write('<code class="blk" id="socket-test">Connecting to socket…</code>');
				res.write('<script src="/a/sockettest.js"></script>');
				respondPageFooter(res);
			});
		});
	} else errorNotFound(req, res, user);
};