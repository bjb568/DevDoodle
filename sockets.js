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

var fs = require('fs'),
	cookie = require('cookie'),
	https = require('https'),
	ws = require('ws'),
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
	db.authenticate('DevDoodle', fs.readFileSync('../Secret/devdoodleDB.key').toString(), function(err, result) {
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

var questionTypes = {
	err: 'an error',
	bug: 'unexpected behavior',
	imp: 'improving working code',
	how: 'achieving an end result',
	alg: 'algorithms and data structures',
	pra: 'techniques and best practices',
	the: 'a theoretical scenario'
};

var wss = new ws.Server({
	server: https.createServer({
		key: fs.readFileSync('../Secret/devdoodle.net.key'),
		cert: fs.readFileSync('../Secret/devdoodle.net.crt'),
		ca: [fs.readFileSync('../Secret/devdoodle.net-geotrust.crt')],
		ssl: true,
		ciphers: [
			'ECDHE-RSA-AES128-GCM-SHA256',
			'ECDHE-ECDSA-AES128-GCM-SHA256',
			'ECDHE-RSA-AES256-GCM-SHA384',
			'ECDHE-ECDSA-AES256-GCM-SHA384',
			'DHE-RSA-AES128-GCM-SHA256',
			'ECDHE-RSA-AES128-SHA256',
			'DHE-RSA-AES128-SHA256',
			'ECDHE-RSA-AES256-SHA384',
			'DHE-RSA-AES256-SHA384',
			'ECDHE-RSA-AES256-SHA256',
			'DHE-RSA-AES256-SHA256',
			'HIGH',
			'!aNULL',
			'!eNULL',
			'!EXPORT',
			'!DES',
			'!RC4',
			'!MD5',
			'!PSK',
			'!SRP',
			'!CAMELLIA'
		].join(':'),
		honorCipherOrder: true
	}, function(req, res) {
		res.writeHead(200);
		res.end('All glory to WebSockets!\n');
	}).listen(81)
});

function markdownEscape(input) {
	return input.replace(/([^\\]?)(\\*)([`*_–\-+[(:"])/g, function(m, p1, p2, p3, i) {
		if (i && !p1) return m;
		return p1 + (p2.length % 2 ? p2 : p2 + '\\') + p3;
	});
};

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
			dbcs.chatrooms.findOne({_id: tws.room = parseInt(i[1])}, function(err, room) {
				if (err) throw err;
				if (!room) return tws.trysend(JSON.stringify({
					event: 'err',
					body: 'Room not found.'
				}));
				tws.roomType = room.type;
				tws.isInvited = room.type == 'P' || room.invited.indexOf(tws.user.name) != -1;
				if (room.type == 'N' && room.invited.indexOf(user.name) == -1) return tws.trysend(JSON.stringify({
					event: 'err',
					body: 'You have not been invited to this private room.'
				}));
				if (room.type == 'M' && user.level != 5) return tws.trysend(JSON.stringify({
					event: 'err',
					body: 'You must be a moderator to join this room.'
				}));
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
							if (rem.result.n) {
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
						if (!tws.isInvited) return tws.trysend(JSON.stringify({
							event: 'err',
							body: 'You may not post in a non-public room unless you are invited.'
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
							var matches = (message.body + ' ').match(/@([a-zA-Z0-9-]{3,16})\W/g) || [];
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
						if (!tws.isInvited) return tws.trysend(JSON.stringify({
							event: 'err',
							body: 'You may not edit messages in a non-public room unless you are invited.'
						}));
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
							var changes = {
								$set: {reviewing: new Date().getTime()},
								$push: {
									flags: {
										body: message.body,
										time: new Date().getTime(),
										user: tws.user.name
									}
								}
							};
							if (post.deleted && !post.mod) changes['$set'].mod = 'Deleted';
							dbcs.chat.update({_id: post._id}, changes);
							tws.trysend(JSON.stringify({
								event: 'notice',
								body: 'Post #' + message.id + ' flagged.'
							}));
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
							dbcs.chat.update({_id: post._id}, {$set: {deleted: 1}});
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
							if (post.deleted > 1) return tws.trysend(JSON.stringify({
								event: 'err',
								body: 'You may undelete only messages that you have deleted.'
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
						if (!tws.user.name || tws.user.rep < 200 || !tws.isInvited) return tws.trysend(JSON.stringify({
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
			});
		} else if ((i = tws.upgradeReq.url.match(/\/dev\/(\d+)/))) {
			dbcs.programs.findOne({_id: tws.program = parseInt(i[1])}, function(err, program) {
				if (err) throw err;
				if (!program) return tws.trysend(JSON.stringify({
					event: 'err',
					body: 'Program not found.'
				}));
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
							var matches = (message.body + ' ').match(/@([a-zA-Z0-9-]{3,16})\W/g) || [];
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
							body: 'You must be logged in and have 20 reputation to vote on comments.'
						}));
						if (tws.user.rep < 20) return tws.trysend(JSON.stringify({
							event: 'err',
							body: 'You must have 20 reputation to vote on comments.'
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
							if (post.user == tws.user.name) return tws.trysend(JSON.stringify({
								event: 'err',
								body: 'You may not vote on your own comments.',
								commentUnvote: id
							}));
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
			});
		} else if ((i = tws.upgradeReq.url.match(/\/q\/(\d+)/))) {
			dbcs.questions.findOne({_id: tws.question = parseInt(i[1])}, function(err, question) {
				if (err) throw err;
				if (!question) return tws.trysend(JSON.stringify({
					event: 'err',
					body: 'Question not found.'
				}));
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
					if (message.event == 'q-edit') {
						if (!tws.user.name) return tws.trysend(JSON.stringify({
							event: 'err',
							body: 'You must be logged in and have level 3 moderator tools to edit posts.'
						}));
						if (tws.user.level < 3 && question.user != user.name) return tws.trysend(JSON.stringify({
							event: 'err',
							body: 'You must have level 3 moderator tools to edit posts other than your own.'
						}));
						if (!message.title || !message.lang || !message.description || !message.question || !message.type || !message.tags) return tws.trysend(JSON.stringify({
							event: 'err',
							body: 'Edit missing required fields.'
						}));
						if (!questionTypes.hasOwnProperty(message.type)) return tws.trysend(JSON.stringify({
							event: 'err',
							body: 'Invalid type parameter.'
						}));
						var tags = message.tags.split();
						for (var i = 0; i < tags.length; i++) {
							if (!(tags[i] = parseInt(tags[i]))) {
								res.writeHead(400);
								return res.end('Error: Invalid tag list.');
							}
						}
						dbcs.qtags.findOne({lang: message.lang}, function(err, tag) {
							if (err) throw err;
							if (!tag) {
								res.writeHead(400);
								return res.end('Error: Invalid language.');
							}
							dbcs.posthistory.insert({
								q: question._id,
								event: 'edit',
								user: tws.user.name,
								comment: message.comment.substr(0, 288),
								time: new Date().getTime(),
								title: question.title,
								lang: question.lang,
								description: question.description,
								question: question.question,
								code: question.code,
								type: question.type,
								tags: question.tags
							});
							dbcs.questions.update({_id: question._id}, {
								$set: {
									title: message.title.substr(0, 144),
									lang: message.lang,
									description: message.description,
									question: message.question.substr(0, 144),
									code: message.code,
									type: message.type,
									tags: tags
								}
							});
							var sendto = [];
							for (var i in wss.clients) {
								if (wss.clients[i].question == tws.question) sendto.push(wss.clients[i]);
							}
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
												tageditstr += '<label><input type="checkbox" id="tag' + tag._id + '"' + (question.tags.indexOf(tag._id) == -1 ? '' : ' checked=""') + ' /> ' + tag.name + '</label>';
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
											for (var i in sendto) sendto[i].trysend(JSON.stringify({
												event: 'q-edit',
												title: message.title.substr(0, 144),
												lang: message.lang,
												description: message.description,
												question: message.question.substr(0, 144),
												code: message.code,
												type: message.type,
												tags: tagstr,
												editTags: tageditstr,
												rawEditTags: question.tags.join()
											}));
										}
									});
								}
							});
						});
					} else if (message.event == 'comment') {
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
								question: tws.question
							});
							var sendto = [];
							for (var i in wss.clients) {
								if (wss.clients[i].question == tws.question && sendto.indexOf(wss.clients[i].user.name) == -1) sendto.push(wss.clients[i]);
							}
							for (var i in sendto) sendto[i].trysend(JSON.stringify({
								event: 'add',
								body: message.body,
								user: tws.user.name,
								id: id
							}));
							var matches = (message.body + ' ').match(/@([a-zA-Z0-9-]{3,16})\W/g) || [];
							for (var i in matches) matches[i] = matches[i].substr(1, matches[i].length - 2);
							dbcs.questions.findOne({_id: tws.question}, function(err, question) {
								if (err) throw err;
								if (matches.indexOf(question.user) == -1) matches.push(question.user);
								for (var i = 0; i < matches.length; i++) {
									if (matches[i] == tws.user.name) continue;
									dbcs.users.findOne({name: matches[i]}, function(err, user) {
										if (err) throw err;
										if (!user) return;
										dbcs.users.update({name: user.name}, {
											$push: {
												notifs: {
													type: 'Comment',
													on: question.title.link('/qa/' + tws.question + '#c' + id),
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
					} else if (message.event == 'c-vote') {
						if (!tws.user.name) return tws.trysend(JSON.stringify({
							event: 'err',
							body: 'You must be logged in and have 20 reputation to vote on comments.'
						}));
						if (tws.user.rep < 20) return tws.trysend(JSON.stringify({
							event: 'err',
							body: 'You must have 20 reputation to vote on comments.'
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
							if (post.user == tws.user.name) return tws.trysend(JSON.stringify({
								event: 'err',
								body: 'You may not vote on your own comments.',
								commentUnvote: id
							}));
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
								if (wss.clients[i].question == tws.question && sendto.indexOf(wss.clients[i].user.name) == -1) sendto.push(wss.clients[i]);
							}
							for (var i in sendto) sendto[i].trysend(JSON.stringify({
								event: 'scorechange',
								id: post._id,
								score: post.votes ? post.votes.length + 1 : 1
							}));
						});
					} else if (message.event == 'c-unvote') {
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
								if (wss.clients[i].question == tws.question && sendto.indexOf(wss.clients[i].user.name) == -1) sendto.push(wss.clients[i]);
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
			});
		} else tws.trysend(JSON.stringify({
			event: 'err',
			body: 'Invalid upgrade URL.'
		}));
	});
});
console.log('sockets.js running on port 81');