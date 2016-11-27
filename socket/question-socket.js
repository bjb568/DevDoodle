'use strict';
let socketUtil = require('../sockets.js').util;
module.exports = o(function*(tws, wss, i) {
	if (!(yield dbcs.questions.findOne({_id: tws.question = i[1]}, yield))) return tws.sendError('Question not found.');
	tws.on('message', o(function*(message, raw) {
		console.log(message);
		try {
			message = JSON.parse(message);
		} catch (e) {
			return tws.sendError('JSON error.');
		}
		if (message.event == 'q-edit') {
			if (!tws.user.name) return tws.sendError('You must be logged in to edit posts.');
			let question = yield dbcs.questions.findOne({_id: tws.question}, yield);
			if (!message.title || !message.lang || !message.description || !message.qquestion || !message.type || !message.tags) return tws.sendError('Edit missing required fields.');
			if (message.description.toString().length < 144) return tws.sendError('Description must be at least 144 characters long.');
			if (!questionTypes.hasOwnProperty(message.type)) return tws.sendError('Invalid type parameter.');
			let tags = message.tags.split(',');
			for (let i = 0; i < tags.length; i++) {
				if (!(tags[i] = parseInt(tags[i]))) return tws.sendError('Invalid tag list.');
			}
			let tag = yield dbcs.qtags.findOne({lang: message.lang}, yield);
			if (!tag) return tws.sendError('Invalid language.');
			if (tws.user.level < 3 && question.user != tws.user.name) {
				dbcs.posthistory.insert({
					question: question._id,
					event: 'edit-suggestion',
					user: tws.user.name,
					reviewing: new Date().getTime(),
					comment: (message.comment || '').toString().substr(0, 288),
					time: new Date().getTime(),
					taskID: generateID(),
					proposedEdit: {
						title: message.title.substr(0, 144),
						lang: message.lang,
						description: message.description.toString(),
						qquestion: message.qquestion.toString().substr(0, 144),
						code: message.code.toString(),
						type: message.type,
						tags
					},
					title: question.title,
					lang: question.lang,
					description: question.description,
					qquestion: question.qquestion,
					code: question.code,
					type: question.type,
					tags: question.tags
				});
				let toSend = JSON.stringify({
					event: 'edit-suggestion',
					user: tws.user.name
				});
				for (let i in wss.clients) {
					if (wss.clients[i].question == tws.question) wss.clients[i].trysend(toSend);
				}
				return tws.sendj({event: 'edit-suggestion-received'});
			}
			dbcs.posthistory.insert({
				question: question._id,
				event: 'edit',
				user: tws.user.name,
				comment: (message.comment || '').toString().substr(0, 288),
				time: new Date().getTime(),
				title: question.title,
				lang: question.lang,
				description: question.description,
				qquestion: question.qquestion,
				code: question.code,
				type: question.type,
				tags: question.tags
			});
			dbcs.questions.update({_id: question._id}, {
				$set: {
					title: message.title.substr(0, 144),
					lang: message.lang,
					description: message.description.toString(),
					qquestion: message.qquestion.toString().substr(0, 144),
					code: message.code.toString(),
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
								qquestion: message.qquestion.substr(0, 144),
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
		} else if (message.event == 'answer-edit') {
			if (!tws.user.name) return tws.sendError('You must be logged in to edit posts.');
			let answer = yield dbcs.answers.findOne({_id: message.id}, yield);
			if (!answer) return tws.sendError('Invalid answer id.');
			if (tws.user.level < 3 && answer.user != tws.user.name) return tws.sendError('You must have level 3 moderator tools to edit posts other than your own.'); //TODO: add answer edit queue
			if (!message.body) return tws.sendError('Edit missing required fields.');
			if (message.body.toString().length < 144) return tws.sendError('Body must be at least 144 characters long.');
			dbcs.posthistory.insert({
				answer: answer._id,
				event: 'edit',
				user: tws.user.name,
				comment: (message.comment || '').toString().substr(0, 288),
				time: new Date().getTime(),
				body: answer.body.toString()
			});
			dbcs.answers.update({_id: answer._id}, {$set: {body: message.body.toString()}});
			let toSend = JSON.stringify({
				event: 'answer-edit',
				id: answer._id,
				body: message.body.toString()
			});
			for (let i in wss.clients) {
				if (wss.clients[i].question == tws.question) wss.clients[i].trysend(toSend);
			}
		} else if (message.event == 'answer-delete') {
			if (!tws.user.name) return tws.sendError('You must be logged in to delete answers.');
			let answer = yield dbcs.answers.findOne({_id: message.id}, yield);
			if (!answer) return tws.sendError('Invalid answer id.');
			if (answer.user != tws.user.name && tws.user.level < 4) return tws.sendError('You may delete only your own answers.');
			dbcs.posthistory.insert({
				answer: answer._id,
				event: 'delete',
				by: [tws.user.name],
				time: new Date().getTime()
			});
			dbcs.answers.update({_id: answer._id}, {
				$set: {
					deleted: {
						by: [tws.user.name],
						time: new Date().getTime()
					}
				}
			});
			dbcs.questions.update({_id: answer.question}, {$inc: {answers: -1}});
			for (let i in wss.clients) {
				if (wss.clients[i].question == tws.question) {
					wss.clients[i].sendj({
						event: 'answer-delete',
						id: answer._id
					});
				}
			}
		} else if (message.event == 'comment') {
			if (!tws.user.name) return tws.sendError('You must be logged in and have 20 reputation to comment.');
			if (tws.user.rep < 20) return tws.sendError('You must have 20 reputation to comment.');
			if (!message.body) return tws.sendError('Comment body not submitted.');
			message.body = message.body.toString();
			if (message.body.length > 720) return tws.sendError('Comment length may not exceed 720 characters.');
			let id = generateID();
			let tcomment = {
				_id: id,
				body: message.body,
				user: tws.user.name,
				time: new Date().getTime(),
				question: tws.question
			};
			tcomment.answer = (message.answer || '').toString();
			dbcs.comments.insert(tcomment);
			for (let i in wss.clients) {
				if (wss.clients[i].question == tws.question) {
					wss.clients[i].sendj({
						event: 'comment-add',
						body: message.body,
						user: tws.user.name,
						answer: tcomment.answer,
						id
					});
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
		} else tws.sendError('Invalid event type.');
	}));
});