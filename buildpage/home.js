'use strict';
let fs = require('fs'),
	Question = require('../utility/question.js');
module.exports = o(function*(req, res, user) {
	if (req.url.pathname != '/') return errorNotFound(req, res, user);
	yield respondPage('', user, req, res, yield, {description: 'DevDoodle is a developer network where you can learn languages, create and share your own programs, and ask and answer questions.'});
	res.write(yield fs.readFile('./html/home.html', yield));
	res.write('<section class="flexcont small-q-previews">');
	res.write('<h2 class="underline">Questions</h2>');
	let cursor = dbcs.questions.find({deleted: {$exists: false}}).sort({hotness: -1, time: -1}).limit(9);
	function questionSummaryHandler(err, question) {
		if (err) throw err;
		if (question) {
			res.write('<div class="question-preview">');
			res.write('<h2 class="title">' + Question.answerCount(question.answers) + ' <a href="qa/' + question._id + '">' + html(question.lang) + ': ' + html(question.title) + '</a></h2>');
			res.write('<blockquote class="limited">' + markdown(question.description) + '</blockquote>');
			let tagstr = '';
			dbcs.qtags.find({_id: {$in: question.tags}}).each(function(err, tag) {
				if (err) throw err;
				if (tag) tagstr += '<a href="qa/search?q=%5B%5B' + tag._id + '%5D%5D" class="tag">' + tag.name + '</a> ';
				else {
					res.write('<p class="qlist-tags">' + tagstr + ' <span class="rit"><a href="qa/' + question._id + '?history">asked <time datetime="' + new Date(question.time).toISOString() + '"></time></a> by <a href="/user/' + question.user + '">' + question.user + '</a></span></p>');
					res.write('</div>');
					cursor.nextObject(questionSummaryHandler);
				}
			});
		} else {
			res.write('</section>');
			res.write('<section class="resp-block">');
			res.write('<h2 class="underline">Hot Programs</h2>');
			res.write('<div class="flexcont programs lim-programs">');
			let programstr = '';
			dbcs.programs.find({
				deleted: {$exists: false},
				private: false
			}).sort({hotness: -1, updated: -1}).limit(24).each(o(function*(err, program) {
				if (err) throw err;
				if (program) {
					programstr += '<div class="program">';
					programstr += '<h2 class="title"><a href="dev/' + program._id + '">' + html(program.title || 'Untitled') + typeIcons[program.private ? 'R' : 'P'] + '</a> <small>-<a href="/user/' + program.user + '">' + program.user + '</a></small></h2>';
					if (program.type == 0) programstr += '<div><code class="blk small">' + html(program.code) + '</code></div>';
					if (program.type == 1) programstr += '<div><iframe sandbox="allow-scripts" class="canvas-program" data-code="' + html(program.code) + '"></iframe></div>';
					else if (program.type == 2) programstr += '<div><iframe sandbox="allow-scripts" class="html-program" data-html="' + html(program.html) + '" data-css="' + html(program.css) + '" data-js="' + html(program.js) + '"></iframe></div>';
					programstr += '</div> ';
				} else {
					res.write(programstr + '</div></section>');
					res.end(yield fs.readFile('html/a/foot.html', yield));
				}
			}));
		}
	}
	cursor.nextObject(questionSummaryHandler);
});