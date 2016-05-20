'use strict';
var myRep = parseInt(document.getElementById('rep').value),
	username = document.querySelector('#nav > div:nth-of-type(3) > a:nth-child(2) span').firstChild.nodeValue,
	id = parseInt(location.href.match(/\d+/)[0]),
	langs = JSON.parse(document.getElementById('langs').value),
	langsug = document.getElementById('langsug'),
	lang = document.getElementById('lang-edit'),
	editCommentForm = document.getElementById('editcomment'),
	editCommentTA = document.getElementById('comment-edit-ta'),
	editingComment;
function handleLocationUpdate() {
	var e = document.getElementById(location.hash.substr(1)),
		f;
	if (e) f = e.getElementsByTagName('textarea')[0];
	if (f) e.focus();
	else if (location.hash == '#edit') {
		document.body.classList.add('q-editing');
		document.getElementById('q-edit').hidden = 0;
		document.getElementById('title').hidden = 1;
		document.getElementById('title-edit').hidden = 0;
		document.getElementById('q-content').hidden = 1;
		document.getElementById('q-desc-edit').focus();
		document.getElementById('med').href = '#';
	} else if (!document.getElementById('q-edit').hidden) document.getElementById('cancel-edit').onclick();
}
addEventListener('load', handleLocationUpdate);
addEventListener('hashchange', handleLocationUpdate);
document.getElementById('cancel-edit').onclick = function() {
	location.hash = '';
	document.body.classList.remove('q-editing');
	document.getElementById('q-edit').hidden = 1;
	document.getElementById('title').hidden = 0;
	document.getElementById('title-edit').hidden = 1;
	document.getElementById('q-content').hidden = 0;
	document.getElementById('med').href = '#edit';
};
var addCommentBtns = document.getElementsByClassName('addcomment');
for (var i = 0; i < addCommentBtns.length; i++) {
	addCommentBtns[i].onclick = function() {
		var e = this;
		requestAnimationFrame(function() {
			e.previousElementSibling.firstElementChild.focus();
		});
	};
}
function langKeyUp() {
	var firstChild;
	while (firstChild = langsug.firstChild) langsug.removeChild(firstChild);
	var i = lang.value.length,
		used = [];
	while (used.length < 2) {
		for (var j = 0; j < langs.length; j++) {
			if (used.indexOf(langs[j]) == -1 && langs[j].substr(0, i).toLowerCase() == lang.value.substr(0, i).toLowerCase()) {
				used.push(langs[j]);
				var span = document.createElement('span');
				span.appendChild(document.createTextNode(langs[j]));
				span.onmousedown = function(e) {
					e.preventDefault();
					lang.value = this.textContent;
					this.parentNode.hidden = true;
				};
				langsug.appendChild(span);
				langsug.appendChild(document.createTextNode(' '));
			}
		}
		if (i == 0) return;
		i--;
	}
}
lang.addEventListener('keyup', function() {
	if (!(langsug.hidden = !this.value)) langKeyUp();
});
langKeyUp();
lang.addEventListener('keydown', function(e) {
	if (this.value && e.which == 9) this.value = langsug.firstChild.textContent;
});
lang.addEventListener('blur', function() {
	langsug.hidden = true;
});
lang.addEventListener('focus', function() {
	langsug.hidden = !this.value;
});
document.getElementById('q-edit').onsubmit = function(e) {
	e.preventDefault();
	socket.send(JSON.stringify({
		event: 'q-edit',
		comment: document.getElementById('q-edit-comment').value,
		title: document.getElementById('title-edit').value,
		lang: document.getElementById('lang-edit').value,
		description: document.getElementById('q-desc-edit').value,
		question: document.getElementById('q-question-edit').value,
		code: document.getElementById('q-code-edit').value,
		type: document.getElementById('edit-type').value,
		tags: document.getElementById('edit-tags-input').value
	}));
};
document.getElementById('q-delete').onclick = function() {
	if (confirm('Do you want to delete this question?')) {
		request('/api/question/delete', function(res) {
			if (res.indexOf('Error') == 0) alert(res);
			else if (res == 'Success') location.reload();
			else alert('Unknown error. Response was: ' + res);
		});
	}
};
document.getElementById('edit-tags').onchange = function() {
	setTimeout(function() {
		var arr = [],
			els = document.getElementById('edit-tags').querySelectorAll(':checked');
		for (var i = 0; i < els.length; i++) {
			arr.push(els[i].id.substr(3));
		}
		document.getElementById('edit-tags-input').value = arr.join(',');
	}, 0);
};
document.getElementById('answerform').addEventListener('submit', function(e) {
	e.preventDefault();
	var answer = document.getElementById('answerta'),
		err = document.getElementById('answer-error');
	if (answer.mdValidate(true)) return;
	if (err.firstChild) err.removeChild(err.firstChild);
	if (answer.value.length < 144) return err.appendChild(document.createTextNode('Answer body must be at least 144 characters long.'));
	request('/api/answer/add', function(res) {
		if (res.indexOf('Location:') == 0) {
			location.href = '#' + res.substr(12);
			location.reload();
		} else if (res.indexOf('Error') == 0) alert(res);
		else alert('Unknown error. Response was: ' + res);
	}, 'body=' + encodeURIComponent(answer.value));
});
var socket = new WebSocket((location.protocol == 'http:' ? 'ws://' : 'wss://') + location.hostname + '/q/' + id),
	commentForms = document.getElementsByClassName('commentform');
for (var i = 0; i < commentForms.length; i++) {
	commentForms[i].onsubmit = function(e) {
		e.preventDefault();
		if (this.firstElementChild.mdValidate(true)) return;
		var el = this;
		socket.send(JSON.stringify({
			event: 'comment',
			body: el.firstElementChild.value,
			answer: parseInt(el.dataset.answer)
		}));
		this.firstElementChild.value = '';
		this.lastElementChild.onclick();
	};
}
var cResetBtns = document.getElementsByClassName('c-reset');
for (var i = 0; i < cResetBtns.length; i++) {
	cResetBtns[i].onclick = function() {
		var scrlTop = document.body.scrollTop;
		location.hash = '';
		history.replaceState('', document.title, window.location.pathname);
		document.body.scrollTop = scrlTop;
	};
}
var cEditResetBtns = document.getElementsByClassName('c-edit-reset');
for (var i = 0; i < cEditResetBtns.length; i++) {
	cEditResetBtns[i].onclick = function() {
		editCommentForm.hidden = true;
		document.getElementById('c' + editingComment).classList.remove('editing');
		editingComment = null;
	};
}
var cEditForm = document.getElementsByClassName('editcommentform');
for (var i = 0; i < cEditForm.length; i++) {
	cEditForm[i].onsubmit = function(e) {
		e.preventDefault();
		if (this.firstElementChild.mdValidate(true)) return;
		socket.send(JSON.stringify({
			event: 'comment-edit',
			id: editingComment,
			body: editCommentTA.value
		}));
		this.hidden = true;
		document.getElementById('c' + editingComment).classList.remove('editing');
		editingComment = null;
	};
}
function upvoteComment() {
	this.title = this.classList.toggle('clkd') ? 'Unvote' : 'This comment is useful.';
	socket.send(JSON.stringify({
		event: this.classList.contains('clkd') ? 'comment-vote' : 'comment-unvote',
		id: parseInt(this.parentNode.parentNode.id.substr(1))
	}));
}
function editComment() {
	var s = this.parentNode.parentNode.classList.contains('editing'),
		existing = document.getElementById('c' + editingComment),
		idSuffix = this.parentNode.parentNode.parentNode.id == 'comments' ? '' : '-' + this.parentNode.parentNode.parentNode.parentNode.previousElementSibling.id.substr(1);
	if (existing) existing.classList.remove('editing');
	if ((editCommentForm = document.getElementById('editcomment' + idSuffix)).hidden = s) editingComment = false;
	else {
		this.parentNode.parentNode.classList.add('editing');
		editingComment = parseInt(this.parentNode.parentNode.id.substr(1));
		editCommentTA = document.getElementById('comment-edit-ta' + idSuffix);
		editCommentTA.value = '';
		editCommentTA.placeholder = 'Loading…';
		request('/api/comment/' + editingComment + '/body', function(res) {
			if (res.indexOf('Error') == 0) alert(res);
			else {
				editCommentTA.value = res;
				editCommentTA.focus();
				editCommentTA.selectionStart = editCommentTA.selectionEnd = res.length;
			}
		});
	}
}
function deleteComment() {
	if (confirm('Do you want to delete this comment?')) socket.send(JSON.stringify({event: 'comment-delete', id: parseInt(this.parentNode.parentNode.id.substr(1))}));
}
function undeleteComment() {
	if (confirm('Do you want to undelete this comment?')) socket.send(JSON.stringify({event: 'comment-undelete', id: parseInt(this.parentNode.parentNode.id.substr(1))}));
}
function createComment(data) {
	var div = document.createElement('div');
	div.className = 'comment';
	div.innerHTML = (username ? markdown(data.body + ' ').replace(new RegExp('@' + username + '(\\W)', 'g'), '<span class="mention">@' + username + '</span>$1') : markdown(data.body));
	div.insertBefore(document.getElementById('content').children[2].cloneNode(true), div.firstChild);
	div.firstChild.children[0].onclick = upvoteComment;
	if (username != data.user) {
		div.firstChild.children[2].hidden = true;
		div.firstChild.children[3].hidden = true;
	}
	if (myRep < 50) {
		div.firstChild.children[0].hidden = true;
		div.firstChild.children[1].hidden = true;
	}
	div.firstChild.children[4].hidden = true;
	div.firstChild.children[2].onclick = editComment;
	div.firstChild.children[3].onclick = deleteComment;
	div.firstChild.children[4].onclick = undeleteComment;
	var score = document.createElement('span');
	score.classList.add('score');
	score.appendChild(document.createTextNode(score.dataset.score = 0));
	div.insertBefore(score, div.firstChild);
	var sig = document.createElement('span');
	sig.classList.add('c-sig');
	sig.appendChild(document.createTextNode('-'));
	var a = document.createElement('a');
	a.href = '/user/' + data.user;
	a.appendChild(document.createTextNode(data.user));
	sig.appendChild(a);
	sig.appendChild(document.createTextNode(', '));
	var permalink = document.createElement('a');
	permalink.appendChild(agot(data.time || new Date().getTime()));
	permalink.href = '#' + (div.id = 'c' + data.id);
	sig.appendChild(permalink);
	var currentNode = div;
	while (!sig.parentNode) {
		if (!currentNode.lastElementChild || ['blockquote', 'code', 'a', 'img', 'div'].indexOf(currentNode.lastElementChild.tagName) != -1) currentNode.appendChild(sig);
		else currentNode = currentNode.lastElementChild;
	}
	var comments = document.getElementById(data.answer ? 'comments-' + data.answer : 'comments');
	for (var i = 0; i < comments.children.length; i++) {
		if (parseInt(comments.children[i].id.substr(1)) > data.id) return comments.insertBefore(div, comments.children[i]);
	}
	comments.appendChild(div);
}
socket.onmessage = function(e) {
	console.log(e.data);
	try {
		var data = JSON.parse(e.data);
	} catch (err) {
		console.log(err);
		return alert('JSON Error. Response was: ' + e.data);
	}
	if (data.event == 'q-edit') {
		if (location.hash == '#edit') location.hash = '';
		document.getElementById('title').firstChild.nodeValue =
			(document.getElementById('lang-edit').value = data.lang) +
			': ' +
			(document.getElementById('title-edit').value = data.title);
		document.getElementById('q-body').innerHTML =
			markdown(document.getElementById('q-desc-edit').value = data.description) +
			'<code class="blk">' + html(document.getElementById('q-code-edit').value = data.code) + '</code>' +
			'<p><strong>' + inlineMarkdown(document.getElementById('q-question-edit').value = data.question) + '</strong></p>';
		var options = document.getElementById('edit-type').options;
		for (var i = 0; i < options.length; i++) {
			if (options[i].value == data.type) options[i].selected = true;
		}
		document.getElementById('tags').innerHTML = data.tags;
		document.getElementById('edit-tags').innerHTML = data.editTags;
		document.getElementById('edit-tags-input').value = data.rawEditTags;
		document.getElementById('q-edit-comment').value = '';
		var hist = document.getElementById('q-hist').firstChild;
		hist.nodeValue = 'History (' + (1 + parseInt(hist.nodeValue.match(/\d+/) || 0)) + ')';
	} else if (data.event == 'comment-add') {
		var div = document.createElement('div');
		createComment(data);
	} else if (data.event == 'comment-scorechange') {
		var c = document.getElementById('c' + data.id);
		if (c) c.getElementsByClassName('score')[0].dataset.score = c.getElementsByClassName('score')[0].textContent = data.score;
	} else if (data.event == 'comment-edit') {
		var msg = document.getElementById('c' + data.id),
			sig = msg.getElementsByClassName('c-sig')[0],
			msgCtrls = msg.getElementsByClassName('sctrls')[0],
			score = msg.getElementsByClassName('score')[0];
		sig.parentNode.removeChild(sig);
		if (msgCtrls) msgCtrls.parentNode.removeChild(msgCtrls);
		score.parentNode.removeChild(score);
		msg.innerHTML = (username ? markdown(data.body + ' ').replace(new RegExp('@' + username + '(\\W)', 'g'), '<span class="mention">@' + username + '</span>$1') : markdown(data.body));
		var currentNode = msg;
		while (!sig.parentNode) {
			if (!currentNode.lastElementChild || ['blockquote', 'code', 'a', 'img', 'div'].indexOf(currentNode.lastElementChild.tagName) != -1) currentNode.appendChild(sig);
			else currentNode = currentNode.lastElementChild;
		}
		if (msgCtrls) msg.insertBefore(msgCtrls, msg.firstChild);
		msg.insertBefore(score, msg.firstChild);
	} else if (data.event == 'comment-delete') {
		var msg = document.getElementById('c' + data.id);
		if (msg.getElementsByClassName('c-sig')[0].getElementsByTagName('a')[0].textContent == username) {
			msg.classList.add('deleted');
			var msgCtrls = msg.getElementsByClassName('sctrls')[0];
			msgCtrls = msgCtrls.children;
			msgCtrls[3].hidden = true;
			msgCtrls[4].hidden = false;
		} else msg.parentNode.removeChild(msg);
	} else if (data.event == 'comment-undelete') {
		var msg = document.getElementById('c' + data.id);
		if (msg) {
			msg.classList.remove('deleted');
			var msgCtrls = msg.getElementsByClassName('sctrls')[0];
			msgCtrls = msgCtrls.children;
			msgCtrls[3].hidden = false;
			msgCtrls[4].hidden = true;
		} else createComment(data);
	} else if (data.event == 'err') {
		alert('Error: ' + data.body);
		if (data.commentUnvote) document.getElementById('c' + data.commentUnvote).getElementsByClassName('up')[0].parentNode.classList.remove('clkd');
	} else alert(e.data);
};
socket.onclose = function() {
	var ta = document.getElementById('commentta');
	if (ta.disabled) return;
	ta.blur();
	ta.disabled = true;
	var warning = document.createElement('div');
	warning.className = 'connection-error';
	warning.appendChild(document.createTextNode('Connection error. '));
	var link = document.createElement('a');
	link.appendChild(document.createTextNode('Reload?'));
	link.href = '';
	warning.appendChild(link);
	var addcomment = document.getElementsByClassName('addcomment')[0];
	addcomment.parentNode.insertAfter(warning, addcomment);
	addcomment.hidden = true;
	socket = new WebSocket((location.protocol == 'http:' ? 'ws://' : 'wss://') + location.hostname + '/qa/' + id);
	setInterval(function() {
		if (socket.readyState == 1) return location.reload();
		socket = new WebSocket((location.protocol == 'http:' ? 'ws://' : 'wss://') + location.hostname + '/qa/' + id);
	}, 200);
};
addEventListener('popstate', function(event) {
	if (socket.readyState != 1) location.reload();
});
var comments = document.getElementsByClassName('comment');
for (var i = 0; i < comments.length; i++) {
	var sctrls = comments[i].getElementsByClassName('sctrls')[0];
	sctrls.children[0].onclick = upvoteComment;
	sctrls.children[2].onclick = editComment;
	sctrls.children[3].onclick = deleteComment;
	sctrls.children[4].onclick = undeleteComment;
}
var up = document.getElementById('q-up');
up.parentNode.onclick = function() {
	request('/api/question/vote', function(res) {
		if (res.indexOf('Error') == 0) alert(res);
		else if (res == 'Success') {
			var opName = document.querySelector('#question .rep').previousElementSibling.firstChild.nodeValue,
				e = document.getElementsByClassName('user-' + opName);
			for (var i = 0; i < e.length; i++) e[i].getElementsByClassName('rep')[0].textContent -= (dn.classList.contains('clkd') ? -2 : 0) - (up.classList.contains('clkd') ? -2 : 2);
			up.classList.toggle('clkd');
			dn.classList.remove('clkd');
		} else alert('Unknown error. Response was: ' + res);
	}, 'val=' + (this.firstChild.classList.contains('clkd') ? 0 : 1));
};
var dn = document.getElementById('q-dn');
dn.parentNode.onclick = function() {
	request('/api/question/vote', function(res) {
		if (res.indexOf('Error') == 0) alert(res);
		else if (res == 'Success') {
			var opName = document.querySelector('#question .rep').previousElementSibling.firstChild.nodeValue,
				e = document.getElementsByClassName('user-' + opName);
			for (var i = 0; i < e.length; i++) e[i].getElementsByClassName('rep')[0].textContent -= (up.classList.contains('clkd') ? 2 : 0) - (dn.classList.contains('clkd') ? 2 : -2);
			dn.classList.toggle('clkd');
			up.classList.remove('clkd');
		} else alert('Unknown error. Response was: ' + res);
	}, 'val=' + (this.firstChild.classList.contains('clkd') ? 0 : -1));
};
var answers = document.getElementsByClassName('answer');
for (var i = 0; i < answers.length; i++) {
	answers[i].getElementsByClassName('up')[0].onclick = function() {
		var up = this.firstChild,
			dn = this.nextElementSibling.firstChild,
			id = parseInt(this.parentNode.parentNode.id.substr(1));
		request('/api/answer/vote', function(res) {
			if (res.indexOf('Error') == 0) alert(res);
			else if (res == 'Success') {
				var opName = document.querySelector('#a' + id + ' .rep').previousElementSibling.firstChild.nodeValue,
					e = document.getElementsByClassName('user-' + opName);
				for (var i = 0; i < e.length; i++) e[i].getElementsByClassName('rep')[0].textContent -= (dn.classList.contains('clkd') ? -5 : 0) - (up.classList.contains('clkd') ? -5 : 5);
				up.classList.toggle('clkd');
				dn.classList.remove('clkd');
			} else alert('Unknown error. Response was: ' + res);
		}, 'id=' + id + '&val=' + (up.classList.contains('clkd') ? 0 : 1));
	};
	answers[i].getElementsByClassName('dn')[0].onclick = function() {
		var up = this.previousElementSibling.firstChild,
			dn = this.firstChild,
			id = parseInt(this.parentNode.parentNode.id.substr(1));
		request('/api/answer/vote', function(res) {
			if (res.indexOf('Error') == 0) alert(res);
			else if (res == 'Success') {
				var opName = document.querySelector('#a' + id + ' .rep').previousElementSibling.firstChild.nodeValue,
					e = document.getElementsByClassName('user-' + opName);
				for (var i = 0; i < e.length; i++) e[i].getElementsByClassName('rep')[0].textContent -= (up.classList.contains('clkd') ? 5 : 0) - (dn.classList.contains('clkd') ? 5 : -5);
				dn.classList.toggle('clkd');
				up.classList.remove('clkd');
			} else alert('Unknown error. Response was: ' + res);
		}, 'id=' + id + '&val=' + (dn.classList.contains('clkd') ? 0 : -1));
	};
}
var e = document.getElementById('edit-tags').getElementsByTagName('label');
for (var i = 0; i < e.length; i++) {
	e[i].addEventListener('click', function() {
		if (!this.children[0].checked) {
			var e = this.nextElementSibling.getElementsByTagName('input');
			for (var i = 0; i < e.length; i++) e[i].checked = false;
		}
	});
	e[i].onclick = function() {
		if (this.children[0].checked) {
			var ref = this.parentNode.previousElementSibling;
			if (ref.firstElementChild) ref.firstElementChild.checked = true;
			if (ref.onclick) ref.onclick();
		}
	};
}