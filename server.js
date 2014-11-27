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

function html(input, replaceQuoteOff) {
	if (replaceQuoteOff) return input.toString().replaceAll(['&', '<'], ['&amp;', '&lt;']);
	return input.toString().replaceAll(['&', '<', '"'], ['&amp;', '&lt;', '&quot;']);
}
function markdownEscape(input) {
	return input.replaceAll(['\\', '`', '*', '_', '-', '+', '.', '#', '>', '(', ')', '^', '$'], ['\u0001', '\u0002', '\u0003', '\u0004', '\u0005', '\u0006', '\u000e', '\u000f', '\u0010', '\u0011', '\u0012', '\u0013', '\u0014']);
}
function inlineMarkdown(input) {
	var backslash = '\u0001';
	input = input.replaceAll('\\\\', backslash);
	var graveaccent = '\u0002';
	input = input.replaceAll('\\`', graveaccent);
	var asterisk = '\u0003';
	input = input.replaceAll('\\*', asterisk);
	var underscore = '\u0004';
	input = input.replaceAll('\\_', underscore);
	var dash = '\u0005';
	input = input.replaceAll('\\-', dash);
	var plus = '\u0006';
	input = input.replaceAll('\\+', plus);
	var dot = '\u000e';
	input = input.replaceAll('\\.', dot);
	var hash = '\u000f';
	input = input.replaceAll('\\#', hash);
	var gt = '\u0010';
	input = input.replaceAll('\\>', gt);
	var paren = '\u0011';
	input = input.replaceAll('\\(', paren);
	var cparen = '\u0012';
	input = input.replaceAll('\\)', cparen);
	var carrot = '\u0013';
	input = input.replaceAll('\\^', carrot);
	var dollar = '\u0014';
	input = input.replaceAll('\\$', dollar);
	var open = [];
	return input.split('`').map(function(val, i, arr) {
		if (i % 2) return '<code>' + html(val.replaceAll([backslash, graveaccent, asterisk, underscore, dash, plus, dot, hash, gt, paren, cparen, carrot, dollar], ['\\\\', '\\`', '\\*', '\\_', '\\-', '\\+', '\\.', '\\#', '\\>', '\\(', '\\)', '\\^'])) + '</code>';
		var parsed = val
			.replace(/!\[([^\]]+)]\((https?:\/\/[^\s("\\]+\.[^\s"\\]+)\)/g, function(match, p1, p2) {
				return '![' + markdownEscape(p1) + '](' + markdownEscape(p2) + ')';
			})
			.replace(/\[([^\]]+)]\((https?:\/\/[^\s("\\]+\.[^\s"\\]+)\)/g, function(match, p1, p2) {
				return '[' + markdownEscape(p1) + '](' + markdownEscape(p2) + ')';
			})
			.replace(/([^;["\\])(https?:\/\/([^\s("\\]+\.[^\s"\\]+))/g, function(match, p1, p2) {
				return markdownEscape(p1) + markdownEscape(p2);
			})
			.replace(/^(https?:\/\/([^\s("\\]+\.[^\s"\\]+))/g, function(match, p1) {
				return markdownEscape(p1);
			})
		.split('*').map(function(val, i, arr) {
			var parsed = val.split('_').map(function(val, i, arr) {
				var parsed = val.split('---').map(function(val, i, arr) {
					var parsed = val.split('+++').map(function(val, i, arr) {
						var parsed = html(val.replaceAll([backslash, graveaccent, asterisk, underscore, dash, plus, dot, hash, gt], ['\\', '`', '*', '_', '-', '+', '.', '#', '>']), true)
							.replace(/!\[([^\]]+)]\((https?:\/\/[^\s("\\]+\.[^\s"\\]+)\)/g, '<img alt="$1" src="$2" />')
							.replace(/\[([^\]]+)]\((https?:\/\/[^\s("\\]+\.[^\s"\\]+)\)/g, '$1'.link('$2'))
							.replace(/([^;["\\])(https?:\/\/([^\s("\\]+\.[^\s"\\]+))/g, '$1' + '$3'.link('$2'))
							.replace(/^(https?:\/\/([^\s("\\]+\.[^\s"\\]+))/g, '$2'.link('$1'))
							.replace(/\^(\w+)/g, '<sup>$1</sup>');
						if (i % 2) {
							var p = open.indexOf('</ins>');
							if (p != -1) {
								open.splice(p, 1);
								return '</ins>' + parsed;
							} else if (arr[i + 1] === undefined) {
								open.push('</ins>');
								return '<ins>' + parsed;
							}
						}
						return i % 2 ? '<ins>' + parsed + '</ins>' : parsed;
					}).join('');
					if (i % 2) {
						var p = open.indexOf('</del>');
						if (p != -1) {
							open.splice(p, 1);
							return '</del>' + parsed;
						} else if (arr[i + 1] === undefined) {
							open.push('</del>');
							return '<del>' + parsed;
						}
					}
					return i % 2 ? '<del>' + parsed + '</del>' : parsed;
				}).join('');
				if (i % 2) {
					var p = open.indexOf('</strong>');
					if (p != -1) {
						open.splice(p, 1);
						return '</strong>' + parsed;
					} else if (arr[i + 1] === undefined) {
						open.push('</strong>');
						return '<strong>' + parsed;
					}
				}
				return i % 2 ? '<strong>' + parsed + '</strong>' : parsed;
			}).join('');
			if (i % 2) {
				var p = open.indexOf('</em>');
				if (p != -1) {
					open.splice(p, 1);
					return '</em>' + parsed;
				} else if (arr[i + 1] === undefined) {
					open.push('</em>');
					return '<em>' + parsed;
				}
			}
			return i % 2 ? '<em>' + parsed + '</em>' : parsed;
		}).join('');
		return parsed.replace(/\^\(([^)]+)\)/g, '<sup>$1</sup>').replace(/\$\(([^)]+)\)/g, '<sub>$1</sub>').replaceAll([paren, cparen, carrot, dollar], ['(', ')', '^', '$']);
	}).join('') + open.join('');
}
function markdown(input) {
	if (input.indexOf('\n') == -1 && input.substr(0, 2) != '> ' && input.substr(0, 2) != '- ' && input.substr(0, 2) != '* ' && input.substr(0, 4) != '    ' && input[0] != '\t' && !input.match(/^((\d+|[A-z])[.)]|#{1,6}) /)) return inlineMarkdown(input);
	var blockquote = '',
		ul = '',
		ol = '',
		li = '',
		code = '';
	return input.split('\n').map(function(val, i, arr) {
		if (!val) return '';
		var f;
		if (val.substr(0, 2) == '> ') {
			val = val.substr(2);
			if (arr[i + 1] && arr[i + 1].substr(0, 2) == '> ') {
				blockquote += val + '\n';
				return '';
			} else {
				var arg = blockquote + val;
				blockquote = '';
				return '<blockquote>' + markdown(arg) + '</blockquote>';
			}
		} else if (val.substr(0, 2) == '- ' || val.substr(0, 2) == '* ') {
			if (!ul) ul = '<ul>';
			val = val.substr(2);
			if (li) {
				ul += '<li>' + markdown(li) + '</li>';
				li = '';
			};
			if (arr[i + 1] && (arr[i + 1].substr(0, 2) == '- ' || arr[i + 1] && arr[i + 1].substr(0, 2) == '* ')) {
				ul += '<li>' + inlineMarkdown(val) + '</li>';
				return '';
			} else if (arr[i + 1] && (arr[i + 1][0] == '\t' || arr[i + 1] && arr[i + 1].substr(0, 4) == '    ')) {
				li += val + '\n';
				return '';
			} else {
				var arg = ul + '<li>' + markdown(val) + '</li>';
				ul = '';
				return arg + '</ul>';
			}
		} else if (f = val.match(/^(\d+|[A-z])[.)] /)) {
			if (!ol) ol = '<ol>';
			val = val.substr(f[0].length);
			if (li) {
				ol += '<li>' + markdown(li) + '</li>';
				li = '';
			};
			if (arr[i + 1] && arr[i + 1].match(/^(\d+|[A-z])[.)] /)) {
				ol += '<li>' + inlineMarkdown(val) + '</li>';
				return '';
			} else if (arr[i + 1] && (arr[i + 1][0] == '\t' || arr[i + 1] && arr[i + 1].substr(0, 4) == '    ')) {
				li += val + '\n';
				return '';
			} else {
				var arg = ol + '<li>' + inlineMarkdown(val) + '</li>';
				ol = '';
				return arg + '</ol>';
			}
		} else if (li && val[0] == '\t') {
			li += val.substr(1) + '\n';
			if (ul && (!arr[i + 1] || (arr[i + 1][0] != '\t' && arr[i + 1].substr(0, 4) != '    ' && arr[i + 1].substr(2) != '- ' && arr[i + 1].substr(2) != '* '))) {
				var arg = ul + '<li>' + markdown(li) + '</li>';
				li = '';
				return arg + '</ul>';
			} else if (ol && (!arr[i + 1] || (arr[i + 1][0] != '\t' && arr[i + 1].substr(0, 4) != '    ' && !arr[i + 1].match(/^(\d+|[A-z])[.)] /)))) {
				var arg = ol + '<li>' + markdown(li) + '</li>';
				li = '';
				return arg + '</ol>';
			}
			return '';
		} else if (li && val.substr(0, 4) == '    ') {
			li += val.substr(4) + '\n';
			if (ul && (!arr[i + 1] || (arr[i + 1][0] != '\t' && arr[i + 1].substr(0, 4) != '    ' && arr[i + 1].substr(2) != '- ' && arr[i + 1].substr(2) != '* '))) {
				var arg = ul + '<li>' + markdown(li) + '</li>';
				li = '';
				return arg + '</ul>';
			} else if (ol && (!arr[i + 1] || (arr[i + 1][0] != '\t' && arr[i + 1].substr(0, 4) != '    ' && !arr[i + 1].match(/^((\d+|[A-z])|[A-z])[.)] /)))) {
				var arg = ol + '<li>' + markdown(li) + '</li>';
				li = '';
				return arg + '</ol>';
			}
			return '';
		} else if (val[0] == '\t') {
			code += val.substr(1);
			if (!arr[i + 1] || (arr[i + 1].substr(0, 4) != '    ' && arr[i + 1][0] != '\t')) {
				var arg = html(code);
				code = '';
				return '<code class="blk">' + arg + '</code>';
			} else code += '\n';
			return '';
		} else if (val.substr(0, 4) == '    ') {
			code += val.substr(4);
			if (!arr[i + 1] || (arr[i + 1].substr(0, 4) != '    ' && arr[i + 1][0] != '\t')) {
				var arg = html(code);
				code = '';
				return '<code class="blk">' + arg + '</code>';
			} else code += '\n';
			return '';
		} else if ((f = val.match(/^#{1,6} /)) && (f = f[0].length - 1)) {
			return '<h' + f + '>' + inlineMarkdown(val.substr(f + 1)) + '</h' + f + '>';
		} else return '<p>' + inlineMarkdown(val) + '</p>';
	}).join('');
}

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

var questionTypes = {
	err: 'an error',
	bug: 'unexpected behavior',
	imp: 'improving working code',
	how: 'achieving an end result',
	alg: 'algorithms and data structures',
	pra: 'techniques and best practices',
	the: 'a theoretical scenario'
};

var sensitivePaths = ['README.md', 'server.js', '.git', 'package.json', '/data/', 'node_modules'];

var http = require('http');
var ws = require('ws');
var fs = require('fs');
var path = require('path');
var url = require('url');
var querystring = require('querystring');
var cookie = require('cookie');
var crypto = require('crypto');

var nodemailer = require('nodemailer');
var sendmailTransport = require('nodemailer-sendmail-transport');
var transport = nodemailer.createTransport(sendmailTransport());

var mongo = require('mongodb');
var db = new mongo.Db('DevDoodle', new mongo.Server('localhost', 27017, {
	auto_reconnect: false,
	poolSize: 4
}), {
	w: 0,
	native_parser: false
});

var dbcs = {},
	usedDBCs = ['users', 'questions', 'chat', 'chathistory', 'chatstars', 'chatusers', 'chatrooms', 'programs', 'comments', 'comments', 'votes'];
db.open(function(err, db) {
	if (err) throw err;
	db.authenticate('DevDoodle', 'KnT$6D6hF35^75tNyu6t', function(err, result) {
		if (err) throw err;
		var i = usedDBCs.length;
		while (i--) {
			db.collection(usedDBCs[i], function(err, collection) {
				if (err) throw err;
				dbcs[usedDBCs[i]] = collection;
				if (usedDBCs[i] == 'chatusers') collection.drop();
			});
		}
	});
});

var errorPage = [];
errorPage[400] = function(req, res) {
	respondPage('400', req, res, function() {
		res.write('<h1>Error 400 :(</h1>');
		res.write('<p>Your request was corrupted, <a href="">try again</a>. If the problem persists, please <a href="mailto:support@devdoodle.net">let us know</a>.</p>');
		res.write('<p><a href="">Reload</a>, <a href="javascript:history.go(-1)">go back</a>.</p>');
		respondPageFooter(res);
	}, {}, 400);
};
errorPage[403] = function(req, res, msg) {
	respondPage('403', req, res, function() {
		res.write('<h1>Error 403</h1>');
		res.write(msg || '<p>Permission denied. If you think this is a mistake, please <a href="mailto:support@devdoodle.net">let us know</a>.</p>');
		res.write('<p><a href="javascript:history.go(-1)">Go back</a>.</p>');
		respondPageFooter(res);
	}, {}, 403);
};
errorPage[404] = function(req, res) {
	respondPage('404', req, res, function() {
		res.write('<h1>Error 404 :(</h1>');
		res.write('<p>The requested file could not be found. If you found a broken link, please <a href="mailto:support@devdoodle.net">let us know</a>.</p>');
		res.write('<p><a href="javascript:history.go(-1)">Go back</a>, <a href="/search/?q=' + encodeURIComponent(req.url.pathname.replaceAll('/', ' ')) + '">Search</a>.</p>');
		respondPageFooter(res);
	}, {}, 404);
};
errorPage[405] = function(req, res) {
	respondPage('405', req, res, function() {
		res.write('<h1>Error 405</h1>');
		res.write('<p>Method not allowed.</p>');
		res.write('<p><a href="javascript:history.go(-1)">Go back</a>.</p>');
		respondPageFooter(res);
	}, {}, 405);
};
errorPage[413] = function(req, res) {
	respondPage('413', req, res, function() {
		res.write('<h1>Error 413</h1>');
		res.write('<p>Request entity too large.</p>');
		res.write('<p><a href="javascript:history.go(-1)">Go back</a>.</p>');
		respondPageFooter(res);
	}, {}, 413);
};
errorPage[414] = function(req, res) {
	respondPage('414', req, res, function() {
		res.write('<h1>Error 414</h1>');
		res.write('<p>Request URI too long.</p>');
		res.write('<p><a href="javascript:history.go(-1)">Go back</a>.</p>');
		respondPageFooter(res);
	}, {}, 414);
};
errorPage[415] = function(req, res) {
	respondPage('415', req, res, function() {
		res.write('<h1>Error 415</h1>');
		res.write('<p>Unsupported media type. If you think this is a mistake, please <a href="mailto:support@devdoodle.net">let us know</a>.</p>');
		res.write('<p><a href="javascript:history.go(-1)">Go back</a>.</p>');
		respondPageFooter(res);
	}, {}, 415);
};
errorPage[418] = function(req, res) {
	respondPage('418', req, res, function() {
		res.write('<h1>418!</h1>');
		res.write('<p>I\'m a little teapot, short and stout.</p>');
		respondPageFooter(res);
	}, {}, 418);
};
errorPage[429] = function(req, res) {
	respondPage('429', req, res, function() {
		res.write('<h1>Error 429</h1>');
		res.write('<p>Too many requests.</p>');
		res.write('<p>Wait, then <a href="">Reload</a>.</p>');
		respondPageFooter(res);
	}, {}, 429);
};
errorPage[431] = function(req, res) {
	respondPage('431', req, res, function() {
		res.write('<h1>Error 431</h1>');
		res.write('<p>Request header fields too large.</p>');
		res.write('<p><a href="javascript:history.go(-1)">Go back</a>.</p>');
		respondPageFooter(res);
	}, {}, 431);
};
errorPage[500] = function(req, res) {
	respondPage('500', req, res, function() {
		res.write('<h1>Error 500 :(</h1>');
		res.write('<p>Internal server error. This will be automatically reported.</p>');
		res.write('<p><a href="">Reload</a>, <a href="javascript:history.go(-1)">go back</a>.</p>');
		respondPageFooter(res);
	}, {}, 500);
};
errorPage[505] = function(req, res) {
	respondPage('505', req, res, function() {
		res.write('<h1>Error 505</h1>');
		res.write('<p>HTTP version not supported.</p>');
		res.write('<p><a href="">Reload</a>, <a href="javascript:history.go(-1)">go back</a>.</p>');
		respondPageFooter(res);
	}, {}, 505);
};
errorPage[521] = function(req, res) {
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

function respondPage(title, req, res, callback, header, status) {
	if (title) title = html(title);
	var query = req.url.query,
		cookies = cookie.parse(req.headers.cookie || '');
	if (!header) header = {};
	var inhead = header.inhead || '';
	var huser = header.user;
	var nonotif = header.nonotif;
	delete header.inhead;
	delete header.user;
	delete header.nonotif;
	if (!header['Content-Type']) header['Content-Type'] = 'application/xhtml+xml';
	if (!header['Cache-Control']) header['Cache-Control'] = 'no-cache';
	dbcs.users.findOne({
		cookie: {
			$elemMatch: {
				token: cookies.id,
				created: {$gt: new Date().getTime() - 2592000000}
			}
		}
	}, function(err, user) {
		if (err) throw err;
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
		fs.readFile('a/head.html', function(err, data) {
			if (err) throw err;
			data = data.toString();
			if (user = huser || user) data = data.replace('<a href="/login/">Login</a>', '<a$notifs href="/user/' + user.name + '">' + user.name + '</a>');
			var dirs = req.url.pathname.split('/');
			res.write(data.replace('$title', (title ? title + ' | ' : '') + (site.titles[dirs[1]] ? site.titles[dirs[1]] + ' | ' : '') + site.name).replaceAll('"' + req.url.pathname + '"', '"' + req.url.pathname + '" class="active"').replace('"/' + dirs[1]+ '/"', '"/' + dirs[1]+ '/" class="active"').replace('"/' + dirs[1] + '/' + dirs[2] + '/"', '"/' + dirs[1] + '/' + dirs[2] + '/" class="active"').replaceAll('class="active" class="active"','class="active"').replace('$search', html(query.q || '')).replace('$inhead', inhead).replace('$notifs', (user && user.unread && !nonotif) ? ' class="unread"' : ''));
			callback(user);
		});
	});
}

function respondPageFooter(res, aside) {
	fs.readFile('a/foot.html', function(err, data) {
		if (err) throw err;
		res.end(data.toString().replace('</div>', aside ? '</aside>' : '</div>'));
	});
}

function errorsHTML(errs) {
	return errs.length ? (errs.length == 1 ? '<div class="error">' + errs[0] + '</div>\n' : '<div class="error">\n\t<ul>\n\t\t<li>' + errs.join('</li>\n\t\t<li>') + '</li>\n\t</ul>\n</div>\n') : '';
}

function respondLoginPage(errs, req, res, post, fillm, filln, fpass) {
	respondPage('Login', req, res, function() {
		res.write('<h1>Log in</h1>\n');
		res.write(errorsHTML(errs));
		res.write('<form method="post">');
		res.write('<input type="checkbox" name="create" id="create" onchange="document.getElementById(\'ccreate\').hidden ^= 1"' + (post.create ? ' checked=""' : '') + ' /> <label for="create">Create an account</label>\n');
		res.write('<input type="text" name="name" placeholder="Name"' + (filln && post.name ? ' value="' + html(post.name) + '"' : '') + ' required="" maxlength="16"' + (fpass ? '' : ' autofocus=""') + ' />\n');
		res.write('<input type="password" name="pass" placeholder="Password" required=""' + (fpass ? ' autofocus=""' : '') + ' />\n');
		res.write('<div id="ccreate" ' + (post.create ? '' : 'hidden="" ') + '>\n');
		res.write('<input type="password" name="passc" placeholder="Confirm Password" />\n');
		res.write('<input type="text" name="mail" placeholder="Email"' + (fillm && post.mail ? ' value="' + html(post.mail) + '"' : '') + ' />\n');
		res.write('</div>\n');
		res.write('<input type="hidden" name="referer" value="' + html(post.referer) + '" />\n');
		res.write('<button type="submit">Submit</button>\n');
		res.write('</form>\n');
		res.write('<style>\n');
		res.write('#content input[type=text], button { display: block }\n');
		res.write('</style>');
		respondPageFooter(res);
	});
}

function respondCreateRoomPage(errs, req, res, post) {
	respondPage('Create Room', req, res, function() {
		res.write('<h1>Create Room</h1>\n');
		res.write(errorsHTML(errs));
		res.write('<form method="post">\n');
		res.write('<div>Name: <input type="text" name="name" required="" /></div>\n');
		res.write('<div>Description: <textarea name="desc" required="" minlength="16" rows="3" cols="80"></textarea></div>\n');
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

function respondChangePassPage(errs, req, res, post) {
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

http.createServer(function(req, res) {
	if (req.url.length > 1000) {
		req.url = url.parse(req.url, true);
		return errorPage[414](req, res);
	}
	req.url = url.parse(req.url, true);
	console.log('Req ' + req.url.pathname);
	var i, post;
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
					if (!post.name || !post.pass || !post.passc || !post.mail) return respondLoginPage(['All fields are required.'], req, res, post, true, true, post.name && !post.pass);
					var errors = [],
						nfillm,
						nfilln,
						fpass;
					if (post.name.length > 16 && (nfilln = true)) errors.push('Name must be no longer than 16 characters.');
					if (post.name.length < 3 && (nfilln = true)) errors.push('Name must be at least 3 characters long.');
					if (!post.name.match(/^[\w-]+$/) && (nfilln = true)) errors.push('Name may not contain non-alphanumeric characters besides "-" and "_".');
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
					if (errors.length) return respondLoginPage(errors, req, res, post, !nfillm, !nfilln, fpass);
					dbcs.users.findOne({name: post.name}, function(err, existingUser) {
						if (err) throw err;
						if (existingUser) return respondLoginPage(['Username already taken.'], req, res, post, true);
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
							respondPage('Account Created', req, res, function() {
								res.write('An account for you has been created. To activate it, click the link in the email sent to you.');
								respondPageFooter(res);
							});
						});
					});
				} else {
					if (!post.name || !post.pass) return respondLoginPage(['All fields are required.'], req, res, post);
					dbcs.users.findOne({name: post.name}, function(err, user) {
						if (err) throw err;
						if (!user) return respondLoginPage(['Invalid Credentials.'], req, res, post);
						if (user.confirm) return respondLoginPage(['You must confirm your account by clicking the link in the email sent to you before logging in.'], req, res, post);
						if (user.level < 1) return respondLoginPage(['This account has been disabled.'], req, res, post);
						crypto.pbkdf2(post.pass + user.salt, 'KJ:C5A;_?F!00S(4S[T-3X!#NCZI;A', 1e5, 128, function(err, key) {
							if (err) throw err;
							if (key.toString('base64') != user.pass) return respondLoginPage(['Invalid Credentials.'], req, res, post);
							var idToken = crypto.randomBytes(128).toString('base64');
							respondPage('Login Success', req, res, function() {
								res.write('<p>Welcome back, ' + user.name + '. You have ' + user.rep + ' reputation.</p>');
								var referer = url.parse(post.referer);
								if (referer && referer.host == req.headers.host && referer.pathname.indexOf('login') == -1) res.write('<p>Continue to <a href="' + html(referer.pathname) + '">' + html(referer.pathname) + '</a>.</p>');
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
		} else respondLoginPage([], req, res, {referer: req.headers.referer});
	} else if (i = req.url.pathname.match(/^\/login\/confirm\/([A-Za-z\d+\/=]{172})$/)) {
		dbcs.users.findOne({confirm: i[1]}, function(err, user) {
			if (err) throw err;
			if (user) {
				dbcs.users.update({name: user.name}, {
					$set: {level: 1},
					$unset: {confirm: 1}
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
					bactv: {seen: {$gt: new Date().getTime() - 300000}},
					mod: {level: {$gte: 6}},
					new: {joined: {$gt: new Date().getTime() - 86400000}},
					lowrep: {rep: {$lt: 10}},
					trusted: {rep: {$gte: 200}}
				};
			var order = {};
			order[orderByDict[orderBy] || orderByDict.default] = orderDirDict[orderDir] || orderDirDict.default;
			dbcs.users.find(whereDict[where] || whereDict.default).sort(order).each(function(err, cUser) {
				if (err) throw err;
				if (cUser) dstr += '\t<div class="lft user">\n\t\t<img src="//gravatar.com/avatar/' + cUser.mailhash + '?s=576&amp;d=identicon" width="40" height="40" />\n\t\t<div>\n\t\t\t<a href="/user/' + cUser.name + '">' + cUser.name + '</a>\n\t\t\t<small class="rep">' + cUser.rep + '</small>\n\t\t</div>\n\t</div>\n';
				else {
					fs.readFile('user/userlist.html', function(err, data) {
						if (err) throw err;
						res.write(data.toString().replace('$users', dstr).replace('"' + orderBy + '"', '"' + orderBy + '" selected=""').replace('"' + orderDir + '"', '"' + orderDir + '" selected=""').replace('"' + where + '"', '"' + where + '" selected=""'));
						respondPageFooter(res);
					});
				}
			});
		});
	} else if (i = req.url.pathname.match(/^\/user\/([\w-]{3,16})$/)) {
		dbcs.users.findOne({name: i[1]}, function(err, dispUser) {
			if (err) throw err;
			if (!dispUser) return errorPage[404](req, res);
			respondPage(dispUser.name, req, res, function(user) {
				var me = user ? user.name == dispUser.name : false;
				res.write('<h1><a href="/user/" title="User List">←</a> ' + dispUser.name + (me ? '<small><a href="/user/' + user.name + '/changepass">Change Password</a> <line /> <a href="/logout">Log out</a></small>' : '') + '</h1>\n');
				res.write('<img class="lft" src="//gravatar.com/avatar/' + dispUser.mailhash + '?s=576&amp;d=identicon" style="max-width: 144px; max-height: 144px;" />\n');
				res.write('<div style="padding-left: 6px; overflow: hidden;">\n');
				res.write('\t<div>Joined <time datetime="' + new Date(dispUser.joined).toISOString() + '"></time></div>\n');
				if (dispUser.seen) res.write('\t<div>Seen <time datetime="' + new Date(dispUser.seen).toISOString() + '"></time></div>\n');
				if (me) res.write('\t<a href="//gravatar.com/' + dispUser.mailhash + '" title="Gravatar user page for this email">Change profile picture on gravatar</a> (you must <a href="http://gravatar.com/login">create a gravatar account</a> if you don\'t have one <em>for this email</em>)\n');
				res.write('</div>\n');
				res.write('<div class="clear"><span style="font-size: 1.8em">' + dispUser.rep + '</span> reputation</div>\n');
				if (me) {
					res.write('<h2>Private</h2>\n');
					res.write('<form onsubmit="arguments[0].preventDefault(); request(\'/api/me/changemail\', function(res) { if (res.indexOf(\'Error:\') == 0) return alert(res); var mail = document.getElementById(\'mail\'); mail.hidden = document.getElementById(\'mailedit\').hidden = false; document.getElementById(\'mailinput\').hidden = document.getElementById(\'mailsave\').hidden = document.getElementById(\'mailcancel\').hidden = true; mail.removeChild(mail.firstChild); mail.appendChild(document.createTextNode(document.getElementById(\'mailinput\').value)); }, \'newmail=\' + encodeURIComponent(document.getElementById(\'mailinput\').value));"><span id="mail">Email: ' + html(user.mail) + '</span> <input type="text" id="mailinput" hidden="" value="' + html(user.mail) + '" placeholder="mail" style="width: 240px; max-width: 100%;" /> <button type="submit" id="mailsave" hidden="">Save</button> <button type="reset" id="mailcancel" hidden="" onclick="document.getElementById(\'mail\').hidden = document.getElementById(\'mailedit\').hidden = false; document.getElementById(\'mailinput\').hidden = document.getElementById(\'mailsave\').hidden = document.getElementById(\'mailcancel\').hidden = true;">Cancel</button> <button type="button" id="mailedit" onclick="document.getElementById(\'mail\').hidden = this.hidden = true; document.getElementById(\'mailinput\').hidden = document.getElementById(\'mailsave\').hidden = document.getElementById(\'mailcancel\').hidden = false; document.getElementById(\'mailinput\').focus();">edit</button></form>\n');
					if (user.notifs) {
						var notifs = [];
						for (var i = 0; i < user.notifs.length; i++) {
							if (user.notifs[i].unread) notifs.push(user.notifs[i]);
							user.notifs[i].unread = false;
						}
						if (notifs.length) {
							res.write('<h2>Notifications</h2>\n');
							res.write('<ul id="notifs">\n');
							for (var i = 0; i < notifs.length; i++) res.write('\t<li class="hglt pad"><em>' + notifs[i].type + ' on ' + notifs[i].on + '</em><blockquote>' + notifs[i].body + '</blockquote>-' + notifs[i].from.link('/user/' + notifs[i].from) + ', <time datetime="' + new Date(notifs[i].time).toISOString() + '"></time></li>\n');
							res.write('</ul>');
							dbcs.users.update({name: user.name}, {
								$set: {
									unread: 0,
									notifs: user.notifs
								}
							});
						} else res.write('<p><a href="/notifs">Read old notifications</a></p>');
					}
				}
				respondPageFooter(res);
			}, {nonotif: true});
		});
	} else if (req.url.pathname == '/notifs') {
		dbcs.users.findOne({
			cookie: {
				$elemMatch: {
					token: cookie.parse(req.headers.cookie || '').id,
					created: {$gt: new Date().getTime() - 2592000000}
				}
			}
		}, function(err, user) {
			if (err) throw err;
			if (!user) return errorsHTML[403](req, res, 'You must be logged in to view your notifications.');
			respondPage('Notifications', req, res, function() {
				res.write('<h1>Notifications</h1>\n');
				res.write('<ul id="notifs">\n');
				for (var i = user.notifs.length - 1; i >= 0; i--) res.write('\t<li class="hglt pad"><em>' + user.notifs[i].type + ' on ' + user.notifs[i].on + '</em><blockquote>' + user.notifs[i].body + '</blockquote>-' + user.notifs[i].from.link('/user/' + user.notifs[i].from) + ', <time datetime="' + new Date(user.notifs[i].time).toISOString() + '"></time></li>\n');
				res.write('</ul>\n');
				respondPageFooter(res);
			});
		});
	} else if (req.url.pathname == '/logout') {
		res.writeHead(303, {
			location: '/',
			'Set-Cookie': 'id='
		});
		dbcs.users.update({
			cookie: {
				$elemMatch: {
					token: cookie.parse(req.headers.cookie || '').id,
					created: {$gt: new Date().getTime() - 2592000000}
				}
			}
		}, {$unset: {cookie: 1}});
		res.end();
	} else if (i = req.url.pathname.match(/^\/user\/([\w-]{3,16})\/changepass$/)) {
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
				dbcs.users.findOne({
					cookie: {
						$elemMatch: {
							token: cookie.parse(req.headers.cookie || '').id,
							created: {$gt: new Date().getTime() - 2592000000}
						}
					}
				}, function(err, user) {
					if (err) throw err;
					if (!user || user.name != i[1]) return errorPage[403](req, res);
					if (!post.old || !post.new || !post.conf) return respondChangePassPage(['All fields are required.'], req, res, {});
					if (post.new != post.conf) return respondChangePassPage(['New passwords don\'t match.'], req, res, {});
					crypto.pbkdf2(post.old + user.salt, 'KJ:C5A;_?F!00S(4S[T-3X!#NCZI;A', 1e5, 128, function(err, key) {
						if (err) throw err;
						if (new Buffer(key).toString('base64') != user.pass) return respondChangePassPage(['Incorrect old password.'], req, res, {});
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
							respondPage('Password Updated', req, res, function() {
								res.write('The password for user ' + user.name + ' has been updated. You have been logged out.');
								respondPageFooter(res);
							}, {'Set-Cookie': 'id='});
						});
					});
				});
			});
		} else respondChangePassPage([], req, res, {});
	} else if (req.url.pathname == '/qa/') {
		respondPage(null, req, res, function() {
			res.write('<h1>Questions <small><a href="ask">New Question</a></small></h1>\n');
			dbcs.questions.find().each(function(err, doc) {
				if (err) throw err;
				if (doc) res.write('<h2 class="title"><a href="' + doc._id + '" title="Score: ' + doc.score + '">' + html(doc.title) + '</a></h2>\n');
				else respondPageFooter(res);
			});
		});
	} else if (req.url.pathname == '/qa/ask') {
		respondPage('New Question', req, res, function() {
			fs.readFile('qa/ask.html', function(err, data) {
				if (err) throw err;
				res.write(data);
				respondPageFooter(res);
			});
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
				respondPage(post.lang + ': ' + post.title, req, res, function() {
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
					res.write('<button onclick="request(\'/api/qa/newquestion\', function(res) { if (res.substr(0, 7) == \'Error: \') alert(res); else location.href = res }, ' + html(JSON.stringify(
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
	} else if (i = req.url.pathname.match(/\/qa\/(\d+)/)) {
		dbcs.questions.findOne({_id: parseInt(i[1])}, function(err, question) {
			if (err) throw err;
			if (!question) return errorPage[404](req, res);
			respondPage(question.lang + ': ' + question.title, req, res, function() {
				res.write('<h1>' + html(question.lang + ': ' + question.title) + '</h1>');
				res.write(markdown(question.description));
				res.write('<code class="blk">' + html(question.code) + '</code>');
				res.write('<p>' + html(question.question) + '</p>');
				respondPageFooter(res);
			});
		});
	} else if (req.url.pathname == '/chat/') {
		respondPage(null, req, res, function(user) {
			res.write('<h1>Chat Rooms</h1>\n');
			var roomnames = {};
			dbcs.chatrooms.find().each(function(err, doc) {
				if (err) throw err;
				if (doc) {
					res.write('<h2 class="title"><a href="' + doc._id + '">' + doc.name + '</a></h2>\n');
					res.write(markdown(doc.desc) + '\n');
					roomnames[doc._id] = doc.name;
				} else {
					res.write('<hr />\n');
					if (user && user.rep >= 200) res.write('<a href="newroom" title="Requires 200 reputation" class="small">Create Room</a>\n');
					res.write('</div>\n');
					res.write('<aside id="sidebar" style="overflow-x: hidden">\n');
					res.write('<h2>Recent Posts</h2>\n');
					dbcs.chat.find({deleted: {$exists: false}}).sort({_id: -1}).limit(12).each(function(err, doc) {
						if (err) throw err;
						if (doc) res.write('<div class="comment">' + markdown(doc.body) + '<span class="c-sig">-<a href="/user/' + doc.user + '">' + doc.user + '</a>, <a href="' + doc.room + '#' + doc._id + '" title="Permalink"><time datetime="' + new Date(doc.time).toISOString() + '"></time> in ' + roomnames[doc.room] + '</a></span></div>\n');
						else respondPageFooter(res, true);
					});
				}
			});
		});
	} else if (req.url.pathname == '/chat/newroom') {
		dbcs.users.findOne({
			cookie: {
				$elemMatch: {
					token: cookie.parse(req.headers.cookie || '').id,
					created: {$gt: new Date().getTime() - 2592000000}
				}
			}
		}, function(err, user) {
			if (err) throw err;
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
					if (errors.length) return respondCreateRoomPage(errors, req, res, {});
					dbcs.chatrooms.find().sort({_id: -1}).limit(1).next(function(err, last) {
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
			} else respondCreateRoomPage([], req, res, {});
		});
	} else if (i = req.url.pathname.match(/^\/chat\/(\d+)/)) {
		dbcs.chatrooms.findOne({_id: parseInt(i[1])}, function(err, doc) {
			if (err) throw err;
			if (!doc) return errorPage[404](req, res);
			respondPage(doc.name, req, res, function(user) {
				fs.readFile('chat/room.html', function(err, data) {
					if (err) throw err;
					res.write(data.toString().replaceAll('$id', doc._id).replaceAll('$name', html(doc.name)).replaceAll('$rawdesc', html(doc.desc)).replace('$desc', markdown(doc.desc)).replace('$user', user ? user.name : '').replace('$textarea', user ? ((user || {rep: 0}).rep < 30 ? '<p id="loginmsg">You must have at least 30 reputation to post to chat.</p>' : '<div id="pingsug"></div><textarea autofocus="" id="ta" class="umar" style="width: 100%; height: 96px;"></textarea><div id="subta" class="umar"><button id="btn" onclick="send()">Post</button> <a href="/formatting" target="_blank">Formatting help</a></div>') : '<p id="loginmsg">You must be <a href="/login/" title="Log in or register">logged in</a> and have 30 reputation to post to chat.</p>').replace(' <small><a id="edit">Edit</a></small>', (user || {rep: 0}).rep < 200 ? '' : ' <small><a id="edit">Edit</a></small>'));
					respondPageFooter(res);
				});
			});
		});
	} else if (i = req.url.pathname.match(/^\/chat\/message\/(\d+)/)) {
		dbcs.chat.findOne({_id: parseInt(i[1])}, function(err, doc) {
			if (err) throw err;
			if (!doc) return errorPage[404](req, res);
			respondPage('Message #' + doc._id, req, res, function(user) {
				if (doc.deleted && doc.user != user.name) {
					res.write('This message has been deleted.');
					return respondPageFooter(res);
				}
				var revisions = 0,
					events;
				res.write('<h1>Message #' + doc._id + '</h1>\n');
				res.write('<p><a href="/chat/' + doc.room + '#' + doc._id + '" title="See message in room">Posted <time datetime="' + new Date(doc.time).toISOString() + '"></time></a> by <a href="/user/' + doc.user + '">' + doc.user + '</a></p>\n');
				res.write('<p>Current revision:</p>\n');
				res.write('<blockquote><pre class="nomar">' + html(doc.body) + '</pre></blockquote>\n');
				dbcs.chathistory.find({message: doc._id}).sort({time: 1}).each(function(err, data) {
					if (err) throw err;
					if (data) {
						if (!events) {
							res.write('<h2>History:</h2>\n');
							res.write('<ul>\n')
							events = true;
						}
						res.write('<li>\n');
						if (data.event == 'edit') {
							revisions++;
							res.write('Revision ' + revisions + ' (<time datetime="' + new Date(data.time).toISOString() + '"></time>):\n');
							res.write('<blockquote><pre class="nomar">' + html(data.body) + '</pre></blockquote>');
						} else if (data.event == 'delete' || data.event == 'undelete') {
							var deletersstr = '',
								i = data.by.length;
							while (i--) {
								deletersstr += '<a href="/user/' + data.by[i] + '">' + data.by[i] + '</a>';
								if (i == 1) deletersstr += ', and ';
								else if (i != 0) deletersstr += ', ';
							}
							res.write('<div>' + data.event[0].toUpperCase() + data.event.substr(1) + 'd <time datetime="' + new Date(data.time).toISOString() + '"></time> by ' + deletersstr + '</div>');
						}
						res.write('</li>\n');
					} else {
						if (events) res.write('</ul>');
						else res.write('<p>(no message history)</p>\n');
						respondPageFooter(res);
					}
				});
			});
		});
	} else if (req.url.pathname == '/dev/') {
		respondPage(null, req, res, function() {
			res.write('<h1>Programs <small><a href="new/">New Program</a></small></h1>\n');
			dbcs.programs.find({deleted: {$exists: false}}).sort({score: -1}).limit(15).each(function(err, data) {
				if (err) throw err;
				if (data) {
					res.write('<div class="program">\n');
					res.write('\t<h2 class="title"><a href="' + data._id + '">' + (html(data.title) || 'Untitled') + '</a> <small>-<a href="/user/' + data.user + '">' + data.user + '</a></small></h2>\n');
					if (data.type == 1) res.write('\t<div><iframe sandbox="allow-scripts" seamless="" srcdoc="&lt;!DOCTYPE html>&lt;html>&lt;head>&lt;title>Output frame&lt;/title>&lt;style>*{margin:0;max-width:100%;box-sizing:border-box}#canvas{-webkit-user-select:none;-moz-user-select:none;cursor:default}#console{height:100px;background:#111;color:#fff;overflow:auto;margin-top:8px}#console:empty{display:none}button{display:block}&lt;/style>&lt;/head>&lt;body>&lt;canvas id=&quot;canvas&quot;>&lt;/canvas>&lt;div id=&quot;console&quot;>&lt;/div>&lt;script src=&quot;/dev/canvas.js&quot;>&lt;/script>&lt;script>\'use strict\';try{this.eval(' + html(JSON.stringify(data.code)) + ')}catch(e){error(e)}&lt;/script>&lt;/body>&lt;/html>"></iframe></div>\n');
					else if (data.type == 2) res.write('\t<div><iframe sandbox="allow-scripts" srcdoc="&lt;!DOCTYPE html>&lt;html>&lt;body>' + html(data.html) + '&lt;style>' + html(data.css) + '&lt;/style>&lt;script>alert=prompt=confirm=null;' + html(data.js) + '&lt;/script>&lt;/body>&lt;/html>"></iframe></div>\n'); 
					res.write('</div>\n');
				} else {
					res.write('<a href="search/" class="center-text blk">See more</a>\n');
					respondPageFooter(res);
				}
			});
		});
	} else if (req.url.pathname == '/dev/search/') {
		respondPage('Search', req, res, function() {
			var liststr = '',
				sort = (req.url.query || {}).sort || 'hot',
				sortDict = {
					default: {hotness: -1},
					votes: {score: -1},
					upvotes: {upvotes: -1},
					recent: {time: -1},
					update: {updated: -1}
				};
			dbcs.programs.find({deleted: {$exists: false}}).sort(sortDict[sort] || sortDict.default).limit(720).each(function(err, data) {
				if (err) throw err;
				if (data) liststr += '\t<li><a href="../' + data._id + '">' + (html(data.title) || 'Untitled') + '</a> by <a href="/user/' + data.user + '">' + data.user + '</a></li>\n';
				else {
					fs.readFile('dev/search.html', function(err, data) {
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
				res.write(data.toString().replace(/<section id="meta">[^]+<\/section>/, '').replaceAll(['$id', '$title', '$code'], ['', 'New Program', req.url.query ? (html(req.url.query.code || '')) : '']));
				respondPageFooter(res);
			});
		});
	} else if (req.url.pathname == '/dev/new/html') {
		respondPage('HTML Playground', req, res, function() {
			fs.readFile('dev/html.html', function(err, data) {
				if (err) throw err;
				res.write(data.toString().replace(/<section id="meta">[^]+<\/section>/, '').replaceAll(['$id', '$title', '$html', '$css', '$js'], ['', 'New Program', req.url.query ? (html(req.url.query.html || '')) : '', req.url.query ? (html(req.url.query.css || '')) : '', req.url.query ? (html(req.url.query.js || '')) : '']));
				respondPageFooter(res);
			});
		});
	} else if (i = req.url.pathname.match(/^\/dev\/(\d+)$/)) {
		dbcs.programs.findOne({_id: i = parseInt(i[1])}, function(err, program) {
			if (err) throw err;
			if (!program) return errorPage[404](req, res);
			respondPage(program.deleted ? '[Deleted]' : program.title || 'Untitled', req, res, function(user) {
				if (!user) user = {};
				if (program.deleted) {
					if (program.deleted.by.length == 1 && program.deleted.by == program.user && program.user == user.name) res.write('You deleted this <time datetime="' + new Date(program.deleted.time).toISOString() + '"></time>. <a id="undelete">[undelete]</a>');
					else if (user.level >= 4) {
						var deletersstr = '',
							i = program.deleted.by.length;
						while (i--) {
							deletersstr += '<a href="/user/' + program.deleted.by[i] + '">' + program.deleted.by[i] + '</a>';
							if (i == 1) deletersstr += ', and ';
							else if (i != 0) deletersstr += ', ';
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
				dbcs.votes.findOne({
					user: user.name,
					program: program._id
				}, function(err, vote) {
					if (err) throw err;
					if (!vote) vote = {val: 0};
					dbcs.users.findOne({name: program.user}, function(err, op) {
						if (err) throw err;
						var commentstr = '';
						dbcs.comments.find({program: program._id}).each(function(err, comment) {
							if (err) throw err;
							if (comment) {
								var votes = comment.votes || [],
									voted;
								for (var i in votes) if (votes[i].user == user.name) voted = true;
								commentstr += '<div id="c' + comment._id + '" class="comment"><span class="score" data-score="' + (comment.votes || []).length + '">' + (comment.votes || []).length + '</span> ' + (user && user.rep >= 50 ? '<span class="sctrls"><svg class="up' + (voted ? ' clkd' : '') + '" xmlns="http://www.w3.org/2000/svg"><polygon points="7,-1 0,11 5,11 5,16 9,16 9,11 14,11"></polygon></svg><svg class="fl" xmlns="http://www.w3.org/2000/svg"><polygon points="0,0 13,0 13,8 4,8 4,16 0,16"></polygon></svg></span>' : '') + markdown(comment.body) + '<span class="c-sig">-<a href="/user/' + comment.user + '">' + comment.user + '</a>, <a href="#c' + comment._id + '" title="Permalink"><time datetime="' + new Date(comment.time).toISOString() + '"></time></a></span></div>';
							} else {
								if (program.type == 1) {
									fs.readFile('dev/canvas.html', function(err, data) {
										if (err) throw err;
										res.write(data.toString().replaceAll(['$id', '$title', '$code', '$op-rep', '$op-pic', '$op', '$created', '$updated', '$comments', '$rep', 'Save</a>', 'id="addcomment"', vote.val ? (vote.val == 1 ? 'id="up"' : 'id="dn"') : 0], [program._id.toString(), html(program.title || 'Untitled'), html(program.code), op.rep.toString(), '//gravatar.com/avatar/' + op.mailhash + '?s=576&amp;d=identicon', op.name, new Date(program.created).toISOString(), new Date(program.updated).toISOString(), commentstr, (user.rep || 0).toString(), 'Save</a>' + (program.user == (user || {}).name ? ' <line /> <a id="fork" title="Create a new program based on this one">Fork</a> <line /> <a id="delete" class="red">Delete</a>' : ''), 'id="addcomment"' + (user && user.rep >= 50 ? '' : ' hidden=""'), (vote.val ? (vote.val == 1 ? 'id="up"' : 'id="dn"') : 0) + ' class="clkd"']));
										respondPageFooter(res);
									});
								} else if (program.type == 2) {
									fs.readFile('dev/html.html', function(err, data) {
										if (err) throw err;
										res.write(data.toString().replaceAll(['$id', '$title', '$html', '$css', '$js', '$op-rep', '$op-pic', '$op', '$created', '$updated', '$comments', '$rep', 'Save</a>', 'id="addcomment"', vote.val ? (vote.val == 1 ? 'id="up"' : 'id="dn"') : 0], [program._id.toString(), html(program.title || 'Untitled'), html(program.html), html(program.css), html(program.js), op.rep.toString(), '//gravatar.com/avatar/' + op.mailhash + '?s=576&amp;d=identicon', op.name, new Date(program.created).toISOString(), new Date(program.updated).toISOString(), commentstr, (user.rep || 0).toString(), 'Save</a>' + (program.user == (user || {}).name ? ' <line /> <a id="fork" title="Create a new program based on this one">Fork</a> <line /> <a id="delete" class="red">Delete</a>' : ''), 'id="addcomment"' + (user && user.rep >= 50 ? '' : ' hidden=""'), (vote.val ? (vote.val == 1 ? 'id="up"' : 'id="dn"') : 0) + ' class="clkd"']));
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
		respondPage('Web', req, res, function() {
			fs.readFile('learn/web/web.html', function(err, data) {
				if (err) throw err;
				res.write(data);
				respondPageFooter(res);
			});
		});
	} else if (req.url.pathname == '/learn/debug/') {
		respondPage('Debugging', req, res, function() {
			fs.readFile('learn/debug/debug.html', function(err, data) {
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
			if (err) errorPage[404](req, res);
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
	} else if (req.url.pathname == '/formatting') {
		respondPage('Formatting Help', req, res, function() {
			fs.readFile('formatting.html', function(err, data) {
				if (err) throw err;
				res.write(data);
				respondPageFooter(res);
			});
		}, {inhead: '<style>section, section > code.blk { margin-left: 36px} section { padding: 6px }</style>'});
	} else if (req.url.pathname == '/mod/') {
		respondPage('', req, res, function(user) {
			res.write('<h1>Moderation Queues</h1>\n');
			res.write('' + (user && user.level > 1 ? '<h2><a href="chatflag">' : '<h2 class="grey">') + 'Chat flags' + (user && user.level > 1 ? '</a>' : ' <small class="nofloat">(requires moderator level 2)</small>') + '</h2>\n');
			respondPageFooter(res);
		});
	} else if (req.url.pathname == '/mod/chatflag') {
		respondPage('Chat Flags', req, res, function(user) {
			res.write('<h1>Chat Flags</h1>\n');
			if (!user) {
				res.write('<p>You must be logged in and have level 2 moderator tools to access this queue.</p>');
				return respondPageFooter(res);
			}
			if (user.level < 2) {
				res.write('<p>You must have level 2 moderator tools to access this queue.</p>');
				return respondPageFooter(res);
			}
			dbcs.chat.findOne({
				reviews: {$gt: 0},
				reviewers: {$not: {$in: [user.name]}}
			}, function(err, message) {
				if (err) throw err;
				if (message) {
					dbcs.chatrooms.findOne({_id: message.room}, function(err, room) {
						if (err) throw err;
						res.write('<a href="/user/' + message.user + '">' + message.user + '</a> posted <a href="/chat/' + message.room + '#' + message._id + '"><time datetime="' + new Date(message.time).toISOString() + '"></time></a> in <a href="/chat/' + message.room + '">' + room.name + '</a>:\n');
						res.write('<blockquote><pre>' + html(message.body) + '</pre></blockquote>\n');
						respondPageFooter(res);
					});
				} else {
					res.write('There are no items for you to review.');
					respondPageFooter(res);
				}
			});
		}, {inhead: '<style>pre { margin: 0 }</style>'});
	} else if (req.url.pathname == '/api/me/changemail') {
		if (req.method == 'POST') {
			if (url.parse(req.headers.referer).host != req.headers.host) {
				res.writeHead(403);
				return res.end('Error: Suspicious request.');
			}
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
				var newmail = post.newmail;
				if (!newmail) return res.end('Error: No email specified.');
				if (newmail.length > 256) return res.end('Error: Email address must be no longer than 256 characters.');
				dbcs.users.findOne({
					cookie: {
						$elemMatch: {
							token: cookie.parse(req.headers.cookie || '').id,
							created: {$gt: new Date().getTime() - 2592000000}
						}
					}
				}, function(err, user) {
					if (err) throw err;
					if (!user) return res.end('Error: You are not logged in.');
					dbcs.users.update({name: user.name}, {$set: {mail: newmail, mailhash: crypto.createHash('md5').update(newmail).digest('hex')}});
					res.end('Success');
				});
			});
		} else errorPage[405](req, res);
	} else if (req.url.pathname == '/api/qa/newquestion') {
		if (req.method == 'POST') {
			if (url.parse(req.headers.referer).host != req.headers.host) {
				res.writeHead(403);
				return res.end('Error: Suspicious request.');
			}
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
				dbcs.users.findOne({
					cookie: {
						$elemMatch: {
							token: cookie.parse(req.headers.cookie || '').id,
							created: {$gt: new Date().getTime() - 2592000000}
						}
					}
				}, function(err, user) {
					if (err) throw err;
					if (!user) return res.end('Error: You must be logged in to ask a question.');
					dbcs.questions.find().sort({_id: -1}).limit(1).next(function(err, last) {
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
						res.end('/qa/' + id);
					});
				});
			});
		} else errorPage[405](req, res);
	} else if (i = req.url.pathname.match(/\/api\/chat\/(\d+)/)) {
		dbcs.chat.findOne({_id: parseInt(i[1])}, function(err, doc) {
			if (err) throw err;
			if (doc.deleted) return res.end('Error: Message has been deleted.');
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
			if (url.parse(req.headers.referer).host != req.headers.host) {
				res.writeHead(403);
				return res.end('Error: Suspicious request.');
			}
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
				var type = parseInt(req.url.query.type);
				if (type !== 1 && type !== 2) return res.end('Error: Invalid program type.'); 
				dbcs.users.findOne({
					cookie: {
						$elemMatch: {
							token: cookie.parse(req.headers.cookie || '').id,
							created: {$gt: new Date().getTime() - 2592000000}
						}
					}
				}, function(err, user) {
					if (err) throw err;
					if (!user) return res.end('Error: You must be logged in to save a program.');
					var i = url.parse(req.headers.referer || '').pathname.match(/^\/dev\/(\d+)/),
						id = i ? parseInt(i[1]) : 0;
					dbcs.programs.findOne({_id: id}, function(err, program) {
						if (err) throw err;
						if (id && !req.url.query.fork && program && program.user.toString() == user.name.toString()) {
							if (type == 2) dbcs.programs.update({_id: id}, {
									$set: {
										html: post.html,
										css: post.css,
										js: post.js,
										updated: new Date().getTime()
									}
								});
							else dbcs.programs.update({_id: id}, {
									$set: {
										code: post.code,
										updated: new Date().getTime()
									}
								});
							res.end('Success');
						} else {
							dbcs.programs.find().sort({_id: -1}).limit(1).next(function(err, last) {
								if (err) throw err;
								var i = last ? last._id + 1 : 1;
								if (type == 2) dbcs.programs.insert({
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
								else dbcs.programs.insert({
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
		} else errorPage[405](req, res);
	} else if (req.url.pathname == '/api/program/edit-title') {
		if (req.method == 'POST') {
			if (url.parse(req.headers.referer).host != req.headers.host) {
				res.writeHead(403);
				return res.end('Error: Suspicious request.');
			}
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
				dbcs.users.findOne({
					cookie: {
						$elemMatch: {
							token: cookie.parse(req.headers.cookie || '').id,
							created: {$gt: new Date().getTime() - 2592000000}
						}
					}
				}, function(err, user) {
					if (err) throw err;
					if (!user) return res.end('Error: You must be logged in to change a program title.');
					var i = url.parse(req.headers.referer || '').pathname.match(/^\/dev\/(\d+)/),
						id = i ? parseInt(i[1]) : 0;
					dbcs.programs.findOne({_id: id}, function(err, program) {
						if (err) throw err;
						if (!program) return res.end('Error: Invalid program id.');
						if (program.user.toString() == user.name.toString()) {
							dbcs.programs.update({_id: id}, {$set: {title: post.title.substr(0, 92)}});
							res.end('Success');
						} else res.end('Error: You may only rename your own programs.');
					});
				});
			});
		} else errorPage[405](req, res);
	} else if (req.url.pathname == '/api/program/vote') {
		if (req.method == 'POST') {
			if (url.parse(req.headers.referer).host != req.headers.host) {
				res.writeHead(403);
				return res.end('Error: Suspicious request.');
			}
			post = '';
			req.on('data', function(data) {
				if (req.abort) return;
				post += data;
				if (post.length > 200) {
					errorPage[413](req, res);
					req.abort = true;
				}
			});
			req.on('end', function() {
				if (req.abort) return;
				post = querystring.parse(post);
				if (!post.val) return res.end('Error: Vote value not specified.');
				post.val = parseInt(post.val);
				if (post.val !== 0 && post.val !== 1 && post.val !== -1) return res.end('Error: Invalid vote value.');
				dbcs.users.findOne({
					cookie: {
						$elemMatch: {
							token: cookie.parse(req.headers.cookie || '').id,
							created: {$gt: new Date().getTime() - 2592000000}
						}
					}
				}, function(err, user) {
					if (err) throw err;
					if (!user) return res.end('Error: You must be logged in and have 15 reputation to vote.');
					if (user.rep < 15) return res.end('Error: You must have 15 reputation to vote.');
					var i = url.parse(req.headers.referer || '').pathname.match(/^\/dev\/(\d+)/),
						id = i ? parseInt(i[1]) : 0;
					dbcs.programs.findOne({_id: id}, function(err, program) {
						if (err) throw err;
						if (!program) return res.end('Error: Invalid program id.');
						if (program.user.toString() == user.name.toString()) return res.end('Error: You can\'t vote for your own post');
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
							res.end('Success');
						});
						dbcs.votes.find({
							program: id,
							time: {$lt: new Date().getTime() - 86400000}
						}).count(function(err, count) {
							if (err) throw err;
							dbcs.programs.update({_id: id}, {$inc: {hotness: -count}});
						});
					});
				});
			});
		} else errorPage[405](req, res);
	} else if (req.url.pathname == '/api/program/delete') {
		if (req.method == 'POST') {
			if (url.parse(req.headers.referer).host != req.headers.host) {
				res.writeHead(403);
				return res.end('Error: Suspicious request.');
			}
			post = '';
			req.on('data', function(data) {
				if (req.abort) return;
				post += data;
				if (post.length > 100) {
					errorPage[413](req, res);
					req.abort = true;
				}
			});
			req.on('end', function() {
				if (req.abort) return;
				post = querystring.parse(post);
				dbcs.users.findOne({
					cookie: {
						$elemMatch: {
							token: cookie.parse(req.headers.cookie || '').id,
							created: {$gt: new Date().getTime() - 2592000000}
						}
					}
				}, function(err, user) {
					if (err) throw err;
					if (!user) return res.end('Error: You must be logged in to delete programs.');
					var i = url.parse(req.headers.referer || '').pathname.match(/^\/dev\/(\d+)/),
						id = i ? parseInt(i[1]) : 0;
					dbcs.programs.findOne({_id: id}, function(err, program) {
						if (err) throw err;
						if (!program) return res.end('Error: Invalid program id.');
						if (program.user.toString() != user.name.toString() && user.level != 2) return res.end('Error: You may only delete your own programs.');
						dbcs.programs.update({_id: id}, {
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
		} else errorPage[405](req, res);
	} else if (req.url.pathname == '/api/program/undelete') {
		if (req.method == 'POST') {
			if (url.parse(req.headers.referer).host != req.headers.host) {
				res.writeHead(403);
				return res.end('Error: Suspicious request.');
			}
			post = '';
			req.on('data', function(data) {
				if (req.abort) return;
				post += data;
				if (post.length > 100) {
					errorPage[413](req, res);
					req.abort = true;
				}
			});
			req.on('end', function() {
				post = querystring.parse(post);
				dbcs.users.findOne({
					cookie: {
						$elemMatch: {
							token: cookie.parse(req.headers.cookie || '').id,
							created: {$gt: new Date().getTime() - 2592000000}
						}
					}
				}, function(err, user) {
					if (err) throw err;
					if (!user) return res.end('Error: You must be logged in to vote.');
					var i = url.parse(req.headers.referer || '').pathname.match(/^\/dev\/(\d+)/),
						id = i ? parseInt(i[1]) : 0;
					dbcs.programs.findOne({_id: id}, function(err, program) {
						if (err) throw err;
						if (!program) return res.end('Error: Invalid program id.');
						if (program.user.toString() != user.name.toString() && user.level != 2) return res.end('Error: You may only undelete your own programs.');
						dbcs.programs.update({_id: id}, {$unset: {deleted: 1}});
						res.end('Success');
					});
				});
			});
		} else errorPage[405](req, res);
	} else {
		fs.stat('.' + req.url.pathname, function(err, stats) {
			if (err) return errorPage[404](req, res);
			var i = sensitivePaths.length;
			while (i--) if (req.url.pathname.indexOf(sensitivePaths[i]) != -1) return errorPage[403](req, res);
			res.writeHead(200, {
				'Content-Type': mime[path.extname(req.url.pathname)] || 'text/plain',
				'Cache-Control': 'max-age=6012800, public',
				'Content-Length': stats.size
			});
			fs.readFile('.' + req.url.pathname, function(err, data) {
				if (err) errorPage[404](req, res);
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
		dbcs.users.findOne({
				cookie: {
					$elemMatch: {
						token: cookie.parse(tws.upgradeReq.headers.cookie || '').id,
						created: {$gt: new Date().getTime() - 2592000000}
					}
				}
			}, function(err, user) {
			if (err) throw err;
			if (!user) user = {};
			tws.user = user;
			dbcs.chat.find({
				room: tws.room,
				$or: [
					{deleted: {$exists: false}},
					{user: tws.user.name}
				]
			}).count(function(err, count) {
				if (err) throw err;
				var i = parseInt(tws.upgradeReq.url.match(/\/chat\/(\d+)(\/(\d+))?/)[3]) || Infinity;
				dbcs.chat.find({
					room: tws.room,
					$or: [
						{deleted: {$exists: false}},
						{user: tws.user.name}
					],
					_id: {$gt: i}
				}).count(function(err, after) {
					var skip = Math.max(0, after > 92 ? count - after - 18 : count - 92);
					try {
						tws.send(JSON.stringify({
							event: 'info-skipped',
							body: skip,
							ts: after > 92
						}));
					} catch(e) {}
					dbcs.chat.find({
						room: tws.room,
						$or: [
							{deleted: {$exists: false}},
							{user: tws.user.name}
						]
					}).skip(skip).sort({_id: 1}).limit(after > 92 ? 192 : 92).each(function(err, doc) {
						if (err) throw err;
						if (doc) {
							try {
								tws.send(JSON.stringify({
									event: 'init',
									id: doc._id,
									body: doc.body,
									user: doc.user,
									time: doc.time,
									stars: doc.stars,
									deleted: doc.deleted
								}));
							} catch(e) {}
							dbcs.chatstars.findOne({
								pid: doc._id,
								user: tws.user.name
							}, function(err, star) {
								if (err) throw err;
								try {
									if (star) tws.send(JSON.stringify({
											event: 'selfstar',
											id: star.pid
										}));
								} catch(e) {}
							});
						} else {
							var pids = [];
							dbcs.chatstars.find({room: tws.room}).sort({time: -1}).limit(12).each(function(err, star) {
								if (err) throw err;
								if (star) {
									if (pids.indexOf(star.pid) == -1) pids.push(star.pid);
								} else {
									dbcs.chat.find({
										_id: {$in: pids},
										deleted: {$exists: false}
									}).sort({_id: -1}).each(function(err, post) {
										if (err) throw err;
										if (post) {
											try {
												tws.send(JSON.stringify({
													event: 'star',
													id: post._id,
													board: true,
													body: post.body,
													stars: post.stars || 0,
													user: post.user,
													time: post.time
												}));
											} catch (e) {}
										}
									});
									try {
										return tws.send(JSON.stringify({event: 'info-complete'}));
									} catch(e) {}
								}
							});
						}
					});
				});
			});
			dbcs.chatusers.remove({
				name: user.name,
				room: tws.room
			}, {w: 1}, function(err, rem) {
				if (err) throw err;
				dbcs.chatusers.find({room: tws.room}).each(function(err, doc) {
					if (err) throw err;
					if (doc) tws.send(JSON.stringify({
						event: 'adduser',
						name: doc.name,
						state: doc.state
					}));
					else if (user.name) {
						if (rem.result.n) {
							tws.send(JSON.stringify({
								event: 'adduser',
								name: user.name,
								state: 1
							}));
						} else {
							var sendto = [];
							for (var i in wss.clients) {
								if (wss.clients[i].room == tws.room && sendto.indexOf(wss.clients[i].user.name) == -1) sendto.push(wss.clients[i]);
							}
							for (var i in sendto) {
								sendto[i].send(JSON.stringify({
									event: 'adduser',
									name: user.name,
									state: 1
								}));
							}
						}
						dbcs.chatusers.insert({
							name: user.name,
							room: tws.room,
							state: 1
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
					dbcs.chat.find().sort({_id: -1}).limit(1).next(function(err, doc) {
						if (err) throw err;
						var id = doc ? doc._id + 1 : 1;
						dbcs.chat.insert({
							_id: id,
							body: message.body,
							user: tws.user.name,
							time: new Date().getTime(),
							room: tws.room
						});
						var sendto = [];
						for (var i in wss.clients) {
							if (wss.clients[i].room == tws.room && sendto.indexOf(wss.clients[i].user.name) == -1) sendto.push(wss.clients[i]);
						}
						for (var i in sendto) {
							sendto[i].send(JSON.stringify({
								event: 'add',
								body: message.body,
								user: tws.user.name,
								id: id
							}));
						}
						var matches = message.body.match(/@([\w-]{3,16})\W/g);
						if (!matches) return;
						for (var i = 0; i < matches.length; i++) {
							dbcs.users.findOne({name: matches[i].substr(1, matches[i].length - 2)}, function(err, user) {
								if (err) throw err;
								if (!user) return;
								dbcs.chatusers.findOne({
									name: user.name,
									room: tws.room
								}, function(err, userinroom) {
									if (err) throw err;
									if (userinroom) return;
									dbcs.chatrooms.findOne({_id: tws.room}, function(err, room) {
										if (err) throw err;
										if (!room) throw new TypeError('Undefined room object');
										dbcs.users.update({name: user.name}, {
											$push: {
												notifs: {
													type: 'Chat message',
													on: room.name.link('/chat/' + tws.room + '#' + id),
													body: message.body,
													from: tws.user.name,
													unread: true,
													time: new Date().getTime()
												}
											},
											$inc: {unread: 1}
										});
									});
								});
							});
						}
					});
				} else if (message.event == 'edit') {
					dbcs.chat.findOne({_id: message.id}, function(err, post) {
						if (err) throw err;
						if (!post) return tws.send(JSON.stringify({
							event: 'err',
							body: 'Message not found.'
						}));
						if (post.user != tws.user.name) return tws.send(JSON.stringify({
							event: 'err',
							body: 'You may only edit your own messages.'
						}));
						dbcs.chathistory.insert({
							message: post._id,
							event: 'edit',
							time: new Date().getTime(),
							body: post.body
						});
					dbcs.chat.update({_id: post._id}, {$set: {body: message.body}});
						var sendto = [];
						for (var i in wss.clients) {
							if (wss.clients[i].room == tws.room && sendto.indexOf(wss.clients[i].user.name) == -1) sendto.push(wss.clients[i]);
						}
						for (var i in sendto) {
							sendto[i].send(JSON.stringify({
								event: 'edit',
								id: post._id,
								body: message.body
							}));
						}
					});
				} else if (message.event == 'flag') {
					dbcs.chat.findOne({_id: message.id}, function(err, post) {
						if (err) throw err;
						if (!post) return tws.send(JSON.stringify({
							event: 'err',
							body: 'Message not found.'
						}));
						if (!tws.user.name) return tws.send(JSON.stringify({
							event: 'err',
							body: 'You must be logged in and have 50 reputation to flag chat messages.'
						}));
						if (tws.user.rep < 50) return tws.send(JSON.stringify({
							event: 'err',
							body: 'You must have 50 reputation to flag chat messages.'
						}));
						if (!message.body) return tws.send(JSON.stringify({
							event: 'err',
							body: 'You must specify a flag description.'
						}));
						dbcs.chat.update({_id: post._id}, {
							$set: {
								reviews: 3,
								lastFlag: new Date().getTime()
							},
							$push: {
								flags: {
									body: message.body,
									time: new Date().getTime(),
									user: tws.user.name
								}
							}
						});
						tws.send(JSON.stringify({
							event: 'notice',
							body: 'Post #' + message.id + ' flagged.'
						}))
					});
				} else if (message.event == 'delete') {
					dbcs.chat.findOne({_id: message.id}, function(err, post) {
						if (err) throw err;
						if (!post) return tws.send(JSON.stringify({
							event: 'err',
							body: 'Message not found.'
						}));
						if (post.deleted) return tws.send(JSON.stringify({
							event: 'err',
							body: 'This message is already deleted.'
						}));
						if (post.user != tws.user.name) return tws.send(JSON.stringify({
							event: 'err',
							body: 'You may only delete your own messages.'
						}));
						dbcs.chathistory.insert({
							message: post._id,
							event: 'delete',
							time: new Date().getTime(),
							by: [tws.user.name]
						});
						dbcs.chat.update({_id: post._id}, {$set: {deleted: true}});
						var sendto = [];
						for (var i in wss.clients) {
							if (wss.clients[i].room == tws.room && sendto.indexOf(wss.clients[i].user.name) == -1) sendto.push(wss.clients[i]);
						}
						for (var i in sendto) {
							sendto[i].send(JSON.stringify({
								event: 'delete',
								id: post._id
							}));
						}
					});
				} else if (message.event == 'undelete') {
					dbcs.chat.findOne({_id: message.id}, function(err, post) {
						if (err) throw err;
						if (!post) return tws.send(JSON.stringify({
							event: 'err',
							body: 'Message not found.'
						}));
						if (!post.deleted) return tws.send(JSON.stringify({
							event: 'err',
							body: 'This message isn\'t deleted.'
						}));
						if (post.user != tws.user.name) return tws.send(JSON.stringify({
							event: 'err',
							body: 'You may only undelete your own messages.'
						}));
						dbcs.chathistory.insert({
							message: post._id,
							event: 'undelete',
							time: new Date().getTime(),
							by: [tws.user.name]
						});
						dbcs.chat.update({_id: post._id}, {$unset: {deleted: 1}});
						var sendto = [];
						for (var i in wss.clients) {
							if (wss.clients[i].room == tws.room && sendto.indexOf(wss.clients[i].user.name) == -1) sendto.push(wss.clients[i]);
						}
						for (var i in sendto) {
							sendto[i].send(JSON.stringify({
								event: 'undelete',
								id: post._id,
								body: post.body,
								user: post.user,
								time: post.time,
								stars: post.stars || 0
							}));
						}
					});
				} else if (message.event == 'statechange') {
					if (tws.user.name) {
						dbcs.chatusers.update({
							name: tws.user.name,
							room: tws.room
						}, {$set: {state: message.state}});
						var sendto = [];
						for (var i in wss.clients) {
							if (wss.clients[i].room == tws.room && sendto.indexOf(wss.clients[i].user.name) == -1) sendto.push(wss.clients[i]);
						}
						for (var i in sendto) {
							sendto[i].send(JSON.stringify({
								event: 'statechange',
								state: message.state,
								user: tws.user.name
							}));
						}
					}
				} else if (message.event == 'req') {
					if (isNaN(message.skip) || message.skip < 0) return tws.send(JSON.stringify({
						event: 'err',
						body: 'Invalid skip value.'
					}));
					var cursor = dbcs.chat.find({
						room: tws.room,
						$or: [
							{deleted: {$exists: false}},
							{user: tws.user.name}
						]
					});
					cursor.count(function(err, count) {
						if (err) throw err;
						var i = 0;
						var num = message.skip - message.to || 0;
						cursor.sort({_id: -1}).skip(count - message.skip - 1).limit(num).each(function(err, doc) {
							if (err) throw err;
							if (!doc) return;
							i++;
							try {
								tws.send(JSON.stringify({
									event: 'init',
									id: doc._id,
									body: doc.body,
									user: doc.user,
									time: doc.time,
									stars: doc.stars,
									before: true
								}));
							} catch(e) {}
							dbcs.chatstars.findOne({
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
					dbcs.chat.findOne({
						_id: id,
						deleted: {$exists: false}
					}, function(err, post) {
						if (err) throw err;
						if (!post) return tws.send(JSON.stringify({
							event: 'err',
							body: 'Invalid message id.'
						}));
						dbcs.chatstars.findOne({
							user: tws.user.name,
							pid: id
						}, function(err, star) {
							if (err) throw err;
							if (star) return tws.send(JSON.stringify({
								event: 'err',
								body: 'You already stared this post.'
							}));
							dbcs.chatstars.insert({
								user: tws.user.name,
								pid: id,
								room: post.room,
								time: new Date().getTime()
							});
							dbcs.chat.update({_id: id}, {$inc: {stars: 1}});
							var sendto = [];
							for (var i in wss.clients) {
								if (wss.clients[i].room == tws.room && sendto.indexOf(wss.clients[i].user.name) == -1) sendto.push(wss.clients[i]);
							}
							for (var i in sendto) {
								sendto[i].send(JSON.stringify({
									event: 'star',
									id: post._id,
									body: post.body,
									stars: (post.stars || 0) + 1,
									user: post.user,
									time: post.time
								}));
							}
						});
					});
				} else if (message.event == 'unstar') {
					if (!tws.user.name) return tws.send(JSON.stringify({
						event: 'err',
						body: 'You must be logged in to unstar messages.'
					}));
					var id = parseInt(message.id);
					dbcs.chat.findOne({
						_id: id,
						deleted: {$exists: false}
					}, function(err, doc) {
						if (err) throw err;
						if (!doc) return tws.send(JSON.stringify({
							event: 'err',
							body: 'Invalid message id.'
						}));
						dbcs.chatstars.findOne({
							user: tws.user.name,
							pid: id
						}, function(err, star) {
							if (err) throw err;
							if (!star) return tws.send(JSON.stringify({
								event: 'err',
								body: 'You haven\'t stared this post.'
							}));
							dbcs.chatstars.remove({
								user: tws.user.name,
								pid: id
							});
							dbcs.chat.update({_id: id}, {$inc: {stars: -1}});
							var sendto = [];
							for (var i in wss.clients) {
								if (wss.clients[i].room == tws.room && sendto.indexOf(wss.clients[i].user.name) == -1) sendto.push(wss.clients[i]);
							}
							for (var i in sendto) {
								sendto[i].send(JSON.stringify({
									event: 'unstar',
									id: id
								}));
							}
						});
					});
				} else if (message.event == 'info-update') {
					if (!tws.user.name || tws.user.rep < 200) return tws.send(JSON.stringify({
						event: 'err',
						body: 'You don\'t have permission to update room information.',
						revertInfo: 1
					}));
					dbcs.chatrooms.update({_id: tws.room}, {
						$set: {
							name: message.name,
							desc: message.desc
						}
					});
					dbcs.chat.find().sort({_id: -1}).limit(1).next(function(err, doc) {
						if (err) throw err;
						var id = doc ? doc._id + 1 : 1,
							newMessage = 'Room description updated to ' + markdownEscape(message.name) + ': ' + message.desc;
						dbcs.chat.insert({
							_id: id,
							body: newMessage,
							user: tws.user.name,
							time: new Date().getTime(),
							room: tws.room
						});
						var sendto = [];
						for (var i in wss.clients) {
							if (wss.clients[i].room == tws.room && sendto.indexOf(wss.clients[i].user.name) == -1) sendto.push(wss.clients[i]);
						}
						for (var i in sendto) {
							sendto[i].send(JSON.stringify({
								event: 'info-update',
								name: message.name,
								desc: message.desc,
								id: id
							}));
							sendto[i].send(JSON.stringify({
								event: 'add',
								body: newMessage,
								user: tws.user.name,
								id: id
							}));
						}
					});
				} else tws.send(JSON.stringify({
					event: 'err',
					body: 'Invalid event type.'
				}));
			});
			tws.on('close', function() {
				var sendto = [];
				for (var i in wss.clients) {
					if (wss.clients[i].room == tws.room && sendto.indexOf(wss.clients[i].user.name) == -1) sendto.push(wss.clients[i]);
				}
				for (var i in sendto) {
					sendto[i].send(JSON.stringify({
						event: 'deluser',
						name: tws.user.name
					}));
				}
				dbcs.chatusers.remove({
					name: tws.user.name,
					room: tws.room
				});
			});
		});
	} else if ((i = tws.upgradeReq.url.match(/\/dev\/(\d+)/))) {
		if (isNaN(tws.program = parseInt(i[1]))) return;
		dbcs.users.findOne({
			cookie: {
				$elemMatch: {
					token: cookie.parse(tws.upgradeReq.headers.cookie || '').id,
					created: {$gt: new Date().getTime() - 2592000000}
				}
			}
		}, function(err, user) {
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
					dbcs.comments.find().sort({_id: -1}).limit(1).next(function(err, doc) {
						if (err) throw err;
						var id = doc ? doc._id + 1 : 1;
						dbcs.comments.insert({
							_id: id,
							body: message.body,
							user: tws.user.name,
							time: new Date().getTime(),
							program: tws.program
						});
						var sendto = [];
						for (var i in wss.clients) {
							if (wss.clients[i].program == tws.program && sendto.indexOf(wss.clients[i].user.name) == -1) sendto.push(wss.clients[i]);
						}
						for (var i in sendto) {
							sendto[i].send(JSON.stringify({
								event: 'add',
								body: message.body,
								user: tws.user.name,
								id: id
							}));
						}
						var matches = message.body.match(/@([\w-]{3,16})\W/g) || [];
						for (var i in matches) matches[i] = matches[i].substr(1, matches[i].length - 2);
						dbcs.programs.findOne({_id: tws.program}, function(err, program) {
							if (err) throw err;
							if (matches.indexOf(program.user) == -1) matches.push(program.user);
							for (var i = 0; i < matches.length; i++) {
								if (matches[i] == tws.user.name) continue;
								dbcs.users.findOne({name: matches[i]}, function(err, user) {
									if (err) throw err;
									if (!user) return;
									dbcs.users.update({name: user.name}, {
										$push: {
											notifs: {
												type: 'Comment',
												on: program.title.link('/dev/' + tws.program + '#c' + id),
												body: message.body,
												from: tws.user.name,
												unread: true,
												time: new Date().getTime()
											}
										},
										$inc: {unread: 1}
									});
								});
							}
						});
					});
				} else if (message.event == 'vote') {
					if (!tws.user.name) return tws.send(JSON.stringify({
						event: 'err',
						body: 'You must be logged in and have 50 reputation to vote on comments.'
					}));
					if (tws.user.rep < 50) return tws.send(JSON.stringify({
						event: 'err',
						body: 'You must have 50 reputation to vote on comments.'
					}));
					var id = parseInt(message.id);
					dbcs.comments.findOne({
						_id: id,
						deleted: {$exists: false}
					}, function(err, post) {
						if (err) throw err;
						if (!post) return tws.send(JSON.stringify({
							event: 'err',
							body: 'Invalid comment id.'
						}));
						for (var i in post.votes) {
							if (post.votes[i].user == tws.user.name) return tws.send(JSON.stringify({
								event: 'err',
								body: 'You already voted on this comment.'
							}));
						}
						dbcs.comments.update({_id: id}, {
							$push: {
								votes: {
									user: tws.user.name,
									time: new Date().getTime()
								}
							}
						});
						var sendto = [];
						for (var i in wss.clients) {
							if (wss.clients[i].program == tws.program && sendto.indexOf(wss.clients[i].user.name) == -1) sendto.push(wss.clients[i]);
						}
						for (var i in sendto) {
							sendto[i].send(JSON.stringify({
								event: 'scorechange',
								id: post._id,
								score: post.votes ? post.votes.length + 1 : 1
							}));
						}
					});
				} else if (message.event == 'unvote') {
					if (!tws.user.name) return tws.send(JSON.stringify({
						event: 'err',
						body: 'You must be logged in to vote on comments.'
					}));
					var id = parseInt(message.id);
					dbcs.comments.findOne({
						_id: id,
						deleted: {$exists: false}
					}, function(err, post) {
						if (err) throw err;
						if (!post) return tws.send(JSON.stringify({
							event: 'err',
							body: 'Invalid comment id.'
						}));
						var err = true;
						for (var i in post.votes) {
							if (post.votes[i].user == tws.user.name) err = false;
						}
						if (err) return tws.send(JSON.stringify({
							event: 'err',
							body: 'You haven\'t voted on this comment.'
						}));
						dbcs.comments.update({_id: id}, {$pull: {votes: {user: tws.user.name}}});
						var sendto = [];
						for (var i in wss.clients) {
							if (wss.clients[i].program == tws.program && sendto.indexOf(wss.clients[i].user.name) == -1) sendto.push(wss.clients[i]);
						}
						for (var i in sendto) {
							sendto[i].send(JSON.stringify({
								event: 'scorechange',
								id: post._id,
								score: post.votes.length - 1
							}));
						}
					});
				} else tws.send(JSON.stringify({
					event: 'err',
					body: 'Invalid event type.'
				}));
			});
		});
	}
});