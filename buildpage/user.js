'use strict';
let fs = require('fs'),
	crypto = require('crypto');
module.exports = o(function*(req, res, user) {
	let i;
	if (req.url.pathname == '/user/') {
		yield respondPage('Users', user, req, res, yield);
		let dstr = '',
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
		let order = {};
		order[orderByDict[orderBy] || orderByDict.default] = orderDirDict[orderDir] || orderDirDict.default;
		let num = 0;
		dbcs.users.find(whereDict[where] || whereDict.default).sort(order).each(o(function*(err, cUser) {
			if (err) throw err;
			if (cUser) {
				num++;
				dstr +=
					'<div class="user"><img src="' + cUser.pic + '" width="40" height="40" />' +
					'<div><a href="/user/' + cUser.name + '">' + cUser.name + '</a><small class="rep">' + cUser.rep + '</small></div>' +
					'</div>';
			} else {
				res.write(
					(yield addVersionNonces((yield fs.readFile('./html/user/userlist.html', yield)).toString(), req.url.pathname, yield))
					.replace('$num', num ? (num == 1 ? '1 user found' : num + ' users found') : '<span class="red">0 users found</span>')
					.replace('$users', dstr)
					.replace('"' + orderBy + '"', '"' + orderBy + '" selected=""')
					.replace('"' + orderDir + '"', '"' + orderDir + '" selected=""')
					.replace('"' + where + '"', '"' + where + '" selected=""')
				);
				res.end(yield fs.readFile('html/a/foot.html', yield));
			}
		}));
	} else if (i = req.url.pathname.match(/^\/user\/([a-zA-Z0-9-]{3,16})$/)) {
		let dispUser = yield dbcs.users.findOne({name: i[1]}, yield);
		if (!dispUser) return errorNotFound(req, res, user);
		let me = user.name == dispUser.name,
			notifstr = '';
		if (me && user.notifs) {
			let notifs = [];
			i = user.notifs.length;
			while (i--) {
				if (user.notifs[i].unread) notifs.push(user.notifs[i]);
				user.notifs[i].unread = false;
			}
			if (notifs.length) {
				notifstr += '<h2>Notifications</h2>';
				notifstr += '<ul id="notifs">';
				i = notifs.length;
				while (i--) notifstr +=
					'<li class="hglt pad"><em>' + notifs[i].type + ' on ' + notifs[i].on + '</em><blockquote>' + markdown(notifs[i].body) + '</blockquote>' +
					'-' + notifs[i].from.link('/user/' + notifs[i].from) + ', <time datetime="' + new Date(notifs[i].time).toISOString() + '"></time></li>';
				notifstr += '</ul>';
				dbcs.users.update({name: user.name}, {
					$set: {
						unread: 0,
						notifs: user.notifs
					}
				});
				user.unread = 0;
			}
			notifstr += '<p><a href="/notifs">Read old notifications</a></p>';
		}
		yield respondPage(dispUser.name, user, req, res, yield);
		let questions = 0;
		res.write('<h1 class="clearfix"><a href="/user/" title="User List">←</a> ' + dispUser.name + (me ? ' <small><a href="/user/' + user.name + '/changepass">Change Password</a> <line /> <a href="/logout">Log out</a></small>' : '') + '</h1>');
		res.write('<img id="profpic" class="lft" src="' + dispUser.pic + '" />');
		res.write('<div>');
		res.write('<div>Joined <time datetime="' + new Date(dispUser.joined).toISOString() + '"></time></div>');
		if (dispUser.seen) res.write('<div>Seen <time datetime="' + new Date(dispUser.seen).toISOString() + '"></time></div>');
		res.write('<div class="grey">Moderator level ' + dispUser.level + '</div>');
		if (dispUser.githubName) res.write('<a href="https://github.com/' + dispUser.githubName + '/">' + dispUser.githubName + ' on GitHub</a>');
		if (me && !dispUser.githubID) {
			res.write(
				'<a href="//gravatar.com/' + crypto.createHash('md5').update(dispUser.mail).digest('hex') + '" target="_blank" title="Gravatar user page for this email">Change profile picture on gravatar</a> ' +
				'(you must <a href="http://gravatar.com/login" target="_blank">create a gravatar account</a> if you don\'t have one <em>for this email</em>)'
			);
		}
		res.write('</div>');
		res.write('<div class="clear"><span class="big-rep">' + dispUser.rep + '</span> reputation</div>');
		res.write(notifstr);
		res.write('<div class="resp-flex umar">');
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
				let cursor = dbcs.answers.find({user: dispUser.name}).sort({score: -1, _id: -1}).limit(16),
					answers = 0;
				let answerHandler = o(function*(err, answer) {
					if (err) throw err;
					if (answer) {
						let question = yield dbcs.questions.findOne({_id: answer.question}, yield);
						res.write('<li><a href="/qa/' + question._id + '">' + question.title + '</a></li>');
						answers++;
						cursor.nextObject(answerHandler);
					} else {
						res.write('</ul></div>');
						if (!answers) res.write('<p class="grey">' + (me ? 'You don\'t' : 'This user doesn\'t') + ' have any answers.</p>');
						res.write('</section>');
						res.write('</div>');
						res.write('<section class="resp-block">');
						res.write('<h2 class="underline">Programs <small><a href="/dev/search/user/' + dispUser.name + '">Show All</a></small></h2>');
						res.write('<div class="flexcont programs lim-programs">');
						let programs = 0,
							programQuery = {
								user: dispUser.name,
								deleted: {$exists: false}
							};
						if (!me) programQuery.private = false;
						dbcs.programs.find(programQuery).sort({
							score: -1,
							updated: -1
						}).limit(24).each(o(function*(err, program) {
							if (err) throw err;
							if (program) {
								res.write('<div class="program">');
								res.write('<h2 class="title"><a href="/dev/' + program._id + '">' + html(program.title || 'Untitled') + typeIcons[data.private ? 'R' : 'P'] + '</a></h2>');
								if (program.type == 1) res.write('<div><iframe sandbox="allow-scripts" class="canvas-program" data-code="' + html(program.code) + '"></iframe></div>');
								else if (program.type == 2) res.write('<div><iframe sandbox="allow-scripts" class="html-program" data-html="' + html(program.html) + '" data-css="' + html(program.css) + '" data-js="' + html(program.js) + '"></iframe></div>');
								res.write('</div> ');
								programs++;
							} else {
								res.write('</div>');
								if (!programs) res.write('<p class="grey">' + (me ? 'You don\'t' : 'This user doesn\'t') + ' have any programs.</p>');
								res.write('</section>');
								if (me) {
									res.write('<h2 class="underline">Private</h2>');
									res.write((yield addVersionNonces((yield fs.readFile('./html/user/mailform.html', yield)).toString(), req.url.pathname, yield)).replaceAll('$mail', html(user.mail)));
								}
								res.end(yield fs.readFile('html/a/foot.html', yield));
							}
						}));
					}
				});
				cursor.nextObject(answerHandler);
			}
		});
	} else errorNotFound(req, res, user);
});