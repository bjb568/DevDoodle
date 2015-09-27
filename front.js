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
	html = essentials.html,
	markdown = essentials.markdown,
	passStrength = essentials.passStrength,
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
	usedDBCs = ['users', 'questions', 'answers', 'posthistory', 'chat', 'chathistory', 'chatstars', 'chatusers', 'chatrooms', 'programs', 'comments', 'votes', 'lessons', 'qtags'];

db.open(function(err, db) {
	if (err) throw err;
	db.authenticate('DevDoodle', fs.readFileSync('../Secret/devdoodleDB.key').toString(), function(err) {
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
	});
});

var mime = {
	'.html': 'text/html',
	'.css': 'text/css',
	'.js': 'text/javascript',
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.mp3': 'audio/mpeg',
	'.ico': 'image/x-icon'
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
	if (clean) inhead += '<script>var footerOff = true;</script>';
	if (!header['Content-Type']) header['Content-Type'] = 'application/xhtml+xml; charset=utf-8';
	if (!header['Cache-Control']) header['Cache-Control'] = 'no-cache';
	if (!header['X-Frame-Options']) header['X-Frame-Options'] = 'DENY';
	header['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
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
				secure: true
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
}

function respondPageFooter(res, aside) {
	fs.readFile('html/a/foot.html', function(err, data) {
		if (err) throw err;
		res.end(data.toString().replace('</div>', aside ? '</aside>' : '</div>'));
	});
}

var errorPage = [];
errorPage[400] = function(req, res, user) {
	respondPage('400', user, req, res, function() {
		res.write('<h1>Error 400 :(</h1>');
		res.write('<p>Your request was corrupted, <a href="">try again</a>. If the problem persists, please <a href="mailto:support@devdoodle.net">let us know</a>.</p>');
		res.write('<p><a href="">Reload</a>, <a href="javascript:history.go(-1)">go back</a>.</p>');
		respondPageFooter(res);
	}, {}, 400);
};
errorPage[403] = function(req, res, user, msg) {
	respondPage('403', user, req, res, function() {
		res.write('<h1>Error 403</h1>');
		res.write(msg || '<p>Permission denied. If you think this is a mistake, please <a href="mailto:support@devdoodle.net">let us know</a>.</p>');
		res.write('<p><a href="javascript:history.go(-1)">Go back</a>.</p>');
		respondPageFooter(res);
	}, {}, 403);
};
errorPage[404] = function(req, res, user) {
	respondPage('404', user, req, res, function() {
		res.write('<h1>Error 404 :(</h1>');
		res.write('<p>The requested file could not be found. If you found a broken link, please <a href="mailto:support@devdoodle.net">let us know</a>.</p>');
		res.write('<p><a href="javascript:history.go(-1)">Go back</a>, <a href="/search/?q=' + encodeURIComponent(req.url.pathname.replaceAll('/', ' ')) + '">Search</a>.</p>');
		respondPageFooter(res);
	}, {}, 404);
};
errorPage[405] = function(req, res, user) {
	respondPage('405', user, req, res, function() {
		res.write('<h1>Error 405</h1>');
		res.write('<p>Method not allowed.</p>');
		res.write('<p><a href="javascript:history.go(-1)">Go back</a>.</p>');
		respondPageFooter(res);
	}, {}, 405);
};
errorPage[413] = function(req, res, user) {
	respondPage('413', user, req, res, function() {
		res.write('<h1>Error 413</h1>');
		res.write('<p>Request entity too large.</p>');
		res.write('<p><a href="javascript:history.go(-1)">Go back</a>.</p>');
		respondPageFooter(res);
	}, {}, 413);
};
errorPage[414] = function(req, res, user) {
	respondPage('414', user, req, res, function() {
		res.write('<h1>Error 414</h1>');
		res.write('<p>Request URI too long.</p>');
		res.write('<p><a href="javascript:history.go(-1)">Go back</a>.</p>');
		respondPageFooter(res);
	}, {}, 414);
};
errorPage[418] = function(req, res, user) {
	respondPage('418', user, req, res, function() {
		res.write('<h1>418!</h1>');
		res.write('<p>I\'m a little teapot, short and stout.</p>');
		respondPageFooter(res);
	}, {}, 418);
};
errorPage[429] = function(req, res, user) {
	respondPage('429', user, req, res, function() {
		res.write('<h1>Error 429</h1>');
		res.write('<p>Too many requests.</p>');
		res.write('<p>Wait, then <a href="">Reload</a>.</p>');
		respondPageFooter(res);
	}, {}, 429);
};
errorPage[431] = function(req, res, user) {
	respondPage('431', user, req, res, function() {
		res.write('<h1>Error 431</h1>');
		res.write('<p>Request header fields too large.</p>');
		res.write('<p><a href="javascript:history.go(-1)">Go back</a>.</p>');
		respondPageFooter(res);
	}, {}, 431);
};
errorPage[500] = function(req, res, user, msg) {
	respondPage('500', user, req, res, function() {
		res.write('<h1>Error 500 :(</h1>');
		res.write('<p>Internal server error. This will be automatically reported.</p>');
		if (msg) res.write('Error: ' + msg);
		res.write('<p><a href="">Reload</a>, <a href="javascript:history.go(-1)">go back</a>.</p>');
		respondPageFooter(res);
	}, {}, 500);
};
errorPage[505] = function(req, res, user) {
	respondPage('505', user, req, res, function() {
		res.write('<h1>Error 505</h1>');
		res.write('<p>HTTP version not supported.</p>');
		res.write('<p><a href="">Reload</a>, <a href="javascript:history.go(-1)">go back</a>.</p>');
		respondPageFooter(res);
	}, {}, 505);
};
errorPage[521] = function(req, res, user) {
	respondPage('521', user, req, res, function() {
		res.write('<h1>Error 521 :(</h1>');
		res.write('<p>We\'re down. We should be up soon!</p>');
		res.write('<p><a href="">Reload</a>.</p>');
		respondPageFooter(res);
	}, {}, 521);
};

function errorsHTML(errs) {
	return errs.length ? (errs.length == 1 ? '<div class="error">' + errs[0] + '</div>' : '<div class="error">\t<ul>\t\t<li>' + errs.join('</li>\t\t<li>') + '</li>\t</ul></div>') : '';
}

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
			'<div><input type="text" id="name" name="name" placeholder="Name"' + (filln && post.name ? ' value="' + html(post.name) + '"' : '') + ' required="" maxlength="16"' + (fpass ? '' : ' autofocus=""') + ' /> ' +
			'<span id="name-error" class="red"> </span></div>'
		);
		res.write('<div><input type="password" id="pass" name="pass" placeholder="Password" required=""' + (fpass ? ' autofocus=""' : '') + ' /> <span id="pass-bad" class="red" hidden="">too short</span></div>');
		res.write('<div id="ccreate">');
		res.write('<div id="pass-bar-outer"><div id="pass-bar"></div></div>');
		res.write('<div><input type="password" id="passc" name="passc" placeholder="Confirm Password" /> <span id="pass-match" class="red" hidden="">Doesn\'t match</span></div>');
		res.write('<p><small>Please use a password manager to store passwords</small></p>');
		res.write('<div><input type="text" name="mail" id="mail" maxlength="256" placeholder="Email"' + (fillm && post.mail ? ' value="' + html(post.mail) + '"' : '') + ' /></div>');
		res.write('<p id="sec">[No CSS]<input type="text" name="sec' + num + '" placeholder="Confirm you\'re human" /></p>');
		res.write('</div>');
		res.write('<input type="hidden" name="referer" value="' + html(post.referer || '') + '" />');
		res.write('<button type="submit" id="submit" class="umar">Submit</button>');
		res.write('</form>');
		res.write('<p class="bumar"><small><a href="recover">Recover account from email</a></small></p>');
		res.write('<script src="login.js"></script>');
		respondPageFooter(res);
	}, {inhead: '<link rel="stylesheet" href="/login/login.css" /><style>#sec::before { content: \'Expand (x ' + (num < 0 ? '- ' + Math.abs(num) : '+ ' + num) + ')² to the form ax² + bx + c: \' }</style>'});
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
		res.write('<div>Name: <input type="text" name="name" required="" value="' + html(post.name || '') + '" /></div>');
		res.write('<div>Description: <textarea name="desc" required="" minlength="16" rows="3" cols="80">' + html(post.desc || '') + '</textarea></div>');
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
	'/dev/docs/shapes/line-func': {
		path: './html/dev/docs/shapes/line-func.html',
		title: 'line(x1, y1, x2, y2) · Docs',
		inhead: '<link rel="stylesheet" href="/dev/docs.css" /><script src="/dev/runcanvas.js"></script>',
		clean: true
	},
	'/dev/docs/shapes/rect-func': {
		path: './html/dev/docs/shapes/rect-func.html',
		title: 'rect(x, y, h, w) · Docs',
		inhead: '<link rel="stylesheet" href="/dev/docs.css" /><script src="/dev/runcanvas.js"></script>',
		clean: true
	},
	'/dev/docs/shapes/point-func': {
		path: './html/dev/docs/shapes/point-func.html',
		title: 'point(x,y) · Docs',
		inhead: '<link rel="stylesheet" href="/dev/docs.css" /><script src="/dev/runcanvas.js"></script>',
		clean: true
	},
	'/dev/docs/shapes/ellipse-func': {
		path: './html/dev/docs/shapes/ellipse-func.html',
		title: 'ellipse(cx, cy, rx, ry) · Docs',
		inhead: '<link rel="stylesheet" href="/dev/docs.css" /><script src="/dev/runcanvas.js"></script>',
		clean: true
	},
	'/dev/docs/text/text-func': {
		path: './html/dev/docs/text/text-func.html',
		title: 'text(x, y, t) · Docs',
		inhead: '<link rel="stylesheet" href="/dev/docs.css" /><script src="/dev/runcanvas.js"></script>',
		clean: true
	},
	'/dev/docs/text/textalign-func': {
		path: './html/dev/docs/text/textalign-func.html',
		title: 'textAlign(h, v) · Docs',
		inhead: '<link rel="stylesheet" href="/dev/docs.css" /><script src="/dev/runcanvas.js"></script>',
		clean: true
	},
	'/dev/docs/text/font-func': {
		path: './html/dev/docs/text/font-func.html',
		title: 'font(f) · Docs',
		inhead: '<link rel="stylesheet" href="/dev/docs.css" /><script src="/dev/runcanvas.js"></script>',
		clean: true
	},
	'/dev/docs/fill/fill-func': {
		path: './html/dev/docs/fill/fill-func.html',
		title: 'fill([shade] [r, g, b] [color]) · Docs',
		inhead: '<link rel="stylesheet" href="/dev/docs.css" /><script src="/dev/runcanvas.js"></script>',
		clean: true
	},
	'/dev/docs/fill/stroke-func': {
		path: './html/dev/docs/fill/stroke-func.html',
		title: 'stroke([shade] [r, g, b] [color]) · Docs',
		inhead: '<link rel="stylesheet" href="/dev/docs.css" /><script src="/dev/runcanvas.js"></script>',
		clean: true
	},
	'/dev/docs/fill/bg-func': {
		path: './html/dev/docs/fill/bg-func.html',
		title: 'bg([shade] [r, g, b] [color]) · Docs',
		inhead: '<link rel="stylesheet" href="/dev/docs.css" /><script src="/dev/runcanvas.js"></script>',
		clean: true
	},
	'/dev/docs/fill/strokewidth-func': {
		path: './html/dev/docs/fill/strokewidth-func.html',
		title: 'strokeWidth(w) · Docs',
		inhead: '<link rel="stylesheet" href="/dev/docs.css" /><script src="/dev/runcanvas.js"></script>',
		clean: true
	},
	'/dev/docs/fill/rgb-func': {
		path: './html/dev/docs/fill/rgb-func.html',
		title: 'rgb(r, g, b[, a]) · Docs',
		inhead: '<link rel="stylesheet" href="/dev/docs.css" /><script src="/dev/runcanvas.js"></script>',
		clean: true
	},
	'/dev/docs/fill/hsl-func': {
		path: './html/dev/docs/fill/hsl-func.html',
		title: 'hsl(r, g, b[, a]) · Docs',
		inhead: '<link rel="stylesheet" href="/dev/docs.css" /><script src="/dev/runcanvas.js"></script>',
		clean: true
	},
	'/dev/docs/fill/trans-none': {
		path: './html/dev/docs/fill/trans-none.html',
		title: 'trans and none · Docs',
		inhead: '<link rel="stylesheet" href="/dev/docs.css" /><script src="/dev/runcanvas.js"></script>',
		clean: true
	},
	'/dev/docs/draw/draw-loop': {
		path: './html/dev/docs/draw/draw-loop.html',
		title: 'draw() loop · Docs',
		inhead: '<link rel="stylesheet" href="/dev/docs.css" /><script src="/dev/runcanvas.js"></script>',
		clean: true
	},
	'/dev/docs/draw/framerate': {
		path: './html/dev/docs/draw/framerate.html',
		title: 'frameRate · Docs',
		inhead: '<link rel="stylesheet" href="/dev/docs.css" /><script src="/dev/runcanvas.js"></script>',
		clean: true
	},
	'/dev/docs/mouse/mousex-y': {
		path: './html/dev/docs/mouse/mousex-y.html',
		title: 'mouseX and mouseY · Docs',
		inhead: '<link rel="stylesheet" href="/dev/docs.css" /><script src="/dev/runcanvas.js"></script>',
		clean: true
	},
	'/dev/docs/mouse/mousepressed': {
		path: './html/dev/docs/mouse/mousepressed.html',
		title: 'mousePressed · Docs',
		inhead: '<link rel="stylesheet" href="/dev/docs.css" /><script src="/dev/runcanvas.js"></script>',
		clean: true
	},
	'/dev/docs/keyboard/keycodes': {
		path: './html/dev/docs/keyboard/keycodes.html',
		title: 'keyCodes object · Docs',
		inhead: '<link rel="stylesheet" href="/dev/docs.css" /><script src="/dev/runcanvas.js"></script>',
		clean: true
	},
	'/dev/docs/keyboard/key': {
		path: './html/dev/docs/keyboard/key.html',
		title: 'key variable · Docs',
		inhead: '<link rel="stylesheet" href="/dev/docs.css" /><script src="/dev/runcanvas.js"></script>',
		clean: true
	},
	'/dev/docs/math/global-math': {
		path: './html/dev/docs/math/global-math.html',
		title: 'Globally-scoped Math · Docs',
		inhead: '<link rel="stylesheet" href="/dev/docs.css" /><script src="/dev/runcanvas.js"></script>',
		clean: true
	},
	'/dev/docs/math/rand-func': {
		path: './html/dev/docs/math/rand-func.html',
		title: 'rand([x[, y]]) · Docs',
		inhead: '<link rel="stylesheet" href="/dev/docs.css" /><script src="/dev/runcanvas.js"></script>',
		clean: true
	},
	'/dev/docs/math/number-proto-bound': {
		path: './html/dev/docs/math/number-proto-bound.html',
		title: 'Number.prototype.bound(l[, h]) · Docs',
		inhead: '<link rel="stylesheet" href="/dev/docs.css" /><script src="/dev/runcanvas.js"></script>',
		clean: true
	},
	'/dev/docs/console/print-func': {
		path: './html/dev/docs/console/print-func.html',
		title: 'print(input) · Docs',
		inhead: '<link rel="stylesheet" href="/dev/docs.css" /><script src="/dev/runcanvas.js"></script>',
		clean: true
	},
	'/dev/docs/console/resetlog-func': {
		path: './html/dev/docs/console/resetlog-func.html',
		title: 'resetLog() · Docs',
		inhead: '<link rel="stylesheet" href="/dev/docs.css" /><script src="/dev/runcanvas.js"></script>',
		clean: true
	},
	'/dev/docs/canvas/size-func': {
		path: './html/dev/docs/size/size-func.html',
		title: 'size(x, y) · Docs',
		inhead: '<link rel="stylesheet" href="/dev/docs.css" /><script src="/dev/runcanvas.js"></script>',
		clean: true
	},
	'/dev/docs/canvas/width-height': {
		path: './html/dev/docs/size/width-height.html',
		title: 'width and height variables · Docs',
		inhead: '<link rel="stylesheet" href="/dev/docs.css" /><script src="/dev/runcanvas.js"></script>',
		clean: true
	},
	'/dev/docs/canvas/canvas-ctx': {
		path: './html/dev/docs/canvas/canvas-ctx.html',
		title: 'canvas and ctx · Docs',
		inhead: '<link rel="stylesheet" href="/dev/docs.css" /><script src="/dev/runcanvas.js"></script>',
		clean: true
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

var cache = {},
	lastBuildpageError;

var constants = require('constants'),
	SSL_ONLY_TLS_1_2 = constants.SSL_OP_NO_TLSv1_1|constants.SSL_OP_NO_TLSv1|constants.SSL_OP_NO_SSLv3|constants.SSL_OP_NO_SSLv2;

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
}, function(req, res) {
	var origURL = req.url,
		i,
		id,
		post;
	if (req.url.length > 1000) {
		req.url = url.parse(req.url, true);
		return errorPage[414](req, res, {});
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
					res.write(data.toString());
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
				if (post.length > 1000000) {
					res.writeHead(413);
					res.end('Error: Request entity too large.');
					req.abort = true;
				}
			});
			req.on('end', function() {
				if (req.abort) return;
				post = querystring.parse(post);
				if (req.url.pathname == '/notif') {
					res.writeHead(200);
					res.end(user && user.unread ? '1' : '');
				} else if (req.url.pathname == '/me/changemail') {
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
								created: {$gt: new Date() -  2592000000}
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
				} else if (req.url.pathname == '/login/recover') {
					if (post.code) {
						dbcs.users.findOne({
							confirm: post.code,
							confirmSentTime: {$gt: new Date() - 300000}
						}, function(err, user) {
							if (err) throw err;
							if (!user) {
								res.writeHead(403);
								return res.end('Error: Authentication failed.');
							}
							if (!post.pass) {
								res.writeHead(400);
								return res.end('Error: No password sent.');
							}
							var salt = crypto.randomBytes(64).toString('base64');
							crypto.pbkdf2(post.pass + salt, 'KJ:C5A;_?F!00S(4S[T-3X!#NCZI;A', 1e5, 128, function(err, key) {
								if (err) throw err;
								dbcs.users.update({name: user.name}, {
									$set: {
										pass: new Buffer(key).toString('base64'),
										salt: salt,
										cookie: []
									},
									$unset: {
										confirm: true,
										confirmSentTime: true
									}
								});
							});
							res.writeHead(303, {Location: '/login/?r=recovered'});
							res.end();
						});
					} else {
						if (!post.user || !post.mail) {
							res.writeHead(400);
							return res.end('Error: Both user and mail are required.');
						}
						dbcs.users.findOne({
							name: post.user,
							mail: post.mail
						}, function(err, user) {
							if (err) throw err;
							var token = crypto.randomBytes(12).toString('base64');
							transport.sendMail({
								from: 'DevDoodle <support@devdoodle.net>',
								to: post.mail,
								subject: 'Password Reset',
								html: '<p>Your ' + user.name + ' account\'s <em>case sensitive</em> recovery code is <strong>' + token + '</strong></p>' +
									'<p>Enter the code into the existing account recovery page to reset your password.</p>' +
									'<p>If you have not requested a password reset for the account ' + user.name + ' on DevDoodle, you may safely ignore this email.</p>'
							});
							dbcs.users.update({name: user.name}, {
								$set: {
									cookie: [],
									confirm: token,
									confirmSentTime: new Date().getTime()
								}
							});
							res.writeHead(204);
							res.end();
						});
					}
				} else if (req.url.pathname == '/login/resend') {
					if (!post.name || !post.pass || !post.mail) {
						res.writeHead(400);
						return res.end('Error: user, pass, and mail are required fields.');
					}
					if (post.mail.length > 256) {
						res.writeHead(400);
						return res.end('Error: Email address must be no longer than 256 characters.');
					}
					dbcs.users.findOne({name: post.name}, function(err, fuser) {
						if (err) throw err;
						if (!fuser) {
							res.writeHead(403);
							return res.end('Error: Invalid credentials.');
						}
						crypto.pbkdf2(post.pass + fuser.salt, 'KJ:C5A;_?F!00S(4S[T-3X!#NCZI;A', 1e5, 128, function(err, key) {
							if (err) throw err;
							if (key.toString('base64') != fuser.pass) {
								res.writeHead(403);
								return res.end('Error: Invalid credentials.');
							}
							var confirmToken = crypto.randomBytes(128).toString('base64');
							dbcs.users.update({name: fuser.name}, {
								$set: {
									mail: post.mail,
									confirm: confirmToken
								}
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
							res.writeHead(200);
							res.end('Confirmation email sent.');
						});
					});
				} else if (i = req.url.pathname.match(/^\/chat\/msg\/(\d+)$/)) {
					dbcs.chat.findOne({_id: parseInt(i[1])}, function(err, doc) {
						if (err) throw err;
						if (!doc) {
							res.writeHead(404);
							res.end('Error: Invalid message id.');
						} else if (doc.deleted) {
							res.writeHead(403);
							return res.end('Error: Message has been deleted.');
						} else {
							res.writeHead(200);
							res.end(JSON.stringify({
								id: doc._id,
								body: doc.body,
								user: doc.user,
								time: doc.time,
								stars: doc.stars,
								room: doc.room
							}));
						}
					});
				} else if (req.url.pathname == '/chat/search') {
					var rooms = {},
						results = [];
					dbcs.chatrooms.find().each(function(err, room) {
						if (err) throw err;
						if (room) rooms[room._id] = room;
						else {
							res.writeHead(200);
							var criteria = {$text: {$search: post.search}};
							if (!user || user.level < 4) criteria.deleted = {$exists: false};
							if (post.user) criteria.user = post.user;
							if (post.room) criteria.room = parseInt(post.room);
							var sort = {
								text: {score: {$meta: 'textScore'}},
								recent: {_id: -1},
								old: {_id: 1},
								stars: {stars: -1, _id: -1}
							};
							dbcs.chat.find(criteria, {score: {$meta: 'textScore'}}).sort(sort[post.sort] || post.text).each(function(err, msg) {
								if (err) throw err;
								if (msg) {
									if (rooms[msg.room].type != 'N' && (rooms[msg.room].type != 'M' || (user && user.level > 4))) results.push({
										id: msg._id,
										body: msg.body,
										user: msg.user,
										time: msg.time,
										room: msg.room,
										roomName: rooms[msg.room].name,
										deleted: msg.deleted,
										stars: msg.stars
									});
								} else res.end(JSON.stringify(results));
							});
						}
					});
				} else if (req.url.pathname == '/chat/changeroomtype') {
					i = (url.parse(req.headers.referer || '').pathname || '').match(/^\/chat\/(\d+)/);
					id = i ? parseInt(i[1]) : 0;
					if (['P', 'R', 'N', 'M'].indexOf(post.type) == -1) {
						res.writeHead(400);
						return res.end('Error: Invalid room type.');
					}
					dbcs.chatrooms.findOne({_id: id}, function(err, room) {
						if (err) throw err;
						if (!room) {
							res.writeHead(400);
							return res.end('Error: Invalid room id.');
						}
						if (room.invited.indexOf(user.name) == -1) {
							res.writeHead(403);
							return res.end('Error: You don\'t have permission to change the room type.');
						}
						dbcs.chatrooms.update({_id: id}, {$set: {type: post.type}});
						res.writeHead(204);
						res.end();
					});
				} else if (req.url.pathname == '/chat/inviteuser') {
					i = (url.parse(req.headers.referer || '').pathname || '').match(/^\/chat\/(\d+)/);
					id = i ? parseInt(i[1]) : 0;
					dbcs.chatrooms.findOne({_id: id}, function(err, room) {
						if (err) throw err;
						if (!room) {
							res.writeHead(400);
							return res.end('Error: Invalid room id.');
						}
						if (room.invited.indexOf(user.name) == -1) {
							res.writeHead(403);
							return res.end('Error: You don\'t have permission to invite users to this room.');
						}
						dbcs.users.findOne({name: post.user}, function(err, invUser) {
							if (err) throw err;
							if (!invUser) {
								res.writeHead(400);
								return res.end('Error: User not found.');
							}
							if (room.invited.indexOf(invUser.name) != -1) {
								res.writeHead(409);
								return res.end('Error: ' + invUser.name + ' has already been invited.');
							}
							dbcs.chatrooms.update({_id: id}, {$push: {invited: invUser.name}});
							res.writeHead(200);
							res.end(JSON.stringify({
								mailhash: invUser.mailhash,
								rep: invUser.rep
							}));
						});
					});
				} else if (req.url.pathname == '/chat/uninviteuser') {
					i = (url.parse(req.headers.referer || '').pathname || '').match(/^\/chat\/(\d+)/);
					id = i ? parseInt(i[1]) : 0;
					dbcs.chatrooms.findOne({_id: id}, function(err, room) {
						if (err) throw err;
						if (!room) {
							res.writeHead(400);
							return res.end('Error: Invalid room id.');
						}
						if (room.invited.indexOf(user.name) == -1) {
							res.writeHead(403);
							return res.end('Error: You don\'t have permission to invite users to this room.');
						}
						if (room.invited.indexOf(post.user) == -1) {
							res.writeHead(409);
							return res.end('Error: ' + post.user + ' has not been invited.');
						}
						if (room.invited.length == 1) {
							res.writeHead(400);
							return res.end('Error: You may not remove the only invited user.');
						}
						dbcs.chatrooms.update({_id: id}, {$pull: {invited: post.user}});
						res.writeHead(204);
						res.end();
					});
				} else if (i = req.url.pathname.match(/^\/chat\/msg\/(\d+)\/delv$/)) {
					if (!user) {
						res.writeHead(403);
						return res.end('Error: You must be logged in to cast deletion votes.');
					}
					if (user.level < 2) {
						res.writeHead(403);
						return res.end('Error: You must be a level 2 moderator to cast delete votes.');
					}
					id = i ? parseInt(i[1]) : 0;
					dbcs.chat.findOne({_id: id}, function(err, msg) {
						if (err) throw err;
						if (!msg) {
							res.writeHead(400);
							return res.end('Error: Invalid message id.');
						}
						if (user.level >= 4 && !msg.deleted) {
							dbcs.chat.update({_id: msg._id}, {$set: {deleted: 2}});
							dbcs.chathistory.insert({
								message: msg._id,
								event: 'delete',
								time: new Date().getTime(),
								by: (msg.dels || []).concat(user.name)
							});
							res.writeHead(204);
							return res.end();
						}
						if ((msg.reviewers || []).indexOf(user.name) != -1) {
							res.writeHead(403);
							return res.end('Error: You have already reviewed this post.');
						}
						var changes = {
							$push: {
								dels: {
									time: new Date().getTime(),
									user: user.name
								},
								reviewers: user.name
							}
						};
						if ((msg.dels || []).length == 2) {
							if (msg.nans.length == 2) changes.$set.mod = 'Controversial';
							else {
								changes.$set = {mod: 'Handled'};
								changes.$unset = {reviewing: 1};
							}
							if (!msg.deleted) {
								changes.$set = {deleted: 2};
								dbcs.chathistory.insert({
									message: msg._id,
									event: 'delete',
									time: new Date().getTime(),
									by: msg.dels.concat(user.name)
								});
							}
						}
						dbcs.chat.update({_id: id}, changes);
						res.writeHead(204);
						res.end();
					});
				} else if (i = req.url.pathname.match(/^\/chat\/msg\/(\d+)\/nanv$/)) {
					if (!user) {
						res.writeHead(403);
						return res.end('Error: You must be logged in to dispute flags.');
					}
					if (user.level < 2) {
						res.writeHead(403);
						return res.end('Error: You must be a level 2 moderator to dispute flags.');
					}
					id = i ? parseInt(i[1]) : 0;
					dbcs.chat.findOne({_id: id}, function(err, msg) {
						if (err) throw err;
						if (!msg) {
							res.writeHead(400);
							return res.end('Error: Invalid message id.');
						}
						if (user.level >= 4 && msg.deleted) {
							dbcs.chat.update({_id: msg._id}, {$set: {deleted: 0}});
							dbcs.chathistory.insert({
								message: msg._id,
								event: 'undelete',
								time: new Date().getTime(),
								by: (msg.nans || []).concat(user.name)
							});
							res.writeHead(204);
							return res.end();
						}
						if ((msg.reviewers || []).indexOf(user.name) != -1) {
							res.writeHead(403);
							return res.end('Error: You have already reviewed this post.');
						}
						var changes = {
							$push: {
								nans: {
									time: new Date().getTime(),
									user: user.name
								},
								reviewers: user.name
							}
						};
						if ((msg.nans || []).length == 2) {
							if (msg.dels.length == 2) changes.$set.mod = 'Controversial';
							else {
								changes.$set = {mod: 'Handled'};
								changes.$unset = {reviewing: 1};
							}
							if (msg.deleted) {
								changes.$set = {deleted: 0};
								dbcs.chathistory.insert({
									message: msg._id,
									event: 'undelete',
									time: new Date().getTime(),
									by: msg.dels.concat(user.name)
								});
							}
						}
						dbcs.chat.update({_id: id}, changes);
						res.writeHead(204);
						res.end();
					});
				} else if (i = req.url.pathname.match(/^\/chat\/msg\/(\d+)\/rcomment$/)) {
					if (!user) {
						res.writeHead(403);
						return res.end('Error: You must be logged in to add review comments.');
					}
					if (user.level < 2) {
						res.writeHead(403);
						return res.end('Error: You must be a level 2 moderator to add review comments.');
					}
					if (!post.body) {
						res.writeHead(400);
						return res.end('Error: Please enter a comment body.');
					}
					if (post.body.length > 2000) {
						res.writeHead(400);
						return res.end('Error: Comment length may not exceed 2000 characters.');
					}
					id = i ? parseInt(i[1]) : 0;
					dbcs.chat.findOne({_id: id}, function(err, msg) {
						if (err) throw err;
						if (!msg) {
							res.writeHead(400);
							return res.end('Error: Invalid message id.');
						}
						if (post.mod && (msg.reviewers || []).indexOf(user.name) != -1) {
							res.writeHead(403);
							return res.end('Error: You have already reviewed this post.');
						}
						if (post.mod && msg.mod) {
							res.writeHead(403);
							return res.end('Error: This post is already mod-only. You may still leave a regular comment.');
						}
						var changes = {
							$push: {
								flags: {
									body: post.body,
									time: new Date().getTime(),
									user: user.name
								}
							}
						};
						if (post.mod) {
							changes.$set = {mod: 'User-req'};
							changes.$push.reviewers = user.name;
						}
						dbcs.chat.update({_id: id}, changes);
						res.writeHead(200);
						res.write('Ok: ');
						res.write('<a href="/user/' + user.name + '">' + user.name + '</a>, <time datetime="' + new Date().toISOString() + '"></time>:');
						res.end('<blockquote>' + markdown(post.body) + '</blockquote>');
					});
				} else if (i = req.url.pathname.match(/^\/chat\/msg\/(\d+)\/edit$/)) {
					if (!user) {
						res.writeHead(403);
						return res.end('Error: You must be logged in to edit chat messages in review.');
					}
					if (user.level < 2) {
						res.writeHead(403);
						return res.end('Error: You must be a level 2 moderator to edit chat messages in review.');
					}
					if (!post.body) {
						res.writeHead(400);
						return res.end('Error: Body text required.');
					}
					if (post.body.length > 2000) {
						res.writeHead(400);
						return res.end('Error: Chat message length may not exceed 2880 characters.');
					}
					id = i ? parseInt(i[1]) : 0;
					dbcs.chat.findOne({_id: id}, function(err, msg) {
						if (err) throw err;
						if (!msg) {
							res.writeHead(400);
							return res.end('Error: Invalid message id.');
						}
						var changes = {$set: {body: post.body}};
						if ((msg.reviewers || []).indexOf(user.name) == -1) changes.$push = {reviewers: user.name};
						dbcs.chat.update({_id: id}, changes);
						dbcs.chathistory.insert({
							message: msg._id,
							event: 'edit',
							time: new Date().getTime(),
							body: msg.body,
							note: '<span title="Overridden as review action in response to flag">overridden</span> by <a href="/user/' + user.name + '">' + user.name + '</a>'
						});
						res.writeHead(204);
						res.end();
					});
				} else if (i = req.url.pathname.match(/^\/chat\/msg\/(\d+)\/rskip$/)) {
					if (!user) {
						res.writeHead(403);
						return res.end('Error: You must be logged in to skip in review.');
					}
					if (user.level < 2) {
						res.writeHead(403);
						return res.end('Error: You must be a level 2 moderator to skip in review.');
					}
					id = i ? parseInt(i[1]) : 0;
					dbcs.chat.findOne({_id: id}, function(err, msg) {
						if (err) throw err;
						if (!msg) {
							res.writeHead(400);
							return res.end('Error: Invalid message id.');
						}
						dbcs.chat.update({_id: id}, {$push: {reviewers: user.name}});
						res.writeHead(204);
						res.end();
					});
				} else if (req.url.pathname == '/question/add') {
					if (!user) {
						res.writeHead(403);
						return res.end('Error: You must be logged in to ask a question.');
					}
					if (!post.title || !post.lang || !post.description || !post.question || !post.type || post.type || !post.tags) {
						res.writeHead(400);
						return res.end('Error: Missing required field.');
					}
					if (!questionTypes.hasOwnProperty(post.type)) {
						res.write(400);
						return res.end('Error: Invalid type parameter.');
					}
					var tags = post.tags.split();
					i = tags.length;
					while (i--) {
						if (!(tags[i] = parseInt(tags[i]))) {
							res.writeHead(400);
							return res.end('Error: Invalid tag list.');
						}
					}
					dbcs.qtags.findOne({lang: post.lang}, function(err, tag) {
						if (err) throw err;
						if (!tag) {
							res.writeHead(400);
							return res.end('Error: Invalid language.');
						}
						dbcs.questions.find().sort({_id: -1}).limit(1).nextObject(function(err, last) {
							if (err) throw err;
							var id = last ? last._id + 1 : 1;
							dbcs.questions.insert({
								_id: id,
								title: post.title.substr(0, 144),
								lang: post.lang.substr(0, 48),
								description: post.description,
								question: post.question.substr(0, 288),
								code: post.code,
								type: post.type,
								tags: tags,
								gr: post.gr == 'on',
								user: user.name,
								time: new Date().getTime(),
								score: 0
							});
							res.writeHead(200);
							res.end('Location: /qa/' + id);
						});
					});
				} else if (req.url.pathname == '/qa/tags') {
					res.writeHead(200);
					res.write('[');
					var n = 0;
					dbcs.qtags.find(post.lang ? {lang: post.lang} : {}).each(function(err, tag) {
						if (err) throw err;
						if (tag) res.write((n ? ',' : '') + JSON.stringify(tag));
						else res.end(']');
						n++;
					});
				} else if (req.url.pathname == '/qa/tags/add') {
					if (!user) {
						res.writeHead(403);
						return res.end('Error: You must be logged in to create a new tag.');
					}
					if (!post.name || !post.lang) {
						res.writeHead(400);
						return res.end('Error: Name and language are required fields.');
					}
					dbcs.answers.find({
						user: user.name,
						score: {$gte: 6}
					}).count(function(err, count) {
						if (err) throw err;
						if (count < 8 && user.level < 3) {
							res.writeHead(403);
							return res.end('Error: You must either be a level 3 moderator or have a bronze ' + post.lang + ' tag badge to create a new tag.');
						}
						dbcs.qtags.findOne({_id: parseInt(post.par)}, function(err, parent) {
							if (err) throw err;
							var newTag = {
								name: post.name.substr(0, 48),
								lang: post.lang.substr(0, 48),
							};
							if (parent) {
								newTag.parentID = parent._id;
								newTag.parentName = parent.name;
							}
							dbcs.qtags.find().sort({_id: -1}).limit(1).nextObject(function(err, last) {
								if (err) throw err;
								newTag._id = last ? last._id + 1 : 1;
								dbcs.qtags.insert(newTag);
								res.writeHead(200);
								res.end(JSON.stringify(newTag));
							});
						});
					});
				} else if (req.url.pathname == '/question/search') {
					var samelang = [],
						otherlang = [];
					res.writeHead(200);
					dbcs.questions.find({
						$text: {$search: post.search}
					}, {score: {$meta: 'textScore'}}).sort({score: {$meta: 'textScore'}}).limit(8).each(function(err, question) {
						if (err) throw err;
						if (question) {
							var q = {
								_id: question._id,
								title: question.title,
								body: question.description
							};
							if (question.lang == post.lang) samelang.push(q);
							else otherlang.push(q);
						} else res.end(JSON.stringify(samelang.concat(otherlang)));
					});
				} else if (req.url.pathname == '/answer/add') {
					if (!user) {
						res.writeHead(403);
						return res.end('Error: You must be logged in to answer a question.');
					}
					if (!post.body) {
						res.writeHead(400);
						return res.end('Error: Missing body.');
					}
					if (post.body.length < 144) {
						res.writeHead(400);
						return res.end('Error: Body must be 144 characters long.');
					}
					if (!(i = (url.parse(req.headers.referer || '').pathname || '').match(/^\/qa\/(\d+)/))) {
						res.writeHead(400);
						return res.end('Error: Bad referer.');
					}
					dbcs.answers.find().sort({_id: -1}).limit(1).nextObject(function(err, last) {
						if (err) throw err;
						var id = last ? last._id + 1 : 1;
						dbcs.answers.insert({
							_id: id,
							question: parseInt(i[1]),
							body: post.body,
							user: user.name,
							time: new Date().getTime(),
							score: 0
						});
						res.writeHead(200);
						res.end('Location: #a' + id);
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
					i = (url.parse(req.headers.referer || '').pathname || '').match(/^\/dev\/(\d+)/);
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
								var tprogram = {
									type: type,
									user: user.name,
									created: new Date().getTime(),
									updated: new Date().getTime(),
									score: 0,
									hotness: 0,
									upvotes: 0,
									_id: i
								};
								if (type == 1) {
									tprogram.code = (post.code || '').toString();
								} else if (type == 2) {
									tprogram.html = (post.html || '').toString();
									tprogram.css = (post.css || '').toString();
									tprogram.js = (post.js || '').toString();
								}
								if (program) {
									tprogram.fork = program._id;
									tprogram.title = 'Fork of ' + (program.title || 'Untitled').substr(0, 84);
								}
								dbcs.programs.insert(tprogram);
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
					i = (url.parse(req.headers.referer || '').pathname || '').match(/^\/dev\/(\d+)/);
					id = i ? parseInt(i[1]) : 0;
					dbcs.programs.findOne({_id: id}, function(err, program) {
						if (err) throw err;
						if (!program) {
							res.writeHead(400);
							return res.end('Error: Invalid program id.');
						}
						if (program.user.toString() != user.name.toString()) {
							res.writeHead(403);
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
					i = (url.parse(req.headers.referer || '').pathname || '').match(/^\/dev\/(\d+)/);
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
							time: {$lt: new Date() -  86400000}
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
					i = (url.parse(req.headers.referer || '').pathname || '').match(/^\/dev\/(\d+)/);
					id = i ? parseInt(i[1]) : 0;
					dbcs.programs.findOne({_id: id}, function(err, program) {
						if (err) throw err;
						if (!program) {
							res.writeHead(400);
							return res.end('Error: Invalid program id.');
						}
						if (program.user.toString() != user.name.toString() && user.level < 4) {
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
					i = (url.parse(req.headers.referer || '').pathname || '').match(/^\/dev\/(\d+)/);
					id = i ? parseInt(i[1]) : 0;
					dbcs.programs.findOne({_id: id}, function(err, program) {
						if (err) throw err;
						if (!program) {
							res.writeHead(400);
							return res.end('Error: Invalid program id.');
						}
						if (program.user.toString() != user.name.toString() && user.level < 4) {
							res.end(403);
							return res.end('Error: You may undelete only your own programs.');
						}
						dbcs.programs.update({_id: id}, {$unset: {deleted: 1}});
						res.writeHead(204);
						res.end();
					});
				} else if (req.url.pathname == '/lesson/edit-title') {
					if (!user) {
						res.writeHead(403);
						return res.end('Error: You must be logged in to change a lesson title.');
					}
					i = (url.parse(req.headers.referer || '').pathname || '').match(/^\/learn\/unoff\/(\d+)/);
					id = i ? parseInt(i[1]) : 0;
					dbcs.lessons.findOne({_id: id}, function(err, lesson) {
						if (err) throw err;
						if (!lesson) {
							res.writeHead(400);
							return res.end('Error: Invalid lesson id.');
						}
						if (lesson.user.toString() != user.name.toString()) {
							res.writeHead(204);
							return res.end('Error: You may rename only your own lessons.');
						}
						dbcs.lessons.update({_id: id}, {$set: {title: post.title.substr(0, 92)}});
						res.writeHead(204);
						res.end();
					});
				} else {
					res.writeHead(404);
					res.end('The API feature requested has not been implemented.');
				}
			});
		} else if (req.url.pathname == '/learn/new') {
			if (req.method == 'GET') {
				respondPage('New Lesson', user, req, res, function() {
					fs.readFile('./html/learn/newlesson.html', function(err, data) {
						if (err) throw err;
						res.write(data.toString().replace('id="checker"', 'id="checker" hidden=""').replace('$title', html(req.url.query.title || '')).replace(/\$[^\s"<]+/g, ''));
						respondPageFooter(res);
					});
				}, {inhead: '<link rel="stylesheet" href="/learn/course.css" />'});
			} else if (req.method == 'POST') {
				post = '';
				req.on('data', function(data) {
					if (req.abort) return;
					post += data;
					if (post.length > 1000000) {
						errorPage[413](req, res, user);
						req.abort = true;
					}
				});
				req.on('end', function() {
					if (req.abort) return;
					post = querystring.parse(post);
					if (parseInt(req.url.query.submit)) {
						if (!user) return errorPage[403](req, res, user, 'You must be logged in to submit a lesson.');
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
											pregex: post.pregex,
											sregex: post.sregex,
											stext: post.stext,
											ftext: post.ftext,
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
											pregex: post.pregex,
											sregex: post.sregex,
											stext: post.stext,
											ftext: post.ftext,
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
									.replace('id="checker"', post.pregex ? 'id="checker"' : 'id="checker" hidden=""')
									.replaceAll(
										['$title', '$stitle', '$sbody', '$pregex', '$sregex', '$stext', '$ftext', '$html'],
										[html(post.title || ''), html(post.stitle || ''), html(post.sbody || ''), html(post.pregex || ''), html(post.sregex || ''), html(post.stext || ''), html(post.ftext || ''), html(post.html || '')]
									).replaceAll(
										['$md-ftext', '$md-stext', '$md-sbody'],
										[markdown(post.ftext), markdown(post.stext), markdown(post.sbody)]
									).replaceAll(
										['$str-pregex', '$str-sregex'],
										[html(JSON.stringify(post.pregex || '')), html(JSON.stringify(post.sregex || ''))]
									)
								);
								respondPageFooter(res);
							});
						}, {inhead: '<link rel="stylesheet" href="/learn/course.css" />'});
					} else {
						respondPage('New Lesson', user, req, res, function() {
							fs.readFile('./html/learn/newlesson.html', function(err, data) {
								if (err) throw err;
								res.write(
									data.toString()
									.replace('id="checker"', post.pregex ? 'id="checker"' : 'id="checker" hidden=""')
									.replaceAll(
										['$title', '$stitle', '$sbody', '$pregex', '$sregex', '$stext', '$ftext', '$html'],
										[html(post.title || ''), html(post.stitle || ''), html(post.sbody || ''), html(post.pregex || ''), html(post.sregex || ''), html(post.stext || ''), html(post.ftext || ''), html(post.html || '')]
									).replaceAll(
										['$md-ftext', '$md-stext'],
										[markdown(post.ftext), markdown(post.stext)]
									)
								);
								respondPageFooter(res);
							});
						}, {inhead: '<link rel="stylesheet" href="/learn/course.css" />'});
					}
				});
			} else errorPage[405](req, res, user);
		} else if (req.url.pathname == '/login/') {
			if (req.method == 'POST') {
				post = '';
				req.on('data', function(data) {
					if (req.abort) return;
					post += data;
					if (post.length > 1000) {
						errorPage[413](req, res, user);
						req.abort = true;
					}
				});
				req.on('end', function() {
					if (req.abort) return;
					post = querystring.parse(post);
					if (!post.referer) post.referer = req.headers.referer;
					if (post.create) {
						if (post.check != 'JS-confirm') return errorPage[403](req, res, user, 'Suspicious request.');
						for (var i = -12; i <= 12; i++) {
							if (!i) continue;
							var str = post['sec' + i],
								fail;
							if (!str) continue;
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
							for (j in arr) {
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
										secure: true
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
			} else respondLoginPage([], user, req, res, {referer: req.headers.referer, r: (req.url.query || {}).r});
		} else if (req.url.pathname == '/login/recover') {
			respondPage('Recover Account', user, req, res, function() {
				fs.readFile('./html/login-recovery.html', function(err, data) {
					if (err) throw err;
					res.write(data);
					respondPageFooter(res);
				});
			});
		} else if (i = req.url.pathname.match(/^\/user\/([a-zA-Z0-9-]{3,16})\/changepass$/)) {
			if (!user) return errorPage[403](req, res, user, 'You must be <a href="/login/">logged in</a> to change your password.');
			if (req.method == 'POST') {
				post = '';
				req.on('data', function(data) {
					if (req.abort) return;
					post += data;
					if (post.length > 100000) {
						errorPage[413](req, res, user);
						req.abort = true;
					}
				});
				req.on('end', function() {
					if (req.abort) return;
					post = querystring.parse(post);
					if (!user || user.name != i[1]) return errorPage[403](req, res, user);
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
								secure: true
							});
							res.writeHead(303, {
								Location: '/login/?r=updated',
								'Set-Cookie': idCookie
							});
							res.end();
						});
					});
				});
			} else respondChangePassPage([], user, req, res, {});
		} else if (req.url.pathname == '/chat/newroom') {
			if (!user) return errorPage[403](req, res, user, 'You must be logged in and have 200 reputation to create a room.');
			if (user.rep < 200) return errorPage[403](req, res, user, 'You must have 200 reputation to create a room.');
			if (req.method == 'POST') {
				post = '';
				req.on('data', function(data) {
					if (req.abort) return;
					post += data;
					if (post.length > 4000) {
						errorPage[413](req, res, user);
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
			} else respondCreateRoomPage([], user, req, res, post);
		} else {
			fs.stat('./http/' + req.url.pathname, function(err, stats) {
				if (err || !stats.isFile()) {
					req.headers.user = JSON.stringify(user) || '';
					http.get({
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
							lastBuildpageError = null;
						});
						bres.on('error', function(e) {
							if (lastBuildpageError != e.message) {
								lastBuildpageError = e.message;
								transport.sendMail({
									from: 'DevDoodle <support@devdoodle.net>',
									to: 'support@devdoodle.net',
									subject: 'front.js cannot connect to buildpage.js: ' + e.message,
									text: 'Error recieved:' + JSON.stringify(e)
								});
							}
							errorPage[500](req, res, user, e.message);
						});
					}).on('error', function(e) {
						if (lastBuildpageError != e.message) {
							lastBuildpageError = e.message;
							transport.sendMail({
								from: 'DevDoodle <support@devdoodle.net>',
								to: 'support@devdoodle.net',
								subject: 'front.js cannot connect to buildpage.js: ' + e.message,
								text: 'Error recieved:' + JSON.stringify(e)
							});
						}
						errorPage[500](req, res, user, e.message);
					});
				} else {
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
							if (err) return errorPage[404](req, res, user);
							if (path.extname(req.url.pathname) == '.js') data = uglifyJS.minify(data.toString(), {fromString: true}).code;
							if (path.extname(req.url.pathname) == '.css') data = new cleanCSS().minify(data).styles;
							cache[req.url.pathname] = {
								data: data,
								updated: stats.mtime
							};
							res.writeHead(200, {
								'Content-Type': mime[path.extname(req.url.pathname)] || 'text/plain',
								'Cache-Control': 'max-age=6012800, public',
								'ETag': etag(data),
								'Vary': 'Accept-Encoding'
							});
							res.end(data);
						});
					}
				}
			});
		}
	});
});
server.listen(process.argv[2] || 443);
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
console.log('front.js running on port ' + (process.argv[2] || 443));

if (!process.argv[2]) {
	http.createServer(function(req, res) {
		res.writeHead(301, {
			Location: 'https://' + req.headers.host + req.url
		});
		res.end();
	}).listen(80);
	console.log('Notice: HTTP on port 80 will redirect to HTTPS on port 443');
}