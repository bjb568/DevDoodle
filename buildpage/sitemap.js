'use strict';
module.exports = function(req, res) {
	res.writeHead(200, {'Content-Type': 'application/xml; charset=utf-8'});
	res.write('<?xml version="1.0" encoding="UTF-8"?>');
	res.write('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
	let learnLocs = {
		'web/html-intro': 5,
		'web/basic-elements': 5
	};
	let locs = [
		['/', '/learn/', '/dev/', '/dev/search/', '/qa/', '/qa/search/'],
		['/chat/'],
		['/user/', '/qa/tips/'],
		['/learn/', '/learn/web/', '/learn/ssj/', '/learn/debug/', '/learn/quality/', '/dev/new/', '/dev/new/html', '/dev/new/canvas', '/dev/new/text', '/dev/docs/', '/dev/docs/shapes/line-func', '/dev/docs/shapes/rect-func', '/dev/docs/shapes/point-func', '/dev/docs/shapes/ellipse-func', '/dev/docs/text/text-func', '/dev/docs/text/textalign-func', '/dev/docs/text/font-func', '/dev/docs/fill/fill-func', '/dev/docs/fill/stroke-func', '/dev/docs/fill/bg-func', '/dev/docs/fill/strokewidth-func', '/dev/docs/fill/rgb-func', '/dev/docs/fill/hsl-func', '/dev/docs/fill/trans-none', '/dev/docs/draw/draw-loop', '/dev/docs/draw/framerate', '/dev/docs/mouse/mousex-y', '/dev/docs/mouse/mousepressed', '/dev/docs/keyboard/keycodes', '/dev/docs/keyboard/key', '/dev/docs/math/global-math', '/dev/docs/math/rand-func', '/dev/docs/math/number-proto-bound', '/dev/docs/console/print-func', '/dev/docs/console/resetlog-func', '/dev/docs/canvas/size-func', '/dev/docs/canvas/width-height', '/dev/docs/canvas/canvas-ctx', '/qa/ask'],
		['/formatting', '/chat/newroom', '/login/']
	];
	let freqs = ['hourly', 'daily', 'weekly', 'monthly', 'yearly'];
	let pages = [];
	for (let a in locs) for (let n in locs[a]) pages.push({loc: locs[a][n], changefreq: freqs[a], priority: a == 4 ? 0.1 : 0.5});
	for (let learnLoc in learnLocs) for (let n = 1; n <= learnLocs[learnLoc]; n++) pages.push({loc: '/learn/' + learnLoc + '/' + n, changefreq: 'monthly'});
	function writePage(page) {
		res.write('<url>');
		res.write('<loc>' + (config.HTTP2 ? "https://" : "http://") + req.headers.host + page.loc + '</loc>');
		if (page.lastmod) res.write('<lastmod>' + page.lastmod.toISOString() + '</lastmod>');
		if (page.changefreq) res.write('<changefreq>' + page.changefreq + '</changefreq>');
		if (page.priority && page.priority != 0.5) res.write('<priority>' + page.priority + '</priority>');
		res.write('</url>');
	}
	for (let page of pages) writePage(page);
	dbcs.lessons.find({}, {content: true, updated: true}).each(function(err, lesson) {
		if (err) throw err;
		if (lesson) {
			writePage({loc: '/learn/unoff/' + lesson._id + '/', changefreq: 'daily', lastmod: new Date(lesson.updated), priority: 0.4});
			for (let n = 1; n <= lesson.content.length; n++) writePage({loc: '/learn/unoff/' + lesson._id + '/' + n, changefreq: 'daily', priority: 0.3});
		} else dbcs.programs.find({
			deleted: {$exists: false},
			private: false
		}, {updated: true}).each(function(err, program) {
			if (err) throw err;
			if (program) writePage({loc: '/dev/' + program._id, changefreq: 'daily', lastmod: new Date(program.updated), priority: 0.3});
			else dbcs.questions.find({deleted: {$exists: false}}, {_id: true}).each(function(err, question) {
				if (err) throw err;
				if (question) writePage({loc: '/qa/' + question._id, changefreq: 'daily', priority: 0.3});
				else dbcs.chatrooms.find({type: {$in: ['P', 'R']}}, {_id: true}).each(function(err, room) {
					if (err) throw err;
					if (room) writePage({loc: '/chat/' + room._id, changefreq: 'hourly', priority: 0.2});
					else dbcs.users.find({}, {name: true}).each(function(err, duser) {
						if (err) throw err;
						if (duser) writePage({loc: '/user/' + duser.name, changefreq: 'daily', priority: 0.4});
						else res.end('</urlset>');
					});
				});
			});
		});
	});
};