'use strict';
function commentToString(comment, user) {
	if (comment.deleted && comment.user != user.name) return '';
	let votes = comment.votes || [],
		voted;
	for (let i in votes) if (votes[i].user == user.name) voted = true;
	let commentBody = (user ? markdown(comment.body + ' ').replace(new RegExp('@' + user.name + '(\\W)', 'g'), '<span class="mention">@' + user.name + '</span>$1') : markdown(comment.body)),
		endTagsLength = (commentBody.match(/(<\/((?!blockquote|code|a|img|div|>).)+?>)+$/) || [{length: 0}])[0].length;
	commentBody = commentBody.substring(0, commentBody.length - endTagsLength) +
		'<span class="c-sig" property="comment" typeof="Comment">' +
			'-<a href="/user/' + comment.user + '" property="author">' + comment.user + '</a>,' +
			' <a href="#c' + comment._id + '" title="Permalink" property="uri"><time datetime="' + new Date(comment.time).toISOString() + '" property="dateCreated"></time></a>' +
		'</span>' +
		commentBody.substring(commentBody.length - endTagsLength);
	return (
		'<div id="c' + comment._id + '" class="comment' + (comment.deleted ? ' deleted' : '') + '">' +
		'<span class="score" data-score="' + (comment.votes || []).length + '">' + (comment.votes || []).length + '</span>' +
		'<span class="sctrls">' +
			'<a' + (user.rep >= 50 ? '' : ' hidden=""') + (voted ? ' class="clkd" title="Unvote"' : ' title="This comment is useful."') + '><svg class="up" width="18" height="20" xmlns="http://www.w3.org/2000/svg"><polygon points="7,-1 0,11 5,11 5,16 9,16 9,11 14,11" /></svg></a>' +
			'<a' + (user.rep >= 50 ? '' : ' hidden=""') + ' title="This comment is inappropriate."><svg class="fl" width="18" height="20" xmlns="http://www.w3.org/2000/svg"><polygon points="0,0 13,0 13,8 4,8 4,16 0,16" /></svg></a>' +
			'<a title="Edit" class="ctrl" ' + (user.name == comment.user ? '' : ' hidden=""') + '>✎</a>' +
			'<a title="Delete…" class="ctrl red" ' + (user.name == comment.user && !comment.deleted ? '' : ' hidden=""') + '>✕</a>' +
			'<a title="Undelete…" class="ctrl" ' + (user.name == comment.user && comment.deleted ? '' : ' hidden=""') + '>↑</a>' +
		'</span>' +
		commentBody + '</div>'
	);
}
module.exports = function(comment) {
	this.comment = comment;
	this.toString = function(user) {
		return commentToString(this.comment, user);
	};
};