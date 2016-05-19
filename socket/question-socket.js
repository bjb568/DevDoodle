'use strict';
let socketUtil = require('../sockets.js').util;
module.exports = o(function*(tws, wss, i) {
	if (!(yield dbcs.questions.findOne({_id: tws.question = parseInt(i[1])}, yield))) return tws.trysend(JSON.stringify({
		event: 'err',
		body: 'Question not found.'
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
		if (message.event == 'q-edit') {
			let question = yield dbcs.questions.findOne({_id: tws.question}, yield);
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
			let tags = message.tags.split(',');
			for (let i = 0; i < tags.length; i++) {
				if (!(tags[i] = parseInt(tags[i]))) return tws.trysend(JSON.stringify({
					event: 'err',
					body: 'Invalid tag list.'
				}));
			}
			let tag = yield dbcs.qtags.findOne({lang: message.lang}, yield);
			if (!tag) return tws.trysend(JSON.stringify({
				event: 'err',
				body: 'Invalid language.'
			}));
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
					tags
				}
			});
			let tagstr = '';
			dbcs.qtags.find({_id: {$in: tags}}).sort({_id: 1}).each(function(err, tag) {
				if (err) throw err;
				if (tag) tagstr += '<a href="search/tag/' + tag._id + '" class="tag">' + tag.name + '</a> ';
				else {
					let tlang = [],
						tageditstr = '';
					dbcs.qtags.find({lang: question.lang}).each(function(err, tag) {
						if (err) throw err;
						if (tag) tlang.push(tag);
						else {
							let writeTagRecursive = function(tag) {
								tageditstr += '<label><input type="checkbox" id="tag' + tag._id + '"' + (question.tags.includes(tag._id) ? ' checked=""' : '') + ' /> ' + tag.name + '</label>';
								tlang.splice(tlang.indexOf(tag), 1);
								tageditstr += '<div class="indt">';
								i = -1;
								while (++i < tlang.length) {
									if (tlang[i].parentID == tag._id) {
										writeTagRecursive(tlang[i]);
										i = -1;
									}
								}
								tageditstr += '</div>';
							};
							i = -1;
							while (++i < tlang.length) {
								if (!tlang[i].parentID) {
									writeTagRecursive(tlang[i]);
									i = -1;
								}
							}
							let toSend = JSON.stringify({
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
							});
							for (let i in wss.clients) {
								if (wss.clients[i].question == tws.question) wss.clients[i].trysend(toSend);
							}
						}
					});
				}
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
			let id = ((yield dbcs.comments.find().sort({_id: -1}).limit(1).nextObject(yield)) || {_id: 0})._id + 1;
			let tcomment = {
				_id: id,
				body: message.body,
				user: tws.user.name,
				time: new Date().getTime(),
				question: tws.question
			};
			if (!isNaN(parseInt(message.answer))) tcomment.answer = parseInt(message.answer);
			dbcs.comments.insert(tcomment);
			for (let i in wss.clients) {
				if (wss.clients[i].question == tws.question) {
					wss.clients[i].trysend(JSON.stringify({
						event: 'comment-add',
						body: message.body,
						user: tws.user.name,
						answer: tcomment.answer,
						id
					}));
				}
			}
			let matches = (message.body + ' ').match(/@([a-zA-Z0-9-]{3,16})\W/g) || [];
			for (let i in matches) matches[i] = matches[i].substr(1, matches[i].length - 2);
			let question = yield dbcs.questions.findOne({_id: tws.question}, yield);
			if (tcomment.answer) {
				let answer = yield dbcs.answers.findOne({_id: tcomment.answer}, yield);
				if (!matches.includes(answer.user)) matches.push(answer.user);
			} else if (!matches.includes(question.user)) matches.push(question.user);
			for (let i = 0; i < matches.length; i++) {
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
		} else if (message.event == 'comment-edit') {
			let toSend = yield socketUtil.commentEdit(message, tws, yield);
			for (let i in wss.clients) {
				if (wss.clients[i].program == tws.program) wss.clients[i].trysend(toSend);
			}
		} else if (message.event == 'comment-vote') {
			let toSend = yield socketUtil.commentVote(message, tws, yield);
			for (let i in wss.clients) {
				if (wss.clients[i].question == tws.question) wss.clients[i].trysend(toSend);
			}
		} else if (message.event == 'comment-unvote') {
			let toSend = yield socketUtil.commentUnvote(message, tws, yield);
			for (let i in wss.clients) {
				if (wss.clients[i].question == tws.question) wss.clients[i].trysend(toSend);
			}
		} else if (message.event == 'comment-delete') {
			let toSend = yield socketUtil.commentDelete(message, tws, yield);
			for (let i in wss.clients) {
				if (wss.clients[i].question == tws.question) wss.clients[i].trysend(toSend);
			}
		} else if (message.event == 'comment-undelete') {
			let toSend = yield socketUtil.commentUndelete(message, tws, yield);
			for (let i in wss.clients) {
				if (wss.clients[i].question == tws.question) wss.clients[i].trysend(toSend);
			}
		} else tws.trysend(JSON.stringify({
			event: 'err',
			body: 'Invalid event type.'
		}));
	}));
});