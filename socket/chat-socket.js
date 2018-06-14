'use strict';

function markdownEscape(input) {
	return input.replace(/([^\\]?)(\\*)([`*_–\-+[(:"])/g, function(m, p1, p2, p3, i) {
		if (i && !p1) return m;
		return p1 + (p2.length % 2 ? p2 : p2 + '\\') + p3;
	});
}
module.exports = o(function*(tws, wss, i) {
	let room = yield dbcs.chatrooms.findOne({_id: tws.room = i[1]}, yield);
	if (!room) return tws.sendError('Room not found.');
	tws.roomType = room.type;
	tws.isInvited = room.type == 'P' || room.invited.includes(tws.user.name);
	if (room.type == 'N' && !room.invited.includes(tws.user.name)) return tws.sendError('You have not been invited to this private room.');
	if (room.type == 'M' && (!tws.user.name || tws.user.level < 5)) return tws.sendError('You must be a level 5 moderator to join this room.');
	let count = yield dbcs.chat.find({
		room: tws.room,
		$or: [
			{deleted: {$exists: false}},
			{user: tws.user.name}
		]
	}).count(yield),
		after = yield dbcs.chat.find({
			room: tws.room,
			$or: [
				{deleted: {$exists: false}},
				{user: tws.user.name}
			],
			_id: {$gt: i = parseInt(tws.upgradeReq.url.match(/\/chat\/([a-zA-Z\d_!@]+)(\/(\d+))?/)[3]) || 0}
		}).count(yield),
		ts = after > 92 && i,
		skip = Math.max(0, ts ? count - after - 18 : count - 92);
	tws.sendj({
		event: 'info-skipped',
		body: skip,
		ts
	});
	dbcs.chat.find({
		room: tws.room,
		$or: [
			{deleted: {$exists: false}},
			{user: tws.user.name}
		]
	}).sort({_id: -1}).skip(ts ? Math.max(0, after - 174) : 0).limit(ts ? 192 : 92).each(function(err, doc) {
		if (err) throw err;
		if (doc) {
			tws.sendj({
				event: 'init',
				id: doc._id,
				body: doc.body,
				user: doc.user,
				time: doc.time,
				stars: doc.stars,
				deleted: doc.deleted
			});
			dbcs.chatstars.findOne({
				pid: doc._id,
				user: tws.user.name
			}, function(err, star) {
				if (err) throw err;
				if (star) tws.sendj({
					event: 'selfstar',
					id: star.pid
				});
			});
		} else {
			let pids = [],
				count = 0;
			dbcs.chatstars.find({room: tws.room}).sort({time: -1}).limit(24).each(function(err, star) {
				if (err) throw err;
				if (star) {
					if (!pids.includes(star.pid)) pids.push(star.pid);
				} else {
					dbcs.chat.find({
						_id: {$in: pids},
						deleted: {$exists: false}
					}).sort({_id: 1}).each(function(err, post) {
						if (err) throw err;
						if (post && post.stars > 1 && count < 12) {
							count++;
							tws.sendj({
								event: 'star',
								id: post._id,
								board: true,
								body: post.body,
								stars: post.stars,
								user: post.user,
								time: post.time
							});
						}
					});
					return tws.sendj({event: 'info-complete'});
				}
			});
		}
	});
	dbcs.chatusers.find({room: tws.room}).each(o(function*(err, doc) {
		if (err) throw err;
		if (doc) {
			tws.sendj({
				event: 'adduser',
				name: doc.name,
				state: doc.state
			});
		} else if (tws.user.name) {
			if ((yield dbcs.chatusers.remove({
				name: tws.user.name,
				room: tws.room
			}, {w: 1}, yield)).result.n) {
				tws.sendj({
					event: 'adduser',
					name: tws.user.name,
					state: 1
				});
			} else {
				let toSend = JSON.stringify({
					event: 'adduser',
					name: tws.user.name,
					state: 1
				});
				for (let i in wss.clients) {
					if (wss.clients[i].room == tws.room) wss.clients[i].trysend(toSend);
				}
			}
			dbcs.chatusers.insert({
				name: tws.user.name,
				room: tws.room,
				state: 1
			});
		}
	}));
	tws.on('message', o(function*(message, raw) {
		console.log(message);
		try {
			message = JSON.parse(message);
		} catch (e) {
			return tws.sendError('JSON error.');
		}
		if (message.event == 'post') {
			if (!tws.user.name) return tws.sendError('You must be logged in and have 30 reputation to chat.');
			if (tws.user.rep < 30) return tws.sendError('You must have 30 reputation to chat.');
			if (!tws.isInvited) return tws.sendError('You may not post in a non-public room unless you are invited.');
			if (!message.body) return tws.sendError('Message body not submitted.');
			message.body = message.body.toString();
			if (message.body.length > 2880) return tws.sendError('Chat message length may not exceed 2880 characters.');
			let id = ((yield dbcs.chat.find().sort({_id: -1}).limit(1).next(yield)) || {_id: 0})._id + 1;
			dbcs.chat.insert({
				_id: id,
				body: message.body,
				user: tws.user.name,
				time: new Date().getTime(),
				room: tws.room
			});
			let toSend = JSON.stringify({
				event: 'add',
				body: message.body,
				user: tws.user.name,
				id
			});
			for (let i in wss.clients) {
				if (wss.clients[i].room == tws.room) wss.clients[i].trysend(toSend);
			}
			let matches = (message.body + ' ').match(/@([a-zA-Z0-9-]{3,16})\W/g) || [],
				ping = o(function*(err, user) {
					if (err) throw err;
					if (!user) return;
					if (yield dbcs.chatusers.findOne({
						name: user.name,
						room: tws.room
					}, yield)) return;
					dbcs.users.update({name: user.name}, {
						$push: {
							notifs: {
								type: 'Chat message',
								on: (yield dbcs.chatrooms.findOne({_id: tws.room}, yield)).name.link('/chat/' + tws.room + '#' + id),
								body: message.body,
								from: tws.user.name,
								unread: true,
								time: new Date().getTime()
							}
						},
						$inc: {unread: 1}
					});
				});
			for (let i = 0; i < matches.length; i++) dbcs.users.findOne({name: matches[i].substr(1, matches[i].length - 2)}, ping);
		} else if (message.event == 'edit') {
			if (!tws.isInvited) return tws.sendError('You may not edit messages in a non-public room unless you are invited.');
			let post = yield dbcs.chat.findOne({_id: message.id}, yield);
			if (!post) return tws.sendError('Message not found.');
			if (post.user != tws.user.name) return tws.sendError('You may edit only your own messages.');
			if (post.body == message.body) return;
			dbcs.chathistory.insert({
				message: post._id,
				event: 'edit',
				time: new Date().getTime(),
				body: post.body
			});
			dbcs.chat.update({_id: post._id}, {$set: {body: message.body}});
			let toSend = JSON.stringify({
				event: 'edit',
				id: post._id,
				body: message.body
			});
			for (let i in wss.clients) {
				if (wss.clients[i].room == tws.room) wss.clients[i].trysend(toSend);
			}
		} else if (message.event == 'flag') {
			let post = yield dbcs.chat.findOne({_id: message.id}, yield);
			if (!post) return tws.sendError('Message not found.');
			if (!tws.user.name) return tws.sendError('You must be logged in and have 50 reputation to flag chat messages.');
			if (tws.user.rep < 50) return tws.sendError('You must have 50 reputation to flag chat messages.');
			if (!message.body) return tws.sendError('You must specify a flag description.');
			let changes = {
				$set: {reviewing: new Date().getTime()},
				$push: {
					flags: {
						body: message.body,
						time: new Date().getTime(),
						user: tws.user.name
					}
				}
			};
			if (post.deleted && !post.mod) changes.$set.mod = 'Deleted';
			dbcs.chat.update({_id: post._id}, changes);
			tws.sendj({
				event: 'notice',
				body: 'Post #' + message.id + ' flagged.'
			});
		} else if (message.event == 'delete') {
			let post = yield dbcs.chat.findOne({_id: message.id}, yield);
			if (!post) return tws.sendError('Message not found.');
			if (post.deleted) return tws.sendError('This message is already deleted.');
			if (post.user != tws.user.name) return tws.sendError('You may delete only your own messages.');
			dbcs.chathistory.insert({
				message: post._id,
				event: 'delete',
				time: new Date().getTime(),
				by: [tws.user.name]
			});
			dbcs.chat.update({_id: post._id}, {$set: {deleted: 1}});
			let toSend = JSON.stringify({
				event: 'delete',
				id: post._id
			});
			for (let i in wss.clients) {
				if (wss.clients[i].room == tws.room) wss.clients[i].trysend(toSend);
			}
		} else if (message.event == 'undelete') {
			let post = yield dbcs.chat.findOne({_id: message.id}, yield);
			if (!post) return tws.sendError('Message not found.');
			if (!post.deleted) return tws.sendError('This message isn\'t deleted.');
			if (post.user != tws.user.name) return tws.sendError('You may undelete only your own messages.');
			if (post.deleted > 1) return tws.sendError('You may undelete only messages that you have deleted.');
			dbcs.chathistory.insert({
				message: post._id,
				event: 'undelete',
				time: new Date().getTime(),
				by: [tws.user.name]
			});
			dbcs.chat.update({_id: post._id}, {$unset: {deleted: 1}});
			let toSend = JSON.stringify({
				event: 'undelete',
				id: post._id,
				body: post.body,
				user: post.user,
				time: post.time,
				stars: post.stars || 0
			});
			for (let i in wss.clients) {
				if (wss.clients[i].room == tws.room) wss.clients[i].trysend(toSend);
			}
		} else if (message.event == 'statechange') {
			if (tws.user.name) {
				dbcs.chatusers.update({
					name: tws.user.name,
					room: tws.room
				}, {$set: {state: message.state}}, {upsert: 1});
				let toSend = JSON.stringify({
					event: 'statechange',
					state: message.state,
					name: tws.user.name
				});
				for (let i in wss.clients) {
					if (wss.clients[i].room == tws.room) wss.clients[i].trysend(toSend);
				}
			}
		} else if (message.event == 'req') {
			message.skip = parseInt(message.skip);
			if (isNaN(message.skip) || message.skip < 0) return tws.sendError('Invalid skip value.');
			let cursor = dbcs.chat.find({
				room: tws.room,
				$or: [
					{deleted: {$exists: false}},
					{user: tws.user.name}
				]
			});
			cursor.sort({_id: 1}).skip(message.skip).limit(1).each(o(function*(err, doc) {
				if (err) throw err;
				if (!doc) return;
				tws.sendj({
					event: 'init',
					id: doc._id,
					body: doc.body,
					user: doc.user,
					deleted: doc.deleted,
					time: doc.time,
					stars: doc.stars
				});
				let star = yield dbcs.chatstars.findOne({
					pid: doc._id,
					user: tws.user.name
				}, yield);
				if (star) tws.sendj({
					event: 'selfstar',
					id: star.pid
				});
			}));
		} else if (message.event == 'star') {
			if (!tws.user.name) return tws.sendError('You must be logged in and have 30 reputation to star messages.');
			if (tws.user.rep < 30) return tws.sendError('You must have 30 reputation to star messages.');
			let id = parseInt(message.id),
				post = yield dbcs.chat.findOne({
					_id: id,
					deleted: {$exists: false}
				}, yield);
			if (!post) return tws.sendError('Invalid message id.');
			if (yield dbcs.chatstars.findOne({
				user: tws.user.name,
				pid: id
			}, yield)) return tws.sendError('You already stared this post.');
			if ((yield dbcs.chatstars.find({
				user: tws.user.name,
				time: {$gt: new Date().getTime() - 900000}
			}).count(yield)) > 3) return tws.sendj({
				event: 'err',
				body: 'You may star no more than 3 posts in 15 minutes.',
				revertStar: id
			});
			if ((yield dbcs.chatstars.find({
				user: tws.user.name,
				time: {$gt: new Date().getTime() - 7200000}
			}).count(yield)) > 8) return tws.sendj({
				event: 'err',
				body: 'You may star no more than 8 posts in 2 hours.',
				revertStar: id
			});
			if ((yield dbcs.chatstars.find({
				user: tws.user.name,
				time: {$gt: new Date().getTime() - 7200000},
				postowner: tws.user.name
			}).count(yield)) > 2) return tws.sendj({
				event: 'err',
				body: 'You may selfstar no more than 2 posts in 24 hours.',
				revertStar: id
			});
			dbcs.chatstars.insert({
				user: tws.user.name,
				pid: id,
				room: post.room,
				time: new Date().getTime(),
				postowner: post.user
			});
			dbcs.chat.update({_id: id}, {$inc: {stars: 1}});
			let toSend = JSON.stringify({
				event: 'star',
				id: post._id,
				body: post.body,
				stars: (post.stars || 0) + 1,
				user: post.user,
				time: post.time
			});
			for (let i in wss.clients) {
				if (wss.clients[i].room == tws.room) wss.clients[i].trysend(toSend);
			}
		} else if (message.event == 'unstar') {
			if (!tws.user.name) return tws.sendError('You must be logged in to unstar messages.');
			let id = parseInt(message.id);
			if (!(yield dbcs.chat.findOne({
				_id: id,
				deleted: {$exists: false}
			}, yield))) return tws.sendError('Invalid message id.');
			if (!(yield dbcs.chatstars.findOne({
				user: tws.user.name,
				pid: id
			}, yield))) return tws.sendError('You haven\'t stared this post.');
			dbcs.chatstars.remove({
				user: tws.user.name,
				pid: id
			});
			dbcs.chat.update({_id: id}, {$inc: {stars: -1}});
			let toSend = JSON.stringify({
				event: 'unstar',
				id
			});
			for (let i in wss.clients) {
				if (wss.clients[i].room == tws.room) wss.clients[i].trysend(toSend);
			}
		} else if (message.event == 'info-update') {
			if (!tws.user.name || tws.user.rep < 200 || !tws.isInvited) return tws.sendj({
				event: 'err',
				body: 'You don\'t have permission to update room information.',
				revertInfo: 1
			});
			dbcs.chatrooms.update({_id: tws.room}, {
				$set: {
					name: message.name,
					desc: message.desc
				}
			});
			let id = ((yield dbcs.chat.find().sort({_id: -1}).limit(1).next(yield)) || {_id: 0})._id + 1;
			let newMessage = 'Room description updated to ' + markdownEscape(message.name) + ': ' + message.desc;
			dbcs.chat.insert({
				_id: id,
				body: newMessage,
				user: tws.user.name,
				time: new Date().getTime(),
				room: tws.room
			});
			let toSendA = JSON.stringify({
				event: 'info-update',
				name: message.name,
				desc: message.desc,
				id
			}),
			toSendB = JSON.stringify({
				event: 'add',
				body: newMessage,
				user: tws.user.name,
				id
			});
			for (let i in wss.clients) {
				if (wss.clients[i].room == tws.room) {
					wss.clients[i].trysend(toSendA);
					wss.clients[i].trysend(toSendB);
				}
			}
		} else tws.sendError('Invalid event type.');
	}));
	tws.on('close', function() {
		let toSend = JSON.stringify({
			event: 'deluser',
			name: tws.user.name
		});
		for (let i in wss.clients) {
			if (wss.clients[i].room == tws.room) wss.clients[i].trysend(toSend);
		}
		dbcs.chatusers.remove({
			name: tws.user.name,
			room: tws.room
		});
	});
});