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
	fs = require('fs'),
	url = require('url'),
	querystring = require('querystring'),
	cookie = require('cookie'),
	crypto = require('crypto'),
	essentials = require('./essentials.js'),
	html = essentials.html,
	markdownEscape = essentials.markdownEscape,
	inlineMarkdown = essentials.inlineMarkdown,
	markdown = essentials.markdown;

var mongo = require('mongodb');
var db = new mongo.Db('DevDoodle', new mongo.Server('localhost', 27017, {
	auto_reconnect: false,
	poolSize: 4
}), {
	w: 0,
	native_parser: false
});

var dbcs = {},
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
				if (usedDBCs[i] == 'chatusers') collection.drop();
			});
		}
	});
});

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
		nonotif = header.nonotif;
	delete header.inhead;
	delete header.user;
	delete header.nonotif;
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
			)
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

var statics = {
	'/': {
		path: './html/home.html'
	}
}

http.createServer(function(req,	res) {
	var origURL = req.url,
		cookies = cookie.parse(req.headers.cookie || ''),
		user = JSON.parse(req.headers.user),
		i;
	req.url = url.parse(req.url, true);
	console.log('Req ' + req.url.pathname);
	if (i = statics[req.url.pathname]) {
		respondPage(i.title, user, req, res, function() {
			fs.readFile(i.path || './html/' + req.url.pathname, function(err, data) {
				if (err) throw err;
				res.write(data.toString());
				respondPageFooter(res);
			});
		})
	} else if (i = req.url.pathname.match(/^\/login\/confirm\/([A-Za-z\d+\/=]{172})$/)) {
		dbcs.users.findOne({confirm: i[1]}, function(err, user) {
			if (err) throw err;
			if (user) {
				dbcs.users.update({name: user.name}, {
					$set: {level: 1},
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
	} else if (req.url.pathname == '/user/') {
		respondPage('Users', user, req, res, function() {
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
					fs.readFile('./html/user/userlist.html', function(err, data) {
						if (err) throw err;
						res.write(data.toString().replace('$users', dstr).replace('"' + orderBy + '"', '"' + orderBy + '" selected=""').replace('"' + orderDir + '"', '"' + orderDir + '" selected=""').replace('"' + where + '"', '"' + where + '" selected=""'));
						respondPageFooter(res);
					});
				}
			});
		});
	} else if (i = req.url.pathname.match(/^\/user\/([a-zA-Z0-9-]{3,16})$/)) {
		dbcs.users.findOne({name: i[1]}, function(err, dispUser) {
			if (err) throw err;
			if (!dispUser) return errorPage[404](req, res);
			respondPage(dispUser.name, user, req, res, function() {
				var me = user ? user.name == dispUser.name : false;
				res.write('<h1><a href="/user/" title="User List">←</a> ' + dispUser.name + (me ? ' <small><a href="/user/' + user.name + '/changepass">Change Password</a> <line /> <a href="/logout">Log out</a></small>' : '') + '</h1>\n');
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
		if (!user) return errorsHTML[403](req, res, 'You must be logged in to view your notifications.');
		respondPage('Notifications', user, req, res, function() {
			res.write('<h1>Notifications</h1>\n');
			res.write('<ul id="notifs">\n');
			for (var i = user.notifs.length - 1; i >= 0; i--) res.write('\t<li class="hglt pad"><em>' + user.notifs[i].type + ' on ' + user.notifs[i].on + '</em><blockquote>' + user.notifs[i].body + '</blockquote>-' + user.notifs[i].from.link('/user/' + user.notifs[i].from) + ', <time datetime="' + new Date(user.notifs[i].time).toISOString() + '"></time></li>\n');
			res.write('</ul>\n');
			respondPageFooter(res);
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
	} else if (req.url.pathname == '/qa/') {
		respondPage(null, user, req, res, function() {
			res.write('<h1>Questions <small><a href="ask">New Question</a></small></h1>\n');
			dbcs.questions.find().each(function(err, doc) {
				if (err) throw err;
				if (doc) res.write('<h2 class="title"><a href="' + doc._id + '" title="Score: ' + doc.score + '">' + html(doc.title) + '</a></h2>\n');
				else respondPageFooter(res);
			});
		});
	} else if (req.url.pathname == '/qa/ask') {
		respondPage('New Question', user, req, res, function() {
			fs.readFile('./html/qa/ask.html', function(err, data) {
				if (err) throw err;
				res.write(data);
				respondPageFooter(res);
			});
		});
	} else if (i = req.url.pathname.match(/\/qa\/(\d+)/)) {
		dbcs.questions.findOne({_id: parseInt(i[1])}, function(err, question) {
			if (err) throw err;
			if (!question) return errorPage[404](req, res);
			respondPage(question.lang + ': ' + question.title, user, req, res, function() {
				dbcs.users.findOne({name: question.user}, function(err, op) {
					if (err) throw err;
					fs.readFile('./html/qa/question.html', function(err, data) {
						if (err) throw err;
						res.write(data.toString()
							.replaceAll(
								['$title', '$lang', '$description', '$rawdesc', '$question', '$rawq', '$code', '$type', '$cat'],
								[html(question.title), question.lang, markdown(question.description), html(question.description), markdown(question.question), html(question.question), html(question.code), question.type, question.cat || '<span title="Plain, without any frameworks or libraries">(vanilla)</span>']
							).replaceAll(
								['$op-name', '$op-rep', '$op-pic'],
								[op.name, op.rep.toString(), '//gravatar.com/avatar/' + op.mailhash + '?s=576&amp;d=identicon']
							)
						);
						respondPageFooter(res);
					});
				});
			});
		});
	} else if (req.url.pathname == '/chat/') {
		respondPage(null, user, req, res, function() {
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
	} else if (i = req.url.pathname.match(/^\/chat\/(\d+)/)) {
		dbcs.chatrooms.findOne({_id: parseInt(i[1])}, function(err, doc) {
			if (err) throw err;
			if (!doc) return errorPage[404](req, res);
			respondPage(doc.name, user, req, res, function() {
				fs.readFile('./html/chat/room.html', function(err, data) {
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
			respondPage('Message #' + doc._id, user, req, res, function() {
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
		respondPage(null, user, req, res, function() {
			res.write('<h1>Programs <small><a href="new/">New Program</a></small></h1>\n');
			dbcs.programs.find({deleted: {$exists: false}}).sort({score: -1}).limit(15).each(function(err, data) {
				if (err) throw err;
				if (data) {
					res.write('<div class="program">\n');
					res.write('\t<h2 class="title"><a href="' + data._id + '">' + html(data.title || 'Untitled') + '</a> <small>-<a href="/user/' + data.user + '">' + data.user + '</a></small></h2>\n');
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
		respondPage('Search', user, req, res, function() {
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
					fs.readFile('./html/dev/search.html', function(err, data) {
						if (err) throw err;
						res.write(data.toString().replace('$list', liststr).replace('"' + sort + '"', '"' + sort + '" selected=""'));
						respondPageFooter(res);
					});
				}
			});
		});
	} else if (req.url.pathname == '/dev/new/') {
		respondPage('New', user, req, res, function() {
			fs.readFile('./html/dev/new.html', function(err, data) {
				if (err) throw err;
				res.write(data);
				respondPageFooter(res);
			});
		});
	} else if (req.url.pathname == '/dev/new/canvas') {
		respondPage('Canvas Playground', user, req, res, function() {
			fs.readFile('./html/dev/canvas.html', function(err, data) {
				if (err) throw err;
				res.write(data.toString().replace(/<section id="meta">[^]+<\/section>/, '').replaceAll(['$id', '$title', '$code'], ['', 'New Program', req.url.query ? (html(req.url.query.code || '')) : '']));
				respondPageFooter(res);
			});
		});
	} else if (req.url.pathname == '/dev/new/html') {
		respondPage('HTML Playground', user, req, res, function() {
			fs.readFile('./html/dev/html.html', function(err, data) {
				if (err) throw err;
				res.write(data.toString().replace(/<section id="meta">[^]+<\/section>/, '').replaceAll(['$id', '$title', '$html', '$css', '$js'], ['', 'New Program', req.url.query ? (html(req.url.query.html || '')) : '', req.url.query ? (html(req.url.query.css || '')) : '', req.url.query ? (html(req.url.query.js || '')) : '']));
				respondPageFooter(res);
			});
		});
	} else if (i = req.url.pathname.match(/^\/dev\/(\d+)$/)) {
		dbcs.programs.findOne({_id: i = parseInt(i[1])}, function(err, program) {
			if (err) throw err;
			if (!program) return errorPage[404](req, res);
			respondPage(program.deleted ? '[Deleted]' : program.title || 'Untitled', user, req, res, function() {
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
									fs.readFile('./html/dev/canvas.html', function(err, data) {
										if (err) throw err;
										res.write(data.toString().replaceAll(
											['$id', '$title', '$code', '$op-name', '$op-rep', '$op-pic', '$created', '$updated', '$comments', '$rep', 'Save</a>', 'id="addcomment"', vote.val ? (vote.val == 1 ? 'id="up"' : 'id="dn"') : 0],
											[program._id.toString(), html(program.title || 'Untitled'), html(program.code), op.name, op.rep.toString(), '//gravatar.com/avatar/' + op.mailhash + '?s=576&amp;d=identicon', new Date(program.created).toISOString(), new Date(program.updated).toISOString(), commentstr, (user.rep || 0).toString(), 'Save</a>' + (program.user == (user || {}).name ? ' <line /> <a id="fork" title="Create a new program based on this one">Fork</a> <line /> <a id="delete" class="red">Delete</a>' : ''), 'id="addcomment"' + (user && user.rep >= 50 ? '' : ' hidden=""'), (vote.val ? (vote.val == 1 ? 'id="up"' : 'id="dn"') : 0) + ' class="clkd"']));
										respondPageFooter(res);
									});
								} else if (program.type == 2) {
									fs.readFile('./html/dev/html.html', function(err, data) {
										if (err) throw err;
										res.write(data.toString().replaceAll(['$id', '$title', '$html', '$css', '$js', '$op-name', '$op-rep', '$op-pic', '$created', '$updated', '$comments', '$rep', 'Save</a>', 'id="addcomment"', vote.val ? (vote.val == 1 ? 'id="up"' : 'id="dn"') : 0],
											[program._id.toString(), html(program.title || 'Untitled'), html(program.html), html(program.css), html(program.js), op.name, op.rep.toString(), '//gravatar.com/avatar/' + op.mailhash + '?s=576&amp;d=identicon', new Date(program.created).toISOString(), new Date(program.updated).toISOString(), commentstr, (user.rep || 0).toString(), 'Save</a>' + (program.user == (user || {}).name ? ' <line /> <a id="fork" title="Create a new program based on this one">Fork</a> <line /> <a id="delete" class="red">Delete</a>' : ''), 'id="addcomment"' + (user && user.rep >= 50 ? '' : ' hidden=""'), (vote.val ? (vote.val == 1 ? 'id="up"' : 'id="dn"') : 0) + ' class="clkd"']));
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
		respondPage('New', user, req, res, function() {
			fs.readFile('./html/dev/docs.html', function(err, data) {
				if (err) throw err;
				res.write(data);
				respondPageFooter(res);
			});
		});
	} else if (req.url.pathname == '/learn/') {
		respondPage(null, user, req, res, function() {
			fs.readFile('./html/learn/learn.html', function(err, data) {
				if (err) throw err;
				res.write(data);
				respondPageFooter(res);
			});
		});
	} else if (req.url.pathname == '/learn/web/') {
		respondPage('Web', user, req, res, function() {
			fs.readFile('./html/learn/web/web.html', function(err, data) {
				if (err) throw err;
				res.write(data);
				respondPageFooter(res);
			});
		});
	} else if (req.url.pathname == '/learn/debug/') {
		respondPage('Debugging', user, req, res, function() {
			fs.readFile('./html/learn/debug.html', function(err, data) {
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
		fs.readFile('./html/learn/' + [i[1], i[2], i[3]].join('/') + '.html', function(err, data) {
			if (err) errorPage[404](req, res);
			else {
				data = data.toString();
				respondPage(data.substr(0, data.indexOf('\n')), user, req, res, function() {
					res.write(data.substr(data.indexOf('\n') + 1));
					respondPageFooter(res);
				}, {
					inhead: '<link rel="stylesheet" href="/learn/course.css" />'
				});
			}
		});
	} else if (req.url.pathname == '/formatting') {
		respondPage('Formatting Help', user, req, res, function() {
			fs.readFile('./html/formatting.html', function(err, data) {
				if (err) throw err;
				res.write(data);
				respondPageFooter(res);
			});
		}, {inhead: '<style>section, section > code.blk { margin-left: 36px} section { padding: 6px }</style>'});
	} else if (req.url.pathname == '/mod/') {
		respondPage(null, user, req, res, function() {
			res.write('<h1>Moderation Queues</h1>\n');
			res.write('' + (user && user.level > 1 ? '<h2><a href="chatflag">' : '<h2 class="grey">') + 'Chat flags' + (user && user.level > 1 ? '</a>' : ' <small class="nofloat">(requires moderator level 2)</small>') + '</h2>\n');
			respondPageFooter(res);
		});
	} else if (req.url.pathname == '/mod/chatflag') {
		respondPage('Chat Flags', user, req, res, function() {
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
	} else return errorPage[404](req, res, user);
}).listen(8000);
console.log('buildpage.js running on port 8000');