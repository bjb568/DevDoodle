'use strict';
const voteMultiplier = {
	program: 1,
	question: 2,
	answer: 5
};
var url = require('url'),
	crypto = require('crypto');
module.exports = o(function*(req, res, user, post) {
	var i, id;
	if (req.url.pathname == '/notif') {
		res.writeHead(200);
		res.end(user && user.unread ? '1' : '');
	} else if (req.url.pathname == '/me/changemail') {
		if (!user) return res.writeHead(403) || res.end('Error: You must be logged in to change your email.');
		var newmail = post.newmail;
		if (!newmail) return res.writeHead(400) || res.end('Error: No email specified.');
		if (newmail.length > 256) return res.writeHead(400) || res.end('Error: Email address must be no longer than 256 characters.');
		var mailhash = crypto.createHash('md5').update(newmail).digest('hex');
		dbcs.users.update({name: user.name}, {
			$set: {
				mail: newmail,
				mailhash: mailhash
			}
		});
		res.writeHead(200);
		res.end(mailhash);
	} else if (req.url.pathname == '/login/recover') {
		if (post.code) {
			var fuser = yield dbcs.users.findOne({
				confirm: post.code,
				confirmSentTime: {$gt: new Date() - 300000}
			}, yield);
			if (!fuser) return res.writeHead(403) || res.end('Error: Invalid or expired recovery code.');
			if (!post.pass) return res.writeHead(400) || res.end('Error: No password received.');
			var salt = crypto.randomBytes(64).toString('base64');
			res.writeHead(303, {Location: '/login/?r=recovered'});
			res.end();
			dbcs.users.update({name: fuser.name}, {
				$set: {
					pass: new Buffer(yield crypto.pbkdf2(post.pass + salt, 'KJ:C5A;_?F!00S(4S[T-3X!#NCZI;A', 1e5, 128, yield)).toString('base64'),
					salt: salt,
					cookie: []
				},
				$unset: {
					confirm: true,
					confirmSentTime: true
				}
			});
		} else {
			if (!post.user || !post.mail) return res.writeHead(400) || res.end('Error: Both user and mail are required.');
			var fuser = yield dbcs.users.findOne({
				name: post.user,
				mail: post.mail
			}, yield);
			if (fuser) {
				var token = crypto.randomBytes(12).toString('base64');
				transport.sendMail({
					from: 'DevDoodle <support@devdoodle.net>',
					to: post.mail,
					subject: 'Password Reset',
					html: '<p>Your ' + fuser.name + ' account\'s <em>case sensitive</em> recovery code is <strong>' + token + '</strong></p>' +
						'<p>Enter the code into the existing account recovery page to reset your password.</p>' +
						'<p>If you have not requested a password reset for the account ' + fuser.name + ' on DevDoodle, you may safely ignore this email.</p>'
				});
				dbcs.users.update({name: fuser.name}, {
					$set: {
						cookie: [],
						confirm: token,
						confirmSentTime: new Date().getTime()
					}
				});
			}
			res.writeHead(204);
			res.end();
		}
	} else if (req.url.pathname == '/login/resend') {
		if (!post.name || !post.pass || !post.mail) return res.writeHead(400) || res.end('Error: user, pass, and mail are required fields.');
		if (post.mail.length > 256) return res.writeHead(400) || res.end('Error: Email address must be no longer than 256 characters.');
		var fuser = yield dbcs.users.findOne({name: post.name}, yield);
		if (!fuser) return res.writeHead(403) || res.end('Error: Invalid credentials.');
		if (
			(
				yield crypto.pbkdf2(post.pass + fuser.salt, 'KJ:C5A;_?F!00S(4S[T-3X!#NCZI;A', 1e5, 128, yield)
			).toString('base64') != fuser.pass
		) return res.writeHead(403) || res.end('Error: Invalid credentials.');
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
	} else if (i = req.url.pathname.match(/^\/chat\/msg\/(\d+)$/)) {
		var doc = yield dbcs.chat.findOne({_id: parseInt(i[1])}, yield);
		if (!doc) return res.writeHead(404) || res.end('Error: Invalid message id.');
		if (doc.deleted) return res.writeHead(403) || res.end('Error: Message has been deleted.');
		res.writeHead(200);
		res.end(JSON.stringify({
			id: doc._id,
			body: doc.body,
			user: doc.user,
			time: doc.time,
			stars: doc.stars,
			room: doc.room
		}));
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
						if ((rooms[msg.room].type != 'N' || rooms[msg.room].invited.indexOf(user.name) != -1) && (rooms[msg.room].type != 'M' || (user && user.level > 4))) results.push({
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
		if (['P', 'R', 'N', 'M'].indexOf(post.type) == -1) return res.writeHead(400) || res.end('Error: Invalid room type.');
		var room = yield dbcs.chatrooms.findOne({_id: id}, yield);
		if (!room) return res.writeHead(400) || res.end('Error: Invalid room id.');
		if (room.invited.indexOf(user.name) == -1) return res.writeHead(403) || res.end('Error: You don\'t have permission to change the room type.');
		dbcs.chatrooms.update({_id: id}, {$set: {type: post.type}});
		res.writeHead(204);
		res.end();
	} else if (req.url.pathname == '/chat/inviteuser') {
		i = (url.parse(req.headers.referer || '').pathname || '').match(/^\/chat\/(\d+)/);
		id = i ? parseInt(i[1]) : 0;
		var room = yield dbcs.chatrooms.findOne({_id: id}, yield);
		if (!room) return res.writeHead(400) || res.end('Error: Invalid room id.');
		if (room.invited.indexOf(user.name) == -1) return res.writeHead(403) || res.end('Error: You don\'t have permission to invite users to this room.');
		var invUser = yield dbcs.users.findOne({name: post.user}, yield);
		if (!invUser) return res.writeHead(400) || res.end('Error: User not found.');
		if (room.invited.indexOf(invUser.name) != -1) return res.writeHead(409) || res.end('Error: ' + invUser.name + ' has already been invited.');
		dbcs.chatrooms.update({_id: id}, {$push: {invited: invUser.name}});
		res.writeHead(200);
		res.end(JSON.stringify({
			mailhash: invUser.mailhash,
			rep: invUser.rep
		}));
	} else if (req.url.pathname == '/chat/uninviteuser') {
		i = (url.parse(req.headers.referer || '').pathname || '').match(/^\/chat\/(\d+)/);
		id = i ? parseInt(i[1]) : 0;
		var room = yield dbcs.chatrooms.findOne({_id: id}, yield);
		if (!room) return res.writeHead(400) || res.end('Error: Invalid room id.');
		if (room.invited.indexOf(user.name) == -1) return res.writeHead(403) || res.end('Error: You don\'t have permission to invite users to this room.');
		if (room.invited.indexOf(post.user) == -1) return res.writeHead(409) || res.end('Error: ' + post.user + ' has not been invited.');
		if (room.invited.length == 1) return res.writeHead(400) || res.end('Error: You may not remove the only invited user.');
		dbcs.chatrooms.update({_id: id}, {$pull: {invited: post.user}});
		res.writeHead(204);
		res.end();
	} else if (i = req.url.pathname.match(/^\/chat\/msg\/(\d+)\/delv$/)) {
		if (!user) return res.writeHead(403) || res.end('Error: You must be logged in to cast deletion votes.');
		if (user.level < 2) return res.writeHead(403) || res.end('Error: You must be a level 2 moderator to cast delete votes.');
		id = i ? parseInt(i[1]) : 0;
		var msg = yield dbcs.chat.findOne({_id: id}, yield);
		if (!msg) return res.writeHead(400) || res.end('Error: Invalid message id.');
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
		if ((msg.reviewers || []).indexOf(user.name) != -1) return res.writeHead(403) || res.end('Error: You have already reviewed this post.');
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
	} else if (i = req.url.pathname.match(/^\/chat\/msg\/(\d+)\/nanv$/)) {
		if (!user) return res.writeHead(403) || res.end('Error: You must be logged in to dispute flags.');
		if (user.level < 2) return res.writeHead(403) || res.end('Error: You must be a level 2 moderator to dispute flags.');
		id = i ? parseInt(i[1]) : 0;
		var msg = yield dbcs.chat.findOne({_id: id}, yield);
		if (!msg) return res.writeHead(400) || res.end('Error: Invalid message id.');
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
		if ((msg.reviewers || []).indexOf(user.name) != -1) return res.writeHead(403) || res.end('Error: You have already reviewed this post.');
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
	} else if (i = req.url.pathname.match(/^\/chat\/msg\/(\d+)\/rcomment$/)) {
		if (!user) return res.writeHead(403) || res.end('Error: You must be logged in to add review comments.');
		if (user.level < 2) return res.writeHead(403) || res.end('Error: You must be a level 2 moderator to add review comments.');
		if (!post.body) return res.writeHead(400) || res.end('Error: Please enter a comment body.');
		if (post.body.length > 2000) return res.writeHead(400) || res.end('Error: Comment length may not exceed 2000 characters.');
		id = i ? parseInt(i[1]) : 0;
		var msg = yield dbcs.chat.findOne({_id: id}, yield);
		if (!msg) return res.writeHead(400) || res.end('Error: Invalid message id.');
		if (post.mod && (msg.reviewers || []).indexOf(user.name) != -1) return res.writeHead(403) || res.end('Error: You have already reviewed this post.');
		if (post.mod && msg.mod) return res.writeHead(403) || res.end('Error: This post is already mod-only. You may still leave a regular comment.');
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
	} else if (i = req.url.pathname.match(/^\/chat\/msg\/(\d+)\/edit$/)) {
		if (!user) return res.writeHead(403) || res.end('Error: You must be logged in to edit chat messages in review.');
		if (user.level < 2) return res.writeHead(403) || res.end('Error: You must be a level 2 moderator to edit chat messages in review.');
		if (!post.body) return res.writeHead(400) || res.end('Error: Body text required.');
		if (post.body.length > 2000) return res.writeHead(400) || res.end('Error: Chat message length may not exceed 2880 characters.');
		id = i ? parseInt(i[1]) : 0;
		var msg = yield dbcs.chat.findOne({_id: id}, yield);
		if (!msg) return res.writeHead(400) || res.end('Error: Invalid message id.');
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
	} else if (i = req.url.pathname.match(/^\/chat\/msg\/(\d+)\/rskip$/)) {
		if (!user) return res.writeHead(403) || res.end('Error: You must be logged in to skip in review.');
		if (user.level < 2) return res.writeHead(403) || res.end('Error: You must be a level 2 moderator to skip in review.');
		id = i ? parseInt(i[1]) : 0;
		var msg = yield dbcs.chat.findOne({_id: id}, yield);
		if (!msg) return res.writeHead(400) || res.end('Error: Invalid message id.');
		dbcs.chat.update({_id: id}, {$push: {reviewers: user.name}});
		res.writeHead(204);
		res.end();
	} else if (req.url.pathname == '/question/add') {
		if (!user) return res.writeHead(403) || res.end('Error: You must be logged in to ask a question.');
		if (!post.title || !post.lang || !post.description || !post.question || !post.type || !post.tags) return res.writeHead(400) || res.end('Error: Missing required field.');
		if (!questionTypes.hasOwnProperty(post.type)) return res.writeHead(400) || res.end('Error: Invalid type parameter.');
		var tags = post.tags.split();
		i = tags.length;
		while (i--) {
			if (!(tags[i] = parseInt(tags[i]))) return res.writeHead(400) || res.end('Error: Invalid tag list.');
		}
		var tag = yield dbcs.qtags.findOne({lang: post.lang}, yield);
		if (!tag) return res.writeHead(400) || res.end('Error: Invalid language.');
		var last = yield dbcs.questions.find().sort({_id: -1}).limit(1).nextObject(yield),
			id = last ? last._id + 1 : 1;
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
			score: 0,
			hotness: 0,
			upvotes: 0
		});
		res.writeHead(200);
		res.end('Location: /qa/' + id);
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
		if (!user) return res.writeHead(403) || res.end('Error: You must be logged in to create a new tag.');
		if (!post.name || !post.lang) return res.writeHead(400) || res.end('Error: Name and language are required fields.');
		var count = yield dbcs.answers.find({
			user: user.name,
			score: {$gte: 6}
		}).count(yield);
		if (count < 8 && user.level < 3) return res.writeHead(403) || res.end('Error: You must either be a level 3 moderator or have a bronze ' + post.lang + ' tag badge to create a new tag.');
		var parent = yield dbcs.qtags.findOne({_id: parseInt(post.par)}, yield),
			newTag = {
				name: post.name.substr(0, 48),
				lang: post.lang.substr(0, 48),
			};
		if (parent) {
			newTag.parentID = parent._id;
			newTag.parentName = parent.name;
		}
		var last = yield dbcs.qtags.find().sort({_id: -1}).limit(1).nextObject(yield);
		newTag._id = last ? last._id + 1 : 1;
		dbcs.qtags.insert(newTag);
		res.writeHead(200);
		res.end(JSON.stringify(newTag));
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
		if (!user) return res.writeHead(403) || res.end('Error: You must be logged in to answer a question.');
		if (!post.body) return res.writeHead(400) || res.end('Error: Missing body.');
		if (post.body.length < 144) return res.writeHead(400) || res.end('Error: Body must be at least 144 characters long.');
		if (!(i = (url.parse(req.headers.referer || '').pathname || '').match(/^\/qa\/(\d+)/))) return res.writeHead(400) || res.end('Error: Bad referer.');
		var last = yield dbcs.answers.find().sort({_id: -1}).limit(1).nextObject(yield),
			id = last ? last._id + 1 : 1;
		dbcs.answers.insert({
			_id: id,
			question: parseInt(i[1]),
			body: post.body,
			user: user.name,
			time: new Date().getTime(),
			score: 0,
			hotness: 0,
			upvotes: 0
		});
		res.writeHead(200);
		res.end('Location: #a' + id);
	} else if (req.url.pathname == '/program/save') {
		var type = parseInt(req.url.query.type);
		if (type !== 1 && type !== 2) return res.writeHead(400) || res.end('Error: Invalid program type.');
		if (!user) return res.writeHead(403) || res.end('Error: You must be logged in to save a program.');
		i = (url.parse(req.headers.referer || '').pathname || '').match(/^\/dev\/(\d+)/);
		id = i ? parseInt(i[1]) : 0;
		var program = yield dbcs.programs.findOne({_id: id}, yield);
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
			var last = yield dbcs.programs.find().sort({_id: -1}).limit(1).nextObject(yield),
				i = last ? last._id + 1 : 1,
				tprogram = {
					type: type,
					user: user.name,
					created: new Date().getTime(),
					updated: new Date().getTime(),
					score: 0,
					hotness: 0,
					upvotes: 0,
					_id: i
				};
			if (type == 1) tprogram.code = (post.code || '').toString();
			else if (type == 2) {
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
		}
	} else if (req.url.pathname == '/program/edit-title') {
		if (!user) return res.writeHead(403) || res.end('Error: You must be logged in to change a program title.');
		i = (url.parse(req.headers.referer || '').pathname || '').match(/^\/dev\/(\d+)/);
		id = i ? parseInt(i[1]) : 0;
		var program = yield dbcs.programs.findOne({_id: id}, yield);
		if (!program) return res.writeHead(400) || res.end('Error: Invalid program id.');
		if (program.user.toString() != user.name.toString()) return res.writeHead(403) || res.end('Error: You may rename only your own programs.');
		dbcs.programs.update({_id: id}, {$set: {title: post.title.substr(0, 92)}});
		res.writeHead(204);
		res.end();
	} else if (req.url.pathname == '/program/vote' || req.url.pathname == '/question/vote' || req.url.pathname == '/answer/vote') {
		if (!post.val) return res.writeHead(400) || res.end('Error: Vote value not specified.');
		post.val = parseInt(post.val);
		if (post.val !== 0 && post.val !== 1 && post.val !== -1) return res.writeHead(400) || res.end('Error: Invalid vote value.');
		if (!user) return res.writeHead(403) || res.end('Error: You must be logged in and have 15 reputation to vote.');
		if (user.rep < 15) return res.writeHead(403) || res.end('Error: You must have 15 reputation to vote.');
		id = parseInt(post.id);
		if (!id) {
			i = (url.parse(req.headers.referer || '').pathname || '').match(/^\/(?:dev|qa)\/(\d+)/);
			id = i ? parseInt(i[1]) : 0;
		}
		var pType = req.url.pathname == '/program/vote' ? 'program' : req.url.pathname == '/question/vote' ? 'question' : 'answer',
			doc = yield dbcs[pType + 's'].findOne({_id: id}, yield);
		if (!doc) return res.writeHead(400) || res.end('Error: Invalid post id.');
		if (doc.user.toString() == user.name.toString()) return res.writeHead(403) || res.end('Error: You may not vote for your own ' + pType + '.');
		var vQuery = {user: user.name};
		vQuery[pType] = id;
		var current = yield dbcs.votes.findOne(vQuery, yield);
		if (!current) {
			current = {val: 0};
			vQuery.val = post.val;
			vQuery.time = new Date().getTime();
			yield dbcs.votes.insert(vQuery, yield);
		} else {
			yield dbcs.votes.update(vQuery, {
				$set: {
					val: post.val,
					time: new Date().getTime()
				}
			}, yield);
		}
		var posHotness = {
			time: {$gt: new Date() - 86400000},
			val: 1
		};
		posHotness[pType] = id;
		var negHotness = {
			time: {$gt: new Date() - 86400000},
			val: -1
		};
		negHotness[pType] = id;
		dbcs[pType + 's'].update({_id: id}, {
			$inc: {
				score: post.val - current.val,
				upvotes: post.val == 1 && current.val != 1 ? 1 : (post.val != 1 && current.val == 1 ? -1 : 0)
			},
			$set: {hotness: (yield dbcs.votes.find(posHotness).count(yield)) - (yield dbcs.votes.find(negHotness).count(yield))}
		});
		dbcs.users.update({name: doc.user}, {$inc: {rep: (post.val - current.val) * voteMultiplier[pType]}});
		res.writeHead(204);
		res.end();
	} else if (req.url.pathname == '/program/delete') {
		if (!user) return res.writeHead(403) || res.end('Error: You must be logged in to delete programs.');
		i = (url.parse(req.headers.referer || '').pathname || '').match(/^\/dev\/(\d+)/);
		id = i ? parseInt(i[1]) : 0;
		var program = yield dbcs.programs.findOne({_id: id}, yield);
		if (!program) return res.writeHead(400) || res.end('Error: Invalid program id.');
		if (program.user.toString() != user.name.toString() && user.level < 4) return res.writeHead(403) || res.end('Error: You may delete only your own programs.');
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
	} else if (req.url.pathname == '/program/undelete') {
		if (!user) return res.writeHead(403) || res.end('Error: You must be logged in to undelete programs.');
		i = (url.parse(req.headers.referer || '').pathname || '').match(/^\/dev\/(\d+)/);
		id = i ? parseInt(i[1]) : 0;
		var program = yield dbcs.programs.findOne({_id: id}, yield);
		if (!program) return res.writeHead(400) || res.end('Error: Invalid program id.');
		if (program.user.toString() != user.name.toString() && user.level < 4) return res.writeHead(403) || res.end('Error: You may undelete only your own programs.');
		dbcs.programs.update({_id: id}, {$unset: {deleted: 1}});
		res.writeHead(204);
		res.end();
	} else if (req.url.pathname == '/lesson/edit-title') {
		if (!user) return res.writeHead(403) || res.end('Error: You must be logged in to change a lesson title.');
		i = (url.parse(req.headers.referer || '').pathname || '').match(/^\/learn\/unoff\/(\d+)/);
		id = i ? parseInt(i[1]) : 0;
		var lesson = yield dbcs.lessons.findOne({_id: id}, yield);
		if (!lesson) return res.writeHead(400) || res.end('Error: Invalid lesson id.');
		if (lesson.user.toString() != user.name.toString()) return res.writeHead(204) || res.end('Error: You may rename only your own lessons.');
		dbcs.lessons.update({_id: id}, {$set: {title: post.title.substr(0, 92)}});
		res.writeHead(204);
		res.end();
	} else {
		res.writeHead(404);
		res.end('The API feature requested has not been implemented.');
	}
});