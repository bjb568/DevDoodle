'use strict';
let socketUtil = require('../sockets.js').util;
module.exports = o(function*(tws, wss, i) {
	let program = yield dbcs.programs.findOne({_id: tws.program = i[1]}, yield);
	if (!program) return tws.trysend(JSON.stringify({
		event: 'err',
		body: 'Program not found.'
	}));
	tws.on('message', o(function*(message, raw) {
		console.log(message);
		try {
			message = JSON.parse(message);
		} catch (e) {
			return tws.trysend(JSON.stringify({
				event: 'err',
				body: 'JSON error.'
			}));
		}
		if (message.event == 'comment') {
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
			let id = generateID();
			dbcs.comments.insert({
				_id: id,
				body: message.body,
				user: tws.user.name,
				time: new Date().getTime(),
				program: tws.program
			});
			let toSend = JSON.stringify({
				event: 'comment-add',
				body: message.body,
				user: tws.user.name,
				id
			});
			for (let i in wss.clients) {
				if (wss.clients[i].program == tws.program) wss.clients[i].trysend(toSend);
			}
			let matches = (message.body + ' ').match(/@([a-zA-Z0-9-]{3,16})\W/g) || [];
			for (let i in matches) matches[i] = matches[i].substr(1, matches[i].length - 2);
			let program = yield dbcs.programs.findOne({_id: tws.program}, yield);
			if (!matches.includes(program.user)) matches.push(program.user);
			for (let i = 0; i < matches.length; i++) {
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
		} else if (message.event == 'comment-edit') {
			let toSend = yield socketUtil.commentEdit(message, tws, yield);
			for (let i in wss.clients) {
				if (wss.clients[i].program == tws.program) wss.clients[i].trysend(toSend);
			}
		} else if (message.event == 'comment-vote') {
			let toSend = yield socketUtil.commentVote(message, tws, yield);
			for (let i in wss.clients) {
				if (wss.clients[i].program == tws.program) wss.clients[i].trysend(toSend);
			}
		} else if (message.event == 'comment-unvote') {
			let toSend = yield socketUtil.commentUnvote(message, tws, yield);
			for (let i in wss.clients) {
				if (wss.clients[i].program == tws.program) wss.clients[i].trysend(toSend);
			}
		} else if (message.event == 'comment-delete') {
			let toSend = yield socketUtil.commentDelete(message, tws, yield);
			for (let i in wss.clients) {
				if (wss.clients[i].program == tws.program) wss.clients[i].trysend(toSend);
			}
		} else if (message.event == 'comment-undelete') {
			let toSend = yield socketUtil.commentUndelete(message, tws, yield);
			for (let i in wss.clients) {
				if (wss.clients[i].program == tws.program) wss.clients[i].trysend(toSend);
			}
		} else if (message.event == 'privitize') {
			if (typeof message.private != 'boolean') return tws.trysend(JSON.stringify({
				event: 'err',
				body: 'Invalid value for private.'
			}));
			dbcs.programs.update({_id: program._id}, {$set: {private: message.private}});
			let toSend = JSON.stringify({
				event: 'privitize',
				private: message.private
			});
			for (let i in wss.clients) {
				if (wss.clients[i].program == tws.program) wss.clients[i].trysend(toSend);
			}
		} else tws.trysend(JSON.stringify({
			event: 'err',
			body: 'Invalid event type.'
		}));
	}));
});