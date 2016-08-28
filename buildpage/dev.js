'use strict';
let fs = require('fs'),
	Comment = require('../utility/comment.js');
module.exports = o(function*(req, res, user) {
	let i;
	if (req.url.pathname == '/dev/') {
		yield respondPage('Search', user, req, res, yield, {description: 'Sortable list of programs on DevDoodle — written with canvas.js or XHTML.'});
		let sort = (req.url.query || {}).sort || 'hot',
			sortDict = {
				default: {hotness: -1, recent: -1},
				votes: {score: -1, recent: -1},
				upvotes: {upvotes: -1, score: -1, hotness: -1, recent: -1},
				recent: {created: -1},
				update: {updated: -1}
			},
			condensed = parseInt(req.url.query.preview) == 0;
		res.write(
			(yield addVersionNonces((yield fs.readFile('./html/dev/search.html', yield)).toString(), req.url.pathname, yield))
			.replace('"' + sort + '"', '"' + sort + '" selected=""')
			.replace(' checked=""', condensed ? '' : ' checked=""')
		);
		let query = {
			deleted: {$exists: false},
			$or: [
				{private: false},
				{user: user.name}
			]
		};
		if (condensed) {
			res.write('<ol>');
			dbcs.programs.find(query, {user: true, title: true}).sort(sortDict[sort] || sortDict.default).limit(720).each(o(function*(err, program) {
				if (err) throw err;
				if (program) res.write('<li><a href="../' + program._id + '">' + html(program.title || 'Untitled') + typeIcons[program.private ? 'R' : 'P'] + '</a> by <a href="/user/' + program.user + '">' + program.user + '</a></li>');
				else res.end('</ol>' + (yield fs.readFile('html/a/foot.html', yield)));
			}));
		} else {
			res.write('<div class="flexcont programs">');
			dbcs.programs.find(query).sort(sortDict[sort] || sortDict.default).limit(15).each(o(function*(err, program) {
				if (err) throw err;
				if (program) {
					res.write('<div class="program">');
					res.write('<h2 class="title"><a href="' + program._id + '">' + html(program.title || 'Untitled') + typeIcons[program.private ? 'R' : 'P'] + '</a> <small>-<a href="/user/' + program.user + '">' + program.user + '</a></small></h2>');
					if (program.type == 0) res.write('<div><code class="blk small">' + html(program.code) + '</code></div>');
					if (program.type == 1) res.write('<div><iframe sandbox="allow-scripts" class="canvas-program" data-code="' + html(program.code) + '"></iframe></div>');
					else if (program.type == 2) res.write('<div><iframe sandbox="allow-scripts" class="html-program" data-html="' + html(program.html) + '" data-css="' + html(program.css) + '" data-js="' + html(program.js) + '"></iframe></div>');
					res.write('</div> ');
				} else {
					res.write('</div>');
					res.write('<a href="search/" class="center-text blk">See more</a>');
					res.end(yield fs.readFile('html/a/foot.html', yield));
				}
			}));
		}
	} else if (req.url.pathname == '/dev/new/canvas') {
		yield respondPage('Canvas Playground', user, req, res, yield, {
			description: 'Create a new program using canvas.js, DevDoodle\'s HTML5 canvas library, to save and share on DevDoodle.',
			clean: true,
			inhead: '<link rel="stylesheet" href="/dev/program.css" /><link rel="stylesheet" href="/dev/canvas.css" />'
		});
		res.write(
			((yield fs.readFile('./html/dev/program.html', yield)).toString() + (yield fs.readFile('./html/dev/canvas.html', yield)).toString())
			.replace('/dev/runcanvas.js', '/dev/runcanvas.js?v=' + (yield getVersionNonce(req.url.pathname, '/dev/runcanvas.js', yield)))
			.replace('$canvasjs', html(yield fs.readFile('./http/dev/canvas.js', yield)))
			.replace(/<section id="meta"[^]+?<\/section>/, '')
			.replace('Fork</a>', 'Save</a>')
			.replaceAll(
				['$mine', '$id', '$op-name', '$rep', '$title', '$raw-title', '$code'],
				['', '0', '', '0', 'New Program', 'New Program', req.url.query ? html(req.url.query.code || '') : '']
			)
		);
		res.end(yield fs.readFile('html/a/foot.html', yield));
	} else if (req.url.pathname == '/dev/new/html') {
		yield respondPage('HTML Playground', user, req, res, yield, {
			description: 'Create a new program using XHTML, CSS, and JavaScript to save and share on DevDoodle.',
			clean: true,
			inhead: '<link rel="stylesheet" href="/dev/program.css" /><link rel="stylesheet" href="/dev/html.css" />'
		});
		res.write(
			((yield fs.readFile('./html/dev/program.html', yield)).toString() + (yield fs.readFile('./html/dev/html.html', yield)).toString())
			.replace('/dev/runhtml.js', '/dev/runhtml.js?v=' + (yield getVersionNonce(req.url.pathname, '/dev/runhtml.js', yield)))
			.replace(/<section id="meta"[^]+?<\/section>/, '')
			.replace('Fork</a>', 'Save</a>')
			.replaceAll(
				['$mine', '$id', '$op-name', '$rep', '$title', '$raw-title', '$html', '$css', '$js'],
				['', '0', '', '0', 'New Program', 'New Program', req.url.query ? html(req.url.query.html || '') : '', req.url.query ? html(req.url.query.css || '') : '', req.url.query ? html(req.url.query.js || '') : '']
			)
		);
		res.end(yield fs.readFile('html/a/foot.html', yield));
	} else if (req.url.pathname == '/dev/new/text') {
		yield respondPage('New Plain Text', user, req, res, yield, {
			description: 'Create a new plain text program to save and share on DevDoodle.',
			clean: true,
			inhead: '<link rel="stylesheet" href="/dev/program.css" />'
		});
		res.write(
			((yield fs.readFile('./html/dev/program.html', yield)).toString() + (yield fs.readFile('./html/dev/text.html', yield)).toString())
			.replace(/<section id="meta"[^]+?<\/section>/, '')
			.replace('Fork</a>', 'Save</a>')
			.replaceAll(
				['$mine', '$id', '$op-name', '$rep', '$title', '$raw-title', '$code', '$css'],
				['', '0', '', '0', 'New Program', 'New Program', req.url.query ? html(req.url.query.code || '') : '']
			)
		);
		res.end(yield fs.readFile('html/a/foot.html', yield));
	} else if (i = req.url.pathname.match(/^\/dev\/([a-zA-Z\d_!@]+)$/)) {
		let program = yield dbcs.programs.findOne({_id: i[1]}, yield);
		if (!program) return errorNotFound(req, res, user);
		let forkedFrom = yield dbcs.programs.findOne({_id: program.fork || 0}, yield);
		if (program.deleted) {
			yield respondPage('[Deleted]', user, req, res, yield, {inhead: '<script src="deleted-program.js"></script>'}, 404);
			if (program.deleted.by.length == 1 && program.deleted.by == program.user && program.user == user.name) {
				res.write('<h1>' + html(program.title || 'Untitled') + '</h1>');
				res.write('<p>You deleted this <time datetime="' + new Date(program.deleted.time).toISOString() + '"></time>. ');
				res.write('<button id="undelete">Undelete…</button></p>');
			} else if (user.level >= 4) {
				let deletersstr = '',
					i = program.deleted.by.length;
				while (i--) {
					deletersstr += '<a href="/user/' + program.deleted.by[i] + '">' + program.deleted.by[i] + '</a>';
					if (i == 1) deletersstr += ', and ';
					else if (i) deletersstr += ', ';
				}
				res.write('<h1>' + html(program.title || 'Untitled') + ' by <a href="/user/' + program.user + '">' + program.user + '</a></h1>');
				res.write('<p>This program was deleted <time datetime="' + new Date(program.deleted.time).toISOString() + '"></time> by ' + deletersstr + '. ');
				res.write('<button id="undelete">Undelete…</button></p>');
			} else {
				res.write(
					'This program was deleted <time datetime="' + new Date(program.deleted.time).toISOString() + '"></time> ' +
					(
						program.deleted.by.length == 1 && program.deleted.by == program.user ?
							'voluntarily by its owner'
							: 'for moderation reasons'
					) +
					'.'
				);
			}
			if (forkedFrom) res.write('<p>It was forked from <a href="' + forkedFrom._id + '">' + html(forkedFrom.title || 'Untitled') + '</a> by <a href="/user/' + forkedFrom.user + '">' + forkedFrom.user + '</a></p>');
			res.end(yield fs.readFile('html/a/foot.html', yield));
		} else {
			yield respondPage(program.title || 'Untitled', user, req, res, yield, {
				description: (program.code || program.html + '\n' + program.css + '\n' + program.js).toMetaDescription(),
				clean: true,
				inhead: '<link rel="stylesheet" href="/dev/program.css" />' + (program.type ? ('<link rel="stylesheet" href="/dev/' + (program.type == 1 ? 'canvas' : 'html') + '.css" />') : ''),
				pageType: 'SoftwareSourceCode'
			});
			let vote = (yield dbcs.votes.findOne({
				user: user.name,
				program: program._id
			}, yield)) || {val: 0},
				op = yield dbcs.users.findOne({name: program.user}, yield),
				commentstr = '';
			dbcs.comments.find({program: program._id}).sort({_id: 1}).each(function(err, comment) {
				if (err) throw err;
				if (comment) commentstr += new Comment(comment).toString(user);
				else {
					let forks = '';
					dbcs.programs.find({fork: program._id}).each(o(function*(err, forkFrom) {
						if (err) throw err;
						if (forkFrom) {
							if (forkFrom.deleted && !forkFrom.deleted.by.includes(user.name) && forkFrom.user != user.name && (!user.name || user.level < 3)) return;
							forks += '<li><a href="' + forkFrom._id + '"' + (forkFrom.deleted ? ' class="red"' : '') + '>' + html(forkFrom.title || 'Untitled') + '</a> by <a href="/user/' + forkFrom.user + '">' + forkFrom.user + '</a></li>';
						} else {
							res.write(
								(
									(yield fs.readFile('./html/dev/program.html', yield)).toString() + (
										!program.type ? (yield fs.readFile('./html/dev/text.html', yield)).toString().replaceAll('$code', html(program.code))
										: program.type == 1 ?
											(yield fs.readFile('./html/dev/canvas.html', yield)).toString()
												.replace('/dev/runcanvas.js', '/dev/runcanvas.js?v=' + (yield getVersionNonce(req.url.pathname, '/dev/runcanvas.js', yield)))
												.replace('$canvasjs', html(yield fs.readFile('./http/dev/canvas.js', yield)))
												.replaceAll('$code', html(program.code))
											: (yield fs.readFile('./html/dev/html.html', yield)).toString()
												.replace('/dev/runhtml.js', '/dev/runhtml.js?v=' + (yield getVersionNonce(req.url.pathname, '/dev/runhtml.js', yield)))
												.replaceAll(
													['$html', '$css', '$js'],
													[html(program.html), html(program.css), html(program.js)]
												)
									)
								).replace('/dev/program.js', '/dev/program.js?v=' + (yield getVersionNonce(req.url.pathname, '/dev/program.js', yield)))
								.replaceAll(
									['$id', '$created', '$updated'],
									[program._id.toString(), new Date(program.created).toISOString(), new Date(program.updated).toISOString()]
								).replace('$title', html(program.title || 'Untitled') + typeIcons.PP.replace('viewBox', program.private ? 'viewBox' : 'hidden="" viewBox'))
								.replaceAll('$raw-title', html(program.title || 'Untitled'))
								.replace('$comments', commentstr).replaceAll(
									['$mine', '$rep', '$op-name', '$op-rep', '$op-pic'],
									[op.name == user.name ? '1' : '', (user.rep || 0).toString(), op.name, op.rep.toString(), op.pic]
								).replace('Fork</a>', (program.user != user.name ? 'Fork</a>' : 'Save</a> <line /> <a id="fork" title="Create a new program based on this one">Fork</a> <line /> <a id="delete" class="red">Delete</a>'))
								.replace('$private',
									(program.private ? '<span id="is-private" class="private">private</span>.' : '<span id="is-private">public</span>.') +
									(program.user == user.name ? ' <button id="privitize">Make ' + (program.private ? 'public' : 'private') + '</button>' : '')
								).replace('id="addcomment"', 'id="addcomment"' + (user.rep >= 50 ? '' : ' hidden=""'))
								.replace(vote.val ? (vote.val == 1 ? 'id="up"' : 'id="dn"') : 'nomatch', (vote.val ? (vote.val == 1 ? 'id="up"' : 'id="dn"') : 'nomatch') + ' class="clkd"')
								.replace(
									'$forked',
									forkedFrom ?
										' Forked from <a href="' + forkedFrom._id + '">' +
											html(forkedFrom.title || 'Untitled') + '</a> by <a href="/user/' + forkedFrom.user + '">' + forkedFrom.user +
											'</a>'
										: ''
								).replace('$forks', forks.length ? '<h2>Forks</h2><ul>' + forks + '</ul>' : '')
							);
							res.end(yield fs.readFile('html/a/foot.html', yield));
						}
					}));
				}
			});
		}
	} else errorNotFound(req, res, user);
});