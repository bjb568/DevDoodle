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

var http = require('http'),
	https = require('https'),
	ocsp = require('ocsp'),
	uglifyJS = require('uglify-js'),
	cleanCSS = require('clean-css'),
	etag = require('etag'),
	fs = require('fs'),
	path = require('path'),
	url = require('url'),
	querystring = require('querystring'),
	cookie = require('cookie'),
	crypto = require('crypto'),
	essentials = require('./essentials.js'),
	nodemailer = require('nodemailer'),
	sendmailTransport = require('nodemailer-sendmail-transport'),
	mongo = require('mongodb').MongoClient,
	usedDBCs = [
		'users',
		'questions',
		'qtags',
		'answers',
		'posthistory',
		'chat',
		'chathistory',
		'chatstars',
		'chatusers',
		'chatrooms',
		'programs',
		'comments',
		'votes',
		'lessons'
	];

global.site = {
	name: 'DevDoodle',
	titles: {
		learn: 'Courses',
		dev: 'Programs',
		qa: 'Q&amp;A',
		chat: 'Chat',
		mod: 'Moderation'
	}
};
global.transport = nodemailer.createTransport(sendmailTransport());
global.html = essentials.html;
global.inlineMarkdown = essentials.inlineMarkdown;
global.markdown = essentials.markdown;
global.passStrength = essentials.passStrength;
global.mime = essentials.mime;
global.dbcs = {};

mongo.connect('mongodb://localhost:27017/DevDoodle/', function(err, db) {
	if (err) throw err;
	db.createCollection('questions', function(err, collection) {
		if (err) throw err;
		db.createIndex('questions', {description: 'text'}, {}, function() {});
		db.createIndex('chat', {body: 'text'}, {}, function() {});
		dbcs.questions = collection;
	});
	var i = usedDBCs.length;
	function handleCollection(err, collection) {
		if (err) throw err;
		dbcs[usedDBCs[i]] = collection;
		if (usedDBCs[i] == 'chatusers') collection.drop();
	}
	while (i--) db.collection(usedDBCs[i], handleCollection);
	if (process.argv.indexOf('--test') != -1) {
		var testReq = http.get("http://localhost:8080/", function(testRes) {
			testRes.on('data', function(d) {
				console.log('Things seem to work!');
				process.exit();
			});
		});
		testReq.on('error', function(e) {
			throw e;
		});
	}
});

global.respondPage = function(title, user, req, res, callback, header, status) {
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
	if (typeof header['Content-Type'] != 'string') header['Content-Type'] = 'application/xhtml+xml; charset=utf-8';
	if (typeof header['Cache-Control'] != 'string') header['Cache-Control'] = 'no-cache';
	if (typeof header['X-Frame-Options'] != 'string') header['X-Frame-Options'] = 'DENY';
	if (typeof header['Content-Security-Policy'] != 'string') {
		header['Content-Security-Policy'] =
			"default-src 'self'; " +
			"connect-src 'self' wss://" + req.headers.host + ":81;" +
			" child-src blob:; " +
			((req.headers['user-agent'] || '').indexOf('Firefox') != -1 ? ' frame-src blob:;' : '') +
			"img-src *";
	}
	header['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
	header['Public-Key-Pins'] = 'pin-sha256="B9Zw6fj5NucVKxVjhJX27HOBvnV+IyFbFwEMmYQ5Y5g="; pin-sha256="03Yp9b7zlEaaJUIWosWYHJcdKYxMSa3Z4bZXWf8LXtI="; max-age=2592000; includeSubdomains';
	if (user) {
		dbcs.users.update({name: user.name}, {$set: {seen: new Date().getTime()}});
		if (!header['Set-Cookie'] && new Date() -  user.seen > 3600000) {
			var tokens = user.cookie,
				idToken = crypto.randomBytes(128).toString('base64');
			for (var i in tokens) {
				if (tokens[i].token == cookies.id) tokens[i].token = idToken;
			}
			dbcs.users.update({name: user.name}, {$set: {cookie: tokens}});
			header['Set-Cookie'] = cookie.serialize('id', idToken, {
				path: '/',
				expires: new Date(new Date().setDate(new Date().getDate() + 30)),
				httpOnly: true,
				secure: usingSSL
			});
		}
	}
	res.writeHead(status || 200, header);
	fs.readFile('html/a/head.html', function(err, data) {
		if (err) throw err;
		data = data.toString();
		if ((user = huser || user) && user.name) data = data.replace('<a href="/login/">Login</a>', '<a$notifs href="/user/' + user.name + '">' + user.name + '</a>');
		var dirs = req.url.pathname.split('/');
		res.write(
			data.replace(
				'$title',
				(title ? title + ' · ' : '') + (site.titles[dirs[1]] ? site.titles[dirs[1]] + ' · ' : '') + site.name
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
};
global.respondPageFooter = function(res, aside) {
	fs.readFile('html/a/foot.html', function(err, data) {
		if (err) throw err;
		res.end(data.toString().replace('</div>', aside ? '</aside>' : '</div>'));
	});
};
global.errorForbidden = function(req, res, user, msg) {
	respondPage('403', user, req, res, function() {
		res.write('<h1>Error 403</h1>');
		res.write(msg || '<p>Permission denied. If you think this is a mistake, please <a href="mailto:support@devdoodle.net">let us know</a>.</p>');
		res.write('<p><a href="javascript:history.go(-1)">Go back</a>.</p>');
		respondPageFooter(res);
	}, {}, 403);
};
global.errorNotFound = function(req, res, user) {
	respondPage('404', user, req, res, function() {
		res.write('<h1>Error 404 :(</h1>');
		res.write('<p>The requested file could not be found. If you found a broken link, please <a href="mailto:support@devdoodle.net">let us know</a>.</p>');
		res.write('<p><a href="javascript:history.go(-1)">Go back</a>, <a href="/search/?q=' + encodeURIComponent(req.url.pathname.replaceAll('/', ' ')) + '">Search</a>.</p>');
		respondPageFooter(res);
	}, {}, 404);
};
global.errorsHTML = function(errs) {
	return errs.length ?
		(
			errs.length == 1 ?
				'<div class="error">' + errs[0] + '</div>' :
				'<div class="error">\t<ul>\t\t<li>' + errs.join('</li>\t\t<li>') + '</li>\t</ul></div>'
		) :
		'';
};

function respondLoginPage(errs, user, req, res, post, fillm, filln, fpass) {
	if (!post) post = {};
	var num = 0;
	while (!num) num = Math.floor(Math.random() * 25 - 12);
	respondPage('Login', user, req, res, function() {
		res.write('<h1>Log in</h1>');
		var notice = ({
			ask: 'You must be logged in to ask a question.',
			recovered: 'Your password has been reset. You may now login.',
			updated: 'Your password has been updated. You may now login with your new password.'
		})[post.r];
		res.write(errorsHTML(errs) || (notice ? '<div class="notice">' + notice + '</div>' : ''));
		res.write('<form method="post">');
		res.write('<input type="checkbox" name="create" id="create"' + (post.create ? ' checked=""' : '') + ' /> <label for="create">Create an account</label>');
		res.write(
			'<div>' +
				'<input type="text" id="name" name="name" placeholder="Name"' +
					(filln && post.name ? ' value="' + html(post.name, true) + '"' : '') +
					' required="" maxlength="16"' + (fpass ? '' : ' autofocus=""') +
				' /> ' +
				'<span id="name-error" class="red"> </span>' +
			'</div>'
		);
		res.write(
			'<div><input type="password" id="pass" name="pass" placeholder="Password" required=""' + (fpass ? ' autofocus=""' : '') + ' /> ' +
			'<span id="pass-bad" class="red" hidden="">too short</span></div>'
		);
		res.write('<div id="ccreate">');
		res.write('<div id="pass-bar-outer"><div id="pass-bar"></div></div>');
		res.write('<div><input type="password" id="passc" name="passc" placeholder="Confirm Password" /> <span id="pass-match" class="red" hidden="">Doesn\'t match</span></div>');
		res.write('<p><small>Please use a password manager to store passwords</small></p>');
		res.write('<div><input type="text" name="mail" id="mail" maxlength="256" placeholder="Email"' + (fillm && post.mail ? ' value="' + html(post.mail, true) + '"' : '') + ' /></div>');
		res.write('<p id="sec">[No CSS]<input type="text" name="sec' + num + '" placeholder="Confirm you\'re human" /></p>');
		res.write('</div>');
		res.write('<input type="hidden" name="referer" value="' + html(post.referer || '', true) + '" />');
		res.write('<button type="submit" id="submit" class="umar">Submit</button>');
		res.write('</form>');
		res.write('<p class="bumar"><small><a href="recover">Recover account from email</a></small></p>');
		res.write('<script src="login.js"></script>');
		respondPageFooter(res);
	}, {
		inhead: '<link rel="stylesheet" href="/login/login.css" />' +
			'<style>#sec::before { content: \'Expand (x ' + (num < 0 ? '- ' + Math.abs(num) : '+ ' + num) + ')² to the form ax² + bx + c: \' }</style>'
	});
}
function respondChangePassPage(errs, user, req, res, post) {
	if (!post) post = {};
	respondPage('Change Password', user, req, res, function() {
		res.write('<h1>Change Password for ' + user.name + '</h1>');
		res.write(errorsHTML(errs));
		res.write('<form method="post">');
		res.write('<div><input type="password" id="old" name="old" placeholder="Old password" required="" autofocus="" /></div>');
		res.write('<div><input type="password" id="new" name="new" placeholder="New password" required="" /> <span id="pass-bad" class="red" hidden="">too short</span></div>');
		res.write('<div id="pass-bar-outer"><div id="pass-bar"></div></div>');
		res.write('<div><input type="password" id="conf" name="conf" placeholder="Confirm Password" /> <span id="pass-match" class="red" hidden="">Doesn\'t match</span></div>');
		res.write('<p><small>Please use a password manager to store passwords</small></p>');
		res.write('<button type="submit" id="submit" disabled="">Submit</button>');
		res.write('</form>');
		res.write('<script src="/login/changepass.js"></script>');
		respondPageFooter(res);
	}, {inhead: '<link rel="stylesheet" href="/login/login.css" />'});
}
function respondCreateRoomPage(errs, user, req, res, post) {
	if (!post) post = {};
	respondPage('Create Room', user, req, res, function() {
		res.write('<h1>Create Room</h1>');
		res.write(errorsHTML(errs));
		res.write('<form method="post">');
		res.write('<div>Name: <input type="text" name="name" required="" value="' + html(post.name || '', true) + '" /></div>');
		res.write('<div>Description: <textarea name="desc" required="" minlength="16" rows="3" cols="80" style="max-width: 100%">' + html(post.desc || '') + '</textarea></div>');
		res.write('<div>Type: <select name="type">');
		res.write('\t<option value="P">Public</option>');
		res.write('\t<option value="R">Read-only</option>');
		res.write('\t<option value="N">Private</option>');
		if (user.level > 4) res.write('\t<option value="M">♦ only</option>');
		res.write('</select>');
		res.write('</div>');
		res.write('<button type="submit">Submit</button>');
		res.write('</form>');
		respondPageFooter(res);
	});
}

global.questionTypes = {
	err: 'an error',
	bug: 'unexpected behavior',
	imp: 'improving working code',
	how: 'achieving an end result',
	alg: 'algorithms and data structures',
	pra: 'techniques and best practices',
	the: 'a theoretical scenario'
};

var statics = JSON.parse(fs.readFileSync('./statics.json')),
	buildpageServers = [
		['/status/', require('./buildpage/status.js')],
		['/user/', require('./buildpage/user.js')],
		['/qa/', require('./buildpage/qa.js')],
		['/chat/', require('./buildpage/chat.js')],
		['/dev/', require('./buildpage/dev.js')],
		['/learn/', require('./buildpage/learn.js')],
		['/mod/', require('./buildpage/mod.js')],
		['/', require('./buildpage/home.js')]
	],
	apiServer = require('./api.js'),
	canvasJS = fs.readFileSync('./http/dev/canvas.js');

var cache = {};

var constants = require('constants'),
	SSL_ONLY_TLS_1_2 = constants.SSL_OP_NO_TLSv1_1|constants.SSL_OP_NO_TLSv1|constants.SSL_OP_NO_SSLv3|constants.SSL_OP_NO_SSLv2;

var usingSSL = true;

function serverHandler(req, res) {
	if (!req.headers.host) {
		res.writeHead(400, {'Content-Type': 'text/html'});
		return res.end('Please send the host HTTP header.');
	} else if (req.headers.host == '205.186.144.188') {
		res.writeHead(400, {'Content-type': 'text/html'});
		return res.end('Perhaps you were looking for <a href="https://devdoodle.net">devdoodle.net</a>?');
	} else if (req.headers.host != 'devdoodle.net' && req.headers.host != 'localhost' && !req.headers.host.match(/\w/)) {
		res.writeHead(400, {'Content-type': 'text/html'});
		return res.end('This is the server for <a href="https://devdoodle.net">devdoodle.net</a>. You must connect to this server from that domain.');
	}
	var i, post;
	if (req.url.length > 1000) {
		req.url = url.parse(req.url, true);
		return respondPage('414', {}, req, res, function() {
			res.write('<h1>Error 414</h1>');
			res.write('<p>Request URI too long.</p>');
			res.write('<p><a href="javascript:history.go(-1)">Go back</a>.</p>');
			respondPageFooter(res);
		}, {}, 414);
	}
	var cookies = cookie.parse(req.headers.cookie || '');
	req.url = url.parse(req.url, true);
	console.log(req.method, req.url.pathname);
	dbcs.users.findOne({
		cookie: {
			$elemMatch: {
				token: cookies.id || 'nomatch',
				created: {$gt: new Date() -  2592000000}
			}
		}
	}, function(err, user) {
		if (err) throw err;
		if (i = statics[req.url.pathname]) {
			var options = {
				clean: i.clean,
				inhead: i.inhead
			};
			respondPage(i.title, user, req, res, function() {
				fs.readFile(i.path || './html/' + req.url.pathname, function(err, data) {
					if (err) throw err;
					res.write(data.toString().replace('$canvasjs', html(canvasJS)));
					respondPageFooter(res);
				});
			}, options);
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
				if (post.length > 1e6) {
					res.writeHead(413);
					res.end('Error: Request entity too large.');
					req.abort = true;
				}
			});
			req.on('end', function() {
				if (req.abort) return;
				post = querystring.parse(post);
				apiServer(req, res, user, post);
			});
		} else if (req.url.pathname == '/learn/new') {
			if (req.method == 'GET') {
				respondPage('New Lesson', user, req, res, function() {
					fs.readFile('./html/learn/newlesson.html', function(err, data) {
						if (err) throw err;
						res.write(data.toString().replace('$title', html(req.url.query.title || '')).replace(/\$[^\/\s"<]+/g, ''));
						respondPageFooter(res);
					});
				}, {inhead: '<link rel="stylesheet" href="/learn/course.css" />\n<link rel="stylesheet" href="/learn/newlesson.css" />'});
			} else if (req.method == 'POST') {
				post = '';
				req.on('data', function(data) {
					if (req.abort) return;
					post += data;
					if (data.length > 1e6) {
						res.writeHead(413);
						res.end('Error: Request entity too large.');
						req.abort = true;
					}
				});
				req.on('end', function() {
					if (req.abort) return;
					post = querystring.parse(post);
					if (parseInt(req.url.query.submit)) {
						if (!user) return errorForbidden(req, res, user, 'You must be logged in to submit a lesson.');
						dbcs.lessons.findOne({
							user: user.name,
							title: post.title || 'Untitled'
						}, function(err, lesson) {
							if (err) throw err;
							if (lesson) {
								dbcs.lessons.update({_id: lesson._id}, {
									$push: {
										content: {
											stitle: post.stitle || 'Untitled',
											sbody: post.sbody || '',
											validate: post.validate || '',
											html: post.html || ''
										}
									}
								});
								res.writeHead(303, {'Location': 'unoff/' + lesson._id + '/'});
								res.end();
							} else {
								dbcs.lessons.find().sort({_id: -1}).limit(1).nextObject(function(err, last) {
									if (err) throw err;
									var id = last ? last._id + 1 : 1;
									dbcs.lessons.insert({
										_id: id,
										user: user.name,
										created: new Date().getTime(),
										updated: new Date().getTime(),
										title: post.title || 'Untitled',
										content: [{
											stitle: post.stitle || 'Untitled',
											sbody: post.sbody || '',
											validate: post.validate || '',
											html: post.html || ''
										}]
									});
									res.writeHead(303, {'Location': 'unoff/' + id + '/'});
									res.end();
								});
							}
						});
					} else if (parseInt(req.url.query.preview)) {
						respondPage('Previewing ' + post.title + ': ' + post.stitle, user, req, res, function() {
							fs.readFile('./html/learn/lessonpreview.html', function(err, data) {
								if (err) throw err;
								res.write(
									data.toString()
									.replaceAll(
										['$title', '$stitle', '$sbody', '$validate', '$html', '$md-sbody'],
										[html(post.title || ''), html(post.stitle || ''), html(post.sbody || ''), html(post.validate || ''), html(post.html || ''), markdown(post.sbody || '')]
									)
								);
								respondPageFooter(res);
							});
						}, {inhead: '<link rel="stylesheet" href="/learn/course.css" />\n<link rel="stylesheet" href="/learn/lessonpreview.css" />'});
					} else {
						respondPage('New Lesson', user, req, res, function() {
							fs.readFile('./html/learn/newlesson.html', function(err, data) {
								if (err) throw err;
								res.write(
									data.toString()
									.replaceAll(
										['$title', '$stitle', '$sbody', '$html'],
										[html(post.title || ''), html(post.stitle || ''), html(post.sbody || ''), html(post.html || '')]
									).replace(/>function[\s\S]+?<\/textarea/, '>' + html(post.validate || '') + '</textarea')
								);
								respondPageFooter(res);
							});
						}, {inhead: '<link rel="stylesheet" href="/learn/course.css" />\n<link rel="stylesheet" href="/learn/newlesson.css" />'});
					}
				});
			} else {
				res.writeHead(405);
				res.end('Method not allowed. Use GET or POST.');
			}
		} else if (req.url.pathname == '/login/') {
			if (req.method == 'GET') respondLoginPage([], user, req, res, {referer: req.headers.referer, r: (req.url.query || {}).r});
			else if (req.method == 'POST') {
				post = '';
				req.on('data', function(data) {
					if (req.abort) return;
					post += data;
					if (post.length > 1e4) {
						res.writeHead(413);
						res.end('Error: Request entity too large.');
						req.abort = true;
					}
				});
				req.on('end', function() {
					if (req.abort) return;
					post = querystring.parse(post);
					if (!post.referer) post.referer = req.headers.referer;
					if (post.create) {
						if (post.check != 'JS-confirm') return errorForbidden(req, res, user, 'Suspicious request.');
						var secAnswered = false;
						for (i = -12; i <= 12; i++) {
							if (!i) continue;
							var str = post['sec' + i],
								fail;
							if (!str) continue;
							secAnswered = true;
							fail |= str.match(/[a-wyz]/i);
							str = str.replace(/x\s*\*\s*x|x\s*\*\*\s*2|x²/, 'x^2').replace(/\s/g, '');
							fail |= str.match(/[^\d\+-^x]/);
							var arr = [],
								lstart = 0;
							for (var j = 0; j < str.length; j++) {
								if (str[j] == '+' || str[j] == '-') {
									arr.push(str.substring(lstart, j));
									lstart = j;
								}
							}
							arr.push(str.substr(lstart));
							var cA, cB, cC;
							for (j = 0; j < arr.length; j++) {
								if (arr[j].length == 1) fail = true;
								if (arr[j][0] == '+') arr[j] = (arr[j].match(/\d/) ? '' : '1') + arr[j].substr(1);
								fail |= arr[j].match(/\d\D+\d/);
								fail |= arr[j].match(/x.*x/);
								fail |= arr[j].match(/^.*^/);
								fail |= arr[j].indexOf('+') != -1;
								var n = parseInt(arr[j].replace(/[^\d-]/g, ''));
								if (arr[j].substring(arr[j].length - 3, arr[j].length) == 'x^2') {
									fail |= n != 1 && arr[j].length != 3;
									cA = true;
								} else if (arr[j][arr[j].length - 1] == 'x') {
									fail |= n != 2 * i;
									fail |= arr[j].indexOf('^') != -1;
									cB = true;
								} else if (!arr[j].match(/[^\d-]/)) {
									fail |= n != i * i;
									cC = true;
								} else fail = true;
							}
							if (fail || !cA || !cB || !cC) return respondLoginPage(['Incorrect response to security question.'], user, req, res, post, true, true, true);
							break;
						}
						if (!secAnswered) return errorForbidden(req, res, user, 'Suspicious request.');
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
						if (post.mail.length > 256 && (nfillm = true)) errors.push('Email address must be no longer than 256 characters.');
						if (passStrength(post.pass) < 1/4) {
							errors.push('Password is too short.');
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
									html:
										'<h1>Welcome to DevDoodle!</h1>' +
										'<p>An account on <a href="http://devdoodle.net/">DevDoodle</a> has been made for this email address under the name ' + post.name + '. ' +
										'Confirm your account creation <a href="http://devdoodle.net/login/confirm/' + confirmToken + '">here</a>.</p>'
								});
								respondPage('Account Created', user, req, res, function() {
									res.write('An account for you has been created. To activate it, click the link in the email sent to you. It may take a few minutes for the email to reach you, but please check your spam folder.');
									respondPageFooter(res);
								});
							});
						});
					} else {
						if (!post.name || !post.pass) return respondLoginPage(['All fields are required.'], user, req, res, post, true, true, post.name && !post.pass);
						dbcs.users.findOne({name: post.name}, function(err, fuser) {
							if (err) throw err;
							if (!fuser) return respondLoginPage(['Invalid Credentials.'], user, req, res, post);
							if (fuser.confirm) {
								if (fuser.seen) return respondLoginPage(['This account has been disabled by a user-initiated password reset. It can be <a href="recover">recovered with email verification</a>.'], user, req, res, post);
								return respondPage('Confirm Account', user, req, res, function() {
									fs.readFile('./html/login-confirm.html', function(err, data) {
										if (err) throw err;
										res.write(data.toString().replaceAll(['$user', '$pass', '$mail'], [fuser.name, html(post.pass), html(fuser.mail)]));
										respondPageFooter(res);
									});
								});
							}
							if (fuser.level < 1) return respondLoginPage(['This account has been disabled.'], user, req, res, post);
							crypto.pbkdf2(post.pass + fuser.salt, 'KJ:C5A;_?F!00S(4S[T-3X!#NCZI;A', 1e5, 128, function(err, key) {
								if (err) throw err;
								if (key.toString('base64') != fuser.pass) return respondLoginPage(['Invalid Credentials.'], user, req, res, post);
								var idToken = crypto.randomBytes(128).toString('base64'),
									idCookie = cookie.serialize('id', idToken, {
										path: '/',
										expires: new Date(new Date().setDate(new Date().getDate() + 30)),
										httpOnly: true,
										secure: usingSSL
									});
								dbcs.users.update({name: fuser.name}, {
									$push: {
										cookie: {
											token: idToken,
											created: new Date().getTime()
										}
									}
								});
								var r = (url.parse(req.headers.referer, true).query || {}).r;
								if (r == 'ask') {
									res.writeHead(303, {
										Location: '/qa/ask',
										'Set-Cookie': idCookie
									});
									return res.end();
								}
								var referer = url.parse(post.referer);
								if (!r && referer && referer.host == req.headers.host && referer.pathname.indexOf('login') == -1 && referer.pathname != '/') {
									res.writeHead(303, {
										Location: referer.pathname,
										'Set-Cookie': idCookie
									});
									return res.end();
								}
								respondPage('Login Success', user, req, res, function() {
									res.write('<p>Welcome back, ' + fuser.name + '. You have ' + fuser.rep + ' reputation.</p>');
									respondPageFooter(res);
								}, {
									'Set-Cookie': idCookie,
									user: fuser
								});
							});
						});
					}
				});
			} else {
			   res.writeHead(405);
			   res.end('Method not allowed. Use GET or POST.');
		   }
		} else if (i = req.url.pathname.match(/^\/login\/confirm\/([A-Za-z\d+\/=]{172})$/)) {
			dbcs.users.findOne({confirm: i[1]}, function(err, user) {
				if (err) throw err;
				if (user) {
					dbcs.users.update({name: user.name}, {
						$set: {
							level: 1,
							cookie: []
						},
						$unset: {confirm: 1}
					});
					respondPage('Account confirmed', user, req, res, function() {
						res.write('<h1>Account confirmed</h1><p>You may <a href="/login/">log in</a> now.</p>');
						respondPageFooter(res);
					});
				} else {
					respondPage('Account confirmation failed', user, req, res, function() {
						res.write('<h1>Account confirmation failed</h1><p>Your token is invalid.</p>');
						respondPageFooter(res);
					});
				}
			});
		} else if (req.url.pathname == '/notifs') {
			if (!user.name) return errorsHTML[403](req, res, 'You must be logged in to view your notifications.');
			respondPage('Notifications', user, req, res, function() {
				res.write('<h1>Notifications</h1>');
				res.write('<ul id="notifs">');
				for (var i = user.notifs.length - 1; i >= 0; i--) res.write(
					'<li class="hglt pad"><em>' + user.notifs[i].type + ' on ' + user.notifs[i].on + '</em><blockquote>' + markdown(user.notifs[i].body) + '</blockquote>' +
					'-' + user.notifs[i].from.link('/user/' + user.notifs[i].from) + ', <time datetime="' + new Date(user.notifs[i].time).toISOString() + '"></time></li>'
				);
				res.write('</ul>');
				respondPageFooter(res);
			});
		} else if (req.url.pathname == '/logout') {
			res.writeHead(303, {
				location: '/',
				'Set-Cookie': 'id='
			});
			dbcs.users.update({name: user.name}, {$set: {cookie: []}});
			res.end();
		} else if (i = req.url.pathname.match(/^\/user\/([a-zA-Z0-9-]{3,16})\/changepass$/)) {
			if (!user) return errorForbidden(req, res, user, 'You must be <a href="/login/">logged in</a> to change your password.');
			if (req.method == 'GET') respondChangePassPage([], user, req, res, {});
			else if (req.method == 'POST') {
				post = '';
				req.on('data', function(data) {
					if (req.abort) return;
					post += data;
					if (post.length > 1e5) {
						res.writeHead(413);
						res.end('Error: Request entity too large.');
						req.abort = true;
					}
				});
				req.on('end', function() {
					if (req.abort) return;
					post = querystring.parse(post);
					if (!user || user.name != i[1]) return errorForbidden(req, res, user);
					if (!post.old || !post.new || !post.conf) return respondChangePassPage(['All fields are required.'], user, req, res, {});
					if (post.new != post.conf) return respondChangePassPage(['New passwords don\'t match.'], user, req, res, {});
					if (passStrength(post.pass) < 1/4) return respondChangePassPage(['Password is too short.'], user, req, res, {});
					crypto.pbkdf2(post.old + user.salt, 'KJ:C5A;_?F!00S(4S[T-3X!#NCZI;A', 1e5, 128, function(err, key) {
						if (err) throw err;
						if (new Buffer(key).toString('base64') != user.pass) return respondChangePassPage(['Incorrect old password.'], user, req, res, {});
						var salt = crypto.randomBytes(64).toString('base64');
						crypto.pbkdf2(post.new + salt, 'KJ:C5A;_?F!00S(4S[T-3X!#NCZI;A', 1e5, 128, function(err, key) {
							if (err) throw err;
							dbcs.users.update({name: user.name}, {
								$set: {
									pass: new Buffer(key).toString('base64'),
									salt: salt,
									cookie: []
								}
							});
							var idCookie = cookie.serialize('id', '', {
								path: '/',
								expires: new Date(),
								httpOnly: true,
								secure: usingSSL
							});
							res.writeHead(303, {
								Location: '/login/?r=updated',
								'Set-Cookie': idCookie
							});
							res.end();
						});
					});
				});
			} else {
				res.writeHead(405);
				res.end('Method not allowed. Use GET or POST.');
			}
		} else if (req.url.pathname == '/chat/newroom') {
			if (!user) return errorForbidden(req, res, user, 'You must be logged in and have 200 reputation to create a room.');
			if (user.rep < 200) return errorForbidden(req, res, user, 'You must have 200 reputation to create a room.');
			if (req.method == 'GET') respondCreateRoomPage([], user, req, res, post);
			else if (req.method == 'POST') {
				post = '';
				req.on('data', function(data) {
					if (req.abort) return;
					post += data;
					if (post.length > 1e5) {
						res.writeHead(413);
						res.end('Error: Request entity too large.');
						req.abort = true;
					}
				});
				req.on('end', function() {
					if (req.abort) return;
					post = querystring.parse(post);
					var errors = [];
					if (!post.name || post.name.length < 4) errors.push('Name must be at least 4 chars long.');
					if (!post.desc || post.desc.length < 16) errors.push('Description must be at least 16 chars long.');
					if (['P', 'R', 'N', 'M'].indexOf(post.type) == -1) errors.push('Invalid room type.');
					if (errors.length) return respondCreateRoomPage(errors, user, req, res, post);
					dbcs.chatrooms.find().sort({_id: -1}).limit(1).nextObject(function(err, last) {
						if (err) throw err;
						var i = last ? last._id + 1 : 1;
						dbcs.chatrooms.insert({
							name: post.name,
							desc: post.desc,
							type: post.type,
							invited: [user.name],
							_id: i
						});
						res.writeHead(303, {'Location': i});
						res.end();
					});
				});
			} else {
				res.writeHead(405);
				res.end('Method not allowed. Use GET or POST.');
			}
		} else if (req.url.pathname.indexOf('.') != -1) {
			fs.stat('./http/' + req.url.pathname, function(err, stats) {
				if (err || !stats.isFile()) return errorNotFound(req, res, user);
				if (cache[req.url.pathname]) {
					res.writeHead(200, {
						'Content-Type': mime[path.extname(req.url.pathname)] || 'text/plain',
						'Cache-Control': 'max-age=6012800, public',
						'ETag': etag(cache[req.url.pathname].data),
						'Vary': 'Accept-Encoding'
					});
					res.end(cache[req.url.pathname].data);
					if (cache[req.url.pathname].updated < stats.mtime) {
						fs.readFile('./http' + req.url.pathname, function(err, data) {
							if (err) return;
							if (path.extname(req.url.pathname) == '.js') data = uglifyJS.minify(data.toString(), {fromString: true}).code;
							if (path.extname(req.url.pathname) == '.css') data = new cleanCSS().minify(data).styles;
							cache[req.url.pathname] = {
								data: data,
								updated: stats.mtime
							};
						});
					}
				} else {
					fs.readFile('./http' + req.url.pathname, function(err, data) {
						if (err) return errorNotFound(req, res, user);
						switch (path.extname(req.url.pathname)) {
							case '.js':
								data = uglifyJS.minify(data.toString(), {fromString: true}).code;
							break;
							case '.css':
								data = new cleanCSS().minify(data).styles;
							break;
						}
						cache[req.url.pathname] = {
							data: data,
							updated: stats.mtime
						};
						res.writeHead(200, {
							'Content-Type': mime[path.extname(req.url.pathname)] || 'text/plain',
							'Cache-Control': 'max-age=6012800, public',
							'ETag': etag(data)
						});
						res.end(data);
					});
				}
			});
		} else {
			for (i = 0; i < buildpageServers.length; i++) {
				if (!req.url.pathname.indexOf(buildpageServers[i][0])) return buildpageServers[i][1](req, res, user || {});
			}
		}
	});
};
if (process.argv.indexOf('--nossl') == -1 && !process.env.NO_SSL) {
	var server = https.createServer({
		key: fs.readFileSync('../Secret/devdoodle.net.key'),
		cert: fs.readFileSync('../Secret/devdoodle.net.crt'),
		ca: [fs.readFileSync('../Secret/devdoodle.net-geotrust.crt')],
		ecdhCurve: 'secp384r1',
		ciphers: [
			'ECDHE-ECDSA-AES256-GCM-SHA384',
			'ECDHE-RSA-AES256-GCM-SHA384',
			'ECDHE-ECDSA-AES128-GCM-SHA256',
			'ECDHE-RSA-AES128-GCM-SHA256',
			'ECDHE-ECDSA-AES256-SHA',
			'ECDHE-RSA-AES256-SHA'
		].join(':'),
		honorCipherOrder: true,
		secureOptions: SSL_ONLY_TLS_1_2
	}, serverHandler);
	server.listen(parseInt(process.argv[2]) || 443);
	var ocspCache = new ocsp.Cache();
	if (process.argv.indexOf('--no-ocsp-stapling') == -1 && !process.env.NO_OCSP_STAPLING) {
		server.on('OCSPRequest', function(cert, issuer, callback) {
			ocsp.getOCSPURI(cert, function(err, uri) {
				if (err) return callback(err);
				var req = ocsp.request.generate(cert, issuer);
				var options = {
					url: uri,
					ocsp: req.data
				};
				ocspCache.request(req.id, options, callback);
			});
		});
	} else console.log('Notice: OCSP stapling is turned OFF.');
	var sslSessionCache = {};
	server.on('newSession', function(sessionId, sessionData, callback) {
		sslSessionCache[sessionId] = sessionData;
		callback();
	});
	server.on('resumeSession', function (sessionId, callback) {
		callback(null, sslSessionCache[sessionId]);
	});
	console.log('server.js running on port ' + (parseInt(process.argv[2]) || 443));
	if (!parseInt(process.argv[2])) {
		http.createServer(function(req, res) {
			res.writeHead(301, {
				Location: 'https://' + req.headers.host + (parseInt(process.argv[2]) ? ':' + process.argv[2] : '') + req.url
			});
			res.end();
		}).listen(80);
		console.log('Notice: HTTP on port 80 will redirect to HTTPS on port ' + (parseInt(process.argv[2]) || 443));
	}
} else {
	usingSSL = false;
	http.createServer(serverHandler).listen(process.argv[2] || 80);
	console.log('server.js running on port ' + (process.argv[2] || 80));
}