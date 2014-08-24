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

function html(input) {
	return input.toString().replaceAll(['&', '<', '"'], ['&amp;', '&lt;', '&quot;']);
};
function markdown(src) {
	var h = '';
	function inlineEscape(s) {
		return html(s)
			.replace(/!\[([^\]]*)]\(([^(]+)\)/g, '<img alt="$1" src="$2">')
			.replace(/\[([^\]]+)]\(([^(]+)\)/g, '$1'.link('$2'))
			.replace(/`([^`]+)`/g, '<code>$1</code>')
			.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
			.replace(/\*([^*]+)\*/g, '<em>$1</em>');
	}
	src.replace(/^\s+|\r|\s+$/g, '').replace(/\t/g, '    ').split(/\n\n+/).forEach(function(b, f, R) {
		f = b.substr(0, 2);
		R = {
			'* ': [(/\n\* /), '<ul><li>', '</li></ul>'],
			'  ': [(/\n    /),'<pre><code>','</pre></code>','\n'],
			'> ': [(/\n> /),'<blockquote>','</blockquote>','\n']
		}[f];
		console.log(f, R);
		if (b.match(/\n[1-9]\d*\. /)) R = [(/\n[1-9]\d*\. /), '<ol><li>', '</li></ol>'];
		h +=
			R ? R[1] + ('\n' + b)
				.split(R[0])
				.slice(1)
				.map(R[3] ? html : inlineEscape)
				.join(R[3]||'</li>\n<li>') + R[2]:
			f == '#' ? '<h' + (f = b.indexOf(' ')) + '>' + inlineEscape(b.slice(f + 1)) + '</h' + f + '>':
			f == '<' ? b:
			'<p>' + inlineEscape(b) + '</p>';
	});
	return h;
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

var http = require('http');
var ws = require('ws');
var fs = require('fs');
var path = require('path');
var url = require('url');
var querystring = require('querystring');
var cookie = require('cookie');
var crypto = require('crypto');

var nodemailer = require('nodemailer');

var transport = nodemailer.createTransport('SMTP', {
	host: '7pnm-mwkh.accessdomain.com',
	secureConnection: true,
	port: 465,
	auth: {
		user: 'support@devdoodle.net',
		pass: 'KnT$6D6hF35^75tNyu6t'
	}
});

var mongo = require('mongodb');
var db = new mongo.Db('DevDoodle', new mongo.Server('localhost', 27017, {
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
		db.collection('chatstars', function(err, collection) {
			if (err) throw err;
			collections.chatstars = collection;
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
		db.collection('comments', function(err, collection) {
			if (err) throw err;
			collections.comments = collection;
		});
		db.collection('votes', function(err, collection) {
			if (err) throw err;
			collections.votes = collection;
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
	var inhead = header.inhead || '';
	var huser = header.user;
	delete header.inhead;
	delete header.user;
	if (!header['Content-Type']) header['Content-Type'] = 'application/xhtml+xml';
	res.writeHead(status || 200, header);
	fs.readFile('a/head.html', function(err, data) {
		if (err) throw err;
		collections.users.findOne({cookie: cookies.id}, function(err, user) {
			if (err) throw err;
			data = data.toString();
			if (user = huser || user) data = data.replace('<a href="/login/">Login</a>', linkUser(user.name));
			var dirs = req.url.pathname.split('/');
			res.write(data.replace('$title', (title ? title + ' | ' : '') + (site.titles[dirs[1]] ? site.titles[dirs[1]] + ' | ' : '') + site.name).replaceAll('"' + req.url.pathname + '"', '"' + req.url.pathname + '" class="active"').replace('"/' + dirs[1]+ '/"', '"/' + dirs[1]+ '/" class="active"').replace('"/' + dirs[1] + '/' + dirs[2] + '/"', '"/' + dirs[1] + '/' + dirs[2] + '/" class="active"').replaceAll('class="active" class="active"','class="active"').replace('$search', html(query.q || '')).replace('$inhead', inhead));
			callback(user);
			if (user) collections.users.update({name: user.name}, {$set: {seen: new Date().getTime()}});
		});
	});
};

function respondPageFooter(res, aside) {
	fs.readFile('a/foot.html', function(err, data) {
		if (err) throw err;
		res.end(data.toString().replace('</div>', aside ? '</aside>' : '</div>'));
	});
};

function errorsHTML(errs) {
	return errs.length ? (errs.length == 1 ? '<div class="error">' + errs[0] + '</div>\n' : '<div class="error">\n\t<ul>\n\t\t<li>' + errs.join('</li>\n\t\t<li>') + '</li>\n\t</ul>\n</div>\n') : '';
};

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

function respondChangePassPage(errs, req, res, post) {
	respondPage('Create Room', req, res, function(user) {
		res.write('<h1>Change Password for ' + user.name + '</h1>\n');
		res.write(errorsHTML(errs));
		res.write('<form method="post">\n');
		res.write('<div>Old password: <input type="password" name="old" required="" /></div>\n');
		res.write('<div>New password: <input type="password" name="new" required="" /></div>\n');
		res.write('<div>Confirm new password: <input type="password" name="conf" required="" /></div>\n');
		res.write('<button type="submit">Submit</button>\n');
		res.write('</form>\n');
		respondPageFooter(res);
	});
};

http.createServer(function(req, res) {
	req.url = url.parse(req.url, true);
	console.log('Req ' + req.url.pathname);
	var i;
	if (req.url.pathname == '/') {
		respondPage(null, req, res, function() {
			fs.readFile('home.html', function(err, data) {
				if (err) throw err;
				res.write(data);
				respondPageFooter(res);
			});
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
					if (!post.name || !post.pass || !post.passc || !post.email) return respondLoginPage(['All fields are required.'], req, res, post);
					if (post.name.length > 16) return respondLoginPage(['Name must be no longer than 16 characters.'], req, res, post);
					if (post.name.length < 3) return respondLoginPage(['Name must be at least 3 characters long.'], req, res, post);
					if (!post.name.match(/^[\w-_!$^*]+$/)) return respondLoginPage(['Name may not contain non-alphanumeric characters besides "-", "_", "!", "$", "^", and "*."'], req, res, post);
					if (post.pass != post.passc) return respondLoginPage(['Passwords don\'t match.'], req, res, post);
					crypto.pbkdf2(post.pass, 'KJ:C5A;_\?F!00S\(4S[T-3X!#NCZI;A', 1e5, 128, function(err, key) {
						if (err) throw err;
						var pass = new Buffer(key).toString('base64'),
							rstr = crypto.randomBytes(128).toString('base64');
						collections.users.insert({
							name: post.name,
							pass: pass,
							email: post.email,
							confirm: rstr,
							joined: new Date().getTime(),
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
								res.write('Welcome back, ' + user.name + '. You have ' + user.rep + ' reputation.');
								respondPageFooter(res);
							}, {
								'Set-Cookie': cookie.serialize('id', rstr, {
									path: '/',
									expires: new Date(new Date().setDate(new Date().getDate() + 30))
								}),
								user: user
							});
							collections.users.update({name: user.name}, {$set: {cookie: rstr}});
						} else respondLoginPage(['Invalid Credentials.'], req, res, post);
					});
				}
			});
		} else respondLoginPage([], req, res, {});
	} else if (i = req.url.pathname.match(/^\/login\/confirm\/([A-Za-z\d+\/=]{172})$/)) {
		collections.users.findOne({confirm: i[1]}, function(err, user) {
			if (err) throw err;
			if (user) {
				collections.users.update({name: user.name}, {$unset: {confirm: ''}});
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
			var dstr = '',
				orderBy = (req.url.query || {}).orderby || 'rep',
				orderByDict = {
					default: 'rep',
					join: 'joined',
					actv: 'seen'
				},
				orderDir = (req.url.query || {}).orderdir || 'desc',
				orderDirDict = {
					default: -1,
					asc: 1
				},
				where = (req.url.query || {}).where || 'none',
				whereDict = {
					default: {},
					actv: {seen: {$gt: new Date().getTime() - 300000}},
					mod: {level: {$gte: 6}},
					new: {joined: {$gt: new Date().getTime() - 86400000}},
					lowrep: {rep: {$lt: 10}},
					trusted: {rep: {$gte: 200}}
				};
			var order = {};
			order[orderByDict[orderBy] || orderByDict.default] = orderDirDict[orderDir] || orderDirDict.default;
			collections.users.find(whereDict[where] || whereDict.default).sort(order).each(function(err, cUser) {
				if (err) throw err;
				if (cUser) dstr += '\t<div class="lft user">\n\t\t<img src="/ap/pic/' + cUser.name + '" width="40" height="40" />\n\t\t<div>\n\t\t\t' + linkUser(cUser.name) + '\n\t\t\t<small class="rep">' + cUser.rep + '</small>\n\t\t</div>\n\t</div>\n';
				else {
					fs.readFile('user/userlist.html', function(err, data) {
						if (err) throw err;
						res.write(data.toString().replace('$users', dstr).replace('"' + orderBy + '"', '"' + orderBy + '" selected=""').replace('"' + orderDir + '"', '"' + orderDir + '" selected=""').replace('"' + where + '"', '"' + where + '" selected=""'));
						respondPageFooter(res);
					})
				}
			});
		});
	} else if (i = req.url.pathname.match(/^\/user\/([\w-_!$^*]{1,16})$/)) {
		collections.users.findOne({name: i[1]}, function(err, dispUser) {
			if (err) throw err;
			if (!dispUser) return errors[404](req, res);
			respondPage(dispUser.name, req, res, function(user) {
				var me = user ? user.name == dispUser.name : false;
				console.log(dispUser.name)
				res.write('<h1><a href="/user/">←</a> ' + dispUser.name + (me ? '<small><a href="/user/' + user.name + '/changepass">Change Password</a> <line /> <a href="/logout">Log out</a></small>' : '') + '</h1>\n');
				res.write(dispUser.rep + ' reputation');
				respondPageFooter(res);
			});
		});
	} else if (req.url.pathname.match('/logout')) {
		res.writeHead(303, {
			location: '/',
			'Set-Cookie': 'id='
		});
		collections.users.update({cookie: cookie.parse(req.headers.cookie || '').id}, {$set: {cookie: 'none'}});
		res.end();
	} else if (i = req.url.pathname.match(/^\/user\/([\w-_!$^*]{1,16})\/changepass$/)) {
		var nameGiven = i[1];
		if (req.method == 'POST') {
			var post = '';
			req.on('data', function(data) {
				post += data;
			});
			req.on('end', function() {
				post = querystring.parse(post);
				var errors = [];
				if (!post.old || !post.new || !post.conf) return respondChangePassPage(['All fields are required.'], req, res, {});
				if (post.new != post.conf) return respondChangePassPage(['New passwords don\'t match.'], req, res, {});
				crypto.pbkdf2(post.old, 'KJ:C5A;_\?F!00S\(4S[T-3X!#NCZI;A', 1e5, 128, function(err, key) {
					if (err) throw err;
					var old = new Buffer(key).toString('base64');
					collections.users.findOne({
						name: nameGiven,
						pass: old
					}, function(err, user) {
						if (err) throw err;
						if (!user) return respondChangePassPage(['Incorrect old password.'], req, res, {});
						crypto.pbkdf2(post.new, 'KJ:C5A;_\?F!00S\(4S[T-3X!#NCZI;A', 1e5, 128, function(err, key) {
							if (err) throw err;
							collections.users.update({name: user.name}, {$set: {pass: new Buffer(key).toString('base64')}});
							respondPage('Password Updated', req, res, function() {
								res.write('The password for ' + user.name + ' has been updated.');
								respondPageFooter(res);
							});
						});
					});
				});
			});
		} else respondChangePassPage([], req, res, {});
	} else if (req.url.pathname == '/chat/') {
		respondPage('Chat', req, res, function() {
			res.write('<h1>Chat Rooms</h1>\n');
			collections.chatrooms.find().each(function(err, doc) {
				if (err) throw err;
				if (doc) {
					res.write('<h2 class="title"><a href="' + doc._id + '">' + doc.name + '</a></h2>\n');
					res.write(markdown(doc.desc) + '\n');
				} else {
					res.write('<hr />\n');
					res.write('<a href="newroom" class="small">Create Room</a>\n');
					res.write('</div>\n');
					res.write('<aside id="sidebar">\n');
					res.write('<h2>Recent Posts</h2>\n');
					collections.chat.find().sort({_id: -1}).limit(12).each(function(err, doc) {
						if (err) throw err;
						if (doc) res.write('<div class="comment">' + markdown(doc.body) + '<span class="c-sig">-' + doc.user + ', <a href="' + doc.room + '#' + doc._id + '"><time datetime="' + new Date(doc.time).toISOString() + '"></time></a></span></div>\n');
						else respondPageFooter(res, true);
					});
				}
			});
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
				if (errors.length) return respondCreateRoomPage(errors, req, res, {});
				collections.chatrooms.find().sort({_id: -1}).limit(1).next(function(err, last) {
					if (err) throw err;
					var i = last ? last._id + 1 : 1;
					collections.chatrooms.insert({
						name: post.name,
						desc: post.desc,
						type: post.type,
						_id: i
					});
					res.writeHead(303, {'Location': i});
					res.end();
				});
			});
		} else respondCreateRoomPage([], req, res, {});
	} else if (i = req.url.pathname.match(/^\/chat\/(\d+)/)) {
		collections.chatrooms.findOne({_id: parseInt(i[1])}, function(err, doc) {
			if (err) throw err;
			if (!doc) return errors[404](req, res);
			respondPage(doc.name, req, res, function() {
				fs.readFile('chat/room.html', function(err, data) {
					if (err) throw err;
					res.write(data.toString().replaceAll('$id', doc._id).replaceAll('$name', html(doc.name)).replaceAll('$desc', markdown(doc.desc)));
					respondPageFooter(res);
				});
			});
		});
	} else if (req.url.pathname == '/dev/') {
		respondPage(null, req, res, function() {
			res.write('<h1>Programs</h1>\n');
			collections.programs.find().sort({score: -1}).limit(15).each(function(err, data) {
				if (err) throw err;
				if (data) {
					res.write('<div class="program">\n');
					res.write('\t<h2 class="title"><a href="' + data._id + '">' + (data.title || 'Untitled') + '</a> <small>-<a href="/user/' + data.user + '">' + data.user + '</a></small></h2>\n');
					if (data.type == 1) res.write('\t<div><iframe sandbox="allow-scripts" seamless="" srcdoc="&lt;!DOCTYPE html>&lt;html>&lt;head>&lt;title>Output frame&lt;/title>&lt;style>*{margin:0;max-width:100%;box-sizing:border-box}#canvas{-webkit-user-select:none;-moz-user-select:none;cursor:default}#console{height:100px;background:#111;color:#fff;overflow:auto;margin-top:8px}#console:empty{display:none}button{display:block}&lt;/style>&lt;/head>&lt;body>&lt;canvas id=&quot;canvas&quot;>&lt;/canvas>&lt;div id=&quot;console&quot;>&lt;/div>&lt;button onclick=&quot;location.reload()&quot;>Restart&lt;/button>&lt;script src=&quot;/dev/canvas.js&quot;>&lt;/script>&lt;script>\'use strict\';try{this.eval(' + html(JSON.stringify(data.code)) + ')}catch(e){error(e)}&lt;/script>&lt;/body>&lt;/html>"></iframe></div>\n');
					else if (data.type == 2) res.write('\t<div><iframe sandbox="allow-scripts" srcdoc="&lt;!DOCTYPE html>&lt;html>&lt;body>' + html(data.html) + '&lt;style>' + html(data.css) + '&lt;/style>&lt;script>alert=prompt=confirm=null;' + html(data.js) + '&lt;/script>&lt;button style=&quot;display:block&quot; onclick=&quot;location.reload()&quot;>Restart&lt;/button>&lt;/body>&lt;/html>"></iframe></div>\n'); 
					res.write('</div>\n');
				} else {
					res.write('<a href="list/" class="center-text blk">See more</a>\n');
					respondPageFooter(res);
				}
			});
		});
	} else if (req.url.pathname == '/dev/list/') {
		respondPage('List', req, res, function() {
			var liststr = '',
				sort = (req.url.query || {}).sort || 'hot',
				sortDict = {
					default: {hotness: -1},
					votes: {score: -1},
					upvotes: {upvotes: -1},
					recent: {time: -1},
					update: {updated: -1}
				};
			collections.programs.find().sort(sortDict[sort] || sortDict.default).limit(720).each(function(err, data) {
				if (err) throw err;
				if (data) liststr += '\t<li><a href="../' + data._id + '">' + (data.title || 'Untitled') + '</a> by <a href="/user/' + data.user + '">' + data.user + '</a></li>\n';
				else {
					fs.readFile('dev/list.html', function(err, data) {
						if (err) throw err;
						res.write(data.toString().replace('$list', liststr).replace('"' + sort + '"', '"' + sort + '" selected=""'));
						respondPageFooter(res);
					});
				}
			});
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
		respondPage('Canvas Playground', req, res, function() {
			fs.readFile('dev/canvas.html', function(err, data) {
				if (err) throw err;
				res.write(data.toString().replace(/<section id="meta">[\S\s]+<\/section>/, '').replaceAll(['$id', '$title', '$code'], ['', 'New Program', req.url.query ? (html(req.url.query.code || '')) : '']));
				respondPageFooter(res);
			});
		});
	} else if (req.url.pathname == '/dev/new/html') {
		respondPage('HTML Playground', req, res, function() {
			fs.readFile('dev/html.html', function(err, data) {
				if (err) throw err;
				res.write(data.toString().replaceAll(['$id', '$title', '$html', '$css', '$js'], ['', 'New Program', req.url.query ? (html(req.url.query.html || '')) : '', req.url.query ? (html(req.url.query.css || '')) : '', req.url.query ? (html(req.url.query.js || '')) : '']));
				respondPageFooter(res);
			});
		});
	} else if (i = req.url.pathname.match(/^\/dev\/(\d+)$/)) {
		collections.programs.findOne({_id: i = parseInt(i[1])}, function(err, program) {
			if (err) throw err;
			if (!program) return errors[404](req, res);
			respondPage(program.deleted ? '[Deleted]' : program.title || 'Untitled', req, res, function(user) {
				if (!user) user = {};
				if (program.deleted) {
					if (program.deleted.by.length == 1 && program.deleted.by == program.user && program.user == user.name) res.write('You deleted this <time datetime="' + new Date(program.deleted.time).toISOString() + '"></time>. <a id="undelete">[undelete]</a>');
					else if (user.level >= 4) {
						var deletersstr = '',
							i = program.deleted.by.length;
						while (i--) {
							deletestr += '<a href="/user/' + program.deleted.by[i] + '">' + program.deleted.by[i] + '</a>';
							if (i == 1) deletestr += ', and ';
							else if (i != 0) deletestr += ', ';
						}
						res.write('This program was deleted <time datetime="' + new Date(program.deleted.time).toISOString() + '"></time> by ' + deletersstr + '. <a id="undelete">[undelete]</a>');
					} else res.write('This program was deleted <time datetime="' + new Date(program.deleted.time).toISOString() + '"></time> ' + (program.deleted.by.length == 1 && program.deleted.by == program.user ? 'voluntarily by its owner' : 'for moderation reasons') + '.');
					res.write('\n<script>\n');
					res.write('\tvar undel = document.getElementById(\'undelete\');\n');
					res.write('\tif (undel) undel.onclick = function() {\n');
					res.write('\t\tif (confirm(\'Do you want to undelete this program?\'))\n');
					res.write('\t\t\trequest(\'/api/program/undelete\', function(res) {\n');
					res.write('\t\t\t\tif (res.indexOf(\'Error\') == 0) alert(res);\n');
					res.write('\t\t\t\telse if (res == \'Success\') location.reload();\n');
					res.write('\t\t\t\telse alert(\'Unknown error. Response was: \' + res);\n');
					res.write('\t\t\t});\n');
					res.write('\t}\n');
					res.write('</script>');
					return respondPageFooter(res);
				}
				collections.votes.findOne({
					user: user.name,
					program: program._id
				}, function(err, vote) {
					if (err) throw err;
					if (!vote) vote = {val: 0};
					collections.users.findOne({name: program.user}, function(err, op) {
						if (err) throw err;
						var commentstr = '';
						collections.comments.find({program: program._id}).each(function(err, comment) {
							if (err) throw err;
							if (comment) commentstr += '<div id="c' + comment._id + '" class="comment">' + markdown(comment.body) + '<span class="c-sig">-' + comment.user + ', <a href="#c' + comment._id + '"><time datetime="' + new Date(comment.time).toISOString() + '"></time></a></span></div>';
							else {
								if (program.type == 1) {
									fs.readFile('dev/canvas.html', function(err, data) {
										if (err) throw err;
										res.write(data.toString().replaceAll(['$id', '$title', '$code', '$op-rep', '$op', '$created', '$updated', '$comments', 'Save</a>', vote.val ? (vote.val == 1 ? 'id="up"' : 'id="dn"') : 0], [program._id.toString(), program.title || 'Untitled', html(program.code), op.rep.toString(), op.name, new Date(program.created).toISOString(), new Date(program.updated).toISOString(), commentstr, 'Save</a>' + (program.user == (user || {}).name ? ' <line /> <a id="fork">Fork</a> <line /> <a id="delete" class="red">Delete</a>' : ''), (vote.val ? (vote.val == 1 ? 'id="up"' : 'id="dn"') : 0) + ' class="clkd"']));
										respondPageFooter(res);
									});
								} else if (program.type == 2) {
									fs.readFile('dev/html.html', function(err, data) {
										if (err) throw err;
										res.write(data.toString().replaceAll(['$id', '$title', '$html', '$css', '$js', '$op-rep', '$op', '$created', '$updated', '$comments', 'Save</a>', vote.val ? (vote.val == 1 ? 'id="up"' : 'id="dn"') : 0], [program._id.toString(), program.title || 'Untitled', html(program.html), html(program.css), html(program.js), op.rep.toString(), op.name, new Date(program.created).toISOString(), new Date(program.updated).toISOString(), commentstr, 'Save</a>' + (program.user == (user || {}).name ? ' <line /> <a id="fork">Fork</a> <line /> <a id="delete" class="red">Delete</a>' : ''), (vote.val ? (vote.val == 1 ? 'id="up"' : 'id="dn"') : 0) + ' class="clkd"']));
										respondPageFooter(res);
									});
								} else throw 'Invalid program type for id: ' + program._id;
							}
						});
					});
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
		res.writeHead(303, {
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
	} else if (i = req.url.pathname.match(/\/api\/chat\/(\d+)/)) {
		collections.chat.findOne({_id: parseInt(i[1])}, function(err, doc) {
			if (err) throw err;
			if (doc) res.end(JSON.stringify({
					id: doc._id,
					body: doc.body,
					user: doc.user,
					time: doc.time,
					stars: doc.stars,
					room: doc.room
				}));
			else res.end('Error: Invalid message id.');
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
				if (type !== 1 && type !== 2) return res.end('Error: Invalid program type.'); 
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
							if (type == 2) collections.programs.update({_id: id}, {
									$set: {
										html: post.html,
										css: post.css,
										js: post.js,
										updated: new Date().getTime()
									}
								});
							else collections.programs.update({_id: id}, {
									$set: {
										code: post.code,
										updated: new Date().getTime()
									}
								});
							res.end('Success');
						} else {
							collections.programs.find().sort({_id: -1}).limit(1).next(function(err, last) {
								if (err) throw err;
								var i = last ? last._id + 1 : 1;
								if (type == 2) collections.programs.insert({
										type: type,
										html: post.html,
										css: post.css,
										js: post.js,
										user: user.name,
										created: new Date().getTime(),
										updated: new Date().getTime(),
										score: 0,
										hotness: 0,
										upvotes: 0,
										_id: i
									});
								else collections.programs.insert({
										type: type,
										code: post.code,
										user: user.name,
										created: new Date().getTime(),
										updated: new Date().getTime(),
										score: 0,
										hotness: 0,
										upvotes: 0,
										_id: i
									});
								res.end('Location: /dev/' + i);
							});
						}
					});
				});
			});
		} else errors[405](req, res);
	} else if (req.url.pathname == '/api/program/edit-title') {
		if (req.method == 'POST') {
			var post = '';
			req.on('data', function(data) {
				post += data;
			});
			req.on('end', function() {
				post = querystring.parse(post);
				collections.users.findOne({cookie: cookie.parse(req.headers.cookie || '').id}, function(err, user) {
					if (err) throw err;
					if (!user) return res.end('Error: You must be logged in to change a program title.');
					var i = url.parse(req.headers.referer || '').pathname.match(/^\/dev\/(\d+)/),
						id = i ? parseInt(i[1]) : 0;
					collections.programs.findOne({_id: id}, function(err, program) {
						if (err) throw err;
						if (!program) return res.end('Error: Invalid program id.');
						if (program.user.toString() == user.name.toString()) {
							collections.programs.update({_id: id}, {$set: {title: post.title.substr(0, 92)}});
							res.end('Success');
						} else res.end('Error: You may only rename your own programs.');
					});
				});
			});
		} else errors[405](req, res);
	} else if (req.url.pathname == '/api/program/vote') {
		if (req.method == 'POST') {
			var post = '';
			req.on('data', function(data) {
				post += data;
			});
			req.on('end', function() {
				post = querystring.parse(post);
				if (!post.val) return res.end('Error: Vote value not specified.');
				post.val = parseInt(post.val);
				if (post.val !== 0 && post.val !== 1 && post.val !== -1) return res.end('Error: Invalid vote value.');
				collections.users.findOne({cookie: cookie.parse(req.headers.cookie || '').id}, function(err, user) {
					if (err) throw err;
					if (!user) return res.end('Error: You must be logged in to vote.');
					var i = url.parse(req.headers.referer || '').pathname.match(/^\/dev\/(\d+)/),
						id = i ? parseInt(i[1]) : 0;
					collections.programs.findOne({_id: id}, function(err, program) {
						if (err) throw err;
						if (!program) return res.end('Error: Invalid program id.');
						if (program.user.toString() == user.name.toString()) return res.end('Error: You can\'t vote for your own post');
						collections.votes.findOne({
							program: id,
							user: user.name
						}, function(err, current) {
							if (err) throw err;
							if (!current) {
								current = {val: 0};
								collections.votes.insert({
									user: user.name,
									program: id,
									val: post.val,
									time: new Date().getTime()
								});
							} else {
								collections.votes.update({
									program: id,
									user: user.name
								}, {
									$set: {
										val: post.val,
										time: new Date().getTime()
									}
								});
							}
							collections.programs.update({_id: id}, {
								$inc: {
									score: post.val - current.val,
									hotness: post.val - current.val,
									upvotes: post.val == 1 && current.val != 1 ? 1 : (post.val != 1 && current.val == 1 ? -1 : 0)
								}
							});
							collections.users.update({name: program.user}, {$inc: {rep: post.val - current.val}});
							res.end('Success');
						});
						collections.votes.find({
							program: id,
							time: {$lt: new Date().getTime() - 86400000}
						}).count(function(err, count) {
							if (err) throw err;
							collections.programs.update({_id: id}, {$inc: {hotness: -count}});
						});
					});
				});
			});
		} else errors[405](req, res);
	} else if (req.url.pathname == '/api/program/delete') {
		if (req.method == 'POST') {
			var post = '';
			req.on('data', function(data) {
				post += data;
			});
			req.on('end', function() {
				post = querystring.parse(post);
				collections.users.findOne({cookie: cookie.parse(req.headers.cookie || '').id}, function(err, user) {
					if (err) throw err;
					if (!user) return res.end('Error: You must be logged in to vote.');
					var i = url.parse(req.headers.referer || '').pathname.match(/^\/dev\/(\d+)/),
						id = i ? parseInt(i[1]) : 0;
					collections.programs.findOne({_id: id}, function(err, program) {
						if (err) throw err;
						if (!program) return res.end('Error: Invalid program id.');
						if (program.user.toString() != user.name.toString() && user.level != 2) return res.end('Error: You may only delete your own programs.');
						collections.programs.update({_id: id}, {
							$set: {
								deleted: {
									by: [user.name],
									time: new Date().getTime()
								}
							}
						});
						res.end('Success');
					});
				});
			});
		} else errors[405](req, res);
	} else if (req.url.pathname == '/api/program/undelete') {
		if (req.method == 'POST') {
			var post = '';
			req.on('data', function(data) {
				post += data;
			});
			req.on('end', function() {
				post = querystring.parse(post);
				collections.users.findOne({cookie: cookie.parse(req.headers.cookie || '').id}, function(err, user) {
					if (err) throw err;
					if (!user) return res.end('Error: You must be logged in to vote.');
					var i = url.parse(req.headers.referer || '').pathname.match(/^\/dev\/(\d+)/),
						id = i ? parseInt(i[1]) : 0;
					collections.programs.findOne({_id: id}, function(err, program) {
						if (err) throw err;
						if (!program) return res.end('Error: Invalid program id.');
						if (program.user.toString() != user.name.toString() && user.level != 2) return res.end('Error: You may only undelete your own programs.');
						collections.programs.update({_id: id}, {$unset: {deleted: ''}});
						res.end('Success');
					});
				});
			});
		} else errors[405](req, res);
	} else {
		fs.stat('.' + req.url.pathname, function(err, stats) {
			if (err) return errors[404](req, res);
			res.writeHead(200, {
				'Content-Type': mime[path.extname(req.url.pathname)] || 'text/plain',
				'Cache-Control': 'max-age=6012800, public',
				'Content-Length': stats.size
			});
			fs.readFile('.' + req.url.pathname, function(err, data) {
				if (err) errors[404](req, res)
				else res.end(data);
			});
		});
	}
}).listen(80);
console.log('Server running.');

var wss = new ws.Server({port: 81});

wss.on('connection', function(tws) {
	var i;
	if ((i = tws.upgradeReq.url.match(/\/chat\/(\d+)/))) {
		if (isNaN(tws.room = parseInt(i[1]))) return;
		collections.users.findOne({cookie: cookie.parse(tws.upgradeReq.headers.cookie || '').id}, function(err, user) {
			if (err) throw err;
			if (!user) user = {};
			tws.user = user;
			var pids = [];
			collections.chatstars.find({room: tws.room}).sort({time: -1}).limit(12).each(function(err, star) {
				if (err) throw err;
				if (star && pids.indexOf(star.pid) == -1) {
					tws.send(JSON.stringify({
						event: 'star',
						id: star.pid,
						board: true
					}));
					pids.push(star.pid);
				}
			});
			var cursor = collections.chat.find({room: tws.room});
			cursor.count(function(err, count) {
				if (err) throw err;
				var i = (parseInt(tws.upgradeReq.url.match(/\/chat\/(\d+)(\/(\d+))?/)[3]) + 1 || Infinity) - 3;
				var skip = Math.max(0, Math.min(count - 92, i));
				tws.send(JSON.stringify({
					event: 'info-skipped',
					body: skip,
					ts: Math.min(count - 92, i) == i
				}));
				i = 0;
				cursor.skip(skip).limit(92).each(function(err, doc) {
					if (err) throw err;
					if (!doc) return tws.send(JSON.stringify({event: 'info-complete'}));
					i++;
					tws.send(JSON.stringify({
						event: 'init',
						id: doc._id,
						body: doc.body,
						user: doc.user,
						time: doc.time,
						stars: doc.stars
					}));
					collections.chatstars.findOne({
						pid: doc._id,
						user: tws.user.name
					}, function(err, star) {
						if (err) throw err;
						if (star) tws.send(JSON.stringify({
								event: 'selfstar',
								id: star.pid
							}));
					});
				});
			});
			collections.chatusers.remove({
				name: user.name,
				room: tws.room
			}, {w: 1}, function(err, rem) {
				if (err) throw err;
				collections.chatusers.find({room: tws.room}).each(function(err, doc) {
					if (err) throw err;
					if (doc) tws.send(JSON.stringify({
							event: 'adduser',
							name: doc.name
						}));
					else if (user.name) {
						if (rem) tws.send(JSON.stringify({
								event: 'adduser',
								name: user.name
							}));
						else
							for (var i in wss.clients)
								if (wss.clients[i].room == tws.room) wss.clients[i].send(JSON.stringify({
									event: 'adduser',
									name: user.name
								}));
						collections.chatusers.insert({
							name: user.name,
							room: tws.room
						});
					}
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
				if (message.event == 'post') {
					if (!tws.user.name) return tws.send(JSON.stringify({
							event: 'err',
							body: 'You must be logged in and have 30 reputation to chat.'
						}));
					if (tws.user.rep < 30) return tws.send(JSON.stringify({
							event: 'err',
							body: 'You must have 30 reputation to chat.'
						}));
					if (!message.body) return tws.send(JSON.stringify({
							event: 'err',
							body: 'Message body not submitted.'
						}));
					message.body = message.body.toString();
					if (message.body.length > 2880) return tws.send(JSON.stringify({
							event: 'err',
							body: 'Chat message length may not exceed 2880 characters.'
						}));
					collections.chat.find().sort({$natural: -1}).limit(1).next(function(err, doc) {
						if (err) throw err;
						var id = doc ? doc._id + 1 : 1;
						collections.chat.insert({
							_id: id,
							body: message.body,
							user: tws.user.name,
							time: new Date().getTime(),
							room: tws.room
						});
						for (var i in wss.clients)
							if (wss.clients[i].room == tws.room) wss.clients[i].send(JSON.stringify({
									event: 'add',
									body: message.body,
									user: tws.user.name,
									id: id
								}));
					});
				} else if (message.event == 'statechange') {
					if (tws.user.name) {
						collections.chatusers.update({
							name: tws.user.name,
							room: tws.room
						}, {$set: {state: message.state}});
						for (var i in wss.clients)
							if (wss.clients[i].room == tws.room) wss.clients[i].send(JSON.stringify({
									event: 'statechange',
									state: message.state,
									user: tws.user.name
								}));
					}
				} else if (message.event == 'req') {
					if (isNaN(message.skip) || message.skip < 0) return tws.send(JSON.stringify({
							event: 'err',
							body: 'Invalid skip value.'
						}));
					var cursor = collections.chat.find({room: tws.room});
					cursor.count(function(err, count) {
						if (err) throw err;
						var i = 0;
						var num = message.skip - message.to || 1;
						cursor.sort({$natural: -1}).skip(count - message.skip - 1).limit(num).each(function(err, doc) {
							if (err) throw err;
							if (!doc) return;
							i++;
							tws.send(JSON.stringify({
								event: 'init',
								id: doc._id,
								body: doc.body,
								user: doc.user,
								time: doc.time,
								stars: doc.stars,
								before: true
							}));
							collections.chatstars.findOne({
								pid: doc._id,
								user: tws.user.name
							}, function(err, star) {
								if (err) throw err;
								if (star) tws.send(JSON.stringify({
										event: 'selfstar',
										id: star.pid
									}));
							});
						});
					});
				} else if (message.event == 'star') {
					if (!tws.user.name) return tws.send(JSON.stringify({
							event: 'err',
							body: 'You must be logged in and have 30 reputation to star messages.'
						}));
					if (tws.user.rep < 30) return tws.send(JSON.stringify({
							event: 'err',
							body: 'You must have 30 reputation to star messages.'
						}));
					var id = parseInt(message.id);
					collections.chat.findOne({_id: id}, function(err, doc) {
						if (err) throw err;
						if (!doc) return tws.send(JSON.stringify({
							event: 'err',
							body: 'Invalid message id.'
						}));
						collections.chatstars.findOne({
							user: tws.user.name,
							pid: id
						}, function(err, star) {
							if (err) throw err;
							if (star) return tws.send(JSON.stringify({
									event: 'err',
									body: 'You already stared this post.'
								}));
							collections.chatstars.insert({
								user: tws.user.name,
								pid: id,
								room: doc.room,
								time: new Date().getTime()
							});
							collections.chat.update({_id: id}, {$inc: {stars: 1}});
							for (var i in wss.clients)
									if (wss.clients[i].room == tws.room) wss.clients[i].send(JSON.stringify({
										event: 'star',
										id: id
									}));
						});
					});
				} else if (message.event == 'unstar') {
					if (!tws.user.name) return tws.send(JSON.stringify({
							event: 'err',
							body: 'You must be logged in and have 30 reputation to unstar messages.'
						}));
					if (tws.user.rep < 30) return tws.send(JSON.stringify({
							event: 'err',
							body: 'You must have 30 reputation to unstar messages.'
						}));
					var id = parseInt(message.id);
					collections.chat.findOne({_id: id}, function(err, doc) {
						if (err) throw err;
						if (!doc) return tws.send(JSON.stringify({
							event: 'err',
							body: 'Invalid message id.'
						}));
						collections.chatstars.findOne({
							user: tws.user.name,
							pid: id
						}, function(err, star) {
							if (err) throw err;
							if (!star) return tws.send(JSON.stringify({
									event: 'err',
									body: 'You haven\'t stared this post.'
								}));
							collections.chatstars.remove({
								user: tws.user.name,
								pid: id
							});
							collections.chat.update({_id: id}, {$inc: {stars: -1}});
							for (var i in wss.clients)
									if (wss.clients[i].room == tws.room) wss.clients[i].send(JSON.stringify({
										event: 'unstar',
										id: id
									}));
						});
					});
				} else if (message.event == 'info-update') {
					if (!tws.user.name || tws.user.rep < 30) return tws.send(JSON.stringify({
							event: 'err',
							body: 'You don\'t have permission to update room information.',
							revertInfo: 1
						}));
					collections.chatrooms.update({_id: tws.room}, {
						$set: {
							name: message.name,
							desc: message.desc
						}
					});
					collections.chat.find().sort({$natural: -1}).limit(1).next(function(err, doc) {
						if (err) throw err;
						var id = doc ? doc._id + 1 : 1;
						collections.chat.insert({
							_id: id,
							body: 'Room description updated to ' + message.name + ': ' + message.desc,
							user: 'Bot',
							time: new Date().getTime(),
							room: tws.room
						});
						for (var i in wss.clients)
							if (wss.clients[i].room == tws.room) wss.clients[i].send(JSON.stringify({
								event: 'info-update',
								name: message.name,
								desc: message.desc,
								id: id
							}));
					});
				} else tws.send(JSON.stringify({
						event: 'err',
						body: 'Invalid event type.'
					}));
			});
			tws.on('close', function() {
				for (var i in wss.clients)
					if (wss.clients[i].room == tws.room) wss.clients[i].send(JSON.stringify({
						event: 'deluser',
						name: tws.user.name
					}));
				collections.chatusers.remove({
					name: tws.user.name,
					room: tws.room
				});
			});
		});
	} else if ((i = tws.upgradeReq.url.match(/\/dev\/(\d+)/))) {
		if (isNaN(tws.program = parseInt(i[1]))) return;
		collections.users.findOne({cookie: cookie.parse(tws.upgradeReq.headers.cookie || '').id}, function(err, user) {
			if (err) throw err;
			if (!user) user = {};
			tws.user = user;
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
				if (message.event == 'post') {
					if (!tws.user.name) return tws.send(JSON.stringify({
							event: 'err',
							body: 'You must be logged in and have 20 reputation to comment.'
						}));
					if (tws.user.rep < 20) return tws.send(JSON.stringify({
							event: 'err',
							body: 'You must have 20 reputation to comment.'
						}));
					message.body = message.body.toString();
					if (!message.body) return tws.send(JSON.stringify({
							event: 'err',
							body: 'Comment body not submitted.'
						}));
					if (message.body.length > 720) return tws.send(JSON.stringify({
							event: 'err',
							body: 'Comment length may not exceed 720 characters.'
						}));
					collections.comments.find().sort({$natural: -1}).limit(1).next(function(err, doc) {
						if (err) throw err;
						var id = doc ? doc._id + 1 : 1;
						collections.comments.insert({
							_id: id,
							body: message.body,
							user: tws.user.name,
							time: new Date().getTime(),
							program: tws.program
						});
						for (var i in wss.clients)
							if (wss.clients[i].program == tws.program) wss.clients[i].send(JSON.stringify({
									event: 'add',
									body: message.body,
									user: tws.user.name,
									id: id
								}));
					});
				}
			});
		});
	}
});