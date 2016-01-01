'use strict';
var fs = require('fs');
module.exports = o(function*(req, res, user) {
	var i;
	if (req.url.pathname == '/learn/') {
		yield respondPage('', user, req, res, yield, {inhead: '<link rel="stylesheet" href="learn.css" />'});
		var lessonstr = '';
		dbcs.lessons.find().each(o(function*(err, lesson) {
			if (err) throw err;
			if (lesson) lessonstr += '<li><a href="unoff/' + lesson._id + '/">' + html(lesson.title) + '</a></li>';
			else {
				res.write((yield fs.readFile('./html/learn/learn.html', yield)).toString().replace('$lessons', '<ul>' + lessonstr + '</ul>'));
				res.end(yield fs.readFile('html/a/foot.html', yield));
			}
		}));
	} else if (i = req.url.pathname.match(/^\/learn\/unoff\/(\d+)\/$/)) {
		var post = yield dbcs.lessons.findOne({_id: parseInt(i[1])}, yield);
		if (!post) return errorNotFound(req, res, user);
		yield respondPage(post.title, user, req, res, yield);
		res.write('<h1><span id="title">' + html(post.title) + '</span> <input type="text" id="edit-title" hidden="" value="' + html(post.title) + '" /> <small><a id="save">Save</a></small></h1>');
		res.write(
			'<ul>' +
			post.content.map(function(val, i) {
				return '<li><a href="' + (i + 1) + '">' + html(val.stitle) + '</a></li>';
			}).join('') +
			'</ul>'
		);
		if (post.user == user.name) {
			res.write('<a href="../../new?title=' + html(encodeURIComponent(post.title)) + '" class="grey">+ Add a slide</a>');
			res.write('<script src="/learn/my-course-slides.js" async=""></script>');
		}
		res.end(yield fs.readFile('html/a/foot.html', yield));
	} else if (i = req.url.pathname.match(/^\/learn\/unoff\/(\d+)\/(\d+)$/)) {
		var lesson = yield dbcs.lessons.findOne({_id: parseInt(i[1])}, yield);
		if (!lesson) return errorNotFound(req, res, user);
		var post = lesson.content[--i[2]];
		if (!post) return errorNotFound(req, res, user);
		yield respondPage(post.title, user, req, res, yield, {clean: true, inhead: '<link rel="stylesheet" href="/learn/course.css" />'});
		var isLast = i[2] == lesson.content.length - 1;
		res.write(
			(yield fs.readFile('./html/learn/lesson.html', yield)).toString()
			.replaceAll(
				['$title', '$stitle', '$sbody', '$validate', '$html', '$md-sbody'],
				[html(lesson.title || ''), html(post.stitle || ''), html(post.sbody || ''), html(post.validate || ''), html(post.html || ''), markdown(post.sbody || '')]
			).replace('<a href="$next">Move on →</a>', isLast ? 'Last slide, <a href="/learn/">return to index</a>' : '<a href="$next">Move on →</a>').replaceAll(
				['$back', '$next'],
				[
					i[2] ? i[2].toString() : '" title="This is the first slide." class="disabled',
					isLast ? '" title="This is the last slide." class="disabled' : (i[2] + 2).toString()
				]
			)
		);
		res.end(yield fs.readFile('html/a/foot.html', yield));
	} else if (req.url.pathname.match(/^\/learn\/[\w-]+\/[\w-]+\/$/)) {
		res.writeHead(303, {
			Location: '1/'
		});
		res.end();
	} else if (i = req.url.pathname.match(/^\/learn\/([\w-]+)\/([\w-]+)\/(\d+)\/$/)) {
		fs.readFile('./html/learn/' + [i[1], i[2], i[3]].join('/') + '.html', o(function*(err, data) {
			if (err) errorNotFound(req, res, user);
			else {
				data = data.toString();
				yield respondPage(data.substr(0, data.indexOf('\n')), user, req, res, yield, {clean: true, inhead: '<link rel="stylesheet" href="/learn/course.css" />'});
				res.write(data.substr(data.indexOf('\n') + 1));
				res.end(yield fs.readFile('html/a/foot.html', yield));
			}
		}));
	} else errorNotFound(req, res, user);
});