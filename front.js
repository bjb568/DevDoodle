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

var site = {
	name: 'DevDoodle',
	titles: {
		learn: 'Courses',
		dev: 'Programs',
		qa: 'Q&amp;A',
		chat: 'Chat',
		mod: 'Moderation'
	}
};

var http = require('http'),
	zlib = require('zlib'),
	fs = require('fs'),
	path = require('path'),
	url = require('url'),
	querystring = require('querystring'),
	cookie = require('cookie'),
	crypto = require('crypto'),
	essentials = require('./essentials.js'),
	html = essentials.html,
	markdownEscape = essentials.markdownEscape,
	inlineMarkdown = essentials.inlineMarkdown,
	markdown = essentials.markdown,
	errorPage = essentials.errorPage,
	nodemailer = require('nodemailer'),
	sendmailTransport = require('nodemailer-sendmail-transport'),
	transport = nodemailer.createTransport(sendmailTransport()),
	mongo = require('mongodb'),
	db = new mongo.Db('DevDoodle', new mongo.Server('localhost', 27017, {
		auto_reconnect: false,
		poolSize: 4
	}), {
		w: 0,
		native_parser: false
	}),
	dbcs = {},
	usedDBCs = ['users', 'questions', 'chat', 'chathistory', 'chatstars', 'chatusers', 'chatrooms', 'programs', 'comments', 'votes'];

db.open(function(err, db) {
	if (err) throw err;
	db.authenticate('DevDoodle', 'KnT$6D6hF35^75tNyu6t', function(err, result) {
		if (err) throw err;
		var i = usedDBCs.length;
		while (i--) {
			db.collection(usedDBCs[i], function(err, collection) {
				if (err) throw err;
				dbcs[usedDBCs[i]] = collection;
			});
		}
	});
});

var mime = {
	'.html': 'text/html',
	'.css': 'text/css',
	'.js': 'text/javascript',
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.mp3': 'audio/mpeg'
};

function respondPage(title, user, req, res, callback, header, status) {
	if (title) title = html(title);
	var query = req.url.query,
		cookies = cookie.parse(req.headers.cookie || '');
	if (!header) header = {};
	var inhead = header.inhead || '',
		huser = header.user,
		nonotif = header.nonotif,
		clean = header.clean;
	delete header.inhead;
	delete header.user;
	delete header.nonotif;
	delete header.clean;
	if (!header['Content-Type']) header['Content-Type'] = 'application/xhtml+xml';
	if (!header['Cache-Control']) header['Cache-Control'] = 'no-cache';
	if (user) {
		dbcs.users.update({name: user.name}, {$set: {seen: new Date().getTime()}});
		if (!header['Set-Cookie'] && new Date().getTime() - user.seen > 3600000) {
			var tokens = user.cookie,
				idToken = crypto.randomBytes(128).toString('base64');
			for (var i in tokens) {
				if (tokens[i].token == cookies.id) tokens[i].token = idToken;
			}
			dbcs.users.update({name: user.name}, {$set: {cookie: tokens}});
			header['Set-Cookie'] = cookie.serialize('id', idToken, {
				path: '/',
				expires: new Date(new Date().setDate(new Date().getDate() + 30))
			});
		}
	}
	res.writeHead(status || 200, header);
	fs.readFile('html/a/head.html', function(err, data) {
		if (err) throw err;
		data = data.toString();
		if (user = huser || user) data = data.replace('<a href="/login/">Login</a>', '<a$notifs href="/user/' + user.name + '">' + user.name + '</a>');
		var dirs = req.url.pathname.split('/');
		res.write(
			data.replace(
				'$title',
				(title ? title + ' | ' : '') + (site.titles[dirs[1]] ? site.titles[dirs[1]] + ' | ' : '') + site.name
			).replaceAll(
				'"' + req.url.pathname + '"',
				'"' + req.url.pathname + '" class="active"'
			).replace(
				'"/' + dirs[1]+ '/"',
				'"/' + dirs[1]+ '/" class="active"'
			).replace(
				'"/' + dirs[1] + '/' + dirs[2] + '/"',
				'"/' + dirs[1] + '/' + dirs[2] + '/" class="active"'
			).replaceAll(
				'class="active" class="active"',
				'class="active"'
			).replace(
				'$search',
				html(query.q || '')
			).replace(
				'$inhead',
				inhead
			).replace(
				'$notifs',
				(user && user.unread && !nonotif) ? ' class="unread"' : ''
			).replace(
				'<a href="/mod/">Mod</a>',
				user && user.level > 1 ? '<a href="/mod/">Mod</a>' : ''
			).replace('main.css', clean ? 'clean.css' : 'main.css')
		);
		callback();
	});
}

function respondPageFooter(res, aside) {
	fs.readFile('html/a/foot.html', function(err, data) {
		if (err) throw err;
		res.end(data.toString().replace('</div>', aside ? '</aside>' : '</div>'));
	});
}

function errorsHTML(errs) {
	return errs.length ? (errs.length == 1 ? '<div class="error">' + errs[0] + '</div>\n' : '<div class="error">\n\t<ul>\n\t\t<li>' + errs.join('</li>\n\t\t<li>') + '</li>\n\t</ul>\n</div>\n') : '';
}

function respondLoginPage(errs, user, req, res, post, fillm, filln, fpass) {
	respondPage('Login', user, req, res, function() {
		res.write('<h1>Log in</h1>\n');
		res.write(errorsHTML(errs));
		res.write('<form method="post">');
		res.write('<input type="checkbox" name="create" id="create"' + (post.create ? ' checked=""' : '') + ' /> <label for="create">Create an account</label>\n');
		res.write('<input type="text" name="name" placeholder="Name"' + (filln && post.name ? ' value="' + html(post.name) + '"' : '') + ' required="" maxlength="16"' + (fpass ? '' : ' autofocus=""') + ' />\n');
		res.write('<input type="password" name="pass" placeholder="Password" required=""' + (fpass ? ' autofocus=""' : '') + ' />\n');
		res.write('<div id="ccreate">\n');
		res.write('<input type="password" name="passc" placeholder="Confirm Password" />\n');
		res.write('<input type="text" name="mail" placeholder="Email"' + (fillm && post.mail ? ' value="' + html(post.mail) + '"' : '') + ' />\n');
		res.write('</div>\n');
		res.write('<input type="hidden" name="referer" value="' + html(post.referer || '') + '" />\n');
		res.write('<button type="submit">Submit</button>\n');
		res.write('</form>\n');
		res.write('<style>\n');
		res.write('#content input[type=text], button { display: block }\n');
		res.write('</style>');
		respondPageFooter(res);
	}, {inhead: '<style>#create:not(:checked) ~ #ccreate { display: none }</style>'});
}

function respondCreateRoomPage(errs, user, req, res, post) {
	respondPage('Create Room', user, req, res, function() {
		res.write('<h1>Create Room</h1>\n');
		res.write(errorsHTML(errs));
		res.write('<form method="post">\n');
		res.write('<div>Name: <input type="text" name="name" required="" value="' + html(post.name) + '" /></div>\n');
		res.write('<div>Description: <textarea name="desc" required="" minlength="16" rows="3" cols="80">' + html(post.desc) + '</textarea></div>\n');
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
}

function respondChangePassPage(errs, user, req, res, post) {
	respondPage('Create Room', req, res, function(user) {
		res.write('<h1>Change Password for ' + user.name + '</h1>\n');
		res.write(errorsHTML(errs));
		res.write('<form method="post">\n');
		res.write('<div>Old password: <input type="password" name="old" required="" autofocus="" /></div>\n');
		res.write('<div>New password: <input type="password" name="new" required="" /></div>\n');
		res.write('<div>Confirm new password: <input type="password" name="conf" required="" /></div>\n');
		res.write('<button type="submit">Submit</button>\n');
		res.write('</form>\n');
		respondPageFooter(res);
	});
}

var questionTypes = {
	err: 'an error',
	bug: 'unexpected behavior',
	imp: 'improving working code',
	how: 'achieving an end result',
	alg: 'algorithms and data structures',
	pra: 'techniques and best practices',
	the: 'a theoretical scenario'
};

var statics = {
	'/': {
		path: './html/home.html'
	},
	'/formatting': {
		path: './html/formatting.html',
		title: 'Formatting'
	},
	'/about': {
		path: './html/about.html',
		title: 'About',
		clean: true
	},
	'/dev/docs/': {
		path: './html/dev/docs.html',
		title: 'Docs'
	},
	'/learn/': {
		path: './html/learn/learn.html'
	},
	'/learn/web/': {
		path: './html/learn/web/web.html',
		title: 'Web'
	},
	'/learn/ssj/': {
		path: './html/learn/ssj/ssj.html',
		title: 'Server-Side JS'
	},
	'/learn/debug/': {
		path: './html/learn/debug/debug.html',
		title: 'Debugging'
	},
	'/learn/quality/': {
		path: './html/learn/quality/quality.html',
		title: 'Code Quality'
	}
};

var cache = {};

http.createServer(function(req,	res) {
	var origURL = req.url, i, post;
	if (req.url.length > 1000) {
		req.url = url.parse(req.url, true);
		return errorPage[414](req, res);
	}
	var cookies = cookie.parse(req.headers.cookie || '');
	req.url = url.parse(req.url, true);
	console.log('Req ' + req.url.pathname);
	dbcs.users.findOne({
		cookie: {
			$elemMatch: {
				token: cookies.id,
				created: {$gt: new Date().getTime() - 2592000000}
			}
		}
	}, function(err, user) {
		if (err) throw err;
		if (i = statics[req.url.pathname]) {
			respondPage(i.title, user, req, res, function() {
				fs.readFile(i.path || './html/' + req.url.pathname, function(err, data) {
					if (err) throw err;
					res.write(data.toString());
					respondPageFooter(res);
				});
			}, i.clean ? {clean: true} : null);
		} else if (req.url.pathname.substr(0, 5) == '/api/') {
			req.url.pathname = req.url.pathname.substr(4);
			if (req.method != 'POST') {
				res.writeHead(405);
				return res.end('Error: Method not allowed. Use POST.');
			}
			if (url.parse(req.headers.referer).host != req.headers.host) {
				res.writeHead(409);
				return res.end('Error: Suspicious request.');
			}
			post = '';
			req.on('data', function(data) {
				if (req.abort) return;
				post += data;
				if (post.length > 1000000) {
					res.writeHead(413);
					res.end('Error: Request entity too large.');
					req.abort = true;
				}
			});
			req.on('end', function() {
				if (req.abort) return;
				post = querystring.parse(post);
				if (req.url.pathname == '/me/changemail') {
					var newmail = post.newmail;
					if (!newmail) {
						res.writeHead(400);
						return res.end('Error: No email specified.');
					}
					if (newmail.length > 256) {
						res.writeHead(400);
						return res.end('Error: Email address must be no longer than 256 characters.');
					}
					dbcs.users.findOne({
						cookie: {
							$elemMatch: {
								token: cookie.parse(req.headers.cookie || '').id,
								created: {$gt: new Date().getTime() - 2592000000}
							}
						}
					}, function(err, user) {
						if (err) throw err;
						if (!user) {
							res.writeHead(403);
							return res.end('Error: You are not logged in.');
						}
						dbcs.users.update({name: user.name}, {
							$set: {
								mail: newmail,
								mailhash: crypto.createHash('md5').update(newmail).digest('hex')
							}
						});
						res.writeHead(204);
						res.end();
					});
				} else if (req.url.pathname == '/qa/newquestion') {
					if (!user) {
						res.writeHead(403);
						return res.end('Error: You must be logged in to ask a question.');
					}
					dbcs.questions.find().sort({_id: -1}).limit(1).nextObject(function(err, last) {
						if (err) throw err;
						var id = last ? last._id + 1 : 0;
						dbcs.questions.insert({
							_id: id,
							title: post.title,
							lang: post.lang,
							description: post.description,
							question: post.question,
							code: post.code,
							type: post.type,
							cat: post.cat,
							gr: post.gr,
							self: post.self,
							bounty: post.bounty,
							user: user.name,
							time: new Date().getTime(),
							score: 0
						});
						res.writeHead(200);
						res.end('Location: /qa/' + id);
					});
				} else if (req.url.pathname == '/program/save') {
					var type = parseInt(req.url.query.type);
					if (type !== 1 && type !== 2) {
						res.writeHead(400);
						return res.end('Error: Invalid program type.'); 
					}
					if (!user) {
						res.writeHead(403);
						return res.end('Error: You must be logged in to save a program.');
					}
					var i = url.parse(req.headers.referer || '').pathname.match(/^\/dev\/(\d+)/),
						id = i ? parseInt(i[1]) : 0;
					dbcs.programs.findOne({_id: id}, function(err, program) {
						if (err) throw err;
						if (id && !req.url.query.fork && program && program.user.toString() == user.name.toString()) {
							if (type == 2) {
								dbcs.programs.update({_id: id}, {
									$set: {
										html: post.html,
										css: post.css,
										js: post.js,
										updated: new Date().getTime()
									}
								});
							} else {
								dbcs.programs.update({_id: id}, {
									$set: {
										code: post.code,
										updated: new Date().getTime()
									}
								});
							}
							res.writeHead(204);
							res.end();
						} else {
							dbcs.programs.find().sort({_id: -1}).limit(1).nextObject(function(err, last) {
								if (err) throw err;
								var i = last ? last._id + 1 : 1;
								if (type == 2) {
									dbcs.programs.insert({
										type: type,
										html: (post.html || '').toString(),
										css: (post.css || '').toString(),
										js: (post.js || '').toString(),
										user: user.name,
										created: new Date().getTime(),
										updated: new Date().getTime(),
										score: 0,
										hotness: 0,
										upvotes: 0,
										_id: i
									});
								} else {
									dbcs.programs.insert({
										type: type,
										code: (post.code || '').toString(),
										user: user.name,
										created: new Date().getTime(),
										updated: new Date().getTime(),
										score: 0,
										hotness: 0,
										upvotes: 0,
										_id: i
									});
								}
								res.writeHead(200);
								res.end('Location: /dev/' + i);
							});
						}
					});
				} else if (req.url.pathname == '/program/edit-title') {
					if (!user) {
						res.writeHead(403);
						return res.end('Error: You must be logged in to change a program title.');
					}
					var i = url.parse(req.headers.referer || '').pathname.match(/^\/dev\/(\d+)/),
						id = i ? parseInt(i[1]) : 0;
					dbcs.programs.findOne({_id: id}, function(err, program) {
						if (err) throw err;
						if (!program) {
							res.writeHead(400);
							return res.end('Error: Invalid program id.');
						}
						if (program.user.toString() != user.name.toString()) {
							res.writeHead(204);
							return res.end('Error: You may rename only your own programs.');
						}
						dbcs.programs.update({_id: id}, {$set: {title: post.title.substr(0, 92)}});
						res.writeHead(204);
						res.end();
					});
				} else if (req.url.pathname == '/program/vote') {
					if (!post.val) {
						res.write(400);
						return res.end('Error: Vote value not specified.');
					}
					post.val = parseInt(post.val);
					if (post.val !== 0 && post.val !== 1 && post.val !== -1) {
						res.write(400);
						return res.end('Error: Invalid vote value.');
					}
					if (!user) {
						res.writeHead(403);
						return res.end('Error: You must be logged in and have 15 reputation to vote.');
					}
					if (user.rep < 15) {
						res.writeHead(403);
						return res.end('Error: You must have 15 reputation to vote.');
					}
					var i = url.parse(req.headers.referer || '').pathname.match(/^\/dev\/(\d+)/),
						id = i ? parseInt(i[1]) : 0;
					dbcs.programs.findOne({_id: id}, function(err, program) {
						if (err) throw err;
						if (!program) {
							res.writeHead(400);
							return res.end('Error: Invalid program id.');
						}
						if (program.user.toString() == user.name.toString()) {
							res.writeHead(403);
							return res.end('Error: You can\'t vote for your own post');
						}
						dbcs.votes.findOne({
							program: id,
							user: user.name
						}, function(err, current) {
							if (err) throw err;
							if (!current) {
								current = {val: 0};
								dbcs.votes.insert({
									user: user.name,
									program: id,
									val: post.val,
									time: new Date().getTime()
								});
							} else {
								dbcs.votes.update({
									program: id,
									user: user.name
								}, {
									$set: {
										val: post.val,
										time: new Date().getTime()
									}
								});
							}
							dbcs.programs.update({_id: id}, {
								$inc: {
									score: post.val - current.val,
									hotness: post.val - current.val,
									upvotes: post.val == 1 && current.val != 1 ? 1 : (post.val != 1 && current.val == 1 ? -1 : 0)
								}
							});
							dbcs.users.update({name: program.user}, {$inc: {rep: post.val - current.val}});
							res.writeHead(204);
							res.end();
						});
						dbcs.votes.find({
							program: id,
							time: {$lt: new Date().getTime() - 86400000}
						}).count(function(err, count) {
							if (err) throw err;
							dbcs.programs.update({_id: id}, {$inc: {hotness: -count}});
						});
					});
				} else if (req.url.pathname == '/program/delete') {
					if (!user) {
						res.writeHead(403);
						return res.end('Error: You must be logged in to delete programs.');
					}
					var i = url.parse(req.headers.referer || '').pathname.match(/^\/dev\/(\d+)/),
						id = i ? parseInt(i[1]) : 0;
					dbcs.programs.findOne({_id: id}, function(err, program) {
						if (err) throw err;
						if (!program) {
							res.writeHead(400);
							return res.end('Error: Invalid program id.');
						}
						if (program.user.toString() != user.name.toString() && user.level != 2) {
							res.end(403);
							return res.end('Error: You may delete only your own programs.');
						}
						dbcs.programs.update({_id: id}, {
							$set: {
								deleted: {
									by: [user.name],
									time: new Date().getTime()
								}
							}
						});
						res.writeHead(204);
						res.end();
					});
				} else if (req.url.pathname == '/program/undelete') {
					if (!user) {
						res.writeHead(403);
						return res.end('Error: You must be logged in to undelete programs.');
					}
					var i = url.parse(req.headers.referer || '').pathname.match(/^\/dev\/(\d+)/),
						id = i ? parseInt(i[1]) : 0;
					dbcs.programs.findOne({_id: id}, function(err, program) {
						if (err) throw err;
						if (!program) {
							res.writeHead(400);
							return res.end('Error: Invalid program id.');
						}
						if (program.user.toString() != user.name.toString() && user.level != 2) {
							res.end(403);
							return res.end('Error: You may undelete only your own programs.');
						}
						dbcs.programs.update({_id: id}, {$unset: {deleted: 1}});
						res.writeHead(204);
						res.end();
					});
				} else {
					res.writeHead(404);
					res.end('The API feature requested has not been implemented.');
				}
			});
		} else if (req.url.pathname == '/qa/preview') {
			if (req.method == 'POST') {
				post = '';
				req.on('data', function(data) {
					if (req.abort) return;
					post += data;
					if (post.length > 1000000) {
						errorPage[413](req, res);
						req.abort = true;
					}
				});
				req.on('end', function() {
					if (req.abort) return;
					post = querystring.parse(post);
					respondPage(post.lang + ': ' + post.title, user, req, res, function() {
						res.write('<h1>' + html(post.lang + ': ' + post.title) + '</h1>');
						res.write(markdown(post.description));
						res.write('<code class="blk">' + html(post.code) + '</code>');
						res.write('<p>' + html(post.question) + '</p>');
						res.write('<small>(type: ' + questionTypes[post.type] + ')</small>');
						res.write('<hr />');
						var cat = [];
						for (var i in post) {
							if (i.substr(0, 2) == 'ck') cat.push(i.substr(2));
						}
						res.write('<button onclick="request(\'/api/qa/newquestion\', function(res) { if (res.substr(0, 7) == \'Error: \') alert(res); elseif (res.substr(0, 10) == \'Location: \') location.href = res; else alert(\'Unknown error. Response was: \' + res) }, ' + html(JSON.stringify(
							'title=' + encodeURIComponent(post.title) +
							'&lang=' + encodeURIComponent(post.lang) +
							'&description=' + encodeURIComponent(post.description) +
							'&question=' + encodeURIComponent(post.question) +
							'&code=' + encodeURIComponent(post.code) +
							'&type=' + encodeURIComponent(post.type) +
							'&cat=' + encodeURIComponent(cat) +
							'&gr=' + encodeURIComponent(post.gr || '') +
							'&self=' + encodeURIComponent(post.self || '') +
							'&bounty=' + encodeURIComponent(post.bounty || '')
						)) + ')">Submit</button>');
						respondPageFooter(res);
					});
				});
			} else errorPage[405](req, res);
		} else if (req.url.pathname == '/login/') {
			if (req.method == 'POST') {
				post = '';
				req.on('data', function(data) {
					if (req.abort) return;
					post += data;
					if (post.length > 1000) {
						errorPage[413](req, res);
						req.abort = true;
					}
				});
				req.on('end', function() {
					if (req.abort) return;
					post = querystring.parse(post);
					if (!post.referer) post.referer = req.headers.referer;
					if (post.create) {
						if (!post.name || !post.pass || !post.passc || !post.mail) return respondLoginPage(['All fields are required.'], user, req, res, post, false, true, true);
						var errors = [],
							nfillm,
							nfilln,
							fpass;
						if (post.name.length > 16 && (nfilln = true)) errors.push('Name must be no longer than 16 characters.');
						if (post.name.length < 3 && (nfilln = true)) errors.push('Name must be at least 3 characters long.');
						if (!post.name.match(/^[a-zA-Z0-9-]+$/) && (nfilln = true)) errors.push('Name may only contain alphanumeric characters and dashes.');
						if (post.name.indexOf(/---/) != -1 && (nfilln = true)) errors.push('Name may not contain a sequence of 3 dashes.');
						if (post.pass != post.passc) errors.push('Passwords don\'t match.');
						var uniqueChars = [];
						for (var i = 0; i < post.pass.length; i++) {
							if (uniqueChars.indexOf(post.pass[i]) == -1) uniqueChars.push(post.pass[i]);
						}
						if (post.mail.length > 256 && (nfillm = true)) errors.push('Email address must be no longer than 256 characters.');
						if (uniqueChars.length < 8) {
							errors.push('Password is too simple.');
							if (!nfillm && !nfilln) fpass = true;
						}
						if (errors.length) return respondLoginPage(errors, user, req, res, post, !nfillm, !nfilln, fpass);
						dbcs.users.findOne({name: post.name}, function(err, existingUser) {
							if (err) throw err;
							if (existingUser) return respondLoginPage(['Username already taken.'], user, req, res, post, true);
							var salt = crypto.randomBytes(64).toString('base64');
							crypto.pbkdf2(post.pass + salt, 'KJ:C5A;_?F!00S(4S[T-3X!#NCZI;A', 1e5, 128, function(err, key) {
								if (err) throw err;
								var pass = new Buffer(key).toString('base64'),
									confirmToken = crypto.randomBytes(128).toString('base64');
								dbcs.users.insert({
									name: post.name,
									pass: pass,
									mail: post.mail,
									mailhash: crypto.createHash('md5').update(post.mail).digest('hex'),
									confirm: confirmToken,
									salt: salt,
									joined: new Date().getTime(),
									rep: 0,
									level: 0
								});
								transport.sendMail({
									from: 'DevDoodle <support@devdoodle.net>',
									to: post.mail,
									subject: 'Confirm your account',
									html: '<h1>Welcome to DevDoodle!</h1><p>An account on <a href="http://devdoodle.net/">DevDoodle</a> has been made for this email address. Confirm your account creation <a href="http://devdoodle.net/login/confirm/' + confirmToken + '">here</a>.</p>'
								});
								respondPage('Account Created', user, req, res, function() {
									res.write('An account for you has been created. To activate it, click the link in the email sent to you.');
									respondPageFooter(res);
								});
							});
						});
					} else {
						if (!post.name || !post.pass) return respondLoginPage(['All fields are required.'], user, req, res, post, true, true, post.name && !post.pass);
						dbcs.users.findOne({name: post.name}, function(err, user) {
							if (err) throw err;
							if (!user) return respondLoginPage(['Invalid Credentials.'], user, req, res, post);
							if (user.confirm) return respondLoginPage(['You must confirm your account by clicking the link in the email sent to you before logging in.'], user, req, res, post);
							if (user.level < 1) return respondLoginPage(['This account has been disabled.'], user, req, res, post);
							crypto.pbkdf2(post.pass + user.salt, 'KJ:C5A;_?F!00S(4S[T-3X!#NCZI;A', 1e5, 128, function(err, key) {
								if (err) throw err;
								if (key.toString('base64') != user.pass) return respondLoginPage(['Invalid Credentials.'], user, req, res, post);
								var idToken = crypto.randomBytes(128).toString('base64');
								respondPage('Login Success', user, req, res, function() {
									res.write('<p>Welcome back, ' + user.name + '. You have ' + user.rep + ' reputation.</p>');
									var referer = url.parse(post.referer);
									if (referer && referer.host == req.headers.host && referer.pathname.indexOf('login') == -1 && referer.pathname != '/') res.write('<p>Continue to <a href="' + html(referer.pathname) + '">' + html(referer.pathname) + '</a>.</p>');
									respondPageFooter(res);
								}, {
									'Set-Cookie': cookie.serialize('id', idToken, {
										path: '/',
										expires: new Date(new Date().setDate(new Date().getDate() + 30))
									}),
									user: user
								});
								dbcs.users.update({name: user.name}, {
									$push: {
										cookie: {
											token: idToken,
											created: new Date().getTime()
										}
									}
								});
							});
						});
					}
				});
			} else respondLoginPage([], user, req, res, {referer: req.headers.referer});
		} else if (i = req.url.pathname.match(/^\/user\/([a-zA-Z0-9-]{3,16})\/changepass$/)) {
			if (req.method == 'POST') {
				post = '';
				req.on('data', function(data) {
					if (req.abort) return;
					post += data;
					if (post.length > 100000) {
						errorPage[413](req, res);
						req.abort = true;
					}
				});
				req.on('end', function() {
					if (req.abort) return;
					post = querystring.parse(post);
					if (!user || user.name != i[1]) return errorPage[403](req, res);
					if (!post.old || !post.new || !post.conf) return respondChangePassPage(['All fields are required.'], user, req, res, {});
					if (post.new != post.conf) return respondChangePassPage(['New passwords don\'t match.'], user, req, res, {});
					crypto.pbkdf2(post.old + user.salt, 'KJ:C5A;_?F!00S(4S[T-3X!#NCZI;A', 1e5, 128, function(err, key) {
						if (err) throw err;
						if (new Buffer(key).toString('base64') != user.pass) return respondChangePassPage(['Incorrect old password.'], user, req, res, {});
						var salt = crypto.randomBytes(64).toString('base64');
						crypto.pbkdf2(post.new + salt, 'KJ:C5A;_?F!00S(4S[T-3X!#NCZI;A', 1e5, 128, function(err, key) {
							if (err) throw err;
							dbcs.users.update({name: user.name}, {
								$set: {
									pass: new Buffer(key).toString('base64'),
									salt: salt
								},
								$unset: {cookie: 1}
							});
							respondPage('Password Updated', user, req, res, function() {
								res.write('The password for user ' + user.name + ' has been updated. You have been logged out.');
								respondPageFooter(res);
							}, {'Set-Cookie': 'id='});
						});
					});
				});
			} else respondChangePassPage([], user, req, res, {});
		} else if (req.url.pathname == '/chat/newroom') {
			if (!user) return errorPage[403](req, res, 'You must be logged in and have 200 reputation to create a room.');
			if (user.rep < 200) return errorPage[403](req, res, 'You must have 200 reputation to create a room.');
			if (req.method == 'POST') {
				post = '';
				req.on('data', function(data) {
					if (req.abort) return;
					post += data;
					if (post.length > 4000) {
						errorPage[413](req, res);
						req.abort = true;
					}
				});
				req.on('end', function() {
					if (req.abort) return;
					post = querystring.parse(post);
					var errors = [];
					if (!post.name || post.name.length < 4) errors.push('Name must be at least 4 chars long.');
					if (!post.desc || post.desc.length < 16) errors.push('Description must be at least 16 chars long.');
					if (errors.length) return respondCreateRoomPage(errors, user, req, res, post);
					dbcs.chatrooms.find().sort({_id: -1}).limit(1).nextObject(function(err, last) {
						if (err) throw err;
						var i = last ? last._id + 1 : 1;
						dbcs.chatrooms.insert({
							name: post.name,
							desc: post.desc,
							type: post.type,
							_id: i
						});
						res.writeHead(303, {'Location': i});
						res.end();
					});
				});
			} else respondCreateRoomPage([], user, req, res, post);
		} else {
			var raw = !req.headers['accept-encoding'] || req.headers['accept-encoding'].indexOf('gzip') == -1 || req.headers['accept-encoding'].indexOf('gzip;q=0') != -1;
			fs.stat('./http/' + req.url.pathname, function(err, stats) {
				if (err || !stats.isFile()) {
					req.headers.user = JSON.stringify(user) || '';
					var bres = http.get({
						host: 'localhost',
						port: 8000,
						path: origURL,
						headers: req.headers
					}, function(bres) {
						res.writeHead(bres.statusCode, bres.headers);
						bres.on('data', function(chunk) {
							res.write(chunk);
						});
						bres.on('end', function() {
							res.end();
						});
						bres.on('error', function(e) {
							throw e;
							errorPage[500](req, res, user, e.message);
						});
					}).on('error', function(e) {
						errorPage[500](req, res, user, e.message);
					});
				} else {
					if (cache[req.url.pathname]) {
						res.writeHead(200, {
							'Content-Encoding': raw ? 'identity' : 'gzip',
							'Content-Type': mime[path.extname(req.url.pathname)] || 'text/plain',
							'Cache-Control': 'max-age=6012800, public',
							'Vary': 'Accept-Encoding'
						});
						res.end(cache[req.url.pathname][raw ? 'raw' : 'gzip']);
						if (cache[req.url.pathname].updated < stats.mtime) {
							fs.readFile('./http' + req.url.pathname, function(err, data) {
								if (err) return;
								zlib.gzip(data, function(err, buffer) {
									if (err) throw err;
									cache[req.url.pathname] = {
										raw: data,
										gzip: buffer,
										updated: stats.mtime
									};
								});
							});
						}
					} else {
						fs.readFile('./http' + req.url.pathname, function(err, data) {
							if (err) return errorPage[404](req, res, user);
							zlib.gzip(data, function(err, buffer) {
								if (err) throw err;
								cache[req.url.pathname] = {
									raw: data,
									gzip: buffer,
									updated: stats.mtime
								};
								res.writeHead(200, {
									'Content-Encoding': raw ? 'identity' : 'gzip',
									'Content-Type': mime[path.extname(req.url.pathname)] || 'text/plain',
									'Cache-Control': 'max-age=6012800, public',
									'Vary': 'Accept-Encoding'
								});
								res.end(raw ? data : buffer);
							});
						});
					}
				}
			});
		}
	});
}).listen(process.argv[2] || 80);
console.log('buildpage.js running on port ' + (process.argv[2] || 80));