'use strict';
let ws = require('ws'),
	cookie = require('cookie'),
	chatSocket = require('./socket/chat-socket.js'),
	testSocket = require('./socket/test-socket.js'),
	programSocket = require('./socket/program-socket.js'),
	questionSocket = require('./socket/question-socket.js');

module.exports = {};
module.exports.init = function(server) {
	let wss = new ws.Server({server});
	wss.on('connection', o(function*(tws, upgradeReq) {
		tws.upgradeReq = upgradeReq;
		console.log('SOCKET CONNECT ' + tws.upgradeReq.url);
		let i;
		let user = yield dbcs.users.findOne({
			cookie: {
				$elemMatch: {
					token: cookie.parse(tws.upgradeReq.headers.cookie || '').id,
					created: {$gt: new Date().getTime() - 2592000000}
				}
			}
		}, yield);
		if (!user) user = {};
		tws.user = user;
		tws.trysend = function(msg) {
			try {
				tws.send(msg, (err) => {});
			} catch (e) {}
		};
		tws.sendj = function(msg) {
			tws.trysend(JSON.stringify(msg));
		};
		tws.sendError = function(error, options) {
			let obj = {event: 'err', body: error};
			for (let n in options) obj[n] = options[n];
			tws.sendj(obj);
		};
		if (tws.upgradeReq.url == '/test') {
			testSocket(tws, wss);
		} else if ((i = tws.upgradeReq.url.match(/\/chat\/([a-zA-Z\d_!@]+)/))) {
			chatSocket(tws, wss, i);
		} else if ((i = tws.upgradeReq.url.match(/\/dev\/([a-zA-Z\d_!@]+)/))) {
			programSocket(tws, wss, i);
		} else if ((i = tws.upgradeReq.url.match(/\/q\/([a-zA-Z\d_!@]+)/))) {
			questionSocket(tws, wss, i);
		} else tws.sendError('Invalid upgradeReq URL.');
	}));
};
module.exports.util = {
	commentEdit: o(function*(message, tws, cb) {
		let post = yield dbcs.comments.findOne({_id: message.id}, yield);
		if (!post) return tws.sendError('Comment not found.');
		if (post.user != tws.user.name) return tws.sendError('You may edit only your own comments.');
		if (post.body == message.body) return;
		dbcs.commenthistory.insert({
			message: post._id,
			event: 'edit',
			time: new Date().getTime(),
			body: post.body
		});
		dbcs.comments.update({_id: post._id}, {$set: {body: message.body}});
		cb(null, JSON.stringify({
			event: 'comment-edit',
			id: post._id,
			body: message.body
		}));
	}),
	commentVote: o(function*(message, tws, cb) {
		if (!tws.user.name) return tws.sendError('You must be logged in and have 20 reputation to vote on comments.');
		if (tws.user.rep < 20) return tws.sendError('You must have 20 reputation to vote on comments.');
		let id = message.id.toString(),
			post = yield dbcs.comments.findOne({
				_id: id,
				deleted: {$exists: false}
			}, yield);
		if (!post) return tws.sendError('Invalid comment id.');
		for (let i in post.votes) {
			if (post.votes[i].user == tws.user.name) return tws.sendError('You already voted on this comment.');
		}
		if (post.user == tws.user.name) return tws.sendError('You may not vote on your own comments.', {commentUnvote: id});
		dbcs.comments.update({_id: id}, {
			$push: {
				votes: {
					user: tws.user.name,
					time: new Date().getTime()
				}
			}
		});
		cb(null, JSON.stringify({
			event: 'comment-scorechange',
			id: post._id,
			score: post.votes ? post.votes.length + 1 : 1
		}));
	}),
	commentUnvote: o(function*(message, tws, cb) {
		if (!tws.user.name) return tws.sendError('You must be logged in to vote on comments.');
		let id = message.id.toString(),
			post = yield dbcs.comments.findOne({
				_id: id,
				deleted: {$exists: false}
			}, yield);
		if (!post) return tws.sendError('Invalid comment id.');
		let err = true;
		for (let i in post.votes) {
			if (post.votes[i].user == tws.user.name) err = false;
		}
		if (err) return tws.sendError('You haven\'t voted on this comment.');
		dbcs.comments.update({_id: id}, {$pull: {votes: {user: tws.user.name}}});
		cb(null, JSON.stringify({
			event: 'comment-scorechange',
			id: post._id,
			score: post.votes.length - 1
		}));
	}),
	commentDelete: o(function*(message, tws, cb) {
		let post = yield dbcs.comments.findOne({_id: message.id}, yield);
		if (!post) return tws.sendError('Comment not found.');
		if (post.user != tws.user.name) return tws.sendError('You may delete only your own comments.');
		dbcs.commenthistory.insert({
			message: post._id,
			event: 'delete',
			time: new Date().getTime(),
			by: [tws.user.name]
		});
		dbcs.comments.update({_id: post._id}, {$set: {deleted: 1}});
		cb(null, JSON.stringify({
			event: 'comment-delete',
			id: post._id
		}));
	}),
	commentUndelete: o(function*(message, tws, cb) {
		let post = yield dbcs.comments.findOne({_id: message.id}, yield);
		if (!post) return tws.sendError('Comment not found.');
		if (post.user != tws.user.name) return tws.sendError('You may undelete only your own comments.');
		dbcs.commenthistory.insert({
			message: post._id,
			event: 'undelete',
			time: new Date().getTime(),
			by: [tws.user.name]
		});
		dbcs.comments.update({_id: post._id}, {$unset: {deleted: 1}});
		cb(null, JSON.stringify({
			event: 'comment-undelete',
			id: post._id,
			body: post.body,
			user: post.user,
			time: post.time
		}));
	})
};