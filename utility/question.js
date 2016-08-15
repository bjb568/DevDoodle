'use strict';
module.exports = {
	answerCount(n) {
		return '<i class="answer-count" title="This question has ' + n + ' answer' + (n == 1 ? '' : 's') + '">' + n + '</i>';
	}
};