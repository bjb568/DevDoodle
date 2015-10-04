'use strict';
var fs = require('fs'),
	showcanvas = fs.readFileSync('./html/dev/showcanvas.html').toString(),
	showhtml = fs.readFileSync('./html/dev/showhtml.html').toString();
module.exports = function(req, res, user) {
	if (req.url.pathname == '/') {
		respondPage('', user, req, res, function() {
			var programstr = '';
			dbcs.programs.find({deleted: {$exists: false}}).sort({hotness: -1, updated: -1}).limit(12).each(function(err, data) {
			if (err) throw err;
				if (data) {
					programstr += '<div class="program">';
					programstr += '<h2 class="title"><a href="dev/' + data._id + '">' + html(data.title || 'Untitled') + '</a> <small>-<a href="/user/' + data.user + '">' + data.user + '</a></small></h2>';
					if (data.type == 1) programstr += showcanvas.replace('$code', html(JSON.stringify(data.code)));
					else if (data.type == 2) programstr += showhtml.replace('$html', html(data.html)).replace('$css', html(data.css)).replace('$js', html(data.js));
					programstr += '</div> ';
				} else {
					fs.readFile('./html/home.html', function(err, data) {
						if (err) throw err;
						res.write(data.toString().replace('$programs', programstr));
						respondPageFooter(res);
					});
				}
			});
		});
	} else errorNotFound(req, res, user);
};