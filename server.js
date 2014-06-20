'use strict';

String.prototype.replaceAll = function(find, replace) {
	if (typeof find == 'string') return this.split(find).join(replace);
	var t = this, i, j;
	while (typeof(i = find.shift()) == 'string' && typeof(j = replace.shift()) == 'string') t = t.replaceAll(i || '', j || '');
	return t;
};
String.prototype.repeat = function(num) {
	return new Array(++num).join(this);
};
Number.prototype.bound = function(l, h) {
	return isNaN(h) ? Math.min(this, l) : Math.max(Math.min(this,h),l);
};

function html(input, type) {
	input = input.toString().replaceAll(['<', '>', '"', '&'],['&lt;', '&gt;', '&lt;', '&amp;']);
	return type == 'attr' ? input.replaceAll('"', '&quot;') : input;
};

var site = {};

site.name = 'DevDoodle';

site.titles = {
	learn: 'Courses',
	dev: 'Programs',
	qa: 'Q&amp;A',
	chat: 'Chat',
	mod: 'Moderation'
};

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
var db = new mongo.Db('DevDoodle', new mongo.Server("localhost", 27017, {
	auto_reconnect: false,
	poolSize: 4
}), {
	w: 0,
	native_parser: false
});

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
		db.collection('chatrooms', function(err, collection) {
			if (err) throw err;
			collections.chatrooms = collection;
		});
		db.collection('programs', function(err, collection) {
			if (err) throw err;
			collections.programs = collection;
		});
	});
});

var errors = [];
errors[400] = function(req, res) {
	respondPage('400', req, res, function() {
		res.write('<h1>Error 400 :(</h1>');
		res.write('<p>Your request was corrupted, <a href="">try again</a>. If the problem persists, please <a href="mailto:support@devdoodle.net">let us know</a>.</p>');
		res.write('<p><a href="">Reload</a>, <a href="javascript:history.go(-1)">go back</a>.</p>');
		respondPageFooter(res);
	}, {}, 400);
};
errors[403] = function(req, res) {
	respondPage('403', req, res, function() {
		res.write('<h1>Error 403</h1>');
		res.write('<p>Permission denied. If you think this is a mistake, please <a href="mailto:support@devdoodle.net">let us know</a>.</p>');
		res.write('<p><a href="javascript:history.go(-1)">Go back</a>.</p>');
		respondPageFooter(res);
	}, {}, 403);
};
errors[404] = function(req, res) {
	respondPage('404', req, res, function() {
		res.write('<h1>Error 404 :(</h1>');
		res.write('<p>The requested file could not be found. If you found a broken link, please <a href="mailto:support@devdoodle.net">let us know</a>.</p>');
		res.write('<p><a href="javascript:history.go(-1)">Go back</a>, <a href="/search/?q=' + encodeURIComponent(req.url.pathname.replaceAll('/', ' ')) + '">Search</a>.</p>');
		respondPageFooter(res);
	}, {}, 404);
};
errors[405] = function(req, res) {
	respondPage('405', req, res, function() {
		res.write('<h1>Error 405</h1>');
		res.write('<p>Method not allowed.</p>');
		res.write('<p><a href="javascript:history.go(-1)">Go back</a>.</p>');
		respondPageFooter(res);
	}, {}, 405);
};
errors[413] = function(req, res) {
	respondPage('413', req, res, function() {
		res.write('<h1>Error 413</h1>');
		res.write('<p>Request entity too large.</p>');
		res.write('<p><a href="javascript:history.go(-1)">Go back</a>.</p>');
		respondPageFooter(res);
	}, {}, 413);
};
errors[414] = function(req, res) {
	respondPage('414', req, res, function() {
		res.write('<h1>Error 414</h1>');
		res.write('<p>Request URI too long.</p>');
		res.write('<p><a href="javascript:history.go(-1)">Go back</a>.</p>');
		respondPageFooter(res);
	}, {}, 414);
};
errors[415] = function(req, res) {
	respondPage('415', req, res, function() {
		res.write('<h1>Error 415</h1>');
		res.write('<p>Unsupported media type. If you think this is a mistake, please <a href="mailto:support@devdoodle.net">let us know</a>.</p>');
		res.write('<p><a href="javascript:history.go(-1)">Go back</a>.</p>');
		respondPageFooter(res);
	}, {}, 415);
};
errors[418] = function(req, res) {
	respondPage('418', req, res, function() {
		res.write('<h1>418!</h1>');
		res.write('<p>I\'m a little teapot, short and stout.</p>');
		respondPageFooter(res);
	}, {}, 418);
};
errors[429] = function(req, res) {
	respondPage('429', req, res, function() {
		res.write('<h1>Error 429</h1>');
		res.write('<p>Too many requests.</p>');
		res.write('<p>Wait, then <a href="">Reload</a>.</p>');
		respondPageFooter(res);
	}, {}, 429);
};
errors[431] = function(req, res) {
	respondPage('431', req, res, function() {
		res.write('<h1>Error 431</h1>');
		res.write('<p>Request header fields too large.</p>');
		res.write('<p><a href="javascript:history.go(-1)">Go back</a>.</p>');
		respondPageFooter(res);
	}, {}, 431);
};
errors[500] = function(req, res) {
	respondPage('500', req, res, function() {
		res.write('<h1>Error 500 :(</h1>');
		res.write('<p>Internal server error. This will be automatically reported.</p>');
		res.write('<p><a href="">Reload</a>, <a href="javascript:history.go(-1)">go back</a>.</p>');
		respondPageFooter(res);
	}, {}, 500);
};
errors[505] = function(req, res) {
	respondPage('505', req, res, function() {
		res.write('<h1>Error 505</h1>');
		res.write('<p>HTTP version not supported.</p>');
		res.write('<p><a href="">Reload</a>, <a href="javascript:history.go(-1)">go back</a>.</p>');
		respondPageFooter(res);
	}, {}, 505);
};
errors[521] = function(req, res) {
	respondPage('521 | DevDoodle', req, res, function() {
		res.write('<h1>Error 521 :(</h1>');
		res.write('<p>We\'re down. We should be up soon!</p>');
		res.write('<p><a href="">Reload</a>.</p>');
		respondPageFooter(res);
	}, {}, 521);
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
	return '<a href="/user/' + name + '">' + name + '</a>';
};

function respondPage(title, req, res, callback, header, status) {
	var query = req.url.query,
		cookies = cookie.parse(req.headers.cookie || '');
	if (!header) header = {};
	var inhead = header.inhead;
	var huser = header.user;
	delete header.inhead;
	delete header.user;
	if (!header['Content-Type']) header['Content-Type'] = 'application/xhtml+xml';
	res.writeHead(status || 200, header);
	fs.readFile('a/head.html', function(err, data) {
		if (err) throw err;
		collections.users.findOne({
			cookie: cookies.id
		}, function(err, user) {
			if (err) throw err;
			data = data.toString();
			if (user = huser || user) data = data.replace('<a href="/login/">Login</a>', linkUser(user.name));
			var dirs = req.url.pathname.split('/');
			res.write(data.replace('$title', (title ? title + ' | ' : '') + (site.titles[dirs[1]] ? site.titles[dirs[1]] + ' | ' : '') + site.name).replaceAll('"' + req.url.pathname + '"', '"' + req.url.pathname + '" class="active"').replace('"/' + dirs[1]+ '/"', '"/' + dirs[1]+ '/" class="active"').replace('"/' + dirs[1] + '/' + dirs[2] + '/"', '"/' + dirs[1] + '/' + dirs[2] + '/" class="active"').replaceAll('class="active" class="active"','class="active"').replace('$search', html(query.q || '')).replace('$inhead', inhead));
			callback(user);
		});
	});
};

function respondPageFooter(res) {
	fs.readFile('a/foot.html', function(err, data) {
		if (err) throw err;
		res.end(data);
	});
};

function errorsHTML(errs) {
	return errs.length ? (errs.length == 1 ? '<div class="error">' + errs[0] + '</div>\n' : '<div class="error">\n\t<ul>\n\t\t<li>' + errs.join('</li>\n\t\t<li>') + '</li>\n\t</ul>\n</div>\n') : '';
}

function respondLoginPage(errs, req, res, post) {
	respondPage('Login', req, res, function() {
		res.write('<h1>Log in</h1>\n');
		res.write(errorsHTML(errs));
		res.write('<form method="post">');
		res.write('<input type="checkbox" name="create" id="create" onchange="document.getElementById(\'ccreate\').hidden ^= 1"' + (post.create ? ' checked=""' : '') + ' /> <label for="create">Create an account</label>\n');
		res.write('<input type="text" name="name" placeholder="Name" required="" />\n');
		res.write('<input type="password" name="pass" placeholder="Password" required="" />\n');
		res.write('<div id="ccreate" ' + (post.create ? '' : 'hidden="" ') + '>\n');
		res.write('<input type="password" name="passc" placeholder="Confirm Password" />\n');
		res.write('<input type="text" name="email" placeholder="Email" />\n');
		res.write('</div>\n');
		res.write('<button type="submit">Submit</button>\n');
		res.write('</form>\n');
		res.write('<style>\n');
		res.write('#content input[type=text], button { display: block }\n');
		res.write('</style>');
		respondPageFooter(res);
	});
};

function respondCreateRoomPage(errs, req, res, post) {
	respondPage('Create Room', req, res, function() {
		res.write('<h1>Create Room</h1>\n');
		res.write(errorsHTML(errs));
		res.write('<form method="post">\n');
		res.write('<div>Name: <input type="text" name="name" required="" /></div>\n');
		res.write('<div>Description: <textarea name="desc" required="" rows="3" cols="80"></textarea></div>\n');
		res.write('<div>Type: <select name="type">\n');
		res.write('\t<option value="P">Public</option>\n');
		res.write('\t<option value="R">Read-only</option>\n');
		res.write('\t<option value="N">Private</option>\n');
		res.write('\t<option value="M">♦ only</option>\n');
		res.write('</select>\n');
		res.write('</div>\n');
		res.write('<button type="submit">Submit</button>\n');
		res.write('</form>\n');
		respondPageFooter(res);
	});
};

http.createServer(function(req, res) {
	console.log('Req ' + req.url);
	req.url = url.parse(req.url, true);
	var i;
	if (req.url.pathname == '/') {
		respondPage(null, req, res, function() {
			res.write('Hi');
			respondPageFooter(res);
		});
	} else if (req.url.pathname == '/login/') {
		if (req.method == 'POST') {
			var post = '';
			req.on('data', function(data) {
				post += data;
			});
			req.on('end', function() {
				post = querystring.parse(post);
				if (post.create) {
					if (!post.name || !post.pass || !post.passc || !post.email) {
						respondLoginPage(['All fields are required.'], req, res, post);
					} else if (post.pass != post.passc) {
						respondLoginPage(['Passwords don\'t match.'], req, res, post);
					} else {
						crypto.pbkdf2(post.pass, 'KJ:C5A;_\?F!00S\(4S[T-3X!#NCZI;A', 1e5, 128, function(err, key) {
							var pass = new Buffer(key).toString('base64'),
								rstr = crypto.randomBytes(128).toString('base64');
							collections.users.insert({
								name: post.name,
								pass: pass,
								email: post.email,
								confirm: rstr,
								rep: 0,
								level: 0
							});
							transport.sendMail({
								from: 'DevDoodle <support@devdoodle.net>',
								to: post.email,
								subject: 'Confirm your account',
								html: '<h1>Welcome to DevDoodle!</h1><p>An account on <a href="http://devdoodle.net/">DevDoodle</a> has been made for this email address. Confirm your account creation <a href="http://devdoodle.net/login/confirm/' + rstr + '">here</a>.</p>'
							});
							respondPage('Account Created', req, res, function() {
								res.write('An account for you has been created. To activate it, click the link in the email sent to you.');
								respondPageFooter(res);
							});

						});
					}
				} else {
					var pass = new Buffer(crypto.pbkdf2Sync(post.pass, 'KJ:C5A;_\?F!00S\(4S[T-3X!#NCZI;A', 1e5, 128)).toString('base64');
					collections.users.findOne({
						name: post.name,
						pass: pass,
						confirm: undefined
					}, function(err, user) {
						if (err) throw err;
						if (user) {
							var rstr = crypto.randomBytes(128).toString('base64');
							respondPage('Login Success', req, res, function() {
								res.write('Welcome back, ' + user.name + '. You have ' + user.rep + ' repuatation.');
								respondPageFooter(res);
							}, {
								'Set-Cookie': cookie.serialize('id', rstr, {
									path: '/',
									expires: new Date(new Date().setDate(new Date().getDate() + 30))
								}),
								user: user
							});
							collections.users.update({
								name: user.name
							}, {
								$set: {
									cookie: rstr
								}
							});
						} else {
							respondLoginPage(['Invalid Credentials.'], req, res, post);
						}
					});
				}
			});
		} else {
			respondLoginPage([], req, res, {});
		}
	} else if (i = req.url.pathname.match(/^\/login\/confirm\/([A-Za-z\d+\/=]{172})$/)) {
		collections.users.findOne({
			confirm: i[1]
		}, function(err, user) {
			if (err) throw err;
			if (user) {
				collections.users.update({
					name: user.name
				}, {
					$unset: {
						confirm: ''
					}
				});
				respondPage('Account confirmed', req, res, function() {
					res.write('<h1>Account confirmed</h1><p>You may <a href="/login/">log in</a> now.</p>');
					respondPageFooter(res);
				});
			} else {
				respondPage('Account confirmation failed', req, res, function() {
					res.write('<h1>Account confirmation failed</h1><p>Your token is invalid.</p>');
					respondPageFooter(res);
				});
			}
		});
	} else if (req.url.pathname == '/user/') {
		respondPage('Users', req, res, function() {
			res.write('<table><tbody>');
			collections.users.find().each(function(err, doc) {
				if (err) throw err;
				if (doc) {
					res.write('<tr>');
					res.write('<td>' + doc.name + '</td>');
					res.write('<td>' + doc.rep + '</td>');
					res.write('</tr>');
				} else {
					res.write('</tbody></table>');
					respondPageFooter(res);
				}
			});
		});
	} else if (req.url.pathname == '/chat/') {
		respondPage('Chat', req, res, function() {
			res.write('<h1>Chat Rooms</h1>');
			collections.chatrooms.find().each(function(err, doc) {
				if (err) throw err;
				if (doc) {
					res.write('<h2 class="title"><a href="' + doc._id + '">' + doc.name + '</a></h2>\n');
					res.write('<p>' + doc.desc + '</p>\n');
				} else {
					res.write('<hr />\n');
					res.write('<a href="newroom" class="small">Create Room</a>');
					respondPageFooter(res);
				}
			});
			respondPageFooter(res);
		});
	} else if (req.url.pathname == '/chat/newroom') {
		if (req.method == 'POST') {
			var post = '';
			req.on('data', function(data) {
				post += data;
			});
			req.on('end', function() {
				post = querystring.parse(post);
				var errors = [];
				if (!post.name || post.name.length < 4) errors.push('Name must be at least 4 chars long.');
				if (!post.desc || post.desc.length < 16) errors.push('Description must be at least 16 chars long.');
				if (errors.length) {
					respondCreateRoomPage(errors, req, res, {});
				} else {
					collections.chatrooms.find().sort({
						'_id': -1
					}).limit(1).next(function(err, last) {
						if (err) throw err;
						var i = last ? last._id + 1 : 1;
						collections.chatrooms.insert({
							name: post.name,
							desc: post.desc,
							type: post.type,
							_id: i
						});
						res.writeHead(302, {
							Location: i
						});
						res.end();
					});
				}
			});
		} else {
			respondCreateRoomPage([], req, res, {});
		}
	} else if (i = req.url.pathname.match(/^\/chat\/(\d+)/)) {
		collections.chatrooms.findOne({
			_id: parseInt(i[1])
		}, function(err, doc) {
			if (err) throw err;
			if (!doc) return errors[404](req, res);
			respondPage(doc.name, req, res, function() {
				fs.readFile('chat/room.html', function(err, data) {
					if (err) throw err;
					res.write(data.toString().replaceAll('$id', html(doc._id)).replaceAll('$name', html(doc.name)).replaceAll('$desc', html(doc.desc)));
					respondPageFooter(res);
				});
			});
		});
	} else if (req.url.pathname == '/dev/') {
		respondPage(null, req, res, function() {
			fs.readFile('dev/create.html', function(err, data) {
				if (err) throw err;
				res.write('<h1>Programs</h1>\n');
				collections.programs.find().sort({score: -1}).limit(15).each(function(err, data) {
					if (err) throw err;
					if (data) {
						res.write('<div class="program">\n');
						res.write('\t<h2 class="title"><a href="' + data._id + '">' + (data.name || 'Untitled') + '</a> <small>-<a href="/user/' + data.user + '">' + data.user + '</a></small></h2>\n');
						res.write('\t<div><iframe sandbox="allow-scripts allow-same-origin" srcdoc="&lt;!DOCTYPE html>&lt;html>&lt;head>&lt;title>Output frame&lt;/title>&lt;/head>&lt;style>*{margin:0;width:100%;}body{background:#000;color:#fff}#canvas{display:block;-webkit-user-select:none;-moz-user-select:none;cursor:default}#console{height:100px;background:#111;overflow:auto;margin-top:8px}#console:empty{display:none}&lt;/style>&lt;body>&lt;canvas id=&quot;canvas&quot;>&lt;/canvas>&lt;div id=&quot;console&quot;>&lt;/div>&lt;script src=&quot;/dev/canvas.js&quot;>&lt;/script>&lt;script>\'use strict\';try{this.eval(' + JSON.stringify(data.code).replaceAll('"', '&quot;') + ')}catch(e){error(e)}&lt;/script>&lt;/body>&lt;/html>"></iframe></div>\n');
						res.write('</div>\n');
					} else {
						res.write('<a href="list/" class="center-text blk">See more</a>\n');
						respondPageFooter(res);
					}
				});
			});
		});
	} else if (req.url.pathname == '/dev/list/') {
		respondPage('List', req, res, function() {
			res.write('<h1>Program list</h1>');
			respondPageFooter(res);
		});
	} else if (req.url.pathname == '/dev/new/') {
		respondPage('New', req, res, function() {
			fs.readFile('dev/new.html', function(err, data) {
				if (err) throw err;
				res.write(data);
				respondPageFooter(res);
			});
		});
	} else if (req.url.pathname == '/dev/new/canvas') {
		respondPage('Canvas.js Editor', req, res, function() {
			fs.readFile('dev/canvas.html', function(err, data) {
				if (err) throw err;
				res.write(data.toString().replaceAll(['$id', '$title', '$code'], ['', 'New Program', req.url.query ? (html(req.url.query.code || '')) : '']));
				respondPageFooter(res);
			});
		});
	} else if (req.url.pathname == '/dev/new/html') {
		respondPage('HTML Editor', req, res, function() {
			fs.readFile('dev/html.html', function(err, data) {
				if (err) throw err;
				res.write(data);
				respondPageFooter(res);
			});
		});
	} else if (i = req.url.pathname.match(/^\/dev\/(\d+)$/)) {
		collections.programs.findOne({_id: i = parseInt(i[1])}, function(err, program) {
			if (err) throw err;
			if (!program) return errors[404](req, res);
			respondPage(program.title || 'Untitled', req, res, function(user) {
				fs.readFile('dev/canvas.html', function(err, data) {
					if (err) throw err;
					res.write(data.toString().replaceAll(['$id', '$title', '$code', 'Save</a>'], [program._id.toString(), program.title || 'Untitled', html(program.code), 'Save</a>' + (program.user == (user || {}).name ? ' <line /> <a id="fork">Fork</a>' : '')]));
					respondPageFooter(res);
				});
			});
		});
	} else if (req.url.pathname == '/dev/docs/') {
		respondPage('New', req, res, function() {
			fs.readFile('dev/docs.html', function(err, data) {
				if (err) throw err;
				res.write(data);
				respondPageFooter(res);
			});
		});
	} else if (req.url.pathname == '/learn/') {
		respondPage(null, req, res, function() {
			fs.readFile('learn/learn.html', function(err, data) {
				if (err) throw err;
				res.write(data);
				respondPageFooter(res);
			});
		});
	} else if (req.url.pathname == '/learn/web/') {
		respondPage('Web Courses', req, res, function() {
			fs.readFile('learn/web/web.html', function(err, data) {
				if (err) throw err;
				res.write(data);
				respondPageFooter(res);
			});
		});
	} else if (req.url.pathname.match(/^\/learn\/[\w-]+\/[\w-]+\/$/)) {
		res.writeHead(302, {
			Location: '1/'
		});
		res.end();
	} else if (i = req.url.pathname.match(/^\/learn\/([\w-]+)\/([\w-]+)\/(\d+)\/$/)) {
		var loc = './learn/' + [i[1], i[2], i[3]].join('/') + '.html';
		fs.readFile(loc, function(err, data) {
			if (err) errors[404](req, res);
			else {
				data = data.toString();
				respondPage(data.substr(0, data.indexOf('\n')), req, res, function() {
					res.write(data.substr(data.indexOf('\n') + 1));
					respondPageFooter(res);
				}, {
					inhead: '<link rel="stylesheet" href="/learn/course.css" />'
				});
			}
		});
	} else if (req.url.pathname == '/api/program/save') {
		if (req.method == 'POST') {
			var post = '';
			req.on('data', function(data) {
				post += data;
			});
			req.on('end', function() {
				post = querystring.parse(post);
				var type = parseInt(req.url.query.type);
				if (type !== 1 && type !== 2) return res.end('Error: Invalid program type'); 
				collections.users.findOne({
					cookie: cookie.parse(req.headers.cookie || '').id
				}, function(err, user) {
					if (err) throw err;
					if (!user) return res.end('Error: You must be logged in to save a program.');
					var i = url.parse(req.headers.referer || '').pathname.match(/^\/dev\/(\d+)/),
						id = i ? parseInt(i[1]) : 0;
					collections.programs.findOne({_id: id}, function(err, program) {
						if (err) throw err;
						if (id && !req.url.query.fork && program && program.user.toString() == user.name.toString()) {
							collections.programs.update({_id: id}, {$set: {code: post.code}});
							res.end('Success');
						} else {
							collections.programs.find().sort({
								'_id': -1
							}).limit(1).next(function(err, last) {
								if (err) throw err;
								var i = last ? last._id + 1 : 1;
								collections.programs.insert({
									type: req.url.query.type,
									code: post.code,
									user: user.name,
									_id: i
								});
								res.end('Location: /dev/' + i);
							});
						}
					});
				});
			});
		} else errors[405](req, res);
	} else {
		fs.stat('.' + req.url.pathname, function(err, stats) {
			if (err) {
				errors[404](req, res)
			} else {
				res.writeHead(200, {
					'Content-Type': mime[path.extname(req.url.pathname)] || 'text/plain',
					'Cache-Control': 'max-age=6012800, public',
					'Content-Length': stats.size
				});
				fs.readFile('.' + req.url.pathname, function(err, data) {
					if (err) {
						errors[404](req, res)
					} else {
						res.end(data);
					}
				});
			}
		});
	}
}).listen(8124);
console.log('Server running at http://localhost:8124/');

var chatWS = new ws.Server({
	host: 'localhost',
	port: 8125
});

chatWS.on('connection', function(tws) {
	var i;
	if ((i = tws.upgradeReq.url.match(/\/chat\/(\d+)/))) {
		if (isNaN(tws.room = parseInt(i[1]))) return;
		var cursor = collections.chat.find({
			room: tws.room
		});
		cursor.count(function(err, count) {
			if (err) throw err;
			var i = tws.upgradeReq.url.match(/\/chat\/(\d+)(\/(\d+))?/)[3] - 2 || Infinity;
			var skip = Math.max(0, Math.min(count - 92, i));
			tws.send(JSON.stringify({
				event: 'info-skipped',
				body: skip,
				ts: skip == i
			}));
			i = 0;
			cursor.skip(skip).limit(92).each(function(err, doc) {
				if (err) throw err;
				if (!doc) return tws.send(JSON.stringify({
					event: 'info-complete'
				}));
				i++;
				tws.send(JSON.stringify({
					event: 'init',
					body: doc.body,
					user: doc.user,
					time: doc.time,
					num: skip + i
				}));
			});
		});
		collections.users.findOne({
			cookie: decodeURIComponent(!tws.upgradeReq.headers.cookie || tws.upgradeReq.headers.cookie.replace(/(?:(?:^|.*;\s*)id\s*\=\s*([^;]*).*$)|^.*$/, '$1'))
		}, function(err, user) {
			if (err) throw err;
			if (!user) user = {};
			collections.chatusers.remove({
				name: user.name,
				room: tws.room
			}, {
				w: 1
			}, function(err, rem) {
				if (err) throw err;
				collections.chatusers.find({
					room: tws.room
				}).each(function(err, doc) {
					if (err) throw err;
					if (doc) {
						tws.send(JSON.stringify({
							event: 'adduser',
							name: doc.name
						}));
					} else if (user.name) {
						if (rem) {
							tws.send(JSON.stringify({
								event: 'adduser',
								name: user.name
							}));
						} else {
							for (var i in chatWS.clients)
								if (chatWS.clients[i].room == tws.room) chatWS.clients[i].send(JSON.stringify({
									event: 'adduser',
									name: user.name
								}));
						}
						collections.chatusers.insert({
							name: user.name,
							room: tws.room
						});
					}
				});
			});
		});
		tws.on('message', function(message) {
			console.log(message);
			try {
				message = JSON.parse(message);
			} catch (e) {
				return tws.send(JSON.stringify({
					event: 'err',
					body: 'JSON error.'
				}));
			}
			collections.users.findOne({
				cookie: decodeURIComponent(!tws.upgradeReq.headers.cookie || tws.upgradeReq.headers.cookie.replace(/(?:(?:^|.*;\s*)id\s*\=\s*([^;]*).*$)|^.*$/, '$1'))
			}, function(err, user) {
				if (err) throw err;
				if (!user) user = {};
				if (message.event == 'post') {
					if (user.name) {
						collections.chat.insert({
							body: message.body,
							user: user.name,
							time: new Date().getTime(),
							room: tws.room
						});
						for (var i in chatWS.clients)
							if (chatWS.clients[i].room == tws.room) chatWS.clients[i].send(JSON.stringify({
								event: 'add',
								body: message.body,
								user: user.name
							}));
					} else tws.send(JSON.stringify({
						event: 'err',
						body: 'You must be logged in to post on chat.'
					}));
				} else if (message.event == 'update') {
					if (user.name) {
						collections.chatusers.update({
							name: user.name,
							room: tws.room
						}, {
							$set: {
								state: message.state
							}
						});
						for (var i in chatWS.clients)
							if (chatWS.clients[i].room == tws.room) chatWS.clients[i].send(JSON.stringify({
								event: 'statechange',
								state: message.state,
								user: user.name
							}));
					}
				} else if (message.event == 'req') {
					if (isNaN(message.skip) || message.skip < 0) return tws.send(JSON.stringify({
						event: 'err',
						body: 'Could not fetch posts.'
					}));
					var cursor = collections.chat.find({
						room: tws.room
					});
					cursor.count(function(err, count) {
						if (err) throw err;
						var i = 0;
						var num = message.skip - message.to || 1;
						cursor.sort({
							$natural: -1
						}).skip(count - message.skip - 1).limit(num).each(function(err, doc) {
							if (err) throw err;
							if (!doc) return;
							i++;
							tws.send(JSON.stringify({
								event: 'init',
								body: doc.body,
								user: doc.user,
								time: doc.time,
								num: message.skip - i,
								before: true
							}));
						});
					});
				} else if (message.event == 'info-update') {
					if (user.name) {
						collections.chatrooms.update({
							_id: tws.room
						}, {
							$set: {
								name: message.name,
								desc: message.desc
							}
						});
						collections.chat.insert({
							body: 'Room description updated to '+message.name+': '+message.desc,
							user: 'Bot',
							time: new Date().getTime(),
							room: tws.room
						});
						for (var i in chatWS.clients)
							if (chatWS.clients[i].room == tws.room) chatWS.clients[i].send(JSON.stringify({
								event: 'info-update',
								name: message.name,
								desc: message.desc,
							}));
					} else tws.send(JSON.stringify({
						event: 'err',
						body: 'You must be logged in to edit room information.'
					}));
				} else {
					tws.send(JSON.stringify({
						event: 'err',
						body: 'Invalid event type.'
					}));
				}
			});
		});
		tws.on('close', function() {
			collections.users.findOne({
				cookie: decodeURIComponent(!tws.upgradeReq.headers.cookie || tws.upgradeReq.headers.cookie.replace(/(?:(?:^|.*;\s*)id\s*\=\s*([^;]*).*$)|^.*$/, '$1'))
			}, function(err, user) {
				if (err) throw err;
				if (!user) return;
				for (var i in chatWS.clients)
					if (chatWS.clients[i].room == tws.room) chatWS.clients[i].send(JSON.stringify({
						event: 'deluser',
						name: user.name
					}));
				collections.chatusers.remove({
					name: user.name,
					room: tws.room
				});
			});
		});
	}
});