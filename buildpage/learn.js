'use strict';
var fs = require('fs');
module.exports = function(req, res, user) {
	var i;
	if (req.url.pathname == '/learn/') {
		respondPage('', user, req, res, function() {
			var lessonstr = '';
			dbcs.lessons.find().each(function(err, lesson) {
				if (err) throw err;
				if (lesson) lessonstr += '<li><a href="unoff/' + lesson._id + '/">' + html(lesson.title) + '</a></li>';
				else {
					fs.readFile('./html/learn/learn.html', function(err, data) {
						if (err) throw err;
						res.write(data.toString().replace('$lessons', '<ul>' + lessonstr + '</ul>'));
						respondPageFooter(res);
					});
				}
			});
		});
	} else if (i = req.url.pathname.match(/^\/learn\/unoff\/(\d+)\/$/)) {
		dbcs.lessons.findOne({_id: parseInt(i[1])}, function(err, post) {
			if (err) throw err;
			if (!post) return errorNotFound(req, res, user);
			respondPage(post.title, user, req, res, function() {
				fs.readFile('./html/learn/course.html', function(err, data) {
					if (err) throw err;
					res.write(
						data.toString()
						.replaceAll('$title', html(post.title))
						.replaceAll('$list', '<ul>' + post.content.map(function(val, i) {
							return '<li><a href="' + (i + 1) + '">' + html(val.stitle) + '</a></li>';
						}).join('') + '</ul>' + (
							post.user == user.name ?
							'<a href="../../new?title=' + html(encodeURIComponent(post.title)) + '" class="grey">+ Add a slide</a>' :
							''
						))
						.replace('$mine', post.user == user.name ? 'true' : 'false')
					);
					respondPageFooter(res);
				});
			});
		});
	} else if (i = req.url.pathname.match(/^\/learn\/unoff\/(\d+)\/(\d+)$/)) {
		dbcs.lessons.findOne({_id: parseInt(i[1])}, function(err, lesson) {
			if (err) throw err;
			if (!lesson) return errorNotFound(req, res, user);
			var post = lesson.content[--i[2]];
			if (!post) return errorNotFound(req, res, user);
			respondPage(post.title, user, req, res, function() {
				fs.readFile('./html/learn/lesson.html', function(err, data) {
					if (err) throw err;
					res.write(
						data.toString()
						.replaceAll(
							['$title', '$stitle', '$sbody', '$validate', '$html'],
							[html(lesson.title || ''), html(post.stitle || ''), html(post.sbody || ''), html(post.validate || ''), html(post.html || '')]
						).replaceAll(
							['$md-sbody', '$jsonvalidate'],
							[markdown(post.sbody), JSON.stringify(post.validate || '')]
						).replaceAll(['$back', '$next'], [i[2] ? i[2].toString() : '" title="This is the first slide." class="disabled', i[2] == lesson.content.length - 1 ? '" title="This is the last slide." class="disabled' : (i[2] + 2).toString()])
					);
					respondPageFooter(res);
				});
			}, {inhead: '<link rel="stylesheet" href="/learn/course.css" />'});
		});
	} else if (req.url.pathname.match(/^\/learn\/[\w-]+\/[\w-]+\/$/)) {
		res.writeHead(303, {
			Location: '1/'
		});
		res.end();
	} else if (i = req.url.pathname.match(/^\/learn\/([\w-]+)\/([\w-]+)\/(\d+)\/$/)) {
		fs.readFile('./html/learn/' + [i[1], i[2], i[3]].join('/') + '.html', function(err, data) {
			if (err) errorNotFound(req, res, user);
			else {
				data = data.toString();
				respondPage(data.substr(0, data.indexOf('\n')), user, req, res, function() {
					res.write(data.substr(data.indexOf('\n') + 1));
					respondPageFooter(res);
				}, {inhead: '<link rel="stylesheet" href="/learn/course.css" />'});
			}
		});
	} else errorNotFound(req, res, user);
};