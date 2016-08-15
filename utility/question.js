'use strict';
module.exports = {
	getByReferer(req, cb) {
		dbcs.questions.findOne({_id: ((url.parse(req.headers.referer || '').pathname || '').match(/^\/qa\/([a-zA-Z\d_!@]+)/) || [])[1]}, cb);
	},
	answerCount(n) {
		return '<i class="answer-count" title="This question has ' + n + ' answer' + (n == 1 ? '' : 's') + '">' + n + '</i>';
	}
};