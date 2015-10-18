'use strict';
var url = require('url'),
	crypto = require('crypto');
module.exports = function(req, res, user, post) {
	var i, id;
	if (req.url.pathname == '/notif') {
		res.writeHead(200);
		res.end(user && user.unread ? '1' : '');
	} else if (req.url.pathname == '/me/changemail') {
		if (!user) {
			res.writeHead(403);
			return res.end('Error: You must be logged in to change your email.');
		}
		var newmail = post.newmail;
		if (!newmail) {
			res.writeHead(400);
			return res.end('Error: No email specified.');
		}
		if (newmail.length > 256) {
			res.writeHead(400);
			return res.end('Error: Email address must be no longer than 256 characters.');
		}
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
		if (!post.title || !post.lang || !post.description || !post.question || !post.type || !post.tags) {
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
};