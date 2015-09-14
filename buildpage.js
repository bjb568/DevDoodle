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
	markdown = essentials.markdown,
	mongo = require('mongodb'),
	db = new mongo.Db('DevDoodle', new mongo.Server('localhost', 27017, {
		auto_reconnect: false,
		poolSize: 4
	}), {
		w: 0,
		native_parser: false
	}),
	dbcs = {},
	usedDBCs = ['users', 'questions', 'answers', 'chat', 'chathistory', 'chatstars', 'chatusers', 'chatrooms', 'programs', 'comments', 'votes', 'lessons', 'qtags'];

db.open(function(err, db) {
	if (err) throw err;
	db.authenticate('DevDoodle', fs.readFileSync('../Secret/devdoodleDB.key').toString(), function(err, result) {
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
	if (!header['Content-Type']) header['Content-Type'] = 'application/xhtml+xml';
	if (!header['Cache-Control']) header['Cache-Control'] = 'no-cache';
	if (!header['X-Frame-Options']) header['X-Frame-Options'] = 'DENY';
	if (user.name) {
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
		if ((user = huser || user).name) data = data.replace('<a href="/login/">Login</a>', '<a$notifs href="/user/' + user.name + '">' + user.name + '</a>');
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
				(user.unread && !nonotif) ? ' class="unread"' : ''
			).replace(
				'<a href="/mod/">Mod</a>',
				user.level > 1 ? '<a href="/mod/">Mod</a>' : ''
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
	return errs.length ? (errs.length == 1 ? '<div class="error">' + errs[0] + '</div>\n' : '<div class="error">\n\t<ul>\n\t\t<li>' + errs.join('</li>\n\t\t<li>') + '</li>\n\t</ul>\n</div>\n') : '';
}


var typeIcons = {
		P: '',
		R: ' <svg xmlns="http://www.w3.org/2000/svg" width="10" height="16"><path d="M 9 5 a 4 4 0 0 0 -8 0" stroke-width="2px" stroke="black" fill="none" /><rect x="8" y="5" width="2" height="4" /><rect x="0" y="5" width="2" height="1" /><rect x="0" y="9" width="10" height="7" /></svg>',
		N: ' <svg xmlns="http://www.w3.org/2000/svg" width="10" height="14"><path d="M 9 5 a 4 4 0 0 0 -8 0" stroke-width="2px" stroke="black" fill="none" /><rect x="8" y="5" width="2" height="2" /><rect x="0" y="5" width="2" height="2" /><rect x="0" y="7" width="10" height="7" /></svg>',
		M: ' <span class="diamond">♦</span>'
	},
	showcanvas = fs.readFileSync('./html/dev/showcanvas.html').toString(),
	showhtml = fs.readFileSync('./html/dev/showhtml.html').toString(),
	mailform = fs.readFileSync('./html/user/mailform.html').toString();

http.createServer(function(req,	res) {
	var user = JSON.parse(req.headers.user) || {},
		i;
	req.url = url.parse(req.url, true);
	console.log(req.method, req.url.pathname);
	if (req.url.pathname == '/') {
		respondPage('Users', user, req, res, function() {
			var programstr = '';
			dbcs.programs.find({deleted: {$exists: false}}).sort({hotness: -1, updated: -1}).limit(12).each(function(err, data) {
			if (err) throw err;
				if (data) {
					programstr += '<div class="program">\n';
					programstr += '\t<h2 class="title"><a href="' + data._id + '">' + html(data.title || 'Untitled') + '</a> <small>-<a href="/user/' + data.user + '">' + data.user + '</a></small></h2>\n';
					if (data.type == 1) programstr += '\t' + showcanvas.replace('$code', html(JSON.stringify(data.code)));
					else if (data.type == 2) programstr += '\t' + showhtml.replace('$html', html(data.html)).replace('$css', html(data.css)).replace('$js', html(data.js));
					programstr += '</div>\n';
				} else {
					fs.readFile('./html/home.html', function(err, data) {
						if (err) throw err;
						res.write(data.toString().replace('$programs', programstr));
						respondPageFooter(res);
					});
				}
			});
		});
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
			var num = 0;
			dbcs.users.find(whereDict[where] || whereDict.default).sort(order).each(function(err, cUser) {
				if (err) throw err;
				if (cUser) {
					num++;
					dstr +=
						'\t<div class="lft user">\n\t\t<img src="//gravatar.com/avatar/' + cUser.mailhash + '?s=576&amp;d=identicon" width="40" height="40" />\n' +
						'\t\t<div>\n\t\t\t<a href="/user/' + cUser.name + '">' + cUser.name + '</a>\n\t\t\t<small class="rep">' + cUser.rep + '</small>\n\t\t</div>' +
						'\n\t</div>\n';
				} else {
					fs.readFile('./html/user/userlist.html', function(err, data) {
						if (err) throw err;
						res.write(
							data.toString()
							.replace('$num', num ? (num == 1 ? '1 user found' : num + ' users found') : '<span class="red">0 users found</span>')
							.replace('$users', dstr)
							.replace('"' + orderBy + '"', '"' + orderBy + '" selected=""')
							.replace('"' + orderDir + '"', '"' + orderDir + '" selected=""')
							.replace('"' + where + '"', '"' + where + '" selected=""')
						);
						respondPageFooter(res);
					});
				}
			});
		});
	} else if (i = req.url.pathname.match(/^\/user\/([a-zA-Z0-9-]{3,16})$/)) {
		dbcs.users.findOne({name: i[1]}, function(err, dispUser) {
			if (err) throw err;
			if (!dispUser) return errorPage[404](req, res, user);
			var questions = 0;
			respondPage(dispUser.name, user, req, res, function() {
				var me = user.name == dispUser.name;
				res.write('<h1 class="clearfix"><a href="/user/" title="User List">←</a> ' + dispUser.name + (me ? ' <small><a href="/user/' + user.name + '/changepass">Change Password</a> <line /> <a href="/logout">Log out</a></small>' : '') + '</h1>\n');
				res.write('<img class="lft" src="//gravatar.com/avatar/' + dispUser.mailhash + '?s=576&amp;d=identicon" style="max-width: 144px; max-height: 144px;" />\n');
				res.write('<div style="padding-left: 6px; overflow: hidden;">\n');
				res.write('\t<div>Joined <time datetime="' + new Date(dispUser.joined).toISOString() + '"></time></div>\n');
				if (dispUser.seen) res.write('\t<div>Seen <time datetime="' + new Date(dispUser.seen).toISOString() + '"></time></div>\n');
				res.write('\t<div class="grey">Moderator level ' + dispUser.level + '</div>');
				if (me) res.write('\t<a href="//gravatar.com/' + dispUser.mailhash + '" title="Gravatar user page for this email">Change profile picture on gravatar</a> (you must <a href="http://gravatar.com/login">create a gravatar account</a> if you don\'t have one <em>for this email</em>)\n');
				res.write('</div>\n');
				res.write('<div class="clear"><span style="font-size: 1.8em">' + dispUser.rep + '</span> reputation</div>\n');
				res.write('<div class="resp-flex">');
				res.write('<section>');
				res.write('<h2>Questions</h2>');
				res.write('<div class="column-medium"><ul>');
				dbcs.questions.find({user: dispUser.name}).sort({score: -1, _id: -1}).limit(16).each(function(err, question) {
					if (err) throw err;
					if (question) {
						res.write('<li><a href="/qa/' + question._id + '">' + question.title + '</a></li>');
						questions++;
					} else {
						res.write('</ul></div>');
						if (!questions) res.write('<p class="grey">' + (me ? 'You don\'t' : 'This user doesn\'t') + ' have any questions.</p>');
						res.write('</section>');
						res.write('<section>');
						res.write('<h2>Answers</h2>');
						res.write('<div class="column-medium"><ul>');
						var cursor = dbcs.answers.find({user: dispUser.name}).sort({score: -1, _id: -1}).limit(16),
							answers = 0;
						var answerHandler = function(err, answer) {
							if (err) throw err;
							if (answer) {
								dbcs.questions.findOne({_id: answer.question}, function(err, question) {
									if (err) throw err;
									res.write('<li><a href="/qa/' + question._id + '">' + question.title + '</a></li>');
									cursor.nextObject(answerHandler);
								});
								answers++;
							} else {
								res.write('</ul></div>');
								if (!answers) res.write('<p class="grey">' + (me ? 'You don\'t' : 'This user doesn\'t') + ' have any answers.</p>');
								res.write('</section>');
								res.write('</div>');
								res.write('<section class="lim-programs resp-block">\n');
								res.write('<h2 class="underline">Programs <small><a href="/dev/search/user/' + dispUser.name + '">Show All</a></small></h2>\n');
								var programs = 0;
								dbcs.programs.find({
									user: dispUser.name,
									deleted: {$exists: false}
								}).sort({
									score: -1,
									updated: -1
								}).limit(6).each(function(err, data) {
									if (err) throw err;
									if (data) {
										res.write('<div class="program">\n');
										res.write('\t<h2 class="title"><a href="/dev/' + data._id + '">' + html(data.title || 'Untitled') + '</a></h2>\n');
										if (data.type == 1) res.write('\t' + showcanvas.replace('$code', html(JSON.stringify(data.code))));
										else if (data.type == 2) res.write('\t' + showhtml.replace('$html', html(data.html)).replace('$css', html(data.css)).replace('$js', html(data.js)));
										res.write('</div>\n');
										programs++;
									} else {
										if (!programs) res.write('<p class="grey">' + (me ? 'You don\'t' : 'This user doesn\'t') + ' have any programs.</p>');
										res.write('</section>\n');
										if (me) {
											res.write('<h2 class="underline">Private</h2>\n');
											res.write(mailform.replaceAll('$mail', html(user.mail)));
											if (user.notifs) {
												var notifs = [];
												for (var i = 0; i < user.notifs.length; i++) {
													if (user.notifs[i].unread) notifs.push(user.notifs[i]);
													user.notifs[i].unread = false;
												}
												if (notifs.length) {
													res.write('<h2>Notifications</h2>\n');
													res.write('<ul id="notifs">\n');
													for (var i = 0; i < notifs.length; i++) res.write(
														'\t<li class="hglt pad"><em>' + notifs[i].type + ' on ' + notifs[i].on + '</em><blockquote>' + markdown(notifs[i].body) + '</blockquote>' +
														'-' + notifs[i].from.link('/user/' + notifs[i].from) + ', <time datetime="' + new Date(notifs[i].time).toISOString() + '"></time></li>\n'
													);
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
									}
								});
							}
						};
						cursor.nextObject(answerHandler);
					}
				});
			}, {nonotif: true});
		});
	} else if (req.url.pathname == '/notifs') {
		if (!user.name) return errorsHTML[403](req, res, 'You must be logged in to view your notifications.');
		respondPage('Notifications', user, req, res, function() {
			res.write('<h1>Notifications</h1>\n');
			res.write('<ul id="notifs">\n');
			for (var i = user.notifs.length - 1; i >= 0; i--) res.write(
				'\t<li class="hglt pad"><em>' + user.notifs[i].type + ' on ' + user.notifs[i].on + '</em><blockquote>' + markdown(user.notifs[i].body) + '</blockquote>' +
				'-' + user.notifs[i].from.link('/user/' + user.notifs[i].from) + ', <time datetime="' + new Date(user.notifs[i].time).toISOString() + '"></time></li>\n'
			);
			res.write('</ul>\n');
			respondPageFooter(res);
		});
	} else if (req.url.pathname == '/logout') {
		res.writeHead(303, {
			location: '/',
			'Set-Cookie': 'id='
		});
		dbcs.users.update({name: user.name}, {$set: {cookie: []}});
		res.end();
	} else if (req.url.pathname == '/qa/') {
		respondPage(null, user, req, res, function() {
			res.write('<h1>Questions <small><a href="ask" title="Requires login">New Question</a></small></h1>\n');
			dbcs.questions.find().each(function(err, doc) {
				if (err) throw err;
				if (doc) res.write('<h2 class="title"><a href="' + doc._id + '">' + html(doc.title) + '</a></h2>\n');
				else respondPageFooter(res);
			});
		});
	} else if (req.url.pathname == '/qa/tags') {
		respondPage('Tags', user, req, res, function() {
			fs.readFile('./html/qa/tags.html', function(err, data) {
				if (err) throw err;
				res.write(data);
				var tlang = [],
					clang = '';
				dbcs.qtags.find().sort({lang: 1}).each(function(err, tag) {
					if (err) throw err;
					if (tag) {
						if (tag.lang == clang) tlang.push(tag);
						else {
							if (clang) {
								res.write('<section id="lang-' + html(encodeURIComponent(clang)) + '">\n');
								res.write('<h2>' + html(clang) + '</h2>\n');
								res.write('<ul>\n');
								var writeTagRecursive = function(tag) {
									res.write('<li id="' + tag._id + '">');
									res.write('<a class="small" href="#' + tag._id + '">#' + tag._id + '</a> ' + tag.name);
									tlang.splice(tlang.indexOf(tag), 1);
									res.write('<ul>');
									var i = -1;
									while (++i < tlang.length) {
										if (tlang[i].parentID == tag._id) {
											writeTagRecursive(tlang[i]);
											i = -1;
										}
									}
									res.write('</ul>');
									res.write('</li>');
								};
								var i = -1;
								while (++i < tlang.length) {
									if (!tlang[i].parentID) {
										writeTagRecursive(tlang[i]);
										i = -1;
									}
								}
								res.write('</ul>\n');
								res.write('</section>\n');
							}
							clang = tag.lang;
							tlang = [tag];
						}
					} else {
						res.write('<section id="lang-' + html(encodeURIComponent(clang)) + '">\n');
						res.write('<h2>' + html(clang) + '</h2>\n');
						res.write('<ul>\n');
						var writeTagRecursive = function(tag) {
							res.write('<li id="' + tag._id + '">');
							res.write('<a class="small" href="#' + tag._id + '">#' + tag._id + '</a> ' + tag.name);
							tlang.splice(tlang.indexOf(tag), 1);
							res.write('<ul>');
							var i = -1;
							while (++i < tlang.length) {
								if (tlang[i].parentID == tag._id) {
									writeTagRecursive(tlang[i]);
									i = -1;
								}
							}
							res.write('</ul>');
							res.write('</li>');
						};
						var i = -1;
						while (++i < tlang.length) {
							if (!tlang[i].parentID) {
								writeTagRecursive(tlang[i]);
								i = -1;
							}
						}
						res.write('</ul>\n');
						res.write('</section>\n');
						respondPageFooter(res);
					}
				});
			});
		});
	} else if (req.url.pathname == '/qa/ask') {
		if (!user.name) {
			res.writeHead('303', {Location: '/login/?r=ask'});
			return res.end();
		}
		respondPage('New Question', user, req, res, function() {
			fs.readFile('./html/qa/ask.html', function(err, data) {
				if (err) throw err;
				dbcs.qtags.distinct('lang', {parentName: {$exists: false}}, function(err, langs) {
					if (err) throw err;
					res.write(data.toString().replace('$langs', JSON.stringify(langs)));
					respondPageFooter(res);
				});
			});
		});
	} else if (i = req.url.pathname.match(/^\/qa\/(\d+)$/)) {
		dbcs.questions.findOne({_id: parseInt(i[1])}, function(err, question) {
			if (err) throw err;
			if (!question) return errorPage[404](req, res, user);
			respondPage(question.lang + ': ' + question.title, user, req, res, function() {
				dbcs.users.findOne({name: question.user}, function(err, op) {
					if (err) throw err;
					var answerstr = '';
					var cursor = dbcs.answers.find({question: question._id}).sort({score: -1});
					cursor.count(function(err, count) {
						if (err) throw err;
						answerstr = '<h2>' + count + ' Answer' + (count == 1 ? '' : 's') + '</h2>';
						var answerHandler = function(err, answer) {
							if (err) throw err;
							if (answer) {
								dbcs.users.findOne({name: answer.user}, function(err, answerPoster) {
									if (err) throw err;
									answerstr += (
										'<div id="a' + answer._id + '" class="answer hglt pad br">' +
											'<div class="ctrl pad lft">' +
												'<a class="up" title="This answers the question well."><svg class="blk up" xmlns="http://www.w3.org/2000/svg"><polygon points="10,1 1,19 19,19" /></svg></a>' +
												'<a class="dn" title="This is not useful."><svg class="blk dn" xmlns="http://www.w3.org/2000/svg"><polygon points="10,19 1,1 19,1" /></svg></a>' +
												'<a class="fl" title="This answer has an issue that needs to be addressed."><svg class="blk fl" xmlns="http://www.w3.org/2000/svg"><polygon points="1,1 19,1 19,11 5,11 5,23 1,23" /></svg></a>' +
												'<a class="ctrlicon editbtn" href="#edit-' + answer._id + '" title="Edit">✎</a>' +
												'<a class="ctrlicon delbtn" title="Delete">✕</a>' +
											'</div>' +
											'<div class="a-content">' +
												'<div class="a-body">' + markdown(answer.body) + '</div>' +
												'<div class="clearfix">' +
													'<div class="rit">' +
														'<div>Answered <time datetime="' + new Date(answer.time).toISOString() + '"></time> by</div>' +
														'<div class="user user-' + answer.user + '">' +
															'<img src="//gravatar.com/avatar/' + answerPoster.mailhash + '?s=576&amp;d=identicon" width="40" height="40" />' +
															'<div>' +
																'<a href="/user/' + answer.user + '">' + answer.user + '</a>' +
																'<small class="rep">' + answerPoster.rep + '</small>' +
															'</div>' +
														'</div>' +
													'</div>' +
													'<small class="blk sumar lft"><a href="#a' + answer._id + '" class="grey" title="Permalink">#</a> <line /> <a href="?history" class="grey">History</a></small>' +
												'</div>' +
											'</div>' +
											'<form class="a-edit indt" hidden="">' +
												'<textarea rows="24">' + html(answer.body) + '</textarea>' +
												'<div>' +
													'<button type="submit">Submit Edit</button>' +
													'<button type="reset" class="cancel-edit">Cancel</button>' +
												'</div>' +
											'</form>' +
										'</div>'
									);
									cursor.nextObject(answerHandler);
								});
							} else {
								var commentstr = '';
								dbcs.comments.find({question: question._id}).sort({_id: 1}).each(function(err, comment) {
									if (err) throw err;
									if (comment) {
										var votes = comment.votes || [],
											voted;
										for (var i in votes) if (votes[i].user == user.name) voted = true;
										var commentBody = markdown(comment.body),
											endTagsLength = (commentBody.match(/(<\/((?!blockquote).)+?>)+$/) || [{length: 0}])[0].length;
										commentBody = commentBody.substring(0, commentBody.length - endTagsLength)
											+ '<span class="c-sig">-<a href="/user/' + comment.user + '">' + comment.user + '</a>, <a href="#c' + comment._id + '" title="Permalink"><time datetime="' + new Date(comment.time).toISOString() + '"></time></a></span>'
											+ commentBody.substring(commentBody.length - endTagsLength);
										commentstr +=
											'<div id="c' + comment._id + '" class="comment">' +
											'<span class="score" data-score="' + (comment.votes || []).length + '">' + (comment.votes || []).length + '</span> ' +
											(
												user.rep >= 50 ?
												(
													'<span class="sctrls">' +
													'<svg class="up' + (voted ? ' clkd' : '') + '" xmlns="http://www.w3.org/2000/svg"><polygon points="7,-1 0,11 5,11 5,16 9,16 9,11 14,11" /></svg>' +
													'<svg class="fl" xmlns="http://www.w3.org/2000/svg"><polygon points="0,0 13,0 13,8 4,8 4,16 0,16" /></svg>' +
													'</span>'
												) :
												''
											) + commentBody + '</div>';
									} else {
										fs.readFile('./html/qa/question.html', function(err, data) {
											if (err) throw err;
											var tagstr = '';
											dbcs.qtags.find({_id: {$in: question.tags}}).sort({_id: 1}).each(function(err, tag) {
												if (err) throw err;
												if (tag) tagstr += '<a href="search/tag/' + tag._id + '" class="tag">' + tag.name + '</a> ';
												else {
													var tlang = [],
														tageditstr = '';
													dbcs.qtags.find({lang: question.lang}).each(function(err, tag) {
														if (err) throw err;
														if (tag) tlang.push(tag);
														else {
															var writeTagRecursive = function(tag) {
																tageditstr += '<label><input type="checkbox" id="' + tag._id + '"' + (question.tags.indexOf(tag._id) == -1 ? '' : ' checked=""') + ' /> ' + tag.name + '</label>';
																tlang.splice(tlang.indexOf(tag), 1);
																tageditstr += '<div class="indt">';
																var i = -1;
																while (++i < tlang.length) {
																	if (tlang[i].parentID == tag._id) {
																		writeTagRecursive(tlang[i]);
																		i = -1;
																	}
																}
																tageditstr += '</div>';
															};
															var i = -1;
															while (++i < tlang.length) {
																if (!tlang[i].parentID) {
																	writeTagRecursive(tlang[i]);
																	i = -1;
																}
															}
															res.write(data.toString()
																.replaceAll(
																	['$id', '$title', '$lang', '$description', '$rawdesc', '$question', '$rawq', '$code', '$type'],
																	[question._id.toString(), html(question.title), question.lang, markdown(question.description), html(question.description), markdown(question.question), html(question.question), html(question.code), question.type]
																).replace('$edit-tags', tageditstr).replaceAll(
																	['$qcommentstr', '$answers', '$tags', '$rep'],
																	[commentstr, answerstr, tagstr, (user.rep || 0).toString()]
																).replaceAll(
																	['$askdate', '$op-name', '$op-rep', '$op-pic'],
																	[new Date(question.time).toISOString(), op.name, op.rep.toString(), '//gravatar.com/avatar/' + op.mailhash + '?s=576&amp;d=identicon']
																).replace('id="mdl"', user.name == op.name ? 'id="mdl"' : 'id="mdl" hidden=""')
															);
															respondPageFooter(res);
														}
													});
												}
											});
										});
									}
								});
							}
						};
						cursor.nextObject(answerHandler);
					});
				});
			});
		});
	} else if (req.url.pathname == '/chat/') {
		respondPage(null, user, req, res, function() {
			res.write('<h1>Chat Rooms</h1>\n');
			var roomnames = [],
				publicRooms = [];
			dbcs.chatrooms.find().each(function(err, doc) {
				if (err) throw err;
				if (doc) {
					if (doc.type == 'M' && (!user || user.level < 5)) return;
					if (doc.type == 'N' && doc.invited.indexOf(user.name) == -1) return;
					res.write('<h2 class="title"><a href="' + doc._id + '">' + doc.name + typeIcons[doc.type] + '</a></h2>\n');
					res.write(markdown(doc.desc) + '\n');
					roomnames[doc._id] = doc.name;
					if (doc.type == 'P' || doc.type == 'R' || doc.type == 'M') publicRooms.push(doc._id);
				} else {
					res.write('<hr />\n');
					res.write('<small>');
					res.write('<a href="search" title="Search across all rooms." class="grey">Search</a>');
					if (user.rep >= 200) res.write(' <line /> <a href="newroom" title="Requires 200 reputation" class="grey">Create Room</a>');
					res.write('</small>\n');
					res.write('</div>\n');
					res.write('<aside id="sidebar" style="overflow-x: hidden">\n');
					res.write('<h2>Recent Posts</h2>\n');
					dbcs.chat.find({
						deleted: {$exists: false},
						room: {$in: publicRooms}
					}).sort({_id: -1}).limit(12).each(function(err, comment) {
						if (err) throw err;
						if (comment) {
							var commentBody = markdown(comment.body),
								endTagsLength = (commentBody.match(/(<\/((?!blockquote).)+?>)+$/) || [{length: 0}])[0].length;
							commentBody = commentBody.substring(0, commentBody.length - endTagsLength)
								+ '<span class="c-sig">-<a href="/user/' + comment.user + '">' + comment.user + '</a>, <a href="' + comment.room + '#' + comment._id + '" title="Permalink"><time datetime="' + new Date(comment.time).toISOString() + '"></time> in ' + roomnames[comment.room] + '</a></span>'
								+ commentBody.substring(commentBody.length - endTagsLength);
							res.write('<div class="comment">' + commentBody + '</div>');
						} else respondPageFooter(res, true);
					});
				}
			});
		});
	} else if (req.url.pathname == '/chat/search') {
		respondPage('Search', user, req, res, function() {
			fs.readFile('./html/chat/search.html', function(err, data) {
				if (err) throw err;
				var rooms = [];
				dbcs.chatrooms.find().each(function(err, doc) {
					if (err) throw err;
					if (doc) {
						if (doc.type == 'M' && (!user || user.level < 5)) return;
						if (doc.type == 'N' && doc.invited.indexOf(user.name) == -1) return;
						if (doc.type == 'P' || doc.type == 'R' || doc.type == 'M') rooms.push({id: doc._id, name: doc.name});
					} else {
						res.write(
							data.toString()
							.replace('$user', user.name)
							.replace('$rooms', JSON.stringify(rooms))
							.replace('$qroom', req.url.query && req.url.query.room ? req.url.query.room : '')
						);
						respondPageFooter(res);
					}
				});
			});
		});
	} else if (i = req.url.pathname.match(/^\/chat\/(\d+)$/)) {
		dbcs.chatrooms.findOne({_id: parseInt(i[1])}, function(err, doc) {
			if (err) throw err;
			if (!doc) return errorPage[404](req, res, user);
			if (req.url.query && typeof(req.url.query.access) == 'string') {
				if (doc.invited.indexOf(user.name) == -1) return errorPage[403](req, res, user, 'You don\'t have permission to control access to this room.');
				respondPage('Access for ' + doc.name, user, req, res, function() {
					var userstr = '';
					dbcs.users.find({name: {$in: doc.invited}}).each(function(err, invUser) {
						if (err) throw err;
						if (invUser) userstr +=
							'\t<div class="lft user">\n\t\t<img src="//gravatar.com/avatar/' + invUser.mailhash + '?s=576&amp;d=identicon" width="40" height="40" />\n' +
							'\t\t<div>\n\t\t\t<a href="/user/' + invUser.name + '">' + invUser.name + '</a>\n\t\t\t<small class="rep">' + invUser.rep + '</small>\n\t\t</div><span>✕</span>' +
							'\n\t</div>\n';
						else {
							fs.readFile('./html/chat/access.html', function(err, data) {
								if (err) throw err;
								res.write(
									data.toString()
									.replaceAll(['$id', '$name', '$type', '$users'], [doc._id.toString(), doc.name, doc.type, userstr])
									.replace('value="' + doc.type + '"', 'value="' + doc.type + '" selected=""')
								);
								respondPageFooter(res);
							});
						}
					});
				});
			} else {
				if (doc.type == 'N' && doc.invited.indexOf(user.name) == -1) return errorPage[403](req, res, user, 'You have not been invited to this private room.');
				if (doc.type == 'M' && (!user || user.level < 5)) return errorPage[403](req, res, user, 'You must be a moderator to join this room.');
				respondPage(doc.name, user, req, res, function() {
					fs.readFile('./html/chat/room.html', function(err, data) {
						if (err) throw err;
						var isInvited = doc.type == 'P' || doc.invited.indexOf(user.name) != -1;
						res.write(
							data.toString()
							.replaceAll('$id', doc._id)
							.replaceAll('$name', html(doc.name))
							.replaceAll('$rawdesc', html(doc.desc))
							.replace('$desc', markdown(doc.desc))
							.replace('$user', user.name || '')
							.replace('$textarea',
								user.name ?
									(
										user.rep < 30 ?
											'<p id="loginmsg">You must have at least 30 reputation to chat.</p>' :
											(
												isInvited ?
													'<div id="pingsug"></div><textarea autofocus="" id="ta" class="umar fullwidth" style="height: 96px"></textarea><div id="subta" class="umar"><button id="btn" onclick="send()">Post</button> <a href="/formatting" target="_blank">Formatting help</a></div>' :
													'<p>Posting in a non-public room is by invitation only.</p>'
											)
									) :
									'<p id="loginmsg">You must be <a href="/login/" title="Log in or register">logged in</a> and have 30 reputation to chat.</p>')
							.replace(' $options', typeIcons[doc.type] + ' <small><a href="search?room=' + doc._id + '">Search</a>' + (user.rep > 200 && isInvited ? ' <line /> <a id="edit">Edit</a>' : '') + '</small>')
							.replace(' $access', doc.invited.indexOf(user.name) == -1 ? '' : ' <small><a href="?access">Access</a></small>')
						);
						respondPageFooter(res);
					});
				});
			}
		});
	} else if (i = req.url.pathname.match(/^\/chat\/message\/(\d+)$/)) {
		dbcs.chat.findOne({_id: parseInt(i[1])}, function(err, doc) {
			if (err) throw err;
			if (!doc) return errorPage[404](req, res, user);
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
							res.write('<ul>\n');
							events = true;
						}
						res.write('<li>\n');
						if (data.event == 'edit') {
							revisions++;
							res.write('Revision ' + revisions + ' (<time datetime="' + new Date(data.time).toISOString() + '"></time>)' + (data.note ? ' ' + data.note : '') + ':\n');
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
			dbcs.programs.find({deleted: {$exists: false}}).sort({hotness: -1, updated: -1}).limit(15).each(function(err, data) {
				if (err) throw err;
				if (data) {
					res.write('<div class="program">\n');
					res.write('\t<h2 class="title"><a href="' + data._id + '">' + html(data.title || 'Untitled') + '</a> <small>-<a href="/user/' + data.user + '">' + data.user + '</a></small></h2>\n');
					if (data.type == 1) res.write('\t' + showcanvas.replace('$code', html(JSON.stringify(data.code))));
						else if (data.type == 2) res.write('\t' + showhtml.replace('$html', html(data.html)).replace('$css', html(data.css)).replace('$js', html(data.js)));
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
					default: {hotness: -1, recent: -1},
					votes: {score: -1, recent: -1},
					upvotes: {upvotes: -1, score: -1, hotness: -1, recent: -1},
					recent: {created: -1},
					update: {updated: -1}
				};
			dbcs.programs.find({deleted: {$exists: false}}).sort(sortDict[sort] || sortDict.default).limit(720).each(function(err, data) {
				if (err) throw err;
				if (data) liststr += '\t<li><a href="../' + data._id + '">' + html(data.title || 'Untitled') + '</a> by <a href="/user/' + data.user + '">' + data.user + '</a></li>\n';
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
				res.write(
					data.toString()
					.replace(/<section id="meta">[^]+<\/section>/, '')
					.replaceAll(
						['$mine', '$id', '$op-name', '$rep', '$title', '$code'],
						['false', '0', '', '0', 'New Program', req.url.query ? html(req.url.query.code || '') : '']
					)
				);
				respondPageFooter(res);
			});
		}, {inhead: '<script src="/dev/runcanvas.js"></script>'});
	} else if (req.url.pathname == '/dev/new/html') {
		respondPage('HTML Playground', user, req, res, function() {
			fs.readFile('./html/dev/html.html', function(err, data) {
				if (err) throw err;
				res.write(
					data.toString()
					.replace(/<section id="meta">[^]+<\/section>/, '')
					.replaceAll(
						['$id', '$title', '$html', '$css', '$js'],
						['', 'New Program', req.url.query ? html(req.url.query.html || '') : '', req.url.query ? html(req.url.query.css || '') : '', req.url.query ? html(req.url.query.js || '') : '']
					)
				);
				respondPageFooter(res);
			});
		});
	} else if (i = req.url.pathname.match(/^\/dev\/(\d+)$/)) {
		dbcs.programs.findOne({_id: i = parseInt(i[1])}, function(err, program) {
			if (err) throw err;
			if (!program) return errorPage[404](req, res, user);
			if (program.deleted) {
				respondPage('[Deleted]', user, req, res, function() {
					if (program.deleted.by.length == 1 && program.deleted.by == program.user && program.user == user.name) res.write('<h1>' + html(program.title || 'Untitled') + '</h1>\nYou deleted this <time datetime="' + new Date(program.deleted.time).toISOString() + '"></time>. <a class="red" id="undelete">[undelete]</a>');
					else if (user.level >= 4) {
						var deletersstr = '',
							i = program.deleted.by.length;
						while (i--) {
							deletersstr += '<a href="/user/' + program.deleted.by[i] + '">' + program.deleted.by[i] + '</a>';
							if (i == 1) deletersstr += ', and ';
							else if (i != 0) deletersstr += ', ';
						}
						res.write('<h1>' + html(program.title || 'Untitled') + '</h1>\nThis program was deleted <time datetime="' + new Date(program.deleted.time).toISOString() + '"></time> by ' + deletersstr + '. <a class="red" id="undelete">[undelete]</a>');
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
					respondPageFooter(res);
				}, {}, 404);
			} else {
				respondPage(program.title || 'Untitled', user, req, res, function() {
					dbcs.votes.findOne({
						user: user.name,
						program: program._id
					}, function(err, vote) {
						if (err) throw err;
						if (!vote) vote = {val: 0};
						dbcs.users.findOne({name: program.user}, function(err, op) {
							if (err) throw err;
							var commentstr = '';
							dbcs.comments.find({program: program._id}).sort({_id: 1}).each(function(err, comment) {
								if (err) throw err;
								if (comment) {
									var votes = comment.votes || [],
										voted;
									for (var i in votes) if (votes[i].user == user.name) voted = true;
									var commentBody = markdown(comment.body),
										endTagsLength = (commentBody.match(/(<\/((?!blockquote).)+?>)+$/) || [{length: 0}])[0].length;
									commentBody = commentBody.substring(0, commentBody.length - endTagsLength)
										+ '<span class="c-sig">-<a href="/user/' + comment.user + '">' + comment.user + '</a>, <a href="#c' + comment._id + '" title="Permalink"><time datetime="' + new Date(comment.time).toISOString() + '"></time></a></span>'
										+ commentBody.substring(commentBody.length - endTagsLength);
									commentstr +=
										'<div id="c' + comment._id + '" class="comment">' +
										'<span class="score" data-score="' + (comment.votes || []).length + '">' + (comment.votes || []).length + '</span> ' +
										(
											user.rep >= 50 ?
											(
												'<span class="sctrls">' +
												'<svg class="up' + (voted ? ' clkd' : '') + '" xmlns="http://www.w3.org/2000/svg"><polygon points="7,-1 0,11 5,11 5,16 9,16 9,11 14,11" /></svg>' +
												'<svg class="fl" xmlns="http://www.w3.org/2000/svg"><polygon points="0,0 13,0 13,8 4,8 4,16 0,16" /></svg>' +
												'</span>'
											) :
											''
										) + commentBody + '</div>';
								} else {
									dbcs.programs.findOne({_id: program.fork}, function(err, forkedFrom) {
										if (err) throw err;
										var forks = [];
										dbcs.programs.find({fork: program._id}).each(function(err, forkFrom) {
											if (err) throw err;
											if (forkFrom) forks.push('<a href="' + forkFrom._id + '">' + html(forkFrom.title || 'Untitled') + '</a> by <a href="/user/' + forkFrom.user + '">' + forkFrom.user + '</a>');
											else {
												if (program.type == 1) {
													fs.readFile('./html/dev/canvas.html', function(err, data) {
														if (err) throw err;
														res.write(
															data.toString()
															.replaceAll(
																['$id', '$title', '$code', '$created', '$updated', '$comments'],
																[program._id.toString(), html(program.title || 'Untitled'), html(program.code), new Date(program.created).toISOString(), new Date(program.updated).toISOString(), commentstr]
															).replaceAll(
																['$mine', '$rep', '$op-name', '$op-rep', '$op-pic'],
																[op.name == user.name ? 'true' : 'false', (user.rep || 0).toString(), op.name, op.rep.toString(), '//gravatar.com/avatar/' + op.mailhash + '?s=576&amp;d=identicon']
															).replace('Save</a>', 'Save</a>' + (program.user == user.name ? ' <line /> <a id="fork" title="Create a new program based on this one">Fork</a> <line /> <a id="delete" class="red">Delete</a>' : ''))
															.replace('id="addcomment"', 'id="addcomment"' + (user.rep >= 50 ? '' : ' hidden=""'))
															.replace(vote.val ? (vote.val == 1 ? 'id="up"' : 'id="dn"') : 'nomatch', (vote.val ? (vote.val == 1 ? 'id="up"' : 'id="dn"') : 'nomatch') + ' class="clkd"')
															.replace('$forked', forkedFrom ? ' Forked from <a href="' + forkedFrom._id + '">' + html(forkedFrom.title || 'Untitled') + '</a> by <a href="/user/' + forkedFrom.user + '">' + forkedFrom.user + '</a>' : '')
															.replace('$forks', forks.length ? '<h2>Forks</h2>\n<ul><li>' + forks.join('</li><li>') + '</li></ul>' : '')
														);
														respondPageFooter(res);
													});
												} else if (program.type == 2) {
													fs.readFile('./html/dev/html.html', function(err, data) {
														if (err) throw err;
														res.write(
															data.toString()
															.replaceAll(
																['$id', '$title', '$html', '$css', '$js', '$created', '$updated', '$comments'],
																[program._id.toString(), html(program.title || 'Untitled'), html(program.html), html(program.css), html(program.js), new Date(program.created).toISOString(), new Date(program.updated).toISOString(), commentstr]
															).replaceAll(
																['$mine', '$rep', '$op-name', '$op-rep', '$op-pic'],
																[op.name == user.name ? 'true' : 'false', (user.rep || 0).toString(), op.name, op.rep.toString(), '//gravatar.com/avatar/' + op.mailhash + '?s=576&amp;d=identicon']
															).replace('Save</a>', 'Save</a>' + (program.user == user.name ? ' <line /> <a id="fork" title="Create a new program based on this one">Fork</a> <line /> <a id="delete" class="red">Delete</a>' : ''))
															.replace('id="addcomment"', 'id="addcomment"' + (user.rep >= 50 ? '' : ' hidden=""'))
															.replace(vote.val ? (vote.val == 1 ? 'id="up"' : 'id="dn"') : 'nomatch', (vote.val ? (vote.val == 1 ? 'id="up"' : 'id="dn"') : 'nomatch') + ' class="clkd"')
															.replace('$forked', forkedFrom ? ' Forked from <a href="' + forkedFrom._id + '">' + html(forkedFrom.title || 'Untitled') + '</a> by <a href="/user/' + forkedFrom.user + '">' + forkedFrom.user + '</a>' : '')
															.replace('$forks', forks.length ? '<h2>Forks</h2>\n<ul><li>' + forks.join('</li><li>') + '</li></ul>' : '')
														);
														respondPageFooter(res);
													});
												} else throw 'Invalid program type for id: ' + program._id;
											}
										});
									});
								}
							});
						});
					});
				}, program.type == 1 ? {inhead: '<script src="/dev/runcanvas.js"></script>'} : null);
			}
		});
	} else if (req.url.pathname == '/learn/') {
		respondPage(null, user, req, res, function() {
			var lessonstr = '';
			dbcs.lessons.find().each(function(err, lesson) {
				if (err) throw err;
				if (lesson) lessonstr += '<li><a href="unoff/' + lesson._id + '/">' + html(lesson.title) + '</a></li>';
				else {
					fs.readFile('./html/learn/learn.html', function(err, data) {
						if (err) throw err;
						res.write(data.toString().replace('$lessons', '<ul>' + lessonstr + '</ul>'));
						respondPageFooter(res);
					});
				}
			});
		});
	} else if (i = req.url.pathname.match(/^\/learn\/unoff\/(\d+)\/$/)) {
		dbcs.lessons.findOne({_id: parseInt(i[1])}, function(err, post) {
			if (err) throw err;
			if (!post) return errorPage[404](req, res, user);
			respondPage(post.title, user, req, res, function() {
				fs.readFile('./html/learn/course.html', function(err, data) {
					if (err) throw err;
					res.write(
						data.toString()
						.replaceAll('$title', html(post.title))
						.replaceAll('$list', '<ul>' + post.content.map(function(val, i) {
							return '<li><a href="' + (i + 1) + '">' + html(val.stitle) + '</a></li>';
						}).join('') + '</ul>' + (
							post.user == user.name
							? '<a href="../../new?title=' + html(encodeURIComponent(post.title)) + '" class="grey">+ Add a slide</a>'
							: ''
						))
						.replace('$mine', post.user == user.name ? 'true' : 'false')
					);
					respondPageFooter(res);
				});
			});
		});
	} else if (i = req.url.pathname.match(/^\/learn\/unoff\/(\d+)\/(\d+)$/)) {
		dbcs.lessons.findOne({_id: parseInt(i[1])}, function(err, lesson) {
			if (err) throw err;
			if (!lesson) return errorPage[404](req, res, user);
			var post = lesson.content[--i[2]];
			if (!post) return errorPage[404](req, res, user);
			respondPage(post.title, user, req, res, function() {
				fs.readFile('./html/learn/lesson.html', function(err, data) {
					if (err) throw err;
					res.write(
						data.toString()
						.replace('id="checker"', post.pregex ? 'id="checker"' : 'id="checker" hidden=""')
						.replaceAll(
							['$title', '$stitle', '$sbody', '$pregex', '$sregex', '$stext', '$ftext', '$html'],
							[html(lesson.title), html(post.stitle), html(post.sbody), html(post.pregex), html(post.sregex), html(post.stext), html(post.ftext), html(post.html)]
						).replaceAll(
							['$md-ftext', '$md-stext', '$md-sbody'],
							[markdown(post.ftext), markdown(post.stext), markdown(post.sbody)]
						).replaceAll(
							['$str-pregex', '$str-sregex'],
							[html(JSON.stringify(post.pregex)), html(JSON.stringify(post.sregex))]
						).replaceAll(['$back', '$next'], [i[2] ? i[2].toString() : '" title="This is the first slide." class="disabled', i[2] == lesson.content.length - 1 ? '" title="This is the last slide." class="disabled' : (i[2] + 2).toString()])
					);
					respondPageFooter(res);
				});
			}, {inhead: '<link rel="stylesheet" href="/learn/course.css" />'});
		});
	} else if (req.url.pathname.match(/^\/learn\/[\w-]+\/[\w-]+\/$/)) {
		res.writeHead(303, {
			Location: '1/'
		});
		res.end();
	} else if (i = req.url.pathname.match(/^\/learn\/([\w-]+)\/([\w-]+)\/(\d+)\/$/)) {
		fs.readFile('./html/learn/' + [i[1], i[2], i[3]].join('/') + '.html', function(err, data) {
			if (err) errorPage[404](req, res, user);
			else {
				data = data.toString();
				respondPage(data.substr(0, data.indexOf('\n')), user, req, res, function() {
					res.write(data.substr(data.indexOf('\n') + 1));
					respondPageFooter(res);
				}, {inhead: '<link rel="stylesheet" href="/learn/course.css" />'});
			}
		});
	} else if (req.url.pathname == '/mod/') {
		respondPage(null, user, req, res, function() {
			res.write('<h1>Moderation Queues</h1>\n');
			res.write('' + (user.level > 1 ? '<h2><a href="chatflag">' : '<h2 class="grey">') + 'Chat flags' + (user.level > 1 ? '</a>' : ' <small class="nofloat">(requires moderator level 2)</small>') + '</h2>\n');
			respondPageFooter(res);
		});
	} else if (req.url.pathname == '/mod/chatflag') {
		respondPage('Chat Flags', user, req, res, function() {
			res.write('<h1>Chat Flags</h1>\n');
			if (!user.name) {
				res.write('<p>You must be logged in and have level 2 moderator tools to access this queue.</p>');
				return respondPageFooter(res);
			}
			if (user.level < 2) {
				res.write('<p>You must have level 2 moderator tools to access this queue.</p>');
				return respondPageFooter(res);
			}
			var query = {
				reviewing: {$exists: true},
				reviewers: {$ne: user.name},
				user: {$ne: user.name}
			};
			if (user.level < 4) query.mod = {$exists: false};
			res.write('<div id="posts">');
			dbcs.chat.find(query).sort({mod: -1, lastFlag: -1}).each(function(err, message) {
				if (err) throw err;
				if (message) {
					res.write('<section id="' + message._id + '">');
					res.write('<h2><a href="#' + message._id + '">#</a>' + message._id + '</h2>');
					res.write('<div class="indt">');
					if (message.mod) res.write('<p class="large red">Mod-only; ' + message.mod + '</p>');
					res.write('<a href="/user/' + message.user + '">' + message.user + '</a> posted <a href="/chat/' + message.room + '#' + message._id + '"><time datetime="' + new Date(message.time).toISOString() + '"></time></a>:\n');
					res.write('<blockquote class="op"><pre>' + html(message.body) + '</pre></blockquote>\n');
					res.write('<form hidden="" onsubmit="arguments[0].preventDefault(); ' +
						'request(\'/api/chat/msg/' + message._id + '/edit\', ' +
							'function(res) { if (res == \'Success\') { document.getElementById(\'' + message._id + '\').hidden = true } else { alert(res) } }, ' +
						'\'body=\' + encodeURIComponent(this.firstChild.value))">');
					res.write('<textarea class="edit fullwidth" rows="6">' + html(message.body) + '</textarea>\n');
					res.write('<div><button type="submit">Submit Edit</button> <button type="reset" onclick="this.parentNode.parentNode.hidden = true; this.parentNode.parentNode.previousSibling.previousSibling.hidden = false">Cancel Edit</button></div>\n');
					res.write('</form>');
					res.write('Quality score: ' + (
						message.stars || 1
						- (message.body.length < 8 ? 1 : 0)
						- (message.body.length > 700 ? 2 : 0)
						- (message.body.match(/\b(i|u|r)\b/) ? 1 : 0)
						- (message.body.match(/\b(im|ur|u|r|pls|plz|omg)\W/i) ? 1 : 0)
						- (message.body.match(/^\W+[a-z]/) ? 1 : 0)
						- (message.body.match(/\w\s+:/) ? 1 : 0)
						- (message.body.match(/@([a-zA-Z0-9-]{3,16})\W/g) || []).length
						- (message.body.match(/(.+)\s*\1\s*\1/g) || []).length
						- (message.body.match(/\!\!+/g) || []).length
						- (message.body.match(/\b[A-Z]\w*\b/) ? 0 : 1)
						- ((message.body.match(/\b[A-Z]\w*\b/g) || []).length / ((message.body.match(/\b\w+\b/g) || []).length + 2) > 0.5 ? 2 : 0)
						+ ((message.body.match(/\w{8,}/g) || []).length > 3 ? 1 : 0)
						+ ((message.body.match(/\. [A-Z]/g) || []).length > 3 ? 1 : 0)
						+ (message.body.indexOf(', ') != -1 ? 1 : 0)
					) + ', Length: ' + message.body.length + ', Uppercase ratio: ' + (Math.round((message.body.match(/[A-Z]/g) || []).length / (message.body.match(/[a-z]/g) || []).length * 100) / 100));
					res.write('<h3>Comments</h3>');
					for (var i = 0; i < message.flags.length; i++) {
						res.write('<div>');
						res.write('<a href="/user/' + message.flags[i].user + '">' + message.flags[i].user + '</a>, <time datetime="' + new Date(message.flags[i].time).toISOString() + '"></time>:');
						res.write('<blockquote>' + markdown(message.flags[i].body) + '</blockquote>');
						res.write('</div>');
					}
					res.write('<div class="actions">');
					if (!message.deleted) res.write('<span><a class="bad" title="Soft-delete this post" onclick="' +
						'request(\'/api/chat/msg/' + message._id + '/delv\', function(res) { if (res == \'Success\') { document.getElementById(\'' + message._id + '\').hidden = true } else { alert(res) } })' +
						'">Vote to Delete</a></span> ');
					res.write('<span><a class="bad" title="Publicly edit this post" onclick="var e = document.getElementById(\'' + message._id + '\').getElementsByTagName(\'form\')[0]; e.hidden = false; e.previousSibling.previousSibling.hidden = true">Edit</a></span> ');
					if (!message.mod) res.write('<span><a class="bad" title="Push this post to the mod queue with a comment explaining what actions you wish to be performed by moderators" onclick="' +
						'var body = prompt(\'Enter your comment.\'); if (body) request(\'/api/chat/msg/' + message._id + '/rcomment\', function(res) { ' +
							'if (res.substr(0, 4) == \'Ok: \') { var e = document.createElement(\'div\'), f = document.getElementById(\'' + message._id + '\').children[1]; e.innerHTML = res.substr(4); f.insertBefore(e, f.lastChild) } else { alert(res) } ' +
							'}, \'mod=1&amp;body=\' + encodeURIComponent(body))' +
						'">Request Mod Action</a></span> ');
					res.write('<span><a class="warn" title="This post looks ok" onclick="' +
						'request(\'/api/chat/msg/' + message._id + '/nanv\', function(res) { if (res == \'Success\') { document.getElementById(\'' + message._id + '\').hidden = true } else { alert(res) } })' +
						'">' + (message.deleted ? 'Vote to Undelete' : 'Dispute flag') + '</a></span> ');
					res.write('<span><a title="Add a comment for other reviewers" onclick="' +
						'var body = prompt(\'Enter your comment.\'); if (body) request(\'/api/chat/msg/' + message._id + '/rcomment\', function(res) { ' +
							'if (res.substr(0, 4) == \'Ok: \') { var e = document.createElement(\'div\'), f = document.getElementById(\'' + message._id + '\').children[1]; e.innerHTML = res.substr(4); f.insertBefore(e, f.lastChild) } else { alert(res) } ' +
							'}, \'body=\' + encodeURIComponent(body))' +
						'">Comment</a></span> ');
					res.write('<span><a title="Go to the next post without performing an action on this one" onclick="request(\'/api/chat/msg/' + message._id + '/rskip\'); document.getElementById(\'' + message._id + '\').hidden = true;">Skip</a></span>');
					res.write('</div>');
					res.write('</div>');
					res.write('</section>');
				} else {
					res.write('</div>');
					respondPageFooter(res);
				}
			});
		}, {
			inhead: '<style>' +
						'#posts:empty::after { content: \'There are no items for you to review at this time.\'} ' +
						'blockquote { overflow-x: auto } ' +
						'pre { margin: 0 } ' +
						'section { background: #222; padding: 4px } ' +
						'.op { font-size: 1.3em } ' +
						'.actions { font-size: 1.18em } ' +
						'.actions span { padding: 12px } ' +
						'.bad { color: #e44 } ' +
						'.bad:hover { color: #f00 } ' +
						'.warn { color: #bb0 } ' +
						'.warn:hover { color: #ff0 }' +
					'</style>',
			clean: true
		});
	} else return errorPage[404](req, res, user);
}).listen(process.argv[2] || 8000);
console.log('buildpage.js running on port ' + (process.argv[2] || 8000));