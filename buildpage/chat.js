'use strict';
var fs = require('fs'),
	typeIcons = {
	P: '',
	R: ' <svg xmlns="http://www.w3.org/2000/svg" width="10" height="16">' +
			'<path d="M 9 5 a 4 4 0 0 0 -8 0" stroke-width="2px" stroke="black" fill="none" /><rect x="8" y="5" width="2" height="4" /><rect x="0" y="5" width="2" height="1" /><rect x="0" y="9" width="10" height="7" />' +
		'</svg>',
	N: ' <svg xmlns="http://www.w3.org/2000/svg" width="10" height="14">' +
			'<path d="M 9 5 a 4 4 0 0 0 -8 0" stroke-width="2px" stroke="black" fill="none" /><rect x="8" y="5" width="2" height="2" /><rect x="0" y="5" width="2" height="2" /><rect x="0" y="7" width="10" height="7" />' +
		'</svg>',
	M: ' <span class="diamond">♦</span>'
};
module.exports = function(req, res, user) {
	var i;
	if (req.url.pathname == '/chat/') {
		respondPage('', user, req, res, function() {
			res.write('<h1>Chat Rooms</h1>');
			var roomnames = [],
				publicRooms = [];
			dbcs.chatrooms.find().each(function(err, doc) {
				if (err) throw err;
				if (doc) {
					if (doc.type == 'M' && (!user || user.level < 5)) return;
					if (doc.type == 'N' && doc.invited.indexOf(user.name) == -1) return;
					res.write('<h2 class="title"><a href="' + doc._id + '">' + doc.name + typeIcons[doc.type] + '</a></h2>');
					res.write(markdown(doc.desc));
					roomnames[doc._id] = doc.name;
					if (doc.type == 'P' || doc.type == 'R' || doc.type == 'M') publicRooms.push(doc._id);
				} else {
					res.write('<hr />');
					res.write('<small>');
					res.write('<a href="search" title="Search across all rooms." class="grey">Search</a>');
					if (user.rep >= 200) res.write(' <line /> <a href="newroom" title="Requires 200 reputation" class="grey">Create Room</a>');
					res.write('</small>');
					res.write('</div>');
					res.write('<aside id="sidebar" style="overflow-x: hidden">');
					res.write('<h2>Recent Posts</h2>');
					dbcs.chat.find({
						deleted: {$exists: false},
						room: {$in: publicRooms}
					}).sort({_id: -1}).limit(12).each(function(err, comment) {
						if (err) throw err;
						if (comment) {
							var commentBody = markdown(comment.body),
								endTagsLength = (commentBody.match(/(<\/((?!blockquote).)+?>)+$/) || [{length: 0}])[0].length;
							commentBody = commentBody.substring(0, commentBody.length - endTagsLength) +
								'<span class="c-sig">' +
									'-<a href="/user/' + comment.user + '">' + comment.user + '</a>, ' +
									'<a href="' + comment.room + '#' + comment._id + '" title="Permalink"><time datetime="' + new Date(comment.time).toISOString() + '"></time> in ' + roomnames[comment.room] + '</a>' +
								'</span>' +
								commentBody.substring(commentBody.length - endTagsLength);
							res.write('<div class="comment">' + commentBody + '</div>');
						} else respondPageFooter(res, true);
					});
				}
			});
		});
	} else if (req.url.pathname == '/chat/search') {
		respondPage('Search', user, req, res, function() {
			fs.readFile('./html/chat/search.html', function(err, data) {
				if (err) throw err;
				var rooms = [];
				dbcs.chatrooms.find().each(function(err, doc) {
					if (err) throw err;
					if (doc) {
						if (doc.type == 'M' && (!user || user.level < 5)) return;
						if (doc.type == 'N' && doc.invited.indexOf(user.name) == -1) return;
						if (doc.type == 'P' || doc.type == 'R' || doc.type == 'M') rooms.push({id: doc._id, name: doc.name});
					} else {
						res.write(
							data.toString()
							.replace('$user', user.name)
							.replace('$rooms', JSON.stringify(rooms))
							.replace('$qroom', req.url.query && req.url.query.room ? req.url.query.room : '')
						);
						respondPageFooter(res);
					}
				});
			});
		});
	} else if (i = req.url.pathname.match(/^\/chat\/(\d+)$/)) {
		dbcs.chatrooms.findOne({_id: parseInt(i[1])}, function(err, doc) {
			if (err) throw err;
			if (!doc) return errorNotFound(req, res, user);
			if (req.url.query && typeof(req.url.query.access) == 'string') {
				if (doc.invited.indexOf(user.name) == -1) return errorForbidden(req, res, user, 'You don\'t have permission to control access to this room.');
				respondPage('Access for ' + doc.name, user, req, res, function() {
					var userstr = '';
					dbcs.users.find({name: {$in: doc.invited}}).each(function(err, invUser) {
						if (err) throw err;
						if (invUser) userstr +=
							'<div class="lft user"><img src="//gravatar.com/avatar/' + invUser.mailhash + '?s=576&amp;d=identicon" width="40" height="40" />' +
							'<div><a href="/user/' + invUser.name + '">' + invUser.name + '</a><small class="rep">' + invUser.rep + '</small></div><span>✕</span>' +
							'</div>';
						else {
							fs.readFile('./html/chat/access.html', function(err, data) {
								if (err) throw err;
								res.write(
									data.toString()
									.replaceAll(['$id', '$name', '$type', '$users'], [doc._id.toString(), doc.name, doc.type, userstr])
									.replace('value="' + doc.type + '"', 'value="' + doc.type + '" selected=""')
								);
								respondPageFooter(res);
							});
						}
					});
				});
			} else {
				if (doc.type == 'N' && doc.invited.indexOf(user.name) == -1) return errorForbidden(req, res, user, 'You have not been invited to this private room.');
				if (doc.type == 'M' && (!user || user.level < 5)) return errorForbidden(req, res, user, 'You must be a moderator to join this room.');
				respondPage(doc.name, user, req, res, function() {
					fs.readFile('./html/chat/room.html', function(err, data) {
						if (err) throw err;
						var isInvited = doc.type == 'P' || doc.invited.indexOf(user.name) != -1;
						res.write(
							data.toString()
							.replaceAll('$id', doc._id)
							.replaceAll('$name', html(doc.name))
							.replaceAll('$rawdesc', html(doc.desc))
							.replace('$desc', markdown(doc.desc))
							.replace('$user', user.name || '')
							.replace('$textarea',
								user.name ?
									(
										user.rep < 30 ?
											'<p id="loginmsg">You must have at least 30 reputation to chat.</p>' :
											(
												isInvited ?
													'<div id="pingsug"></div><textarea autofocus="" id="ta" class="umar fullwidth" style="height: 96px"></textarea>' +
														'<div id="subta" class="umar"><button id="btn" onclick="send()">Post</button> <a href="/formatting" target="_blank">Formatting help</a></div>' :
													'<p>Posting in a non-public room is by invitation only.</p>'
											)
									) :
									'<p id="loginmsg">You must be <a href="/login/" title="Log in or register">logged in</a> and have 30 reputation to chat.</p>')
							.replace(' $options', typeIcons[doc.type] + ' <small><a href="search?room=' + doc._id + '">Search</a>' + (user.rep > 200 && isInvited ? ' <line /> <a id="edit">Edit</a>' : '') + '</small>')
							.replace(' $access', doc.invited.indexOf(user.name) == -1 ? '' : ' <small><a href="?access">Access</a></small>')
						);
						respondPageFooter(res);
					});
				});
			}
		});
	} else if (i = req.url.pathname.match(/^\/chat\/message\/(\d+)$/)) {
		dbcs.chat.findOne({_id: parseInt(i[1])}, function(err, doc) {
			if (err) throw err;
			if (!doc) return errorNotFound(req, res, user);
			respondPage('Message #' + doc._id, user, req, res, function() {
				if (doc.deleted && doc.user != user.name) {
					res.write('This message has been deleted.');
					return respondPageFooter(res);
				}
				var revisions = 0,
					events;
				res.write('<h1>Message #' + doc._id + '</h1>');
				res.write('<p><a href="/chat/' + doc.room + '#' + doc._id + '" title="See message in room">Posted <time datetime="' + new Date(doc.time).toISOString() + '"></time></a> by <a href="/user/' + doc.user + '">' + doc.user + '</a></p>');
				res.write('<p>Current revision:</p>');
				res.write('<blockquote><pre class="nomar">' + html(doc.body) + '</pre></blockquote>');
				dbcs.chathistory.find({message: doc._id}).sort({time: 1}).each(function(err, data) {
					if (err) throw err;
					if (data) {
						if (!events) {
							res.write('<h2>History:</h2>');
							res.write('<ul>');
							events = true;
						}
						res.write('<li>');
						if (data.event == 'edit') {
							revisions++;
							res.write('Revision ' + revisions + ', <time datetime="' + new Date(data.time).toISOString() + '"></time>' + (data.note ? ' ' + data.note : '') + ':');
							res.write('<blockquote><pre class="nomar">' + html(data.body) + '</pre></blockquote>');
						} else if (data.event == 'delete' || data.event == 'undelete') {
							var deletersstr = '',
								i = data.by.length;
							while (i--) {
								deletersstr += '<a href="/user/' + data.by[i] + '">' + data.by[i] + '</a>';
								if (i == 1) deletersstr += ', and ';
								else if (i) deletersstr += ', ';
							}
							res.write('<div>' + data.event[0].toUpperCase() + data.event.substr(1) + 'd <time datetime="' + new Date(data.time).toISOString() + '"></time> by ' + deletersstr + '</div>');
						}
						res.write('</li>');
					} else {
						if (events) res.write('</ul>');
						else res.write('<p>(no message history)</p>');
						respondPageFooter(res);
					}
				});
			});
		});
	} else errorNotFound(req, res, user);
};