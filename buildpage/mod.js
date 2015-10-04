'use strict';
var fs = require('fs'),
	chatflagHTML = fs.readFileSync('./html/mod/chatflag.html').toString();
module.exports = function(req, res, user) {
	if (req.url.pathname == '/mod/') {
		respondPage('', user, req, res, function() {
			res.write('<h1>Moderation Queues</h1>');
			var query = {
				reviewing: {$exists: true}
			};
			if (user) {
				query.reviewers = {$ne: user.name};
				query.user = {$ne: user.name};
				if (user.level < 4) query.mod = {$exists: false};
			}
			dbcs.chat.find(query).count(function(err, chatflags) {
				if (err) throw err;
				res.write(
					(user.level > 1 ? '<h2><a href="chatflag">' : '<h2 class="grey">') +
					'Chat flags (' + chatflags + ')' +
					(user.level > 1 ? '</a>' : ' <small class="nofloat">(requires moderator level 2)</small>') +
					'</h2>'
				);
				respondPageFooter(res);
			});
		});
	} else if (req.url.pathname == '/mod/chatflag') {
		respondPage('Chat Flags', user, req, res, function() {
			res.write('<h1>Chat Flags</h1>');
			if (!user.name) {
				res.write('<p>You must be logged in and have level 2 moderator tools to access this queue.</p>');
				return respondPageFooter(res);
			}
			if (user.level < 2) {
				res.write('<p>You must have level 2 moderator tools to access this queue.</p>');
				return respondPageFooter(res);
			}
			var query = {
				reviewing: {$exists: true},
				reviewers: {$ne: user.name},
				user: {$ne: user.name}
			};
			if (user.level < 4) query.mod = {$exists: false};
			res.write('<div id="posts">');
			dbcs.chat.find(query).sort({mod: -1, lastFlag: -1}).each(function(err, message) {
				if (err) throw err;
				if (message) {
					var commentstr = '';
					for (var i = 0; i < message.flags.length; i++) {
						commentstr += '<div>';
						commentstr += '<a href="/user/' + message.flags[i].user + '" target="_blank">' + message.flags[i].user + '</a>, ';
						commentstr += '<time datetime="' + new Date(message.flags[i].time).toISOString() + '"></time>:';
						commentstr += '<blockquote>' + markdown(message.flags[i].body) + '</blockquote>';
						commentstr += '</div>';
					}
					res.write(
						chatflagHTML.replaceAll(
							['$id', '$room', '$user', '$mod', '$body'],
							[message._id.toString(), message.room.toString(), message.user, message.mod || '', html(message.body)]
						).replace(' hidden="">Mod-only', message.mod ? '>Mod-only' : ' hidden="">Mod-only')
						.replace('$time', new Date(message.time).toISOString())
						.replace('$scores',
							'Quality score: ' + (
								message.stars || 1 -
								(message.body.length < 8 ? 1 : 0) -
								(message.body.length > 700 ? 2 : 0) -
								(message.body.match(/\b(i|u|r)\b/) ? 1 : 0) -
								(message.body.match(/\b(im|ur|u|r|pls|plz|omg)\W/i) ? 1 : 0) -
								(message.body.match(/^\W+[a-z]/) ? 1 : 0) -
								(message.body.match(/\w\s+:/) ? 1 : 0) -
								(message.body.match(/@([a-zA-Z0-9-]{3,16})\W/g) || []).length -
								(message.body.match(/(.+)\s*\1\s*\1/g) || []).length -
								(message.body.match(/\!\!+/g) || []).length -
								(message.body.match(/\b[A-Z]\w*\b/) ? 0 : 1) -
								((message.body.match(/\b[A-Z]\w*\b/g) || []).length / ((message.body.match(/\b\w+\b/g) || []).length + 2) > 0.5 ? 2 : 0) +
								((message.body.match(/\w{8,}/g) || []).length > 3 ? 1 : 0) +
								((message.body.match(/\. [A-Z]/g) || []).length > 3 ? 1 : 0) +
								(message.body.indexOf(', ') != -1 ? 1 : 0)
							) + ', Length: ' + message.body.length +
							', Uppercase ratio: ' + (Math.round((message.body.match(/[A-Z]/g) || []).length / (message.body.match(/[a-z]/g) || []).length * 100) / 100)
						).replace('$comments', commentstr)
						.replace('class="delete"', message.deleted ? 'class="delete" hidden="true"' : 'class="delete"')
						.replace('class="mod"', message.mod ? 'class="mod" hidden="true"' : 'class="mod"')
						.replace('Dispute Flag', message.deleted ? 'Vote to Undelete' : 'Dispute flag')
					);
				} else {
					res.write('</div>');
					respondPageFooter(res);
				}
			});
		}, {
			inhead: '<link rel="stylesheet" href="mod.css" /><script src="mod.js"></script>',
			clean: true
		});
	} else errorNotFound(req, res, user);
};