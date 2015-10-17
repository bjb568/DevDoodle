'use strict';
var fs = require('fs');
module.exports = function(req, res, user) {
	var i;
	if (req.url.pathname == '/dev/') {
		respondPage('', user, req, res, function() {
			res.write('<h1>Programs <small><a href="new/">New Program</a></small></h1>');
			dbcs.programs.find({deleted: {$exists: false}}).sort({hotness: -1, updated: -1}).limit(15).each(function(err, data) {
				if (err) throw err;
				if (data) {
					res.write('<div class="program">');
					res.write('<h2 class="title"><a href="' + data._id + '">' + html(data.title || 'Untitled') + '</a> <small>-<a href="/user/' + data.user + '">' + data.user + '</a></small></h2>');
					if (data.type == 1) res.write('<div><iframe sandbox="allow-scripts" class="canvas-program" data-code="' + html(data.code, true) + '"></iframe></div>');
					else if (data.type == 2) res.write('<div><iframe sandbox="allow-scripts" class="html-program" data-html="' + html(data.html, true) + '" data-css="' + html(data.css, true) + '" data-js="' + html(data.js, true) + '"></iframe></div>');
					res.write('</div> ');
				} else {
					res.write('<a href="search/" class="center-text blk">See more</a>');
					respondPageFooter(res);
				}
			});
		});
	} else if (req.url.pathname == '/dev/search/') {
		respondPage('Search', user, req, res, function() {
			var liststr = '',
				sort = (req.url.query || {}).sort || 'hot',
				sortDict = {
					default: {hotness: -1, recent: -1},
					votes: {score: -1, recent: -1},
					upvotes: {upvotes: -1, score: -1, hotness: -1, recent: -1},
					recent: {created: -1},
					update: {updated: -1}
				};
			dbcs.programs.find({deleted: {$exists: false}}).sort(sortDict[sort] || sortDict.default).limit(720).each(function(err, data) {
				if (err) throw err;
				if (data) liststr += '<li><a href="../' + data._id + '">' + html(data.title || 'Untitled') + '</a> by <a href="/user/' + data.user + '">' + data.user + '</a></li>';
				else {
					fs.readFile('./html/dev/search.html', function(err, data) {
						if (err) throw err;
						res.write(data.toString().replace('$list', liststr).replace('"' + sort + '"', '"' + sort + '" selected=""'));
						respondPageFooter(res);
					});
				}
			});
		});
	} else if (req.url.pathname == '/dev/new/canvas') {
		respondPage('Canvas Playground', user, req, res, function() {
			fs.readFile('./http/dev/canvas.js', function(err, canvasJS) {
				if (err) throw err;
				fs.readFile('./html/dev/canvas.html', function(err, data) {
					if (err) throw err;
					res.write(
						data.toString()
						.replace('$canvasjs', html(canvasJS))
						.replace(/<section id="meta">[^]+<\/section>/, '')
						.replaceAll(
							['$mine', '$id', '$op-name', '$rep', '$title', '$code'],
							['', '0', '', '0', 'New Program', req.url.query ? html(req.url.query.code || '') : '']
						)
					);
					respondPageFooter(res);
				});
			});
		}, {inhead: '<link rel="stylesheet" href="/dev/canvas.css" />'});
	} else if (req.url.pathname == '/dev/new/html') {
		respondPage('HTML Playground', user, req, res, function() {
			fs.readFile('./html/dev/html.html', function(err, data) {
				if (err) throw err;
				res.write(
					data.toString()
					.replace(/<section id="meta">[^]+<\/section>/, '')
					.replaceAll(
						['$id', '$title', '$html', '$css', '$js'],
						['', 'New Program', req.url.query ? html(req.url.query.html || '') : '', req.url.query ? html(req.url.query.css || '') : '', req.url.query ? html(req.url.query.js || '') : '']
					)
				);
				respondPageFooter(res);
			});
		}, {inhead: '<link rel="stylesheet" href="/dev/canvas.css" />'});
	} else if (i = req.url.pathname.match(/^\/dev\/(\d+)$/)) {
		dbcs.programs.findOne({_id: i = parseInt(i[1])}, function(err, program) {
			if (err) throw err;
			if (!program) return errorNotFound(req, res, user);
			if (program.deleted) {
				respondPage('[Deleted]', user, req, res, function() {
					if (program.deleted.by.length == 1 && program.deleted.by == program.user && program.user == user.name) {
						res.write('<h1>' + html(program.title || 'Untitled') + '</h1>You deleted this <time datetime="' + new Date(program.deleted.time).toISOString() + '"></time>. <a class="red" id="undelete">[undelete]</a>');
					} else if (user.level >= 4) {
						var deletersstr = '',
							i = program.deleted.by.length;
						while (i--) {
							deletersstr += '<a href="/user/' + program.deleted.by[i] + '">' + program.deleted.by[i] + '</a>';
							if (i == 1) deletersstr += ', and ';
							else if (i) deletersstr += ', ';
						}
						res.write('<h1>' + html(program.title || 'Untitled') + '</h1>This program was deleted <time datetime="' + new Date(program.deleted.time).toISOString() + '"></time> by ' + deletersstr + '. <a class="red" id="undelete">[undelete]</a>');
					} else {
						res.write(
							'This program was deleted <time datetime="' + new Date(program.deleted.time).toISOString() + '"></time> ' +
							(
								program.deleted.by.length == 1 && program.deleted.by == program.user ?
									'voluntarily by its owner' :
									'for moderation reasons'
							) +
							'.'
						);
					}
					respondPageFooter(res);
				}, {inhead: '<script src="deleted-program.js"></script>'}, 404);
			} else {
				respondPage(program.title || 'Untitled', user, req, res, function() {
					dbcs.votes.findOne({
						user: user.name,
						program: program._id
					}, function(err, vote) {
						if (err) throw err;
						if (!vote) vote = {val: 0};
						dbcs.users.findOne({name: program.user}, function(err, op) {
							if (err) throw err;
							var commentstr = '';
							dbcs.comments.find({program: program._id}).sort({_id: 1}).each(function(err, comment) {
								if (err) throw err;
								if (comment) {
									var votes = comment.votes || [],
										voted;
									for (var i in votes) if (votes[i].user == user.name) voted = true;
									var commentBody = markdown(comment.body),
										endTagsLength = (commentBody.match(/(<\/((?!blockquote|code).)+?>)+$/) || [{length: 0}])[0].length;
									commentBody = commentBody.substring(0, commentBody.length - endTagsLength) +
										'<span class="c-sig">-<a href="/user/' + comment.user + '">' + comment.user + '</a>, <a href="#c' + comment._id + '" title="Permalink"><time datetime="' + new Date(comment.time).toISOString() + '"></time></a></span>' +
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
									dbcs.programs.findOne({_id: program.fork || 0}, function(err, forkedFrom) {
										if (err) throw err;
										var forks = [];
										dbcs.programs.find({fork: program._id}).each(function(err, forkFrom) {
											if (err) throw err;
											if (forkFrom) forks.push('<a href="' + forkFrom._id + '">' + html(forkFrom.title || 'Untitled') + '</a> by <a href="/user/' + forkFrom.user + '">' + forkFrom.user + '</a>');
											else {
												if (program.type == 1) {
													fs.readFile('./http/dev/canvas.js', function(err, canvasJS) {
														if (err) throw err;
														fs.readFile('./html/dev/canvas.html', function(err, data) {
															if (err) throw err;
															res.write(
																data.toString()
																.replace('$canvasjs', html(canvasJS))
																.replaceAll(
																	['$id', '$title', '$code'],
																	[program._id.toString(), html(program.title || 'Untitled'), html(program.code)]
																).replaceAll(
																	['$created', '$updated'],
																	[new Date(program.created).toISOString(), new Date(program.updated).toISOString()]
																).replace('$comments', commentstr).replaceAll(
																	['$mine', '$rep', '$op-name', '$op-rep', '$op-pic'],
																	[op.name == user.name ? '1' : '', (user.rep || 0).toString(), op.name, op.rep.toString(), '//gravatar.com/avatar/' + op.mailhash + '?s=576&amp;d=identicon']
																).replace('Save</a>', 'Save</a>' + (program.user == user.name ? ' <line /> <a id="fork" title="Create a new program based on this one">Fork</a> <line /> <a id="delete" class="red">Delete</a>' : ''))
																.replace('id="addcomment"', 'id="addcomment"' + (user.rep >= 50 ? '' : ' hidden=""'))
																.replace(vote.val ? (vote.val == 1 ? 'id="up"' : 'id="dn"') : 'nomatch', (vote.val ? (vote.val == 1 ? 'id="up"' : 'id="dn"') : 'nomatch') + ' class="clkd"')
																.replace(
																	'$forked',
																	forkedFrom ?
																		' Forked from <a href="' + forkedFrom._id + '">' +
																			html(forkedFrom.title || 'Untitled') + '</a> by <a href="/user/' + forkedFrom.user + '">' + forkedFrom.user +
																			'</a>' :
																		''
																).replace('$forks', forks.length ? '<h2>Forks</h2><ul><li>' + forks.join('</li><li>') + '</li></ul>' : '')
															);
															respondPageFooter(res);
														});
													});
												} else if (program.type == 2) {
													fs.readFile('./html/dev/html.html', function(err, data) {
														if (err) throw err;
														res.write(
															data.toString()
															.replaceAll(
																['$id', '$title', '$html', '$css', '$js'],
																[program._id.toString(), html(program.title || 'Untitled'), html(program.html), html(program.css), html(program.js)]
															).replaceAll(
																['$created', '$updated'],
																[new Date(program.created).toISOString(), new Date(program.updated).toISOString()]
															).replace('$comments', commentstr).replaceAll(
																['$mine', '$rep', '$op-name', '$op-rep', '$op-pic'],
																[op.name == user.name ? '1' : '', (user.rep || 0).toString(), op.name, op.rep.toString(), '//gravatar.com/avatar/' + op.mailhash + '?s=576&amp;d=identicon']
															).replace('Save</a>', 'Save</a>' + (program.user == user.name ? ' <line /> <a id="fork" title="Create a new program based on this one">Fork</a> <line /> <a id="delete" class="red">Delete</a>' : ''))
															.replace('id="addcomment"', 'id="addcomment"' + (user.rep >= 50 ? '' : ' hidden=""'))
															.replace(vote.val ? (vote.val == 1 ? 'id="up"' : 'id="dn"') : 'nomatch', (vote.val ? (vote.val == 1 ? 'id="up"' : 'id="dn"') : 'nomatch') + ' class="clkd"')
															.replace(
																'$forked',
																forkedFrom ?
																	' Forked from <a href="' + forkedFrom._id + '">' +
																		html(forkedFrom.title || 'Untitled') + '</a> by <a href="/user/' + forkedFrom.user + '">' + forkedFrom.user +
																		'</a>' :
																	''
															).replace('$forks', forks.length ? '<h2>Forks</h2><ul><li>' + forks.join('</li><li>') + '</li></ul>' : '')
														);
														respondPageFooter(res);
													});
												} else throw 'Invalid program type for id: ' + program._id;
											}
										});
									});
								}
							});
						});
					});
				}, {inhead: '<link rel="stylesheet" href="/dev/' + (program.type == 1 ? 'canvas' : 'html') + '.css" />'});
			}
		});
	} else errorNotFound(req, res, user);
};