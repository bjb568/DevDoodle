var http = require('http');
var ws = require('ws');
var fs = require('fs');
var path = require('path');
var url = require('url');
var querystring = require('querystring');
var cookie = require('cookie');
var crypto = require('crypto');

var nodemailer = require("nodemailer");

var transport = nodemailer.createTransport("SMTP", {
    host: "7pnm-mwkh.accessdomain.com",
    secureConnection: true,
    port: 465,
    auth: {
        user: "support@devdoodle.net",
        pass: "KnT$6D6hF35^75tNyu6t"
    }
});

var mongo = require('mongodb');
var db = new mongo.Db('DevDoodle', new mongo.Server("localhost", 27017, {auto_reconnect: false, poolSize: 4}), {w:0, native_parser: false});

var collections = {};
db.open(function(err, db) {
	if (err) throw err;
	db.authenticate('DevDoodle', 'KnT$6D6hF35^75tNyu6t', function(err, result) {
		if (err) throw err;
		db.collection('users', function(err, collection) {
			if (err) throw err;
			collections.users = collection;
		});
		db.collection('chat', function(err, collection) {
			if (err) throw err;
			collections.chat = collection;
		});
	});
});

var errors = [];
errors[404] = function(req, res) {
	respondPage('404 | DevDoodle', req, res, function() {
		res.write('<h1>404</h1>');
		respondPageFooter(res);
	}, {}, 404)
};

var mime = {
	'.html': 'text/html',
	'.css': 'text/css',
	'.js': 'text/javascript',
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.mp3': 'audio/mpeg'
};

function linkUser(name) {
	return '<a href="/user/'+name+'">'+name+'</a>';
};

function respondPage(title, req, res, callback, header, status) {
	var query = url.parse(req.url, true).query, cookies = cookie.parse(req.headers.cookie || '');
	if (!header) header = {};
	if (!header['Content-Type']) header['Content-Type'] = 'application/xhtml+xml';
	res.writeHead(status || 200, header);
	fs.readFile('a/head.html', function(err, data) {
		if (err) throw err;
		collections.users.findOne({cookie: cookies.id}, function(err, user) {
			data = data.toString();
			if (user = user || header.user) {
				data = data.replace('<a href="/login/">Login</a>', linkUser(user.name));
			}
			res.write(data.replace('$title', title).replace('$search', query.q || ''));
			delete header.user;
			callback();
		});
	});
};
function respondPageFooter(res) {
	fs.readFile('a/foot.html', function(err, data) {
		if (err) throw err;
		res.end(data);
	});
};

function respondLoginPage(err, req, res, post) {
	respondPage('Login | DevDoodle', req, res, function() {
		if (err) res.write('<div class="error">'+err+'</div>');
		res.write('<form method="post">');
		res.write('<input type="checkbox" name="create" id="create" onchange="document.getElementById(\'ccreate\').hidden ^= 1"' + (post.create?' checked=""':'') + ' /><label for="create">Create an account</label>');
		res.write('<input type="text" name="name" placeholder="Name" required="" />');
		res.write('<input type="password" name="pass" placeholder="Password" required="" />');
		res.write('<div id="ccreate" ' + (post.create?'':'hidden="" ') + '>');
		res.write('<input type="password" name="passc" placeholder="Confirm Password" />');
		res.write('<input type="text" name="email" placeholder="Email" />');
		res.write('</div>');
		res.write('<button type="submit">Submit</button>');
		res.write('</form>');
		res.write('<style>');
		res.write('#content input[type=text], button { display: block }');
		res.write('</style>');
		respondPageFooter(res);
	});
}

http.createServer(function(req, res) {
	console.log('Req '+req.url);
	if (req.url == '/') {
		respondPage('DevDoodle', req, res, function() {
			res.write('Lorem ipsum. <a>this is a link</a>');
			respondPageFooter(res);
		});
	} else if (req.url == '/login/') {
		var i;
		if (req.method == 'POST') {
			var post = '';
			req.on('data', function(data) {
				post += data;
			});
			req.on('end', function() {
				post = querystring.parse(post);
				if (post.create) {
					if (!post.name|| !post.pass || !post.passc || !post.email) {
						respondLoginPage('All fields are required.', req, res, post);
					} else if (post.pass != post.passc) {
						respondLoginPage('Passwords don\'t match.', req, res, post);
					} else {
						crypto.pbkdf2(post.pass, 'KJ:C5A;_\?F!00S\(4S[T-3X!#NCZI;A', 1e5, 128, function(err, key) {
							var pass = new Buffer(key).toString('base64');
							var rstr = crypto.randomBytes(128).toString('base64');
							collections.users.insert({name: post.name, pass: pass, email: post.email, confirm: rstr, rep: 0, level: 0});
							transport.sendMail({
								from: 'DevDoodle <support@devdoodle.net>',
								to: post.email,
								subject: 'Confirm your account',
								html: '<h1>Welcome to <code>DevDoodle</code>!</h1><p>An account on <a href="http://devdoodle.net/">DevDoodle</a> has been made for this email address. Confirm your account creation <a href="http://devdoodle.net/login/confirm/'+rstr+'">here</a>.</p>'
							});
							respondPage('Account Created | DevDoodle', req, res, function() {
								res.write('An account for you has been created. To activate it, click the link in the email sent to you.');
								respondPageFooter(res);
							});
							
						});
					}
				} else {
					var pass = new Buffer(crypto.pbkdf2Sync(post.pass, 'KJ:C5A;_\?F!00S\(4S[T-3X!#NCZI;A', 1e5, 128)).toString('base64');
					collections.users.findOne({name: post.name, pass: pass}, function(err, user) {
						if (err) throw err;
						if (user) {
							var rstr = crypto.randomBytes(128).toString('base64');
							respondPage('Login Success | DevDoodle', req, res, function() {
								res.write('Welcome back, '+user.name+'. You have '+user.rep+' repuatation.');
								respondPageFooter(res);
							}, {
								'Set-Cookie': cookie.serialize('id', rstr, {
									path: '/',
									expires: new Date(new Date().setDate(new Date().getDate() + 30))
								}),
								user: user
							});
							collections.users.update({name: user.name}, {$set: {cookie: rstr}});
						} else {
							respondLoginPage('Invalid Credentials.', req, res, post);
						}
					});
				}
			});
		} else {
			respondLoginPage(null, req, res, {});
		}
	} else if (i = req.url.match(/^\/login\/confirm\/([A-Za-z\d+\/=]{172})$/)) {
		collections.users.findOne({confirm: i[1]}, function(err, user) {
			if (err) throw err;
			if (user) {
				collections.users.update({name: user.name}, {$set: {confirm: undefined}});
				respondPage('Account confirmed | DevDoodle', req, res, function() {
					res.write('<h1>Account confirmed</h1><p>You may <a href="/login/">log in</a> now.</p>');
					respondPageFooter(res);
				});
			} else {
				respondPage('Account confirmation failed | DevDoodle', req, res, function() {
					res.write('<h1>Account confirmation failed</h1><p>Your token is invalid.</p>');
					respondPageFooter(res);
				});
			}
		});
	} else if (req.url == '/user/') {
		respondPage('Users | DevDoodle', req, res, function() {
			collections.users.find().toArray(function(err, docs) {
				if (err) throw err;
				res.write('<table><tbody>');
				docs.forEach(function(doc) {
					res.write('<tr>');
					res.write('<td>' + doc.name + '</td>');
					res.write('<td>' + doc.rep + '</td>');
					res.write('</tr>');
				});
				res.write('</tbody></table>');
				respondPageFooter(res);
			});
		});
	} else if (req.url == '/chat/') {
		respondPage('Chat | DevDoodle', req, res, function() {
			fs.readFile('chat/room.html', function(err, data) {
				if (err) throw err;
				res.write(data);
				respondPageFooter(res);
			});
		});
	} else if (req.url == '/dev/') {
		respondPage('Create | DevDoodle', req, res, function() {
			fs.readFile('dev/create.html', function(err, data) {
				if (err) throw err;
				res.write(data);
				respondPageFooter(res);åå
			});
		});
	} else if (req.url == '/learn/') {
		respondPage('Learn | DevDoodle', req, res, function() {
			fs.readFile('learn/learn.html', function(err, data) {
				if (err) throw err;
				res.write(data);
				respondPageFooter(res);
			});
		});
	} else if (req.url == '/learn/web/'){
		respondPage('Web Courses | Learn | DevDoodle', req, res, function() {
			fs.readFile('learn/web/web.html', function(err, data) {
				if (err) throw err;
				res.write(data);
				respondPageFooter(res)
			});
		});
	} else if (req.url.match(/^\/learn\/[\w-]+\/[\w-]+\/$/)) {
		res.writeHead(302, {Location: '1/'});
		res.end();
	} else if (i = req.url.match(/^\/learn\/([\w-]+)\/([\w-]+)\/(\d+)\/$/)) {
		var loc = './learn/' + [i[1],i[2],i[3]].join('/') + '.html';
		console.log(loc);
		fs.readFile(loc, function(err, data) {
			data = data.toString();
			if (err) { errors[404](req,res) } else {
				respondPage(data.substr(0,data.indexOf('\n')), req, res, function() {
					res.write(data.substr(data.indexOf('\n')+1));
					respondPageFooter(res);
				});
			}
		});
	} else {
		fs.stat('.' + req.url, function(err, stats) {
			if (err) { errors[404](req,res) } else {
				res.writeHead(200, {'Content-Type': mime[path.extname(req.url)] || 'text/plain', 'Cache-Control': 'max-age=6012800, public', 'Content-Length': stats.size});
				fs.readFile('.' + req.url, function(err, data) {
					if (err) { errors[404](req,res) } else {
						res.end(data);
					}
				});
			}
		});
	}
}).listen(8124);
console.log('Server running at http://localhost:8124/');

var chatWS = new ws.Server({host: 'localhost', port:8125});

chatWS.on('connection', function(tws) {
	collections.chat.find().toArray(function(err, docs) {
		docs.forEach(function(doc) {
			tws.send(JSON.stringify({event: 'init', body: doc.body, user: doc.user, time: doc.time}));
		});
	});
	tws.on('message', function(message) {
		message = JSON.parse(message);
		collections.users.findOne({cookie: message.idcookie}, function(err, user) {
			if (err) throw err;
			if (user) {
				collections.chat.insert({body: message.body, user: user.name, time: new Date().getTime()});
				for (var i in chatWS.clients)
					chatWS.clients[i].send(JSON.stringify({event: 'add', body: message.body, user: user.name}));
			} else {
				tws.send('{"event":"err","body":"You must be logged in to post on chat."}');
			}
		});
	});
});