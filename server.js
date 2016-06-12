'use strict';
require('./utility/essentials.js');
require('colors');
let http = require('http'),
	https = require('https'),
	http2 = require('http2'),
	uglifyJS = require('uglify-js'),
	CleanCSS = require('clean-css'),
	zlib = require('zlib'),
	fs = require('fs'),
	path = require('path'),
	url = require('url'),
	querystring = require('querystring'),
	cookie = require('cookie'),
	crypto = require('crypto'),
	mongo = require('mongodb').MongoClient;
global.dbcs = {};
const usedDBCs = [
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
	'commenthistory',
	'votes',
	'lessons'
];

global.githubAuth = '{}';
try {
	githubAuth = fs.readFileSync('../Secret/github-auth.json');
} catch (e) {
	console.log(e.toString());
	console.log('We won\'t be able to log users in with GitHub.'.yellow);
}
githubAuth = JSON.parse(githubAuth);

global.getVersionNonce = o(function*(pn, file, cb) {
	try {
		return cb(null, crypto.createHash('md5').update(yield fs.readFile('http' + path.resolve(pn, pn[pn.length - 1] == '/' ? '' : '..', file), yield)).digest('hex'));
	} catch (e) {
		return cb(e);
	}
});
global.addVersionNonces = o(function*(str, pn, cb) {
	for (let i = 0; i < str.length; i++) {
		if (str.substr(i).match(/^\.[A-z]{1,8}"/)) {
			while (str[i] && str[i] != '"') i++;
			try {
				str = str.substr(0, i) + '?v=' + (yield getVersionNonce(pn, str.substr(0, i).match(/"[^"]+?$/)[0].substr(1), yield)) + str.substr(i);
			} catch (e) {
				console.error(e);
			}
		}
	}
	cb(null, str);
});
global.respondPage = o(function*(title, user, req, res, callback, header, status) {
	if (title) title = html(title);
	let query = req.url.query,
		cookies = cookie.parse(req.headers.cookie || '');
	if (!header) header = {};
	let inhead = (header.inhead || '') + (header.description ? '<meta name="description" content="' + html(header.description) + '" />' : ''),
		huser = header.user,
		clean = header.clean;
	delete header.inhead;
	delete header.description;
	delete header.user;
	delete header.clean;
	if (typeof header['Content-Type'] != 'string') header['Content-Type'] = 'application/xhtml+xml; charset=utf-8';
	if (typeof header['Cache-Control'] != 'string') header['Cache-Control'] = 'no-cache';
	if (typeof header['X-Frame-Options'] != 'string') header['X-Frame-Options'] = 'DENY';
	if (typeof header['Vary'] != 'string') header['Vary'] = 'Cookie';
	if (typeof header['Content-Security-Policy'] != 'string') {
		header['Content-Security-Policy'] =
			"default-src 'self'; " +
			(config.HTTP2 ? "upgrade-insecure-requests; block-all-mixed-content; referrer origin-when-cross-origin; " : '') +
			"connect-src 'self' " + (config.HTTP2 ? "wss://" : "ws://") + req.headers.host + "; " +
			"child-src 'self' blob: https://www.youtube.com; " +
			"frame-src 'self' blob: https://www.youtube.com; " +
			"img-src " + (config.HTTP2 ? 'https:' : 'http:') + " data:";
	}
	if (config.HTTP2) header['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
	header['Public-Key-Pins'] = 'pin-sha256="zX/Henv5b1MtyAvwRb8xIssDu3ddQ6LAO55xFWFoO04="; pin-sha256="xgp6JyeUhDb/K8kpcuufOjq4qmulv8tHomfmKnrq9+E="; max-age=2592000; includeSubdomains';
	if (user) {
		dbcs.users.update({name: user.name}, {$set: {seen: new Date().getTime()}});
		if (!header['Set-Cookie'] && new Date() - user.seen > 3600000) {
			let tokens = user.cookie,
				idToken = crypto.randomBytes(128).toString('base64');
			for (let i in tokens) {
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
	let data = (yield fs.readFile('html/a/head.html', yield)).toString();
	if ((user = huser || user) && user.name) data = data.replace(/<a id="github-button".+?<\/a>/, '<a href="/user/' + user.name + '"$bnotifs><span>' + user.name + '</span></a>');
	let dirs = req.url.pathname.split('/');
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
				'"/' + dirs[1] + '/"',
				'"/' + dirs[1] + '/" class="active"'
			).replace(
				'"/' + dirs[1] + '/' + dirs[2] + '/"',
				'"/' + dirs[1] + '/' + dirs[2] + '/" class="active"'
			).replaceAll(
				'class="active" class="active"',
				'class="active"'
			).replace(
				'$ghClientId',
				githubAuth.client_id
			).replace(
				'$currentPage',
				req.url.pathname
			).replace(
				'$search',
				html(query.q || '')
			).replace(
				'$inhead',
				(clean ? '<link rel="stylesheet" href="/a/clean.css" />' : '') + inhead
			).replace(
				'$bnotifs',
				(user && user.unread) ? ' class="unread"' : ''
			).replace(
				'class="active" class="unread"',
				'class="active unread"'
			).replace(
				'$notifs',
				user && user.unread ?
					'<ul>' +
					user.notifs.map(function(tNotif) {
						if (!tNotif.unread) return '';
						return '<li class="hglt pad"><em>' + tNotif.type + ' on ' + tNotif.on + '</em><blockquote class="large-limited">' + markdown(tNotif.body) + '</blockquote>' +
							'-' + tNotif.from.link('/user/' + tNotif.from) + ', <time datetime="' + new Date(tNotif.time).toISOString() + '"></time></li>';
					}).join('') +
					'<li><a id="markread">Mark all as read</a></li></ul>'
				: ''
			).replace(
				'<a href="/mod/"><span>Mod</span></a>',
				user && user.level > 1 ? '<a href="/mod/"><span>Mod</span></a>' : ''
			),
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
				'<div class="error">' + errs[0] + '</div>'
				: '<div class="error">\t<ul>\t\t<li>' + errs.join('</li>\t\t<li>') + '</li>\t</ul></div>'
		)
		: '';
};

global.questionTypes = {
	err: 'an error',
	bug: 'unexpected behavior',
	imp: 'improving working code',
	how: 'achieving an end result',
	alg: 'algorithms and data structures',
	pra: 'techniques and best practices',
	the: 'a theoretical scenario'
};

let statics = JSON.parse(fs.readFileSync('./statics.json')),
	canvasJS = fs.readFileSync('./http/dev/canvas.js');

const buildpageServers = [
	['/status/', require('./buildpage/status.js')],
	['/user/', require('./buildpage/user.js')],
	['/qa/', require('./buildpage/qa.js')],
	['/chat/', require('./buildpage/chat.js')],
	['/dev/', require('./buildpage/dev.js')],
	['/learn/', require('./buildpage/learn.js')],
	['/mod/', require('./buildpage/mod.js')],
	['/', require('./buildpage/home.js')]
];
const sitemapServer = require('./buildpage/sitemap.js');
let apiServer = require('./api.js');

let cache = {},
	tempVerificationTokens = {};

let serverHandler = o(function*(req, res) {
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
	if (req.url.length > 1000) {
		req.url = url.parse(req.url, true);
		yield respondPage('414', {}, req, res, yield, {}, 414);
		res.write('<h1>Error 414</h1>');
		res.write('<p>Request URI too long.</p>');
		res.write('<p><a href="javascript:history.go(-1)">Go back</a>.</p>');
		return res.end(yield fs.readFile('html/a/foot.html', yield));
	}
	let cookies = cookie.parse(req.headers.cookie || '');
	req.url = url.parse(req.url, true);
	console.log(req.method, req.url.pathname);
	let user = yield dbcs.users.findOne({
		cookie: {
			$elemMatch: {
				token: cookies.id || 'nomatch',
				created: {$gt: new Date() - 2592000000}
			}
		}
	}, yield);
	let i;
	if (i = statics[req.url.pathname]) {
		yield respondPage(i.title, user, req, res, yield, {
			clean: i.clean,
			inhead: i.inhead,
			description: i.description
		});
		res.write(
			(yield addVersionNonces((yield fs.readFile(i.path, yield)).toString(), req.url.pathname, yield))
			.replace('$canvasjs', html(canvasJS))
		);
		res.end(yield fs.readFile('html/a/foot.html', yield));
	} else if (req.url.pathname.substr(0, 5) == '/api/') {
		req.url.pathname = req.url.pathname.substr(4);
		if (req.method != 'POST') return res.writeHead(405) || res.end('Error: Method not allowed. Use POST.');
		if (url.parse(req.headers.referer || '').host != req.headers.host) return res.writeHead(409) || res.end('Error: Suspicious request.');
		let post = '';
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
				inhead: '<link rel="stylesheet" href="/learn/course.css" />'
			});
			res.write(
				(yield addVersionNonces((yield fs.readFile('html/learn/newlesson.html', yield)).toString(), req.url.pathname, yield))
				.replace('$title', html(req.url.query.title || ''))
				.replace(/\$[^\/\s"<]+/g, '')
			);
			res.end(yield fs.readFile('html/a/foot.html', yield));
		} else if (req.method == 'POST') {
			let post = '';
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
					let lesson = yield dbcs.lessons.findOne({
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
							},
							$set: {updated: new Date().getTime()}
						});
						res.writeHead(303, {Location: 'unoff/' + lesson._id + '/'});
						res.end();
					} else {
						let id = generateID();
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
						res.writeHead(303, {Location: 'unoff/' + id + '/'});
						res.end();
					}
				} else if (parseInt(req.url.query.preview)) {
					yield respondPage('Previewing ' + post.title + ': ' + post.stitle, user, req, res, yield, {
						clean: true,
						inhead: '<link rel="stylesheet" href="/learn/course.css" />'
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
						inhead: '<link rel="stylesheet" href="/learn/course.css" />'
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
		yield respondPage('Login', user, req, res, yield, {inhead: '<meta name="robots" content="noindex" />'});
		res.write('<h1>Login</h1>');
		if (req.url.query.r == 'ask') res.write('<div class="notice">You must be logged in to ask a question.</div>');
		if (user) res.write('<p>You are signed in as <a href="/user/' + user.name + '">' + user.name + '</a>.</p>');
		res.write('<a class="button larger" href="https://github.com/login/oauth/authorize?client_id=' + githubAuth.client_id + '&amp;state=' + encodeURIComponent(req.url.query.r == 'ask' ? '/qa/ask' : req.headers.referer || '') + '"><svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 120 120"><path d="M60 1.103C26.653 1.103-0.388 28.138-0.388 61.491 -0.388 88.171 16.915 110.807 40.909 118.792 43.927 119.351 45.035 117.482 45.035 115.887 45.035 114.448 44.979 109.69 44.953 104.644 28.153 108.297 24.608 97.519 24.608 97.519 21.861 90.54 17.903 88.683 17.903 88.683 12.424 84.935 18.316 85.012 18.316 85.012 24.38 85.438 27.573 91.236 27.573 91.236 32.959 100.467 41.7 97.798 45.146 96.255 45.689 92.353 47.253 89.688 48.98 88.18 35.567 86.654 21.467 81.475 21.467 58.336 21.467 51.744 23.826 46.356 27.689 42.127 27.062 40.606 24.995 34.464 28.275 26.146 28.275 26.146 33.346 24.524 44.885 32.337 49.702 30.999 54.868 30.328 60 30.304 65.132 30.328 70.302 30.999 75.128 32.337 86.654 24.524 91.718 26.146 91.718 26.146 95.005 34.464 92.938 40.606 92.311 42.127 96.183 46.356 98.525 51.744 98.525 58.336 98.525 81.531 84.398 86.637 70.951 88.132 73.117 90.006 75.047 93.681 75.047 99.315 75.047 107.395 74.978 113.898 74.978 115.887 74.978 117.495 76.064 119.377 79.125 118.785 103.107 110.791 120.388 88.163 120.388 61.491 120.388 28.138 93.351 1.103 60 1.103" fill="#161514" /></svg> <span>Log in with GitHub</span></a>');
		res.end(yield fs.readFile('html/a/foot.html', yield));
	} else if (req.url.pathname == '/login/github') {
		if (!req.url.query.code) {
			yield respondPage('Login Error', user, req, res, yield, {}, 400);
			res.write('<h1>Login Error</h1>');
			res.write(errorsHTML(['No authentication code was recieved.']));
			return res.end(yield fs.readFile('html/a/foot.html', yield));
		}
		let tryagain = '<a xmlns="http://www.w3.org/1999/xhtml" href="https://github.com/login/oauth/authorize?client_id=' + githubAuth.client_id + '&amp;state=' + encodeURIComponent(req.url.query.state) + '">Try again.</a>';
		let ghReq = https.request({
			hostname: 'github.com',
			path: '/login/oauth/access_token',
			method: 'POST',
			headers: {Accept: 'application/json'}
		}, o(function*(ghRes) {
			let data = '';
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
				let apiReq = https.get({
					hostname: 'api.github.com',
					path: '/user',
					headers: {
						'Authorization': 'token ' + data.access_token,
						'User-Agent': 'DevDoodle'
					}
				}, o(function*(apiRes) {
					let apiData = '';
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
						let matchUser = yield dbcs.users.findOne({githubID: apiData.id}, yield);
						if (matchUser) {
							let idToken = crypto.randomBytes(128).toString('base64');
							dbcs.users.update({githubID: apiData.id}, {
								$push: {
									cookie: {
										token: idToken,
										created: new Date().getTime()
									}
								},
								$set: {githubName: apiData.login}
							});
							res.writeHead(303, {
								Location: req.url.query.state ? url.parse(req.url.query.state).pathname : '/',
								'Set-Cookie': cookie.serialize('id', idToken, {
									path: '/',
									expires: new Date(new Date().setDate(new Date().getDate() + 30)),
									httpOnly: true,
									secure: config.secureCookies
								})
							});
							return res.end();
						} else {
							yield respondPage('Create Login', user, req, res, yield);
							let verificationToken = crypto.randomBytes(128).toString('base64');
							res.write(
								(yield addVersionNonces((yield fs.readFile('html/new-login.html', yield)).toString(), req.url.pathname, yield))
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
					} catch (e) {
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
			} catch (e) {
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
		let post = '';
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
			let errors = [];
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
				res.write(
					(yield addVersionNonces((yield fs.readFile('html/login/new-from-github.html', yield)).toString(), req.url.pathname, yield))
					.replace('$errors', errorsHTML(errors))
					.replace('$verification-token', post.token || '')
					.replace('$name', post.name || '')
					.replace('$mail', post.mail || '')
				);
				return res.end(yield fs.readFile('html/a/foot.html', yield));
			}
			let idToken = crypto.randomBytes(128).toString('base64'),
				idCookie = cookie.serialize('id', idToken, {
					path: '/',
					expires: new Date(new Date().setDate(new Date().getDate() + 30)),
					httpOnly: true,
					secure: config.secureCookies
				});
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
	} else if (req.url.pathname == '/notifs') {
		if (!user) return errorForbidden(req, res, user, 'You must be logged in to view your notifications.');
		yield respondPage('Notifications', user, req, res, yield);
		res.write('<h1>Notifications</h1>');
		res.write('<ul id="notifs">');
		for (let i = user.notifs.length - 1; i >= 0; i--) res.write(
			'<li class="hglt pad"><em>' + user.notifs[i].type + ' on ' + user.notifs[i].on + '</em><blockquote>' + markdown(user.notifs[i].body) + '</blockquote>' +
			'-' + user.notifs[i].from.link('/user/' + user.notifs[i].from) + ', <time datetime="' + new Date(user.notifs[i].time).toISOString() + '"></time></li>'
		);
		res.write('</ul>');
		res.end(yield fs.readFile('html/a/foot.html', yield));
	} else if (req.url.pathname == '/sitemap.xml') sitemapServer(req, res);
	else if (req.url.pathname.includes('.')) {
		let stats;
		try {
			stats = yield fs.stat('./http/' + req.url.pathname, yield);
		} catch (e) {
			return errorNotFound(req, res, user);
		}
		if (!stats.isFile()) return errorNotFound(req, res, user);
		let raw = !req.headers['accept-encoding'] || !req.headers['accept-encoding'].includes('gzip') || req.headers['accept-encoding'].includes('gzip;q=0');
		if (cache[req.url.pathname]) {
			res.writeHead(200, {
				'Content-Encoding': raw ? 'identity' : 'gzip',
				'Content-Type': (mime[path.extname(req.url.pathname)] || 'text/plain') + '; charset=utf-8',
				'Cache-Control': 'max-age=6012800',
				'Vary': 'Accept-Encoding',
				'ETag': cache[req.url.pathname].hash
			});
			res.end(cache[req.url.pathname][raw ? 'raw' : 'gzip']);
			if (cache[req.url.pathname].updated < stats.mtime) {
				let data;
				try {
					data = yield fs.readFile('http' + req.url.pathname, yield);
				} catch (e) {
					return;
				}
				switch (path.extname(req.url.pathname)) {
					case '.js': data = uglifyJS.minify(data.toString(), {fromString: true}).code;
					break;
					case '.css': data = new CleanCSS().minify(data).styles;
					break;
				}
				cache[req.url.pathname] = {
					raw: data,
					gzip: data == cache[req.url.pathname].raw ? cache[req.url.pathname].gzip : yield zlib.gzip(data, yield),
					hash: yield getVersionNonce('/', req.url.pathname, yield),
					updated: stats.mtime
				};
			}
		} else {
			let data;
			try {
				data = yield fs.readFile('http' + req.url.pathname, yield);
			} catch (e) {
				return errorNotFound(req, res, user);
			}
			switch (path.extname(req.url.pathname)) {
				case '.js': data = uglifyJS.minify(data.toString(), {fromString: true}).code;
				break;
				case '.css': data = new CleanCSS().minify(data).styles;
				break;
			}
			cache[req.url.pathname] = {
				raw: data,
				gzip: yield zlib.gzip(data, yield),
				hash: yield getVersionNonce('/', req.url.pathname, yield),
				updated: stats.mtime
			};
			res.writeHead(200, {
				'Content-Encoding': raw ? 'identity' : 'gzip',
				'Content-Type': (mime[path.extname(req.url.pathname)] || 'text/plain') + '; charset=utf-8',
				'Cache-Control': 'max-age=6012800',
				'Vary': 'Accept-Encoding'
			});
			res.end(cache[req.url.pathname][raw ? 'raw' : 'gzip']);
		}
	} else {
		for (let i = 0; i < buildpageServers.length; i++) {
			if (req.url.pathname.indexOf(buildpageServers[i][0]) == 0) return buildpageServers[i][1](req, res, user || {});
		}
	}
});
console.log('Connecting to mongodb…'.cyan);
let server;
mongo.connect('mongodb://localhost:27017/DevDoodle', function(err, db) {
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
	let i = usedDBCs.length;
	function handleCollection(err, collection) {
		if (err) throw err;
		dbcs[usedDBCs[i]] = collection;
		if (usedDBCs[i] == 'chatusers') collection.drop();
	}
	while (i--) db.collection(usedDBCs[i], handleCollection);
	console.log('Connected to mongodb.'.cyan);
	if (process.argv.includes('--test')) {
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
				let WS = require('ws');
				let wsc = new WS('ws://localhost:' + config.port + '/test');
				wsc.on('open', function() {
					console.log('Connected to socket.');
				});
				wsc.on('data', function(d) {
					console.log('Data received (' + d.length + ' char' + (d.length == 1 ? '' : 's') + '):' + ('\n> ' + d.toString().replaceAll('\n', '\n> ')).grey);
				});
				wsc.on('close', function() {
					console.log('Things seem to work!'.green);
					process.exit();
				});
			});
		});
	}
	if (!config.HTTP2) {
		server = http.createServer(serverHandler).listen(config.port);
		console.log(('DevDoodle running on port ' + config.port + ' over plain HTTP.').cyan);
	} else {
		let constants = require('constants');
		const SSL_ONLY_TLS_1_2 = constants.SSL_OP_NO_TLSv1_1 | constants.SSL_OP_NO_TLSv1 | constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_SSLv2;
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