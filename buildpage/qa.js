'use strict';
var fs = require('fs'),
	diff = require('diff');
function writeTagRecursive(tlang, tag, res) {
	res.write('<li id="' + tag._id + '">');
	res.write('<a class="small" href="#' + tag._id + '">#' + tag._id + '</a> ' + tag.name);
	tlang.splice(tlang.indexOf(tag), 1);
	res.write('<ul>');
	var i = -1;
	while (++i < tlang.length) {
		if (tlang[i].parentID == tag._id) {
			writeTagRecursive(tlang, tlang[i], res);
			i = -1;
		}
	}
	res.write('</ul>');
	res.write('</li>');
}
module.exports = function(req, res, user) {
	var i;
	if (req.url.pathname == '/qa/') {
		respondPage('', user, req, res, function() {
			res.write('<h1>Questions <small><a href="ask" title="Requires login">New Question</a>' + (user.level >= 3 ? ' <line /> <a href="tags">Tags</a>' : '') + '</small></h1>');
			dbcs.questions.find().each(function(err, doc) {
				if (err) throw err;
				if (doc) res.write('<h2 class="title"><a href="' + doc._id + '">' + html(doc.title) + '</a></h2>');
				else respondPageFooter(res);
			});
		});
	} else if (req.url.pathname == '/qa/tags') {
		respondPage('Tags', user, req, res, function() {
			fs.readFile('./html/qa/tags.html', function(err, data) {
				if (err) throw err;
				res.write(data);
				var tlang = [],
					clang = '';
				dbcs.qtags.find().sort({lang: 1}).each(function(err, tag) {
					if (err) throw err;
					if (tag) {
						if (tag.lang == clang) tlang.push(tag);
						else {
							if (clang) {
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
							clang = tag.lang;
							tlang = [tag];
						}
					} else {
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
						respondPageFooter(res);
					}
				});
			});
		});
	} else if (req.url.pathname == '/qa/ask') {
		if (!user.name) {
			res.writeHead('303', {Location: '/login/?r=ask'});
			return res.end();
		}
		respondPage('New Question', user, req, res, function() {
			fs.readFile('./html/qa/ask.html', function(err, data) {
				if (err) throw err;
				dbcs.qtags.distinct('lang', {parentName: {$exists: false}}, function(err, langs) {
					if (err) throw err;
					res.write(data.toString().replace('$langs', JSON.stringify(langs)));
					respondPageFooter(res);
				});
			});
		});
	} else if (i = req.url.pathname.match(/^\/qa\/(\d+)$/)) {
		dbcs.questions.findOne({_id: parseInt(i[1])}, function(err, question) {
			if (err) throw err;
			if (!question) return errorNotFound[404](req, res, user);
			var history = typeof req.url.query.history == 'string';
			respondPage((history ? 'History of "' : html(question.lang) + ': ') + html(question.title) + (history ? '"' : ''), user, req, res, function() {
				var revcursor = dbcs.posthistory.find({q: question._id});
				revcursor.sort({time: -1}).count(function(err, revcount) {
					if (err) throw err;
					if (history) {
						res.write('<h1><a href="' + question._id + '">←</a> History of "' + html(question.title) + '"</h1>');
						res.write('<h2>Current Revision</h2>');
						res.write('<p class="indt">Owned by <strong><a href="/user/' + question.user + '">' + question.user + '</a></strong>.</p>');
						res.write('<article class="pad indt">');
						res.write('<h1 class="nomar">' + question.lang + ': ' + question.title + '</h1>');
						res.write('<h2>Body</h2> <code class="blk">' + html(question.description) + '</code>');
						res.write('<h2>Code</h2> <code class="blk">' + html(question.code) + '</code>');
						res.write('<h2>Core Question:</h2> <code class="blk">' + html(question.question) + 'Type: ' + question.type + '</code>');
						res.write('<div class="umar">');
						var langTags = [];
						dbcs.qtags.find().each(function(err, tag) {
							if (err) throw err;
							if (tag) langTags[tag._id] = tag.name;
							else {
								var tagify = function(tag) {
									return '<a href="search?q=[[' + tag + ']]" class="tag">' + langTags[tag] + '</a>';
								};
								for (var i = 0; i < question.tags.length; i++) res.write(tagify(question.tags[i]));
								res.write('</div>');
								res.write('</article>');
								var revnum = 0,
									prev = question;
								revcursor.each(function(err, item) {
									if (err) throw err;
									if (item) {
										res.write('<h2>Revision ' + (revcount - revnum) + ': ' + item.event + '</h2>');
										res.write('<p class="indt">Replaced <time datetime="' + new Date(item.time).toISOString() + '"></time></p>');
										if (item.event == 'edit') {
											var writeDiff = function(o, n) {
												var d = diff.diffWordsWithSpace(o, n);
												for (var i = 0; i < d.length; i++) {
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
											if (revnum) res.write(prev.description);
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
											writeDiff(item.question + 'Type: ' + item.type, prev.question + 'Type: ' + prev.type);
											res.write('</code>');
											res.write('<div class="bumar">');
											var d = diff.diffWords(item.tags.join(), prev.tags.join());
											for (var i = 0; i < d.length; i++) {
												var t = d[i].value.split(',');
												for (var j = 0; j < t.length; j++) {
													if (d[i].added) res.write('<ins>' + tagify(t[j]) + '</ins>');
													else if (d[i].removed) res.write('<del>' + tagify(t[j]) + '</del>');
													else res.write(tagify(t[j]));
												}
											}
											res.write('</div>');
											res.write('</article>');
											prev = item;
										} else res.write('<p class="red">Unknown event.</p>');
										revnum++;
									} else respondPageFooter(res);
								});
							}
						});
						return;
					}
					dbcs.users.findOne({name: question.user}, function(err, op) {
						if (err) throw err;
						var answerstr = '';
						var cursor = dbcs.answers.find({question: question._id}).sort({score: -1});
						cursor.count(function(err, count) {
							if (err) throw err;
							answerstr = '<h2>' + count + ' Answer' + (count == 1 ? '' : 's') + '</h2>';
							var answerHandler = function(err, answer) {
								if (err) throw err;
								if (answer) {
									dbcs.users.findOne({name: answer.user}, function(err, answerPoster) {
										if (err) throw err;
										answerstr += (
											'<div id="a' + answer._id + '" class="answer hglt pad br">' +
												'<div class="ctrl pad lft">' +
													'<a class="up" title="This answers the question well."><svg class="blk up" xmlns="http://www.w3.org/2000/svg"><polygon points="10,1 1,19 19,19" /></svg></a>' +
													'<a class="dn" title="This is not useful."><svg class="blk dn" xmlns="http://www.w3.org/2000/svg"><polygon points="10,19 1,1 19,1" /></svg></a>' +
													'<a class="fl" title="This answer has an issue that needs to be addressed."><svg class="blk fl" xmlns="http://www.w3.org/2000/svg"><polygon points="1,1 19,1 19,11 5,11 5,23 1,23" /></svg></a>' +
													'<a class="ctrlicon editbtn" href="#edit-' + answer._id + '" title="Edit">✎</a>' +
													'<a class="ctrlicon delbtn" title="Delete">✕</a>' +
												'</div>' +
												'<div class="a-content">' +
													'<div class="a-body">' + markdown(answer.body) + '</div>' +
													'<div class="clearfix">' +
														'<div class="rit">' +
															'<div>Answered <time datetime="' + new Date(answer.time).toISOString() + '"></time> by</div>' +
															'<div class="user user-' + answer.user + '">' +
																'<img src="//gravatar.com/avatar/' + answerPoster.mailhash + '?s=576&amp;d=identicon" width="40" height="40" />' +
																'<div>' +
																	'<a href="/user/' + answer.user + '">' + answer.user + '</a>' +
																	'<small class="rep">' + answerPoster.rep + '</small>' +
																'</div>' +
															'</div>' +
														'</div>' +
														'<small class="blk sumar lft"><a href="#' + answer._id + '" class="grey" title="Permalink">#</a> <line /> <a href="?history=' + answer._id + '" class="grey">History</a></small>' +
													'</div>' +
												'</div>' +
												'<form class="a-edit indt" hidden="">' +
													'<textarea rows="24">' + html(answer.body) + '</textarea>' +
													'<div>' +
														'<button type="submit">Submit Edit</button>' +
														'<button type="reset" class="cancel-edit">Cancel</button>' +
													'</div>' +
												'</form>' +
											'</div>'
										);
										cursor.nextObject(answerHandler);
									});
								} else {
									var commentstr = '';
									dbcs.comments.find({question: question._id}).sort({_id: 1}).each(function(err, comment) {
										if (err) throw err;
										if (comment) {
											var votes = comment.votes || [],
												voted;
											for (var i in votes) if (votes[i].user == user.name) voted = true;
											var commentBody = markdown(comment.body),
												endTagsLength = (commentBody.match(/(<\/((?!blockquote).)+?>)+$/) || [{length: 0}])[0].length;
											commentBody = commentBody.substring(0, commentBody.length - endTagsLength) +
												'<span class="c-sig">' +
													'-<a href="/user/' + comment.user + '">' + comment.user + '</a>,' +
													' <a href="#c' + comment._id + '" title="Permalink"><time datetime="' + new Date(comment.time).toISOString() + '"></time></a>' +
												'</span>' +
												commentBody.substring(commentBody.length - endTagsLength);
											commentstr +=
												'<div id="c' + comment._id + '" class="comment">' +
												'<span class="score" data-score="' + (comment.votes || []).length + '">' + (comment.votes || []).length + '</span> ' +
												(
													user.rep >= 50 ?
													(
														'<span class="sctrls">' +
															'<svg class="up' + (voted ? ' clkd' : '') + '" xmlns="http://www.w3.org/2000/svg"><polygon points="7,-1 0,11 5,11 5,16 9,16 9,11 14,11" /></svg>' +
															'<svg class="fl" xmlns="http://www.w3.org/2000/svg"><polygon points="0,0 13,0 13,8 4,8 4,16 0,16" /></svg>' +
														'</span>'
													) :
													''
												) + commentBody + '</div>';
										} else {
											fs.readFile('./html/qa/question.html', function(err, data) {
												if (err) throw err;
												var tagstr = '';
												dbcs.qtags.find({_id: {$in: question.tags}}).sort({_id: 1}).each(function(err, tag) {
													if (err) throw err;
													if (tag) tagstr += '<a href="search?q=[[' + tag._id + ']]" class="tag">' + tag.name + '</a> ';
													else {
														var tlang = [],
															tageditstr = '';
														dbcs.qtags.find({lang: question.lang}).each(function(err, tag) {
															if (err) throw err;
															if (tag) tlang.push(tag);
															else {
																var writeFormTagRecursive = function(tag) {
																	tageditstr += '<label><input type="checkbox" id="tag' + tag._id + '"' + (question.tags.indexOf(tag._id) == -1 ? '' : ' checked=""') + ' /> ' + tag.name + '</label>';
																	tlang.splice(tlang.indexOf(tag), 1);
																	tageditstr += '<div class="indt">';
																	var i = -1;
																	while (++i < tlang.length) {
																		if (tlang[i].parentID == tag._id) {
																			writeFormTagRecursive(tlang[i]);
																			i = -1;
																		}
																	}
																	tageditstr += '</div>';
																};
																var i = -1;
																while (++i < tlang.length) {
																	if (!tlang[i].parentID) {
																		writeFormTagRecursive(tlang[i]);
																		i = -1;
																	}
																}
																dbcs.qtags.distinct('lang', {parentName: {$exists: false}}, function(err, langs) {
																	if (err) throw err;
																	res.write(data.toString()
																		.replace('$langs', JSON.stringify(langs))
																		.replace(revcount ? '$revcount': ' ($revcount)', revcount || '')
																		.replaceAll(
																			['$id', '$title', '$lang', '$rawdesc', '$rawq', '$code', '$type'],
																			[question._id.toString(), html(question.title), html(question.lang), html(question.description), html(question.question), html(question.code), question.type]
																		).replaceAll(
																			['$description', '$question'],
																			[markdown(question.description), inlineMarkdown(question.question)]
																		).replaceAll(
																			['$edit-tags', '$raw-edit-tags'],
																			[tageditstr, question.tags.join()]
																		).replace('option value="' + question.type + '"', 'option value="' + question.type + '" selected=""').replaceAll(
																			['$qcommentstr', '$answers', '$tags', '$rep'],
																			[commentstr, answerstr, tagstr, (user.rep || 0).toString()]
																		).replaceAll(
																			['$askdate', '$op-name', '$op-rep', '$op-pic'],
																			[new Date(question.time).toISOString(), op.name, op.rep.toString(), '//gravatar.com/avatar/' + op.mailhash + '?s=576&amp;d=identicon']
																		).replace('id="mdl"', user.name == op.name ? 'id="mdl"' : 'id="mdl" hidden=""')
																	);
																	respondPageFooter(res);
																});
															}
														});
													}
												});
											});
										}
									});
								}
							};
							cursor.nextObject(answerHandler);
						});
					});
				});
			});
		});
	} else errorNotFound(req, res, user);
};