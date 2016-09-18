'use strict';
let fs = require('fs'),
	diff = require('diff'),
	Comment = require('../utility/comment.js'),
	Question = require('../utility/question.js');
function writeTagRecursive(tlang, tag, res) {
	res.write('<li id="' + tag._id + '">');
	res.write('<a class="small" href="#' + tag._id + '">#' + tag._id + '</a> ' + tag.name);
	tlang.splice(tlang.indexOf(tag), 1);
	res.write('<ul>');
	let i = -1;
	while (++i < tlang.length) {
		if (tlang[i].parentID == tag._id) {
			writeTagRecursive(tlang, tlang[i], res);
			i = -1;
		}
	}
	res.write('</ul>');
	res.write('</li>');
}
module.exports = o(function*(req, res, user) {
	let i;
	if (req.url.pathname == '/qa/') {
		yield respondPage(req.url.query.q ? 'Search' : '', user, req, res, yield);
		res.write('<h1>Questions <small><a href="ask" title="Requires login">New Question</a>' + (user.level >= 3 ? ' <line /> <a href="tags">Tags</a>' : '') + '</small></h1>');
		res.write('<form><input type="text" name="q" class="fullwidth" placeholder="Search Questions" value="' + html(req.url.query.q || '') + '" autofocus="" /></form>');
		let qQuery = {deleted: {$exists: false}};
		if (req.url.query.q) {
			let words = [], tags = [];
			req.url.query.q.split(/"/).forEach(function(chunk, i) {
				if (i % 2) return words.push(chunk);
				chunk.split(/\s+/).forEach(function(chunk) {
					let m = chunk.match(/^\[\[(\d+)\]\]$/);
					if (m) tags.push(parseInt(m[1]));
					else words.push(chunk);
				});
			});
			if (words.length) qQuery.$text = {$search: words.join(' ')};
			if (tags.length) qQuery.tags = {$all: tags};
		}
		let cursor = dbcs.questions.find(qQuery, qQuery.$text ? {score: {$meta: 'textScore'}} : {}).sort(qQuery.$text ? {score: {$meta: 'textScore'}} : {hotness: -1, time: -1}).limit(288),
			count = yield cursor.count(yield);
		res.write('<p><small>' + count + ' question' + (count == 1 ? '' : 's') + ' found.</small></p>');
		res.write('<div class="flexcont">');
		let qSummaryHandler = o(function*(err, question) {
			if (err) throw err;
			if (question) {
				res.write('<div class="question-preview">');
				res.write('<h2 class="title">' + Question.answerCount(question.answers) + ' <a href="' + question._id + '">' + html(question.lang) + ': ' + html(question.title) + '</a></h2>');
				res.write('<blockquote class="limited">' + markdown(question.description) + '</blockquote>');
				let tagstr = '';
				dbcs.qtags.find({_id: {$in: question.tags}}).each(function(err, tag) {
					if (err) throw err;
					if (tag) tagstr += '<a href="?q=%5B%5B' + tag._id + '%5D%5D" class="tag">' + tag.name + '</a> ';
					else {
						res.write('<p class="qlist-tags">' + tagstr + ' <span class="rit"><a href="/qa/' + question._id + '?history">asked <time datetime="' + new Date(question.time).toISOString() + '"></time></a> by <a href="/user/' + question.user + '">' + question.user + '</a></span></p>');
						res.write('</div>');
						cursor.nextObject(qSummaryHandler);
					}
				});
			} else res.end('</div>' + (yield fs.readFile('html/a/foot.html', yield)));
		});
		cursor.nextObject(qSummaryHandler);
	} else if (req.url.pathname == '/qa/tags') {
		yield respondPage('Tags', user, req, res, yield, {inhead: '<link rel="stylesheet" href="tags.css" />'});
		res.write(yield addVersionNonces((yield fs.readFile('./html/qa/tags.html', yield)).toString(), req.url.pathname, yield));
		let tlang = [],
			clang = '';
		dbcs.qtags.find().sort({lang: 1}).each(o(function*(err, tag) {
			if (err) throw err;
			if (tag && tag.lang == clang) return tlang.push(tag);
			if (!tag || clang) {
				res.write('<section id="lang-' + html(encodeURIComponent(clang)) + '">');
				res.write('<h2>' + html(clang) + '</h2>');
				res.write('<ul>');
				i = -1;
				while (++i < tlang.length) {
					if (!tlang[i].parentID) {
						writeTagRecursive(tlang, tlang[i], res);
						i = -1;
					}
				}
				res.write('</ul>');
				res.write('</section>');
			}
			if (tag) {
				clang = tag.lang;
				tlang = [tag];
			}
			else res.end(yield fs.readFile('html/a/foot.html', yield));
		}));
	} else if (req.url.pathname == '/qa/ask') {
		if (!user.name) return res.writeHead('303', {Location: '/login/?r=ask'}) || res.end();
		yield respondPage('New Question', user, req, res, yield, {inhead: '<link rel="stylesheet" href="ask.css" />'});
		res.write(
			(yield addVersionNonces((yield fs.readFile('./html/qa/ask.html', yield)).toString(), req.url.pathname, yield))
			.replace(
				'$langs', html(JSON.stringify(
					yield dbcs.qtags.distinct('lang', {parentName: {$exists: false}}, yield)
				))
			)
		);
		res.end(yield fs.readFile('html/a/foot.html', yield));
	} else if (i = req.url.pathname.match(/^\/qa\/([a-zA-Z\d_!@]+)$/)) {
		let question = yield dbcs.questions.findOne({_id: i[1]}, yield);
		if (!question) return errorNotFound(req, res, user);
		if (question.deleted) {
			yield respondPage('[Deleted]', user, req, res, yield, {inhead: '<script src="deleted-question.js"></script>'}, 404);
			if (question.deleted.by.length == 1 && question.deleted.by == question.user && question.user == user.name) {
				res.write('<h1>' + html(question.title) + '</h1>');
				res.write('<p>You deleted this <time datetime="' + new Date(question.deleted.time).toISOString() + '"></time>. ');
				res.write('<button id="undelete">Undelete…</button></p>');
			} else if (user.level >= 4) {
				let deletersstr = '',
					i = question.deleted.by.length;
				while (i--) {
					deletersstr += '<a href="/user/' + question.deleted.by[i] + '">' + question.deleted.by[i] + '</a>';
					if (i == 1) deletersstr += ', and ';
					else if (i) deletersstr += ', ';
				}
				res.write('<h1>' + html(question.title || 'Untitled') + ' by <a href="/user/' + question.user + '">' + question.user + '</a></h1>');
				res.write('<p>This question was deleted <time datetime="' + new Date(question.deleted.time).toISOString() + '"></time> by ' + deletersstr + '. ');
				res.write('<button id="undelete">Undelete…</button></p>');
			} else {
				res.write(
					'This question was deleted <time datetime="' + new Date(question.deleted.time).toISOString() + '"></time> ' +
					(
						question.deleted.by.length == 1 && question.deleted.by == question.user ?
							'voluntarily by its owner'
							: 'for moderation reasons'
					) +
					'.'
				);
			}
			return res.end(yield fs.readFile('html/a/foot.html', yield));
		}
		let history = typeof req.url.query.history == 'string',
			revcursor = dbcs.posthistory.find({question: question._id}).sort({time: -1}),
			revcount = yield revcursor.count(yield);
		yield respondPage(
			(history ? 'History of "' : question.lang + ': ') + question.title + (history ? '"' : ''),
			user, req, res, yield, {
				description: ((history ? revcount + ' revision' + (revcount == 1 ? '' : 's') + ': ' : '') + question.description).toMetaDescription(),
				inhead: '<link rel="stylesheet" href="question.css" />',
				pageType: 'Question'
			}
		);
		if (history) {
			res.write('<h1><a href="' + question._id + '">←</a> History of "' + html(question.title) + '"</h1>');
			res.write('<h2>Current Revision</h2>');
			res.write('<p class="indt">Owned by <strong><a href="/user/' + question.user + '">' + question.user + '</a></strong>.</p>');
			res.write('<article class="pad indt">');
			res.write('<h1 class="nomar">' + html(question.lang) + ': ' + html(question.title) + '</h1>');
			res.write('<h2>Body</h2> <code class="blk">' + html(question.description) + '</code>');
			res.write('<h2>Code</h2> <code class="blk">' + html(question.code) + '</code>');
			res.write('<h2>Core Question:</h2> <code class="blk">' + html(question.qquestion) + '\nType: ' + question.type + '</code>');
			res.write('<div class="umar">');
			let langTags = [];
			dbcs.qtags.find().each(function(err, tag) {
				if (err) throw err;
				if (tag) langTags[tag._id] = tag.name;
				else {
					let tagify = tag => '<a href="./?q=%5B%5B' + tag + '%5D%5D" class="tag">' + langTags[tag] + '</a>';
					for (let i = 0; i < question.tags.length; i++) res.write(tagify(question.tags[i]) + ' ');
					res.write('</div>');
					res.write('</article>');
					let revnum = 0,
						prev = question;
					revcursor.each(o(function*(err, item) {
						if (err) throw err;
						if (item) {
							res.write('<h2>Revision ' + (revcount - revnum) + ': ' + item.event + '</h2>');
							let deletersstr = '';
							if (item.user) deletersstr = '<a href="/user/' + item.user + '" target="_blank">' + item.user + '</a>';
							else if (item.by && (question.user == user.name || user.level >= 4)) {
								let i = item.by.length;
								while (i--) {
									deletersstr += '<a href="/user/' + item.by[i] + '">' + item.by[i] + '</a>';
									if (i == 1) deletersstr += ', and ';
									else if (i) deletersstr += ', ';
								}
							}
							res.write('<p class="indt"><time datetime="' + new Date(item.time).toISOString() + '"></time>' + (deletersstr ? ' by ' + deletersstr : '') + '</p>');
							if (item.event == 'edit') {
								let writeDiff = function(o, n) {
									let d = diff.diffWordsWithSpace(o, n);
									for (let i = 0; i < d.length; i++) {
										if (d[i].added) res.write('<ins>' + html(d[i].value) + '</ins>');
										else if (d[i].removed) res.write('<del>' + html(d[i].value) + '</del>');
										else res.write(html(d[i].value));
									}
								};
								res.write('<blockquote><i>' + inlineMarkdown(item.comment) + '</i></blockquote>');
								res.write('<article class="pad indt">');
								res.write('<h1 class="noumar">');
								writeDiff(item.lang + ': ' + item.title, prev.lang + ': ' + prev.title);
								res.write('</h1>');
								res.write(item.description == prev.description ? '<details>' : '<details open="">');
								res.write('<summary><h2>Body</h2></summary>');
								res.write('<code class="blk">');
								writeDiff(item.description, prev.description);
								res.write('</code>');
								res.write('</details>');
								res.write(item.code == prev.code ? '<details>' : '<details open="">');
								res.write('<summary><h2>Code</h2></summary>');
								res.write('<code class="blk">');
								writeDiff(item.code, prev.code);
								res.write('</code>');
								res.write('</details>');
								res.write('<h2>Core Question:</h2>');
								res.write('<code class="blk">');
								writeDiff(item.qquestion + '\nType: ' + item.type, prev.qquestion + '\nType: ' + prev.type);
								res.write('</code>');
								res.write('<div class="bumar tag-diff">');
								let d = diff.diffWords(item.tags.join(','), prev.tags.join(','));
								for (let i = 0; i < d.length; i++) {
									let t = d[i].value.split(',');
									for (let j = 0; j < t.length; j++) {
										if (!t[j]) continue;
										if (d[i].added) res.write('<ins>' + tagify(t[j]) + '</ins> ');
										else if (d[i].removed) res.write('<del>' + tagify(t[j]) + '</del> ');
										else res.write(tagify(t[j]) + ' ');
									}
								}
								res.write('</div>');
								res.write('</article>');
								prev = item;
							}
							revnum++;
						} else {
							res.write('<p>Originally posted <time datetime="' + new Date(question.time).toISOString() + '"></time>.</p>');
							res.end(yield fs.readFile('html/a/foot.html', yield));
						}
					}));
				}
			});
		} else {
			let vote = (yield dbcs.votes.findOne({
				user: user.name,
				question: question._id
			}, yield)) || {val: 0},
				op = yield dbcs.users.findOne({name: question.user}, yield),
				answerQuery = {question: question._id};
			if (!(user.level > 3 && question.user == user.name) && !(user.level > 4)) answerQuery['$or'] = [{deleted: {$exists: false}}, {user: user.name}];
			let cursor = dbcs.answers.find(answerQuery).sort({score: -1}),
				count = yield cursor.count(yield),
				answerTemplate = (yield fs.readFile('./html/qa/answer.html', yield)).toString(),
				answerstr = '<h2><span property="answerCount">' + count + '</span> Answer' + (count == 1 ? '' : 's') + '</h2>',
				answerNum = 0;
			let answerHandler = o(function*(err, answer) {
				if (err) throw err;
				if (answer) {
					answerNum++;
					let answerVote = (yield dbcs.votes.findOne({
						user: user.name,
						answer: answer._id
					}, yield)) || {val: 0},
						answerPoster = yield dbcs.users.findOne({name: answer.user}, yield);
					let acstring = '';
					dbcs.comments.find({answer: answer._id}).sort({_id: 1}).each(o(function*(err, comment) {
						if (err) throw err;
						if (comment) acstring += new Comment(comment).toString(user);
						else {
							answerstr +=
								answerTemplate
								.replace(' class=""', answer.deleted ? ' class="deleted"' : ' class=""')
								.replace('suggestedAnswer', answerNum == 1 && answer.score > 1 ? 'suggestedAnswer acceptedAnswer' : 'suggestedAnswer')
								.replace('edit-pending-notice', (
									yield dbcs.posthistory.findOne({
										answer: answer._id,
										event: 'edit-suggestion',
										user: user.name,
										reviewing: {$exists: true}
									}, yield)
								) ? 'edit-pending-notice' : 'edit-pending-notice" hidden="')
								.replace('edit-notice', user.level >= 3 || user.name == answer.user ? 'edit-notice" hidden="' : 'edit-notice')
								.replace(answerVote.val ? (answerVote.val == 1 ? '"blk up"' : '"blk dn"') : 'nomatch', (answerVote.val ? (answerVote.val == 1 ? '"blk up clkd"' : '"blk dn clkd"') : 'nomatch'))
								.replaceAll(
									['$id', '$user', '$op-rep', '$op-pic'],
									[answer._id.toString(), answer.user, answerPoster.rep.toString(), answerPoster.pic]
								).replace('$body-html', html(answer.body)).replace('$body-markdown', markdown(answer.body))
								.replace('$time', new Date(answer.time).toISOString())
								.replace('$commentstr', acstring);
							cursor.nextObject(answerHandler);
						}
					}));
				} else {
					let commentstr = '';
					dbcs.comments.find({
						question: question._id,
						answer: {$exists: false}
					}).sort({_id: 1}).each(function(err, comment) {
						if (err) throw err;
						if (comment) commentstr += new Comment(comment).toString(user);
						else {
							let tagstr = '',
								tlang = [],
								tageditstr = '';
							dbcs.qtags.find({lang: question.lang}).each(o(function*(err, tag) {
								if (err) throw err;
								if (tag) {
									tlang.push(tag);
									if (question.tags.includes(tag._id)) tagstr += '<a href="./?q=%5B%5B' + tag._id + '%5D%5D" class="tag">' + tag.name + '</a> ';
								} else {
									let writeFormTagRecursive = function(tag) {
										tageditstr += '<label><input type="checkbox" id="tag' + tag._id + '"' + (question.tags.includes(tag._id) ? ' checked=""' : '') + ' /> ' + tag.name + '</label>';
										tlang.splice(tlang.indexOf(tag), 1);
										tageditstr += '<div class="indt">';
										let i = -1;
										while (++i < tlang.length) {
											if (tlang[i].parentID == tag._id) {
												writeFormTagRecursive(tlang[i]);
												i = -1;
											}
										}
										tageditstr += '</div>';
									};
									let i = -1;
									while (++i < tlang.length) {
										if (!tlang[i].parentID) {
											writeFormTagRecursive(tlang[i]);
											i = -1;
										}
									}
									res.write(
										(yield addVersionNonces((yield fs.readFile('./html/qa/question.html', yield)).toString(), req.url.pathname, yield))
										.replace('$langs', JSON.stringify(yield dbcs.qtags.distinct('lang', {parentName: {$exists: false}}, yield)))
										.replace(revcount ? '$revcount' : ' ($revcount)', revcount || '')
										.replace('id="addcomment"', 'id="addcomment"' + (user.rep >= 50 ? '' : ' hidden=""'))
										.replace('edit-pending-notice', (
											yield dbcs.posthistory.findOne({
												question: question._id,
												event: 'edit-suggestion',
												user: user.name,
												reviewing: {$exists: true}
											}, yield)
										) ? 'edit-pending-notice' : 'edit-pending-notice" hidden="')
										.replace('edit-notice', user.level >= 3 || user.name == question.user ? 'edit-notice" hidden="' : 'edit-notice')
										.replace(vote.val ? (vote.val == 1 ? 'up" id="q-up"' : 'dn" id="q-dn"') : 'nomatch', (vote.val ? (vote.val == 1 ? 'up clkd" id="q-up"' : 'dn clkd" id="q-dn"') : 'nomatch'))
										.replaceAll(
											['$id', '$title', '$lang', '$rawdesc', '$rawq', '$code', '$type'],
											[question._id.toString(), html(question.title), html(question.lang), html(question.description), html(question.qquestion), html(question.code), question.type]
										).replaceAll(
											['$description', '$question'],
											[markdown(question.description), inlineMarkdown(question.qquestion)]
										).replaceAll(
											['$edit-tags', '$raw-edit-tags'],
											[tageditstr, question.tags.join(',')]
										).replace('option value="' + question.type + '"', 'option value="' + question.type + '" selected=""').replaceAll(
											['$qcommentstr', '$answers', '$tags', '$rep'],
											[commentstr, answerstr, tagstr, (user.rep || 0).toString()]
										).replaceAll(
											['$askdate', '$op-name', '$op-rep', '$op-pic'],
											[new Date(question.time).toISOString(), op.name, op.rep.toString(), op.pic]
										).replace('id="mdl"', user.name == op.name ? 'id="mdl"' : 'id="mdl" hidden=""')
										.replace('<form id="answerform"', user.name ? '<form id="answerform"' : 'You must be <a href="/login/" title="Log in">logged in</a> to answer questions. <form hidden="" id="answerform"')
									);
									res.end(yield fs.readFile('html/a/foot.html', yield));
								}
							}));
						}
					});
				}
			});
			cursor.nextObject(answerHandler);
		}
	} else errorNotFound(req, res, user);
});