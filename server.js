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
var db = new mongo.Db('DevDoodle', new mongo.Server("localhost", 27017, {auto_reconnect: false, poolSize: 4}), {w: 0, native_parser: false});

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
		db.collection('chatusers', function(err, collection) {
			if (err) throw err;
			collections.chatusers = collection;
		});
	});
});

var errors = [];
errors[400] = function(req, res) {
	respondPage('400 | DevDoodle', req, res, function() {
		res.write('<h1>Error 400 :(</h1>');
		res.write('<p>The request was corrupted, please try again. If the problem persists, please <a href="mailto:problem@brianjblair.com">let us know</a>.</p>');
		res.write('<h2>Why am I seeing this?</h2>');
		res.write('<p>The request cannot be fulfilled due to bad syntax. <a href="http://en.wikipedia.org/wiki/List_of_HTTP_status_codes">See more</a> status codes.</p>')
		res.write('<p><a href="">Reload</a>, <a href="javascript:history.go(-1)">go back</a>, or <a href="mailto:problem@brianjblair.com">contact us</a>.</p>');
		respondPageFooter(res);
	}, {}, 400)
};
errors[403] = function(req, res) {
	respondPage('403 | DevDoodle', req, res, function() {
		res.write('<h1>Error 403 :(</h1>');
		res.write('<p>Access denied. You don\'t have the necessary permissions to access this page.</p>');
		res.write('<h2>Why am I seeing this?</h2>');
		res.write('<p>The request was a valid request, but the server is refusing to respond to it. Unlike a 401 Unauthorized response, authenticating will make no difference. <a href="http://en.wikipedia.org/wiki/List_of_HTTP_status_codes">See more</a> status codes.</p>');
		res.write('<p><a href="">Reload</a>, <a href="javascript:history.go(-1)">go back</a>, or <a href="mailto:problem@brianjblair.com">contact us</a>.</p>');
		respondPageFooter(res);
	}, {}, 403)
};
errors[404] = function(req, res) {
	respondPage('404 | DevDoodle', req, res, function() {
		res.write('<h1>Error 404 :(</h1>');
		res.write('<p>The requested file or directory could not be found. If you got here from a broken link, please <a href="mailto:problem@brianjblair.com">let us know</a>.</p>');
		res.write('<h2>Why am I seeing this?</h2>');
		res.write('<p>The requested resource could not be found but may be available again in the future. Subsequent requests by the client are permissible. <a href="http://en.wikipedia.org/wiki/List_of_HTTP_status_codes">See more</a> status codes.</p>');
		res.write('<p><a href="">Reload</a>, <a href="javascript:history.go(-1)">go back</a>, or <a href="mailto:problem@brianjblair.com">contact us</a>.</p>');
		respondPageFooter(res);
	}, {}, 404)
};
errors[405] = function(req, res) {
	respondPage('405 | DevDoodle', req, res, function() {
		res.write('<h1>Error 405 :(</h1>');
		res.write('<p>Method not allowed.</p>');
		res.write('<h2>Why am I seeing this?</h2>');
		res.write('<p>A request was made of a resource using a request method not supported by that resource; for example, using GET on a form which requires data to be presented via POST, or using PUT on a read-only resource. <a href="http://en.wikipedia.org/wiki/List_of_HTTP_status_codes">See more</a> status codes.</p>');
		res.write('<p><a href="">Reload</a>, <a href="javascript:history.go(-1)">go back</a>, or <a href="mailto:problem@brianjblair.com">contact us</a>.</p>');
		respondPageFooter(res);
	}, {}, 405)
};
errors[413] = function(req, res) {
	respondPage('413 | DevDoodle', req, res, function() {
		res.write('<h1>Error 413 :(</h1>');
		res.write('<p>Request entity too large.</p>');
		res.write('<h2>Why am I seeing this?</h2>');
		res.write('<p>The request is larger than the server is willing or able to process. <a href="http://en.wikipedia.org/wiki/List_of_HTTP_status_codes">See more</a> status codes.</p>');
		res.write('<p><a href="">Reload</a>, <a href="javascript:history.go(-1)">go back</a>, or <a href="mailto:problem@brianjblair.com">contact us</a>.</p>');
		respondPageFooter(res);
	}, {}, 413)
};
errors[414] = function(req, res) {
	respondPage('414 | DevDoodle', req, res, function() {
		res.write('<h1>Error 414 :(</h1>');
		res.write('<p>Request URI too long.</p>');
		res.write('<h2>Why am I seeing this?</h2>');
		res.write('<p>The URI provided was too long for the server to process. Often the result of too much data being encoded as a query-string of a GET request, in which case it should be converted to a POST request.</p> <a href="http://en.wikipedia.org/wiki/List_of_HTTP_status_codes">See more</a> status codes.</p>');
		res.write('<p><a href="">Reload</a>, <a href="javascript:history.go(-1)">go back</a>, or <a href="mailto:problem@brianjblair.com">contact us</a>.</p>');
		respondPageFooter(res);
	}, {}, 414)
};
errors[415] = function(req, res) {
	respondPage('415 | DevDoodle', req, res, function() {
		res.write('<h1>Error 415 :(</h1>');
		res.write('<p>Unsupported media type.</p>');
		res.write('<h2>Why am I seeing this?</h2>');
		res.write('<p>The request entity has a media type which the server or resource does not support. For example, the client uploads an image as image/svg+xml, but the server requires that images use a different format. <a href="http://en.wikipedia.org/wiki/List_of_HTTP_status_codes">See more</a> status codes.</p>');
		res.write('<p><a href="">Reload</a>, <a href="javascript:history.go(-1)">go back</a>, or <a href="mailto:problem@brianjblair.com">contact us</a>.</p>');
		respondPageFooter(res);
	}, {}, 415)
};
errors[418] = function(req, res) {
	respondPage('418 | DevDoodle', req, res, function() {
		res.write('<h1>Error 418 :(</h1>');
		res.write('<p>I\'m a little teapot, short and stout.</p>');
		res.write('<h2>Why am I seeing this?</h2>');
		res.write('<p>This code was defined in 1998 as one of the traditional IETF April Fools\' jokes, in RFC 2324, Hyper Text Coffee Pot Control Protocol, and is not expected to be implemented by actual HTTP servers. <a href="http://en.wikipedia.org/wiki/List_of_HTTP_status_codes">See more</a> status codes.</p>');
		res.write('<p><a href="">Reload</a>, <a href="javascript:history.go(-1)">go back</a>, or <a href="mailto:problem@brianjblair.com">contact us</a>.</p>');
		respondPageFooter(res);
	}, {}, 418)
};
errors[429] = function(req, res) {
	respondPage('429 | DevDoodle', req, res, function() {
		res.write('<h1>Error 429 :(</h1>');
		res.write('<p>Too many requests.</p>');
		res.write('<h2>Why am I seeing this?</h2>');
		res.write('<p>The user has sent too many requests in a given amount of time. <a href="http://en.wikipedia.org/wiki/List_of_HTTP_status_codes">See more</a> status codes.</p>');
		res.write('<p><a href="">Reload</a>, <a href="javascript:history.go(-1)">go back</a>, or <a href="mailto:problem@brianjblair.com">contact us</a>.</p>');
		respondPageFooter(res);
	}, {}, 429)
};
errors[431] = function(req, res) {
	respondPage('431 | DevDoodle', req, res, function() {
		res.write('<h1>Error 431 :(</h1>');
		res.write('<p>Request header fields too large.</p>');
		res.write('<h2>Why am I seeing this?</h2>');
		res.write('<p>The server is unwilling to process the request because either an individual header field, or all the header fields collectively, are too large. <a href="http://en.wikipedia.org/wiki/List_of_HTTP_status_codes">See more</a> status codes.</p>');
		res.write('<p><a href="">Reload</a>, <a href="javascript:history.go(-1)">go back</a>, or <a href="mailto:problem@brianjblair.com">contact us</a>.</p>');
		respondPageFooter(res);
	}, {}, 431)
};
errors[500] = function(req, res) {
	respondPage('500 | DevDoodle', req, res, function() {
		res.write('<h1>Error 500 :(</h1>');
		res.write('<p>Internal server error.</p>');
		res.write('<h2>Why am I seeing this?</h2>');
		res.write('<p>An unexpected condition was encountered. <a href="http://en.wikipedia.org/wiki/List_of_HTTP_status_codes">See more</a> status codes.</p>');
		res.write('<p><a href="">Reload</a>, <a href="javascript:history.go(-1)">go back</a>, or <a href="mailto:problem@brianjblair.com">contact us</a>.</p>');
		respondPageFooter(res);
	}, {}, 500)
};
errors[505] = function(req, res) {
	respondPage('505 | DevDoodle', req, res, function() {
		res.write('<h1>Error 505 :(</h1>');
		res.write('<p>HTTP version not supported.</p>');
		res.write('<h2>Why am I seeing this?</h2>');
		res.write('<p>The server does not support the HTTP protocol version used in the request. <a href="http://en.wikipedia.org/wiki/List_of_HTTP_status_codes">See more</a> status codes.</p>');
		res.write('<p><a href="">Reload</a>, <a href="javascript:history.go(-1)">go back</a>, or <a href="mailto:problem@brianjblair.com">contact us</a>.</p>');
		respondPageFooter(res);
	}, {}, 505)
};
errors[521] = function(req, res) {
	respondPage('521 | DevDoodle', req, res, function() {
		res.write('<h1>Error 521 :(</h1>');
		res.write('<p>Web server is down.</p>');
		res.write('<h2>Why am I seeing this?</h2>');
		res.write('<p>The origin webserver refused the connection. <a href="http://en.wikipedia.org/wiki/List_of_HTTP_status_codes">See more</a> status codes.</p>');
		res.write('<p><a href="">Reload</a>, <a href="javascript:history.go(-1)">go back</a>, or <a href="mailto:problem@brianjblair.com">contact us</a>.</p>');
		respondPageFooter(res);
	}, {}, 521)
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
	var inhead = header.inhead;
	var huser = header.user;
	delete header.inhead;
	delete header.user;
	if (!header['Content-Type']) header['Content-Type'] = 'application/xhtml+xml';
	res.writeHead(status || 200, header);
	fs.readFile('a/head.html', function(err, data) {
		if (err) throw err;
		collections.users.findOne({cookie: cookies.id}, function(err, user) {
			data = data.toString();
			if (user = user || huser) {
				data = data.replace('<a href="/login/">Login</a>', linkUser(user.name));
			}
			res.write(data.replace('$title', title).replace('$search', query.q || '').replace('$inhead', inhead));
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
								html: '<h1>Welcome to DevDoodle!</h1><p>An account on <a href="http://devdoodle.net/">DevDoodle</a> has been made for this email address. Confirm your account creation <a href="http://devdoodle.net/login/confirm/'+rstr+'">here</a>.</p>'
							});
							respondPage('Account Created | DevDoodle', req, res, function() {
								res.write('An account for you has been created. To activate it, click the link in the email sent to you.');
								respondPageFooter(res);
							});
							
						});
					}
				} else {
					var pass = new Buffer(crypto.pbkdf2Sync(post.pass, 'KJ:C5A;_\?F!00S\(4S[T-3X!#NCZI;A', 1e5, 128)).toString('base64');
					collections.users.findOne({name: post.name, pass: pass, confirm: undefined}, function(err, user) {
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
				collections.users.update({name: user.name}, {$unset: {confirm: ''}});
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
			collections.users.find({}, function(err, docs) {
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
				respondPageFooter(res);
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
				respondPageFooter(res);
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
				}, {inhead: '<link rel="stylesheet" href="/learn/course.css" />'});
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

var chatWS = new ws.Server({host: 'localhost', port: 8125});

chatWS.on('connection', function(tws) {
	var cursor = collections.chat.find();
	cursor.count(function(err, count) {
		cursor.skip(count - 92).each(function(err, doc) {
			if (err) throw err;
			if (!doc) return;
			tws.send(JSON.stringify({event: 'init', body: doc.body, user: doc.user, time: doc.time}));
		});
	});
	collections.users.findOne({cookie: decodeURIComponent(!tws.upgradeReq.headers.cookie || tws.upgradeReq.headers.cookie.replace(/(?:(?:^|.*;\s*)id\s*\=\s*([^;]*).*$)|^.*$/, '$1')) || null}, function(err, user) {
		if (err) throw err;
		if (!user) user = {};
		collections.chatusers.remove({name: user.name}, {w: 1}, function(err, rem) {
			if (err) throw err;
			console.log(rem);
			collections.chatusers.find().each(function(err, doc) {
				if (err) throw err;
				if (doc) {
					tws.send(JSON.stringify({event: 'adduser', name: doc.name}));
				} else if (user.name) {
					if (rem) {
						tws.send(JSON.stringify({event: 'adduser', name: user.name}));
					} else {
						for (var i in chatWS.clients)
							chatWS.clients[i].send(JSON.stringify({event: 'adduser', name: user.name}));
					}
					collections.chatusers.insert({name: user.name, seen: new Date().getTime()});
					console.log({name: user.name, seen: new Date().getTime()});
				}
			});
		});
	});
	tws.on('message', function(message) {
		console.log(message);
		try {
			message = JSON.parse(message);
			collections.users.findOne({cookie: message.idcookie}, function(err, user) {
				if (err) throw err;
				if (!user) user = {};
				if (message.event == 'post') {
					if (user.name) {
						collections.chat.insert({body: message.body, name: user.name, time: new Date().getTime()});
						for (var i in chatWS.clients)
							chatWS.clients[i].send(JSON.stringify({event: 'add', body: message.body, user: user.name}));
					} else tws.send('{"event":"err","body":"You must be logged in to post on chat."}');
				} else if (message.event == 'update') {
					collections.chatusers.update({name: user.name}, {$set: {state: message.state, seen: new Date().getTime()}}, function(err, result) {
						if (err) throw err;
						collections.chatusers.find({seen: {$lt: new Date().getTime() - 20000}}).each(function(err, doc) {
							if (err) throw err;
							if (!doc) return;
							console.log('325' + JSON.stringify(doc));
							for (var i in chatWS.clients)
								chatWS.clients[i].send(JSON.stringify({event: 'deluser', name: doc.name}));
						});
					});
				} else {
					tws.send('{"event":"err","body":"Unsupported or missing event type."}');
				}
			});
		} catch(e) {
			tws.send('{"event":"err","body":"JSON Error."}');
		}
	});
});