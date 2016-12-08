'use strict';
let fs = require('fs');
module.exports = o(function*(req, res, user) {
	let i;
	if (req.url.pathname == '/learn/') {
		yield respondPage('', user, req, res, yield, {
			description: 'Learn a new technology — front-end web, server side javascript, or a new skill like debugging or code quality.',
			inhead: '<link rel="stylesheet" href="learn.css" />'
		});
		let lessonstr = '';
		dbcs.lessons.find().each(o(function*(err, lesson) {
			if (err) throw err;
			if (lesson) lessonstr += '<li><a href="unoff/' + lesson._id + '/">' + html(lesson.title) + '</a></li>';
			else {
				res.write((yield fs.readFile('./html/learn/learn.html', yield)).toString().replace('$lessons', '<ul>' + lessonstr + '</ul>'));
				res.end(yield fs.readFile('html/a/foot.html', yield));
			}
		}));
	} else if (i = req.url.pathname.match(/^\/learn\/unoff\/([a-zA-Z\d_!@]+)\/$/)) {
		let lesson = yield dbcs.lessons.findOne({_id: i[1]}, yield);
		if (!lesson) return errorNotFound(req, res, user);
		yield respondPage(lesson.title, user, req, res, yield);
		res.write('<h1><span id="title">' + html(lesson.title) + '</span> <input type="text" id="edit-title" hidden="" value="' + html(lesson.title) + '" /> <small><a id="save">Save</a></small></h1>');
		res.write(
			'<ul>' +
			lesson.content.map(function(val, i) {
				return '<li><a href="' + (i + 1) + '">' + html(val.stitle) + '</a>' + (lesson.user == user.name ? ' <a class="ctrl" title="Edit" href="' + (i + 1) + '?edit">✎</a>' : '') + '</li>';
			}).join('').replace(' <a href="./">Course Info</a>', lesson.user == user.name ? ' <a href="./">Course Info</a>' : '') +
			'</ul>'
		);
		if (lesson.user == user.name) {
			res.write('<a href="../../new?title=' + html(encodeURIComponent(lesson.title)) + '" class="grey">+ Add a slide</a>');
			res.write(yield addVersionNonces('<script src="/learn/my-course-slides.js" async=""></script>', req.url.pathname, yield));
		}
		res.end(yield fs.readFile('html/a/foot.html', yield));
	} else if (i = req.url.pathname.match(/^\/learn\/unoff\/([a-zA-Z\d_!@]+)\/(\d+)$/)) {
		let lesson = yield dbcs.lessons.findOne({_id: i[1]}, yield);
		if (!lesson) return errorNotFound(req, res, user);
		let post = lesson.content[--i[2]];
		if (!post) return errorNotFound(req, res, user);
		let editing = typeof req.url.query.edit == 'string';
		if (editing && lesson.user != user.name) return errorForbidden(req, res, user);
		yield respondPage((editing ? 'Editing: ' : '') + lesson.title, user, req, res, yield, {
			description: post.sbody.toMetaDescription(),
			clean: true,
			inhead: '<link rel="stylesheet" href="/learn/course.css" />'
		});
		if (editing) {
			res.write(
				(yield addVersionNonces((yield fs.readFile('html/learn/newlesson.html', yield)).toString(), req.url.pathname, yield))
				.replaceAll(
					['$title', '$stitle', '$sbody', '$html'],
					[html(lesson.title || ''), html(post.stitle || ''), html(post.sbody || ''), html(post.html || '')]
				).replace(/>function[\s\S]+?<\/textarea/, '>' + html(post.validate || '') + '</textarea')
				.replace('Preview Lesson', 'Submit Edit')
			);
		} else {
			let isLast = i[2] == lesson.content.length - 1;
			res.write(
				(yield addVersionNonces((yield fs.readFile('./html/learn/lesson.html', yield)).toString(), req.url.pathname, yield))
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
		}
		res.end(yield fs.readFile('html/a/foot.html', yield));
	} else if (req.url.pathname.match(/^\/learn\/[\w-]+\/[\w-]+\/$/)) {
		res.writeHead(303, {
			Location: '1'
		});
		res.end();
	} else if (i = req.url.pathname.match(/^\/learn\/([\w-]+)\/([\w-]+)\/(\d+)$/)) {
		let data;
		try {
			data = yield addVersionNonces((yield fs.readFile('./html/learn/' + [i[1], i[2], i[3]].join('/') + '.html', yield)).toString(), req.url.pathname, yield);
		} catch (e) {
			return errorNotFound(req, res, user);
		}
		yield respondPage(data.substr(0, data.indexOf('\n')), user, req, res, yield, {clean: true, inhead: '<link rel="stylesheet" href="/learn/course.css" />'});
		res.write(data.substr(data.indexOf('\n') + 1));
		res.end(yield fs.readFile('html/a/foot.html', yield));
	} else errorNotFound(req, res, user);
});