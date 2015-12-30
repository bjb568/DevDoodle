'use strict';
var fs = require('fs');
module.exports = o(function*(req, res, user) {
	if (req.url.pathname != '/') return errorNotFound(req, res, user);
	yield respondPage('', user, req, res, yield);
	res.write(yield fs.readFile('./html/home.html', yield));
	res.write('<section class="resp-block">');
	res.write('<h2 class="underline">Questions</h2>');
	var cursor = dbcs.questions.find({deleted: {$exists: false}}).sort({hotness: -1, updated: -1}).limit(12);
	var questionSummaryHandler = o(function*(err, question) {
		if (err) throw err;
		if (question) {
			res.write('<h2 class="title"><i class="answer-count">' + question.answers + '</i> <a href="qa/' + question._id + '">' + html(question.lang) + ': ' + html(question.title) + '</a></h2>');
			res.write('<blockquote class="limited">' + markdown(question.description) + '</blockquote>');
			var tagstr = '';
			dbcs.qtags.find({_id: {$in: question.tags}}).each(o(function*(err, tag) {
				if (err) throw err;
				if (tag) tagstr += '<a href="qa/search?q=[[' + tag._id + ']]" class="tag">' + tag.name + '</a> ';
				else {
					res.write('<p class="underline qlist-tags">' + tagstr + ' <span class="rit"><a href="qa/' + question._id + '?history">asked <time datetime="' + new Date(question.time).toISOString() + '"></time></a> by <a href="/user/' + question.user + '">' + question.user + '</a></span></p>');
					cursor.nextObject(questionSummaryHandler);
				}
			}));
		} else {
			res.write('</section>');
			res.write('<section class="resp-block">');
			res.write('<h2 class="underline">Hot Programs</h2>');
			res.write('<div class="flexcont programs lim-programs">')
			var programstr = '';
			dbcs.programs.find({deleted: {$exists: false}}).sort({hotness: -1, updated: -1}).limit(24).each(o(function*(err, data) {
				if (err) throw err;
				if (data) {
					programstr += '<div class="program">';
					programstr += '<h2 class="title"><a href="dev/' + data._id + '">' + html(data.title || 'Untitled') + '</a> <small>-<a href="/user/' + data.user + '">' + data.user + '</a></small></h2>';
					if (data.type == 1) programstr += '<div><iframe sandbox="allow-scripts" class="canvas-program" data-code="' + html(data.code, true) + '"></iframe></div>';
					else if (data.type == 2) programstr += '<div><iframe sandbox="allow-scripts" class="html-program" data-html="' + html(data.html, true) + '" data-css="' + html(data.css, true) + '" data-js="' + html(data.js, true) + '"></iframe></div>';
					programstr += '</div> ';
				} else {
					res.write(programstr + '</div></section>');
					res.end(yield fs.readFile('html/a/foot.html', yield));
				}
			}));
		}
	});
	cursor.nextObject(questionSummaryHandler);
});