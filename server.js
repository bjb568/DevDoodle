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

global.o = require('yield-yield');
global.config = require('./config.js')[process.argv.indexOf('--test') == -1 ? 'normal' : 'test'];

var colors = require('colors'),
	http = require('http'),
	https = require('https'),
	http2 = require('http2'),
	uglifyJS = require('uglify-js'),
	cleanCSS = require('clean-css'),
	zlib = require('zlib'),
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

global.githubAuth = '{}';
try {
	githubAuth = fs.readFileSync('../Secret/github-auth.json');
} catch(e) {
	console.log(e.toString());
	console.log('We won\'t be able to log users in with GitHub.'.yellow);
}
githubAuth = JSON.parse(githubAuth);

global.getVersionNonce = o(function*(pn, file, cb) {
	try {
		cb(null, crypto.createHash('md5').update(yield fs.readFile('http' + path.resolve(pn, pn[pn.length - 1] == '/' ? '' : '..', file), yield)).digest('hex'));
	} catch(e) {
		cb(e);
	}
});
global.addVersionNonces = o(function*(str, pn, cb) {
	for (let i = 0; i < str.length; i++) {
		if (str.substr(i).match(/^\.[A-z]{1,8}"/)) {
			while (str[i] && str[i] != '"') i++;
			try {
				str = str.substr(0, i) + '?v=' + (yield getVersionNonce(pn, str.substr(0, i).match(/"[^"]+?$/)[0].substr(1), yield)) + str.substr(i);
			} catch(e) {
				console.log(e);
			}
		}
	}
	cb(null, str);
});
global.respondPage = o(function*(title, user, req, res, callback, header, status) {
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
	if (typeof header['Vary'] != 'string') header['Vary'] = 'Cookie';
	if (typeof header['Content-Security-Policy'] != 'string') {
		header['Content-Security-Policy'] =
			"default-src 'self'; " +
			"connect-src 'self' " + (config.HTTP2 ? "wss://" : "ws://") + req.headers.host + ";" +
			" child-src blob:; " +
			((req.headers['user-agent'] || '').indexOf('Firefox') != -1 ? ' frame-src blob:;' : '') +
			"img-src https://*";
	}
	if (config.HTTP2) header['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
	header['Public-Key-Pins'] = 'pin-sha256="B9Zw6fj5NucVKxVjhJX27HOBvnV+IyFbFwEMmYQ5Y5g="; pin-sha256="Gug+FC9PsilgbCb/VyBoLmXBNzizAL2VpCXDAEhuVOY="; max-age=2592000; includeSubdomains';
	if (user) {
		dbcs.users.update({name: user.name}, {$set: {seen: new Date().getTime()}});
		if (!header['Set-Cookie'] && new Date() - user.seen > 3600000) {
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
				secure: config.secureCookies
			});
		}
	}
	res.writeHead(status || 200, header);
	var data = (yield fs.readFile('html/a/head.html', yield)).toString();
	if ((user = huser || user) && user.name) data = data.replace('<a href="/login/"><span>Log&#160;in</span>', '<a$notifs href="/user/' + user.name + '"><span>' + user.name + '</span>');
	var dirs = req.url.pathname.split('/');
	if (dirs[1] == 'dev' || dirs[1] == 'qa') data = data.replace('id="nav"', 'id="nav" class="sub"');
	res.write(
		yield addVersionNonces(
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
				'<a href="/mod/"><span>Mod</span></a>',
				user && user.level > 1 ? '<a href="/mod/"><span>Mod</span></a>' : ''
			).replace('main.css', clean ? 'clean.css' : 'main.css'),
			req.url.pathname,
			yield
		)
	);
	callback();
});
global.errorForbidden = function(req, res, user, msg) {
	respondPage('403', user, req, res, o(function*() {
		res.write('<h1>Error 403</h1>');
		res.write(msg || '<p>Permission denied. If you think this is a mistake, please <a href="mailto:support@devdoodle.net">let us know</a>.</p>');
		res.write('<p><a href="javascript:history.go(-1)">Go back</a>.</p>');
		res.end(yield fs.readFile('html/a/foot.html', yield));
	}), {}, 403);
};
global.errorNotFound = function(req, res, user) {
	respondPage('404', user, req, res, o(function*() {
		res.write('<h1>Error 404 :(</h1>');
		res.write('<p>The requested file could not be found. If you found a broken link, please <a href="mailto:support@devdoodle.net">let us know</a>.</p>');
		res.write('<p><a href="javascript:history.go(-1)">Go back</a>, <a href="/search/?q=' + encodeURIComponent(req.url.pathname.replaceAll('/', ' ')) + '">Search</a>.</p>');
		res.end(yield fs.readFile('html/a/foot.html', yield));
	}), {}, 404);
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

var respondLoginPage = o(function*(errs, user, req, res, post, fillm, filln, fpass) {
	if (!post) post = {};
	var num = 0;
	while (!num) num = Math.floor(Math.random() * 25 - 12);
	yield respondPage('Login', user, req, res, yield, {
		inhead: '<meta name="robots" content="noindex" /><link rel="stylesheet" href="/login/login.css" />'
	});
	res.write('<h1>Log in</h1>');
	var notice = ({
		ask: 'You must be logged in to ask a question.',
		recovered: 'Your password has been reset. You may now login.',
		updated: 'Your password has been updated. You may now login with your new password.'
	})[post.r];
	res.write(errorsHTML(errs) || (notice ? '<div class="notice">' + notice + '</div>' : ''));
	res.write('<a href="https://github.com/login/oauth/authorize?client_id=' + githubAuth.client_id + '&amp;state=' + encodeURIComponent(req.headers.referer || '') + '" id="github-button"><svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 120 120"><path d="M60 1.103C26.653 1.103-0.388 28.138-0.388 61.491 -0.388 88.171 16.915 110.807 40.909 118.792 43.927 119.351 45.035 117.482 45.035 115.887 45.035 114.448 44.979 109.69 44.953 104.644 28.153 108.297 24.608 97.519 24.608 97.519 21.861 90.54 17.903 88.683 17.903 88.683 12.424 84.935 18.316 85.012 18.316 85.012 24.38 85.438 27.573 91.236 27.573 91.236 32.959 100.467 41.7 97.798 45.146 96.255 45.689 92.353 47.253 89.688 48.98 88.18 35.567 86.654 21.467 81.475 21.467 58.336 21.467 51.744 23.826 46.356 27.689 42.127 27.062 40.606 24.995 34.464 28.275 26.146 28.275 26.146 33.346 24.524 44.885 32.337 49.702 30.999 54.868 30.328 60 30.304 65.132 30.328 70.302 30.999 75.128 32.337 86.654 24.524 91.718 26.146 91.718 26.146 95.005 34.464 92.938 40.606 92.311 42.127 96.183 46.356 98.525 51.744 98.525 58.336 98.525 81.531 84.398 86.637 70.951 88.132 73.117 90.006 75.047 93.681 75.047 99.315 75.047 107.395 74.978 113.898 74.978 115.887 74.978 117.495 76.064 119.377 79.125 118.785 103.107 110.791 120.388 88.163 120.388 61.491 120.388 28.138 93.351 1.103 60 1.103" fill="#161514" /></svg> Log in with GitHub</a>');
	res.write('<p class="bumar">Or on DevDoodle:</p>');
	res.write('<form method="post">');
	res.write('<input type="checkbox" name="create" id="create"' + (post.create ? ' checked=""' : '') + ' /> <label for="create">Create an account</label>');
	res.write(
		'<div>' +
			'<input type="text" id="name" name="name" placeholder="Name"' +
				(filln && post.name ? ' value="' + html(post.name) + '"' : '') +
				' required="" maxlength="16"' +
			' autocapitalize="none" /> ' +
			'<span id="name-error" class="red"> </span>' +
		'</div>'
	);
	res.write(
		'<div><input type="password" id="pass" name="pass" placeholder="Password" required=""' + (fpass ? ' autofocus=""' : '') + ' /> ' +
		'<span id="pass-bad" class="red" hidden="">too short</span></div>'
	);
	res.write('<div id="ccreate">');
	res.write('<div id="pass-bar-outer"><div id="pass-bar"></div></div>');
	res.write('<div><input type="password" id="passc" name="passc" placeholder="Confirm Password" /> <span id="pass-match" class="red" hidden="">doesn\'t match</span></div>');
	res.write('<p><small>Please use a password manager to store passwords</small></p>');
	res.write('<div><input type="email" name="mail" id="mail" maxlength="256" placeholder="Email"' + (fillm && post.mail ? ' value="' + html(post.mail) + '"' : '') + ' /></div>');
	res.write('<p id="sec" data-num="' + num + '">[No JS]<input type="text" name="sec' + num + '" placeholder="Confirm you\'re human" autocorrect="off" autocapitalize="none" /></p>');
	res.write('</div>');
	res.write('<input type="hidden" name="referer" value="' + html(post.referer || '') + '" />');
	res.write('<button type="submit" id="submit" class="umar">Submit</button>');
	res.write('</form>');
	res.write('<p class="bumar"><small><a href="recover">Recover account from email</a></small></p>');
	res.write(yield addVersionNonces('<script src="login.js"></script>', req.url.pathname, yield));
	res.end(yield fs.readFile('html/a/foot.html', yield));
});
var respondChangePassPage = o(function*(errs, user, req, res, post) {
	if (!post) post = {};
	yield respondPage('Change Password', user, req, res, yield, {inhead: '<link rel="stylesheet" href="/login/login.css" />'});
	res.write('<h1>Change Password for ' + user.name + '</h1>');
	res.write(errorsHTML(errs));
	res.write('<form method="post">');
	res.write('<div><input type="password" id="old" name="old" placeholder="Old password" required="" autofocus="" /></div>');
	res.write('<div><input type="password" id="new" name="new" placeholder="New password" required="" /> <span id="pass-bad" class="red" hidden="">too short</span></div>');
	res.write('<div id="pass-bar-outer"><div id="pass-bar"></div></div>');
	res.write('<div><input type="password" id="conf" name="conf" placeholder="Confirm Password" /> <span id="pass-match" class="red" hidden="">doesn\'t match</span></div>');
	res.write('<p><small>Please use a password manager to store passwords</small></p>');
	res.write('<button type="submit" id="submit" disabled="">Submit</button>');
	res.write('</form>');
	res.write(yield addVersionNonces('<script src="/login/changepass.js"></script>', req.url.pathname, yield));
	res.end(yield fs.readFile('html/a/foot.html', yield));
});
var respondCreateRoomPage = o(function*(errs, user, req, res, post) {
	if (!post) post = {};
	yield respondPage('Create Room', user, req, res, yield);
	res.write('<h1>Create Room</h1>');
	res.write(errorsHTML(errs));
	res.write('<form method="post">');
	res.write('<div>Name: <input type="text" name="name" required="" value="' + html(post.name || '') + '" /></div>');
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
	res.end(yield fs.readFile('html/a/foot.html', yield));
});

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

var cache = {},
	tempVerificationTokens = {};

var serverHandler = o(function*(req, res) {
	if (!req.headers.host) {
		res.writeHead(400, {'Content-Type': 'text/html'});
		return res.end('Please send the host HTTP header.');
	} else if (req.headers.host == '205.186.144.188') {
		res.writeHead(400, {'Content-type': 'text/html'});
		return res.end('Perhaps you were looking for <a href="https://devdoodle.net">devdoodle.net</a>?');
	} else if (req.headers.host != 'devdoodle.net' && !req.headers.host.match(/localhost(:\d+)?/) && req.headers.host.match(/[^\d.:]/)) {
		res.writeHead(400, {'Content-type': 'text/html'});
		return res.end('This is the server for <a href="https://devdoodle.net">devdoodle.net</a>. You must connect to this server from that domain.');
	}
	var i, post;
	if (req.url.length > 1000) {
		req.url = url.parse(req.url, true);
		yield respondPage('414', {}, req, res, yield, {}, 414);
		res.write('<h1>Error 414</h1>');
		res.write('<p>Request URI too long.</p>');
		res.write('<p><a href="javascript:history.go(-1)">Go back</a>.</p>');
		return res.end(yield fs.readFile('html/a/foot.html', yield));
	}
	var cookies = cookie.parse(req.headers.cookie || '');
	req.url = url.parse(req.url, true);
	console.log(req.method, req.url.pathname);
	var user = yield dbcs.users.findOne({
		cookie: {
			$elemMatch: {
				token: cookies.id || 'nomatch',
				created: {$gt: new Date() - 2592000000}
			}
		}
	}, yield);
	if (i = statics[req.url.pathname]) {
		yield respondPage(i.title, user, req, res, yield, {
			clean: i.clean,
			inhead: i.inhead
		});
		res.write(
			(yield addVersionNonces((yield fs.readFile(i.path, yield)).toString(), req.url.pathname, yield))
			.replace('$canvasjs', html(canvasJS))
		);
		res.end(yield fs.readFile('html/a/foot.html', yield));
	} else if (req.url.pathname.substr(0, 5) == '/api/') {
		req.url.pathname = req.url.pathname.substr(4);
		if (req.method != 'POST') return res.writeHead(405) || res.end('Error: Method not allowed. Use POST.');
		if (url.parse(req.headers.referer).host != req.headers.host) return res.writeHead(409) || res.end('Error: Suspicious request.');
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
			yield respondPage('New Lesson', user, req, res, yield, {
				clean: true,
				inhead: '<link rel="stylesheet" href="/learn/course.css" />\n<link rel="stylesheet" href="/learn/newlesson.css" />'
			});
			res.write(
				(yield addVersionNonces((yield fs.readFile('html/learn/newlesson.html', yield)).toString(), req.url.pathname, yield))
				.replace('$title', html(req.url.query.title || ''))
				.replace(/\$[^\/\s"<]+/g, '')
			);
			res.end(yield fs.readFile('html/a/foot.html', yield));
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
			req.on('end', o(function*() {
				if (req.abort) return;
				post = querystring.parse(post);
				if (parseInt(req.url.query.submit)) {
					if (!user) return errorForbidden(req, res, user, 'You must be logged in to submit a lesson.');
					var lesson = yield dbcs.lessons.findOne({
						user: user.name,
						title: post.title || 'Untitled'
					}, yield);
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
						var last = yield dbcs.lessons.find().sort({_id: -1}).limit(1).nextObject(yield),
							id = last ? last._id + 1 : 1;
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
					}
				} else if (parseInt(req.url.query.preview)) {
					yield respondPage('Previewing ' + post.title + ': ' + post.stitle, user, req, res, yield, {
						clean: true,
						inhead: '<link rel="stylesheet" href="/learn/course.css" />\n<link rel="stylesheet" href="/learn/lessonpreview.css" />'
					});
					res.write(
						(yield addVersionNonces((yield fs.readFile('html/learn/lessonpreview.html', yield)).toString(), req.url.pathname, yield))
						.replaceAll(
							['$title', '$stitle', '$sbody', '$validate', '$html', '$md-sbody'],
							[html(post.title || ''), html(post.stitle || ''), html(post.sbody || ''), html(post.validate || ''), html(post.html || ''), markdown(post.sbody || '')]
						)
					);
					res.end(yield fs.readFile('html/a/foot.html', yield));
				} else {
					yield respondPage('New Lesson', user, req, res, yield, {
						clean: true,
						inhead: '<link rel="stylesheet" href="/learn/course.css" />\n<link rel="stylesheet" href="/learn/newlesson.css" />'
					});
					res.write(
						(yield addVersionNonces((yield fs.readFile('html/learn/newlesson.html', yield)).toString(), req.url.pathname, yield))
						.replaceAll(
							['$title', '$stitle', '$sbody', '$html'],
							[html(post.title || ''), html(post.stitle || ''), html(post.sbody || ''), html(post.html || '')]
						).replace(/>function[\s\S]+?<\/textarea/, '>' + html(post.validate || '') + '</textarea')
					);
					res.end(yield fs.readFile('html/a/foot.html', yield));
				}
			}));
		} else {
			res.writeHead(405);
			res.end('Method not allowed. Use GET or POST.');
		}
	} else if (req.url.pathname == '/login/') {
		if (req.method == 'GET') respondLoginPage([], user, req, res, {referer: req.headers.referer, r: req.url.query.r});
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
			req.on('end', o(function*() {
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
						str = str.replace(/\s/g, '').replace(/1?\*?(x\^2|x\s*\*\s*x|x\s*\*\*\s*2|x²)/, 'x^2');
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
					var existingUser = yield dbcs.users.findOne({name: post.name}, yield);
					if (existingUser) return respondLoginPage(['Username already taken.'], user, req, res, post, true);
					var salt = crypto.randomBytes(64).toString('base64'),
						key = yield crypto.pbkdf2(post.pass + salt, 'KJ:C5A;_?F!00S(4S[T-3X!#NCZI;A', 1e5, 128, yield),
						pass = new Buffer(key).toString('base64'),
						confirmToken = crypto.randomBytes(128).toString('base64');
					dbcs.users.insert({
						name: post.name,
						pass: pass,
						mail: post.mail,
						pic: 'https://gravatar.com/avatar/' + crypto.createHash('md5').update(post.mail).digest('hex') + '?s=576&amp;d=identicon',
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
							'<p>An account on devdoodle has been made for this email address under the name ' + post.name + '. ' +
							'Confirm your account creation <a href="http://devdoodle.net/login/confirm/' + confirmToken + '">here</a>.</p>'
					});
					yield respondPage('Account Created', user, req, res, yield);
					res.write('An account for you has been created. To activate it, click the link in the email sent to you. It may take a few minutes for the email to reach you, but please check your spam folder.');
					res.end(yield fs.readFile('html/a/foot.html', yield));
				} else {
					if (!post.name || !post.pass) return respondLoginPage(['All fields are required.'], user, req, res, post, true, true, post.name && !post.pass);
					var fuser = yield dbcs.users.findOne({name: post.name}, yield);
					if (!fuser) return respondLoginPage(['Invalid Credentials.'], user, req, res, post);
					if (fuser.confirm) {
						if (fuser.seen) return respondLoginPage(['This account has been disabled by a user-initiated password reset. It can be <a href="recover">recovered with email verification</a>.'], user, req, res, post);
						yield respondPage('Confirm Account', user, req, res, yield);
						res.write(
							(yield addVersionNonces((yield fs.readFile('html/login/login-confirm.html', yield)).toString(), req.url.pathname, yield))
							.replaceAll(['$user', '$pass', '$mail'], [fuser.name, html(post.pass), html(fuser.mail)])
						);
						return res.end(yield fs.readFile('html/a/foot.html', yield));
					}
					if (fuser.level < 1) return respondLoginPage(['This account has been disabled.'], user, req, res, post);
					var key = yield crypto.pbkdf2(post.pass + fuser.salt, 'KJ:C5A;_?F!00S(4S[T-3X!#NCZI;A', 1e5, 128, yield);
					if (key.toString('base64') != fuser.pass) return respondLoginPage(['Invalid Credentials.'], user, req, res, post);
					var idToken = crypto.randomBytes(128).toString('base64'),
						idCookie = cookie.serialize('id', idToken, {
							path: '/',
							expires: new Date(new Date().setDate(new Date().getDate() + 30)),
							httpOnly: true,
							secure: config.secureCookies
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
					res.writeHead(303, {
						Location: referer && referer.host == req.headers.host && referer.pathname.indexOf('login') == -1 && referer.pathname != '/' ? referer.pathname : '/',
						'Set-Cookie': idCookie
					});
					return res.end();
				}
			}));
		} else {
			res.writeHead(405);
			res.end('Method not allowed. Use GET or POST.');
		}
	} else if (req.url.pathname == '/login/github') {
		var tryagain = '<a xmlns="http://www.w3.org/1999/xhtml" href="https://github.com/login/oauth/authorize?client_id=' + githubAuth.client_id + '&amp;state=' + encodeURIComponent(req.url.query.state) + '">Try again.</a>';
		var ghReq = https.request({
			hostname: 'github.com',
			path: '/login/oauth/access_token',
			method: 'POST',
			headers: {Accept: 'application/json'}
		}, o(function*(ghRes) {
			var data = '';
			ghRes.on('data', function(d) {
				data += d;
			});
			yield ghRes.on('end', yield);
			try {
				data = JSON.parse(data);
				console.log(data);
				if (data.error) {
					yield respondPage('Login Error', user, req, res, yield, {}, 500);
					res.write('<h1>Login Error</h1>');
					res.write('<p>An error was recieved from GitHub. ' + tryagain + '</p>');
					res.write(errorsHTML([data.error + ': ' + data.error_description]));
					return res.end(yield fs.readFile('html/a/foot.html', yield));
				}
				var apiReq = https.get({
					hostname: 'api.github.com',
					path: '/user',
					headers: {
						'Authorization': 'token ' + data.access_token,
						'User-Agent': 'DevDoodle'
					}
				}, o(function*(apiRes) {
					var apiData = '';
					apiRes.on('data', function(d) {
						apiData += d;
					});
					yield apiRes.on('end', yield);
					try {
						apiData = JSON.parse(apiData);
						if (apiData.error) {
							yield respondPage('Login Error', user, req, res, yield, {}, 500);
							res.write('<h1>Login Error</h1>');
							res.write('<p>An error was recieved from the GitHub API. ' + tryagain + '</p>');
							res.write(errorsHTML([apiData.error + ': ' + apiData.error_description]));
							return res.end(yield fs.readFile('html/a/foot.html', yield));
						}
						console.log(apiData);
						var matchUser = yield dbcs.users.findOne({githubID: apiData.id}, yield);
						if (matchUser) {
							var idToken = crypto.randomBytes(128).toString('base64'),
								idCookie = cookie.serialize('id', idToken, {
									path: '/',
									expires: new Date(new Date().setDate(new Date().getDate() + 30)),
									httpOnly: true,
									secure: config.secureCookies
								});
							dbcs.users.update({githubID: apiData.id}, {
								$push: {
									cookie: {
										token: idToken,
										created: new Date().getTime()
									}
								},
								$set: {githubName: apiData.login}
							});
							var referer = url.parse(req.url.query.state);
							res.writeHead(303, {
								Location: referer && referer.host == req.headers.host && referer.pathname.indexOf('login') == -1 ? referer.pathname : '/',
								'Set-Cookie': idCookie
							});
							return res.end();
						} else {
							yield respondPage('Create Login', user, req, res, yield);
							var verificationToken = crypto.randomBytes(128).toString('base64');
							res.write(
								(yield addVersionNonces((yield fs.readFile('html/login/new-from-github.html', yield)).toString(), req.url.pathname, yield))
								.replace('$errors', '')
								.replace('$verification-token', verificationToken)
								.replace('$name', (yield dbcs.users.findOne({name: apiData.login}, yield)) ? '' : html(apiData.login))
								.replace('$mail', apiData.email || '')
							);
							tempVerificationTokens[verificationToken] = {
								githubID: apiData.id,
								githubName: apiData.login,
								pic: apiData.avatar_url
							};
							res.end(yield fs.readFile('html/a/foot.html', yield));
						}
					} catch(e) {console.log(e);
						yield respondPage('Login Error', user, req, res, yield, {}, 500);
						res.write('<h1>Login Error</h1>');
						res.write('<p>An invalid response was recieved from the GitHub API. ' + tryagain + '</p>');
						res.end(yield fs.readFile('html/a/foot.html', yield));
					}
				}));
				apiReq.on('error', o(function*(e) {
					yield respondPage('Login Error', user, req, res, yield, {}, 500);
					res.write('<h1>Login Error</h1>');
					res.write('<p>HTTP error when connecting to the GitHub API: ' + e + ' ' + tryagain + '</p>');
					res.end(yield fs.readFile('html/a/foot.html', yield));
				}));
			} catch(e) {
				yield respondPage('Login Error', user, req, res, yield, {}, 500);
				res.write('<h1>Login Error</h1>');
				res.write('<p>An invalid response was recieved from GitHub. ' + tryagain + '</p>');
				res.end(yield fs.readFile('html/a/foot.html', yield));
			}
		}));
		ghReq.end('client_id=' + githubAuth.client_id + '&client_secret=' + githubAuth.client_secret + '&code=' + encodeURIComponent(req.url.query.code));
		ghReq.on('error', o(function*(e) {
			yield respondPage('Login Error', user, req, res, yield, {}, 500);
			res.write('<h1>Login Error</h1>');
			res.write('<p>HTTP error when connecting to GitHub: ' + e + ' ' + tryagain + '</p>');
			res.end(yield fs.readFile('html/a/foot.html', yield));
		}));
	} else if (req.url.pathname == '/login/new') {
		if (req.method != 'POST') return res.writeHead(405) || res.end('Method not allowed. Use POST.');
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
		req.on('end', o(function*() {
			if (req.abort) return;
			post = querystring.parse(post);
			if (!tempVerificationTokens[post.token]) return errorForbidden(req, res, user, 'Invalid verification token.');
			var errors = [];
			if (!post.name) errors.push('Name is a required field.');
			if (!post.mail) errors.push('Email address is a required field.');
			if (post.name.length > 16) errors.push('Name must be no longer than 16 characters.');
			if (post.name.length < 3) errors.push('Name must be at least 3 characters long.');
			if (!post.name.match(/^[a-zA-Z0-9-]+$/)) errors.push('Name may only contain alphanumeric characters and dashes.');
			if (post.name.indexOf(/---/) != -1) errors.push('Name may not contain a sequence of 3 dashes.');
			if (post.mail.length > 4096) errors.push('Email address must be no longer than 4096 characters.');
			if (yield dbcs.users.findOne({name: post.name}, yield)) errors.push('Name has already been taken.');
			if (errors.length) {
				yield respondPage('Create Login', user, req, res, yield);
				var verificationToken = crypto.randomBytes(128).toString('base64');
				res.write(
					(yield addVersionNonces((yield fs.readFile('html/login/new-from-github.html', yield)).toString(), req.url.pathname, yield))
					.replace('$errors', errorsHTML(errors))
					.replace('$verification-token', post.token || '')
					.replace('$name', post.name || '')
					.replace('$mail', post.mail || '')
				);
				return res.end(yield fs.readFile('html/a/foot.html', yield));
			}
			var idToken = crypto.randomBytes(128).toString('base64'),
				idCookie = cookie.serialize('id', idToken, {
					path: '/',
					expires: new Date(new Date().setDate(new Date().getDate() + 30)),
					httpOnly: true,
					secure: config.secureCookies
				}),
				user = {
					name: post.name,
					mail: post.mail,
					pic: tempVerificationTokens[post.token].pic,
					githubID: tempVerificationTokens[post.token].githubID,
					githubName: tempVerificationTokens[post.token].githubName,
					joined: new Date().getTime(),
					rep: 0,
					level: 1,
					cookie: [{
						token: idToken,
						created: new Date().getTime()
					}]
				};
			dbcs.users.insert(user);
			delete tempVerificationTokens[post.token];
			yield respondPage('Account Created', user, req, res, yield, {'Set-Cookie': idCookie});
			res.write('An account for you has been created. You are now logged in.');
			res.end(yield fs.readFile('html/a/foot.html', yield));
		}));
	} else if (i = req.url.pathname.match(/^\/login\/confirm\/([A-Za-z\d+\/=]{172})$/)) {
		user = yield dbcs.users.findOne({confirm: i[1]}, yield);
		if (user) {
			dbcs.users.update({name: user.name}, {
				$set: {
					level: 1,
					cookie: []
				},
				$unset: {confirm: 1}
			});
			yield respondPage('Account confirmed', user, req, res, yield);
			res.write('<h1>Account confirmed</h1><p>You may <a href="/login/">log in</a> now.</p>');
			res.end(yield fs.readFile('html/a/foot.html', yield));
		} else {
			yield respondPage('Account confirmation failed', user, req, res, yield);
			res.write('<h1>Account confirmation failed</h1><p>Your token is invalid.</p>');
			res.end(yield fs.readFile('html/a/foot.html', yield));
		}
	} else if (req.url.pathname == '/notifs') {
		if (!user.name) return errorForbidden(req, res, 'You must be logged in to view your notifications.');
		yield respondPage('Notifications', user, req, res, yield);
		res.write('<h1>Notifications</h1>');
		res.write('<ul id="notifs">');
		for (var i = user.notifs.length - 1; i >= 0; i--) res.write(
			'<li class="hglt pad"><em>' + user.notifs[i].type + ' on ' + user.notifs[i].on + '</em><blockquote>' + markdown(user.notifs[i].body) + '</blockquote>' +
			'-' + user.notifs[i].from.link('/user/' + user.notifs[i].from) + ', <time datetime="' + new Date(user.notifs[i].time).toISOString() + '"></time></li>'
		);
		res.write('</ul>');
		res.end(yield fs.readFile('html/a/foot.html', yield));
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
			req.on('end', o(function*() {
				if (req.abort) return;
				post = querystring.parse(post);
				if (!user || user.name != i[1]) return errorForbidden(req, res, user);
				if (!post.old || !post.new || !post.conf) return respondChangePassPage(['All fields are required.'], user, req, res, {});
				if (post.new != post.conf) return respondChangePassPage(['New passwords don\'t match.'], user, req, res, {});
				if (passStrength(post.pass) < 1/4) return respondChangePassPage(['Password is too short.'], user, req, res, {});
				var key = yield crypto.pbkdf2(post.old + user.salt, 'KJ:C5A;_?F!00S(4S[T-3X!#NCZI;A', 1e5, 128, yield);
				if (new Buffer(key).toString('base64') != user.pass) return respondChangePassPage(['Incorrect old password.'], user, req, res, {});
				var salt = crypto.randomBytes(64).toString('base64'),
					key = yield crypto.pbkdf2(post.new + salt, 'KJ:C5A;_?F!00S(4S[T-3X!#NCZI;A', 1e5, 128, yield);
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
					secure: config.secureCookies
				});
				res.writeHead(303, {
					Location: '/login/?r=updated',
					'Set-Cookie': idCookie
				});
				res.end();
			}));
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
			req.on('end', o(function*() {
				if (req.abort) return;
				post = querystring.parse(post);
				var errors = [];
				if (!post.name || post.name.length < 4) errors.push('Name must be at least 4 chars long.');
				if (!post.desc || post.desc.length < 16) errors.push('Description must be at least 16 chars long.');
				if (['P', 'R', 'N', 'M'].indexOf(post.type) == -1) errors.push('Invalid room type.');
				if (errors.length) return respondCreateRoomPage(errors, user, req, res, post);
				var last = yield dbcs.chatrooms.find().sort({_id: -1}).limit(1).nextObject(yield),
					i = last ? last._id + 1 : 1;
				dbcs.chatrooms.insert({
					name: post.name,
					desc: post.desc,
					type: post.type,
					invited: [user.name],
					_id: i
				});
				res.writeHead(303, {'Location': i});
				res.end();
			}));
		} else {
			res.writeHead(405);
			res.end('Method not allowed. Use GET or POST.');
		}
	} else if (req.url.pathname.indexOf('.') != -1) {
		try {
			var stats = yield fs.stat('./http/' + req.url.pathname, yield);
		} catch(e) { return errorNotFound(req, res, user); }
		if (!stats.isFile()) return errorNotFound(req, res, user);
		var raw = !req.headers['accept-encoding'] || req.headers['accept-encoding'].indexOf('gzip') == -1 || req.headers['accept-encoding'].indexOf('gzip;q=0') != -1;
		if (cache[req.url.pathname]) {
			res.writeHead(200, {
				'Content-Encoding': raw ? 'identity' : 'gzip',
				'Content-Type': (mime[path.extname(req.url.pathname)] || 'text/plain') + '; charset=utf-8',
				'Cache-Control': 'max-age=6012800, public',
				'ETag': etag(cache[req.url.pathname].raw),
				'Vary': 'Accept-Encoding'
			});
			res.end(cache[req.url.pathname][raw ? 'raw' : 'gzip']);
			if (cache[req.url.pathname].updated < stats.mtime) {
				try {
					var data = yield fs.readFile('http' + req.url.pathname, yield);
				} catch(e) { return; }
				switch (path.extname(req.url.pathname)) {
					case '.js': data = uglifyJS.minify(data.toString(), {fromString: true}).code;
					break;
					case '.css': data = new cleanCSS().minify(data).styles;
					break;
				}
				cache[req.url.pathname] = {
					raw: data,
					gzip: data == cache[req.url.pathname].raw ? cache[req.url.pathname].gzip : yield zlib.gzip(data, yield),
					updated: stats.mtime
				};
			}
		} else {
			try {
				var data = yield fs.readFile('http' + req.url.pathname, yield);
			} catch(e) { return errorNotFound(req, res, user); }
			switch (path.extname(req.url.pathname)) {
				case '.js': data = uglifyJS.minify(data.toString(), {fromString: true}).code;
				break;
				case '.css': data = new cleanCSS().minify(data).styles;
				break;
			}
			cache[req.url.pathname] = {
				raw: data,
				gzip: yield zlib.gzip(data, yield),
				updated: stats.mtime
			};
			res.writeHead(200, {
				'Content-Encoding': raw ? 'identity' : 'gzip',
				'Content-Type': (mime[path.extname(req.url.pathname)] || 'text/plain') + '; charset=utf-8',
				'Cache-Control': 'max-age=6012800, public',
				'ETag': etag(data),
				'Vary': 'Accept-Encoding'
			});
			res.end(cache[req.url.pathname][raw ? 'raw' : 'gzip']);
		}
	} else {
		for (i = 0; i < buildpageServers.length; i++) {
			if (!req.url.pathname.indexOf(buildpageServers[i][0])) return buildpageServers[i][1](req, res, user || {});
		}
	}
});
console.log('Connecting to mongodb…'.cyan);
var server;
mongo.connect('mongodb://localhost:27017/DevDoodle/', function(err, db) {
	if (err) throw err;
	db.createCollection('questions', function(err, collection) {
		if (err) throw err;
		db.createIndex('questions', {description: 'text'}, {}, function() {});
		dbcs.questions = collection;
	});
	db.createCollection('chat', function(err, collection) {
		if (err) throw err;
		db.createIndex('chat', {body: 'text'}, {}, function() {});
		dbcs.chat = collection;
	});
	var i = usedDBCs.length;
	function handleCollection(err, collection) {
		if (err) throw err;
		dbcs[usedDBCs[i]] = collection;
		if (usedDBCs[i] == 'chatusers') collection.drop();
	}
	while (i--) db.collection(usedDBCs[i], handleCollection);
	console.log('Connected to mongodb.'.cyan);
	if (process.argv.indexOf('--test') != -1) {
		console.log('Running test, process will terminate when finished.'.yellow);
		http.get({
			port: config.port,
			headers: {host: 'localhost'}
		}, function(testRes) {
			testRes.on('data', function(d) {
				console.log('Data received (' + d.length + ' char' + (d.length == 1 ? '' : 's') + '):' + ('\n> ' + d.toString().replaceAll('\n', '\n> ')).grey);
			});
			testRes.on('end', function() {
				console.log('HTTP test passed, starting socket test.'.green);
				var WebSocket = require('ws'),
					wsc = new WebSocket('ws://localhost:' + config.port + '/test');
				wsc.on('open', function() {
					console.log('Connected to socket.');
				})
				wsc.on('data', function(d) {
					console.log('Data received (' + d.length + ' char' + (d.length == 1 ? '' : 's') + '):' + ('\n> ' + d.toString().replaceAll('\n', '\n> ')).grey);
				});
				wsc.on('close', function() {
					console.log('Things seem to work!'.green);
					process.exit();
				})
			})
		});
	}
	if (!config.HTTP2) {
		server = http.createServer(serverHandler).listen(config.port);
		console.log(('DevDoodle running on port ' + config.port + ' over plain HTTP.').cyan);
	} else {
		var constants = require('constants');
		const SSL_ONLY_TLS_1_2 = constants.SSL_OP_NO_TLSv1_1|constants.SSL_OP_NO_TLSv1|constants.SSL_OP_NO_SSLv3|constants.SSL_OP_NO_SSLv2;
		server = http2.createServer({
			key: fs.readFileSync('../Secret/devdoodle.net.key'),
			cert: fs.readFileSync('../Secret/devdoodle.net.crt'),
			ca: [fs.readFileSync('../Secret/devdoodle.net-chain.crt')],
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
		server.listen(config.port);
		console.log(('DevDoodle running on port ' + config.port + ' over HTTP2.').cyan);
	}
	if (config.port80redirect) {
		http.createServer(function(req, res) {
			res.writeHead(301, {
				Location: 'https://' + req.headers.host + (config.port == 443 ? '' : ':' + config.port) + req.url
			});
			res.end();
		}).listen(80);
		console.log(('HTTP on port 80 will redirect to HTTPS on port ' + config.port + '.').cyan);
	}
	if (config.sockets) require('./sockets.js').init(server);
});