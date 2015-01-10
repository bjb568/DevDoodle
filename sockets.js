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

var cookie = require('cookie'),
	essentials = require('./essentials.js'),
	ws = require('ws'),
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

var wss = new ws.Server({port: 81});

wss.on('connection', function(tws) {
	var i;
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
		tws.trysend = function(msg) {
			try {
				tws.send(msg);
			} catch(e) {}
		};
		if ((i = tws.upgradeReq.url.match(/\/chat\/(\d+)/))) {
			if (isNaN(tws.room = parseInt(i[1]))) return;
			dbcs.chat.find({
				room: tws.room,
				$or: [
					{deleted: {$exists: false}},
					{user: tws.user.name}
				]
			}).count(function(err, count) {
				if (err) throw err;
				var i = parseInt(tws.upgradeReq.url.match(/\/chat\/(\d+)(\/(\d+))?/)[3]) || 0;
				dbcs.chat.find({
					room: tws.room,
					$or: [
						{deleted: {$exists: false}},
						{user: tws.user.name}
					],
					_id: {$gt: i}
				}).count(function(err, after) {
					if (err) throw err;
					var ts = after > 92 && i,
						skip = Math.max(0, ts ? count - after - 18 : count - 92);
					tws.trysend(JSON.stringify({
						event: 'info-skipped',
						body: skip,
						ts: ts
					}));
					dbcs.chat.find({
						room: tws.room,
						$or: [
							{deleted: {$exists: false}},
							{user: tws.user.name}
						]
					}).sort({_id: -1}).skip(ts ? Math.max(0, after - 174) : 0).limit(ts ? 192 : 92).each(function(err, doc) {
						if (err) throw err;
						if (doc) {
							tws.trysend(JSON.stringify({
								event: 'init',
								id: doc._id,
								body: doc.body,
								user: doc.user,
								time: doc.time,
								stars: doc.stars,
								deleted: doc.deleted
							}));
							dbcs.chatstars.findOne({
								pid: doc._id,
								user: tws.user.name
							}, function(err, star) {
								if (err) throw err;
								if (star) tws.trysend(JSON.stringify({
									event: 'selfstar',
									id: star.pid
								}));
							});
						} else {
							var pids = [],
								count = 0;
							dbcs.chatstars.find({room: tws.room}).sort({time: -1}).limit(24).each(function(err, star) {
								if (err) throw err;
								if (star) {
									if (pids.indexOf(star.pid) == -1) pids.push(star.pid);
								} else {
									dbcs.chat.find({
										_id: {$in: pids},
										deleted: {$exists: false}
									}).sort({_id: 1}).each(function(err, post) {
										if (err) throw err;
										if (post && post.stars > 1 && count < 12) {
											count++;
											tws.trysend(JSON.stringify({
												event: 'star',
												id: post._id,
												board: true,
												body: post.body,
												stars: post.stars,
												user: post.user,
												time: post.time
											}));
										}
									});
									return tws.trysend(JSON.stringify({event: 'info-complete'}));
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
					if (doc) tws.trysend(JSON.stringify({
						event: 'adduser',
						name: doc.name,
						state: doc.state
					}));
					else if (user.name) {
						if (rem) {
							tws.trysend(JSON.stringify({
								event: 'adduser',
								name: user.name,
								state: 1
							}));
						} else {
							var sendto = [];
							for (var i in wss.clients) {
								if (wss.clients[i].room == tws.room && sendto.indexOf(wss.clients[i].user.name) == -1) sendto.push(wss.clients[i]);
							}
							for (var i in sendto) sendto[i].trysend(JSON.stringify({
								event: 'adduser',
								name: user.name,
								state: 1
							}));
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
					return tws.trysend(JSON.stringify({
						event: 'err',
						body: 'JSON error.'
					}));
				}
				if (message.event == 'post') {
					if (!tws.user.name) return tws.trysend(JSON.stringify({
						event: 'err',
						body: 'You must be logged in and have 30 reputation to chat.'
					}));
					if (tws.user.rep < 30) return tws.trysend(JSON.stringify({
						event: 'err',
						body: 'You must have 30 reputation to chat.'
					}));
					if (!message.body) return tws.trysend(JSON.stringify({
						event: 'err',
						body: 'Message body not submitted.'
					}));
					message.body = message.body.toString();
					if (message.body.length > 2880) return tws.trysend(JSON.stringify({
						event: 'err',
						body: 'Chat message length may not exceed 2880 characters.'
					}));
					dbcs.chat.find().sort({_id: -1}).limit(1).nextObject(function(err, doc) {
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
						for (var i in sendto) sendto[i].trysend(JSON.stringify({
							event: 'add',
							body: message.body,
							user: tws.user.name,
							id: id
						}));
						var matches = message.body.match(/@([a-zA-Z0-9-]{3,16})\W/g);
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
						if (!post) return tws.trysend(JSON.stringify({
							event: 'err',
							body: 'Message not found.'
						}));
						if (post.user != tws.user.name) return tws.trysend(JSON.stringify({
							event: 'err',
							body: 'You may edit only your own messages.'
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
						for (var i in sendto) sendto[i].trysend(JSON.stringify({
							event: 'edit',
							id: post._id,
							body: message.body
						}));
					});
				} else if (message.event == 'flag') {
					dbcs.chat.findOne({_id: message.id}, function(err, post) {
						if (err) throw err;
						if (!post) return tws.trysend(JSON.stringify({
							event: 'err',
							body: 'Message not found.'
						}));
						if (!tws.user.name) return tws.trysend(JSON.stringify({
							event: 'err',
							body: 'You must be logged in and have 50 reputation to flag chat messages.'
						}));
						if (tws.user.rep < 50) return tws.trysend(JSON.stringify({
							event: 'err',
							body: 'You must have 50 reputation to flag chat messages.'
						}));
						if (!message.body) return tws.trysend(JSON.stringify({
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
						tws.trysend(JSON.stringify({
							event: 'notice',
							body: 'Post #' + message.id + ' flagged.'
						}))
					});
				} else if (message.event == 'delete') {
					dbcs.chat.findOne({_id: message.id}, function(err, post) {
						if (err) throw err;
						if (!post) return tws.trysend(JSON.stringify({
							event: 'err',
							body: 'Message not found.'
						}));
						if (post.deleted) return tws.trysend(JSON.stringify({
							event: 'err',
							body: 'This message is already deleted.'
						}));
						if (post.user != tws.user.name) return tws.trysend(JSON.stringify({
							event: 'err',
							body: 'You may delete only your own messages.'
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
						for (var i in sendto) sendto[i].trysend(JSON.stringify({
							event: 'delete',
							id: post._id
						}));
					});
				} else if (message.event == 'undelete') {
					dbcs.chat.findOne({_id: message.id}, function(err, post) {
						if (err) throw err;
						if (!post) return tws.trysend(JSON.stringify({
							event: 'err',
							body: 'Message not found.'
						}));
						if (!post.deleted) return tws.trysend(JSON.stringify({
							event: 'err',
							body: 'This message isn\'t deleted.'
						}));
						if (post.user != tws.user.name) return tws.trysend(JSON.stringify({
							event: 'err',
							body: 'You may undelete only your own messages.'
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
						for (var i in sendto) sendto[i].trysend(JSON.stringify({
							event: 'undelete',
							id: post._id,
							body: post.body,
							user: post.user,
							time: post.time,
							stars: post.stars || 0
						}));
					});
				} else if (message.event == 'statechange') {
					if (tws.user.name) {
						dbcs.chatusers.update({
							name: tws.user.name,
							room: tws.room
						}, {$set: {state: message.state}}, {upsert: 1});
						var sendto = [];
						for (var i in wss.clients) {
							if (wss.clients[i].room == tws.room && sendto.indexOf(wss.clients[i].user.name) == -1) sendto.push(wss.clients[i]);
						}
						for (var i in sendto) sendto[i].trysend(JSON.stringify({
							event: 'statechange',
							state: message.state,
							name: tws.user.name
						}));
					}
				} else if (message.event == 'req') {
					message.skip = parseInt(message.skip);
					if (isNaN(message.skip) || message.skip < 0) return tws.trysend(JSON.stringify({
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
					cursor.sort({_id: 1}).skip(message.skip).limit(1).each(function(err, doc) {
						if (err) throw err;
						if (!doc) return;
						tws.trysend(JSON.stringify({
							event: 'init',
							id: doc._id,
							body: doc.body,
							user: doc.user,
							deleted: doc.deleted,
							time: doc.time,
							stars: doc.stars
						}));
						dbcs.chatstars.findOne({
							pid: doc._id,
							user: tws.user.name
						}, function(err, star) {
							if (err) throw err;
							if (star) tws.trysend(JSON.stringify({
								event: 'selfstar',
								id: star.pid
							}));
						});
					});
				} else if (message.event == 'star') {
					if (!tws.user.name) return tws.trysend(JSON.stringify({
						event: 'err',
						body: 'You must be logged in and have 30 reputation to star messages.'
					}));
					if (tws.user.rep < 30) return tws.trysend(JSON.stringify({
						event: 'err',
						body: 'You must have 30 reputation to star messages.'
					}));
					var id = parseInt(message.id);
					dbcs.chat.findOne({
						_id: id,
						deleted: {$exists: false}
					}, function(err, post) {
						if (err) throw err;
						if (!post) return tws.trysend(JSON.stringify({
							event: 'err',
							body: 'Invalid message id.'
						}));
						dbcs.chatstars.findOne({
							user: tws.user.name,
							pid: id
						}, function(err, star) {
							if (err) throw err;
							if (star) return tws.trysend(JSON.stringify({
								event: 'err',
								body: 'You already stared this post.'
							}));
							dbcs.chatstars.find({
								user: tws.user.name,
								time: {$gt: new Date().getTime() - 900000}
							}).count(function(err, count) {
								if (err) throw err;
								if (count > 3) return tws.trysend(JSON.stringify({
									event: 'err',
									body: 'You may star only 3 posts in 15 minutes.',
									revertStar: id
								}));
								dbcs.chatstars.find({
									user: tws.user.name,
									time: {$gt: new Date().getTime() - 7200000}
								}).count(function(err, count) {
									if (err) throw err;
									if (count > 8) return tws.trysend(JSON.stringify({
										event: 'err',
										body: 'You may star only 8 posts in 2 hours.',
										revertStar: id
									}));
									dbcs.chatstars.find({
										user: tws.user.name,
										time: {$gt: new Date().getTime() - 86400000},
										postowner: tws.user.name
									}).count(function(err, count) {
										if (err) throw err;
										if (count > 2) return tws.trysend(JSON.stringify({
											event: 'err',
											body: 'You may selfstar only 2 posts in 24 hours.',
											revertStar: id
										}));
										dbcs.chatstars.insert({
											user: tws.user.name,
											pid: id,
											room: post.room,
											time: new Date().getTime(),
											postowner: post.user
										});
										dbcs.chat.update({_id: id}, {$inc: {stars: 1}});
										var sendto = [];
										for (var i in wss.clients) {
											if (wss.clients[i].room == tws.room && sendto.indexOf(wss.clients[i].user.name) == -1) sendto.push(wss.clients[i]);
										}
										for (var i in sendto) sendto[i].trysend(JSON.stringify({
											event: 'star',
											id: post._id,
											body: post.body,
											stars: (post.stars || 0) + 1,
											user: post.user,
											time: post.time
										}));
									});
								});
							});
						});
					});
				} else if (message.event == 'unstar') {
					if (!tws.user.name) return tws.trysend(JSON.stringify({
						event: 'err',
						body: 'You must be logged in to unstar messages.'
					}));
					var id = parseInt(message.id);
					dbcs.chat.findOne({
						_id: id,
						deleted: {$exists: false}
					}, function(err, doc) {
						if (err) throw err;
						if (!doc) return tws.trysend(JSON.stringify({
							event: 'err',
							body: 'Invalid message id.'
						}));
						dbcs.chatstars.findOne({
							user: tws.user.name,
							pid: id
						}, function(err, star) {
							if (err) throw err;
							if (!star) return tws.trysend(JSON.stringify({
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
							for (var i in sendto) sendto[i].trysend(JSON.stringify({
								event: 'unstar',
								id: id
							}));
						});
					});
				} else if (message.event == 'info-update') {
					if (!tws.user.name || tws.user.rep < 200) return tws.trysend(JSON.stringify({
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
					dbcs.chat.find().sort({_id: -1}).limit(1).nextObject(function(err, doc) {
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
							sendto[i].trysend(JSON.stringify({
								event: 'info-update',
								name: message.name,
								desc: message.desc,
								id: id
							}));
							sendto[i].trysend(JSON.stringify({
								event: 'add',
								body: newMessage,
								user: tws.user.name,
								id: id
							}));
						}
					});
				} else tws.trysend(JSON.stringify({
					event: 'err',
					body: 'Invalid event type.'
				}));
			});
			tws.on('close', function() {
				var sendto = [];
				for (var i in wss.clients) {
					if (wss.clients[i].room == tws.room && sendto.indexOf(wss.clients[i].user.name) == -1) sendto.push(wss.clients[i]);
				}
				for (var i in sendto) sendto[i].trysend(JSON.stringify({
					event: 'deluser',
					name: tws.user.name
				}));
				dbcs.chatusers.remove({
					name: tws.user.name,
					room: tws.room
				});
			});
		} else if ((i = tws.upgradeReq.url.match(/\/dev\/(\d+)/))) {
			if (isNaN(tws.program = parseInt(i[1]))) return;
			tws.on('message', function(message) {
				console.log(message);
				try {
					message = JSON.parse(message);
				} catch (e) {
					return tws.trysend(JSON.stringify({
						event: 'err',
						body: 'JSON error.'
					}));
				}
				if (message.event == 'post') {
					if (!tws.user.name) return tws.trysend(JSON.stringify({
						event: 'err',
						body: 'You must be logged in and have 20 reputation to comment.'
					}));
					if (tws.user.rep < 20) return tws.trysend(JSON.stringify({
						event: 'err',
						body: 'You must have 20 reputation to comment.'
					}));
					message.body = message.body.toString();
					if (!message.body) return tws.trysend(JSON.stringify({
						event: 'err',
						body: 'Comment body not submitted.'
					}));
					if (message.body.length > 720) return tws.trysend(JSON.stringify({
						event: 'err',
						body: 'Comment length may not exceed 720 characters.'
					}));
					dbcs.comments.find().sort({_id: -1}).limit(1).nextObject(function(err, doc) {
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
						for (var i in sendto) sendto[i].trysend(JSON.stringify({
							event: 'add',
							body: message.body,
							user: tws.user.name,
							id: id
						}));
						var matches = message.body.match(/@([a-zA-Z0-9-]{3,16})\W/g) || [];
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
					if (!tws.user.name) return tws.trysend(JSON.stringify({
						event: 'err',
						body: 'You must be logged in and have 50 reputation to vote on comments.'
					}));
					if (tws.user.rep < 50) return tws.trysend(JSON.stringify({
						event: 'err',
						body: 'You must have 50 reputation to vote on comments.'
					}));
					var id = parseInt(message.id);
					dbcs.comments.findOne({
						_id: id,
						deleted: {$exists: false}
					}, function(err, post) {
						if (err) throw err;
						if (!post) return tws.trysend(JSON.stringify({
							event: 'err',
							body: 'Invalid comment id.'
						}));
						for (var i in post.votes) {
							if (post.votes[i].user == tws.user.name) return tws.trysend(JSON.stringify({
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
						for (var i in sendto) sendto[i].trysend(JSON.stringify({
							event: 'scorechange',
							id: post._id,
							score: post.votes ? post.votes.length + 1 : 1
						}));
					});
				} else if (message.event == 'unvote') {
					if (!tws.user.name) return tws.trysend(JSON.stringify({
						event: 'err',
						body: 'You must be logged in to vote on comments.'
					}));
					var id = parseInt(message.id);
					dbcs.comments.findOne({
						_id: id,
						deleted: {$exists: false}
					}, function(err, post) {
						if (err) throw err;
						if (!post) return tws.trysend(JSON.stringify({
							event: 'err',
							body: 'Invalid comment id.'
						}));
						var err = true;
						for (var i in post.votes) {
							if (post.votes[i].user == tws.user.name) err = false;
						}
						if (err) return tws.trysend(JSON.stringify({
							event: 'err',
							body: 'You haven\'t voted on this comment.'
						}));
						dbcs.comments.update({_id: id}, {$pull: {votes: {user: tws.user.name}}});
						var sendto = [];
						for (var i in wss.clients) {
							if (wss.clients[i].program == tws.program && sendto.indexOf(wss.clients[i].user.name) == -1) sendto.push(wss.clients[i]);
						}
						for (var i in sendto) sendto[i].trysend(JSON.stringify({
							event: 'scorechange',
							id: post._id,
							score: post.votes.length - 1
						}));
					});
				} else tws.trysend(JSON.stringify({
					event: 'err',
					body: 'Invalid event type.'
				}));
			});
		} else tws.trysend(JSON.stringify({
			event: 'err',
			body: 'Invalid upgrade URL.'
		}));
	});
});
console.log('sockets.js running on port 81');