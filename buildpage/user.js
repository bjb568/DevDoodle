'use strict';
var fs = require('fs');
module.exports = function(req, res, user) {
	var i;
	if (req.url.pathname == '/user/') {
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
						'<div class="lft user"><img src="//gravatar.com/avatar/' + cUser.mailhash + '?s=576&amp;d=identicon" width="40" height="40" />' +
						'<div><a href="/user/' + cUser.name + '">' + cUser.name + '</a><small class="rep">' + cUser.rep + '</small></div>' +
						'</div>';
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
			if (!dispUser) return errorNotFound(req, res, user);
			var questions = 0;
			respondPage(dispUser.name, user, req, res, function() {
				var me = user.name == dispUser.name;
				res.write('<h1 class="clearfix"><a href="/user/" title="User List">←</a> ' + dispUser.name + (me ? ' <small><a href="/user/' + user.name + '/changepass">Change Password</a> <line /> <a href="/logout">Log out</a></small>' : '') + '</h1>');
				res.write('<img id="profpic" class="lft" src="//gravatar.com/avatar/' + dispUser.mailhash + '?s=576&amp;d=identicon" />');
				res.write('<div>');
				res.write('<div>Joined <time datetime="' + new Date(dispUser.joined).toISOString() + '"></time></div>');
				if (dispUser.seen) res.write('<div>Seen <time datetime="' + new Date(dispUser.seen).toISOString() + '"></time></div>');
				res.write('<div class="grey">Moderator level ' + dispUser.level + '</div>');
				if (me) {
					res.write(
						'<a href="//gravatar.com/' + dispUser.mailhash + '" target="_blank" title="Gravatar user page for this email">Change profile picture on gravatar</a> ' +
						'(you must <a href="http://gravatar.com/login" target="_blank">create a gravatar account</a> if you don\'t have one <em>for this email</em>)'
					);
				}
				res.write('</div>');
				res.write('<div class="clear"><span class="big-rep">' + dispUser.rep + '</span> reputation</div>');
				res.write('<div class="resp-flex">');
				res.write('<section>');
				res.write('<h2>Questions</h2>');
				res.write('<div class="column-medium"><ul>');
				dbcs.questions.find({user: dispUser.name}).sort({score: -1, _id: -1}).limit(16).each(function(err, question) {
					if (err) throw err;
					if (question) {
						res.write('<li><a href="/qa/' + question._id + '">' + html(question.lang) + ': ' + html(question.title) + '</a></li>');
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
								res.write('<section class="lim-programs resp-block">');
								res.write('<h2 class="underline">Programs <small><a href="/dev/search/user/' + dispUser.name + '">Show All</a></small></h2>');
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
										res.write('<div class="program">');
										res.write('<h2 class="title"><a href="/dev/' + data._id + '">' + html(data.title || 'Untitled') + '</a></h2>');
										if (data.type == 1) res.write('<div><iframe sandbox="allow-scripts" class="canvas-program" data-code="' + html(data.code, true) + '"></iframe></div>');
										else if (data.type == 2) res.write('<div><iframe sandbox="allow-scripts" class="html-program" data-html="' + html(data.html, true) + '" data-css="' + html(data.css, true) + '" data-js="' + html(data.js, true) + '"></iframe></div>');
										res.write('</div> ');
										programs++;
									} else {
										if (!programs) res.write('<p class="grey">' + (me ? 'You don\'t' : 'This user doesn\'t') + ' have any programs.</p>');
										res.write('</section>');
										if (me) {
											res.write('<h2 class="underline">Private</h2>');
											fs.readFile('./html/user/mailform.html', function(err, mailform) {
												if (err) throw err;
												res.write(mailform.toString().replaceAll('$mail', html(user.mail)));
												if (user.notifs) {
													var notifs = [];
													i = user.notifs.length;
													while (i--) {
														if (user.notifs[i].unread) notifs.push(user.notifs[i]);
														user.notifs[i].unread = false;
													}
													if (notifs.length) {
														res.write('<h2>Notifications</h2>');
														res.write('<ul id="notifs">');
														i = notifs.length;
														while (i--) res.write(
															'<li class="hglt pad"><em>' + notifs[i].type + ' on ' + notifs[i].on + '</em><blockquote>' + markdown(notifs[i].body) + '</blockquote>' +
															'-' + notifs[i].from.link('/user/' + notifs[i].from) + ', <time datetime="' + new Date(notifs[i].time).toISOString() + '"></time></li>'
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
												respondPageFooter(res);
											});
										} else respondPageFooter(res);
									}
								});
							}
						};
						cursor.nextObject(answerHandler);
					}
				});
			}, {nonotif: true});
		});
	} else errorNotFound(req, res, user);
};