'use strict';
if (location.href.indexOf('/dev/new/') != -1) document.documentElement.classList.add('new-program');
var mine = (document.getElementById('mine') || {}).value == '1',
	id = parseInt((document.getElementById('id') || {}).value),
	opName = (document.getElementById('user') || {}).value,
	myRep = parseInt((document.getElementById('rep') || {}).value),
	username = document.querySelector('#nav > div:nth-of-type(3) > a:nth-child(2) span').firstChild.nodeValue,
	title = document.getElementById('title'),
	privitize = document.getElementById('privitize'),
	isPrivate = document.getElementById('is-private'),
	edit = document.getElementById('edit-title'),
	editCommentForm = document.getElementById('editcomment'),
	editCommentTA = document.getElementById('comment-edit-ta'),
	editingComment,
	save = document.getElementById('save'),
	fork = document.getElementById('fork'),
	up = document.getElementById('up'),
	dn = document.getElementById('dn'),
	blinkTimeout,
	onbeforeunload = function() {
		return canUnload() ? null : 'You have unsaved code.';
	};
function blink() {
	document.getElementById('caret').hidden ^= 1;
	blinkTimeout = setTimeout(blink, 500);
}
if (document.getElementById('meta')) {
	addEventListener('DOMContentLoaded', function() {
		document.getElementById('footer').insertBefore(document.getElementById('meta'), document.getElementById('footer').firstChild);
	});
	if (mine) {
		title.onclick = function() {
			this.hidden = true;
			edit.hidden = false;
			edit.focus();
		};
		edit.onblur = function() {
			request('/api/program/edit-title', function(res) {
				if (res.indexOf('Error') == 0) {
					alert(res);
					edit.value = title.textContent;
				} else if (res == 'Success') {
					edit.hidden = true;
					document.title = (title.textContent = edit.value.substr(0, 92) || 'Untitled') + ' | Programs | DevDoodle';
					if (!edit.value) edit.value = 'Untitled';
					title.hidden = false;
					code.focus();
				} else alert('Unknown error. Response was: ' + res);
			}, 'title=' + encodeURIComponent(this.value));
		};
		edit.onkeypress = function(e) {
			if (e.which == 13) this.onblur.apply(this);
			else if (e.which == 27) {
				this.value = title.textContent;
				title.hidden = false;
				this.hidden = true;
				code.focus();
			}
		};
		privitize.onclick = function() {
			socket.send(JSON.stringify({
				event: 'privitize',
				private: !isPrivate.classList.contains('private')
			}));
		};
	}
	up.onclick = function() {
		request('/api/program/vote', function(res) {
			if (res.indexOf('Error') == 0) alert(res);
			else if (res == 'Success') {
				document.getElementsByClassName('user-' + opName)[0].getElementsByClassName('rep')[0].textContent -= (dn.classList.contains('clkd') ? -1 : 0) - (up.classList.contains('clkd') ? -1 : 1);
				up.classList.toggle('clkd');
				dn.classList.remove('clkd');
			} else alert('Unknown error. Response was: ' + res);
		}, 'val=' + (this.classList.contains('clkd') ? 0 : 1));
	};
	dn.onclick = function() {
		request('/api/program/vote', function(res) {
			if (res.indexOf('Error') == 0) alert(res);
			else if (res == 'Success') {
				document.getElementsByClassName('user-' + opName)[0].getElementsByClassName('rep')[0].textContent -= (up.classList.contains('clkd') ? 1 : 0) - (dn.classList.contains('clkd') ? 1 : -1);
				dn.classList.toggle('clkd');
				up.classList.remove('clkd');
			} else alert('Unknown error. Response was: ' + res);
		}, 'val=' + (this.classList.contains('clkd') ? 0 : -1));
	};
	document.getElementById('addcomment').onclick = function() {
		setTimeout(function() {
			document.getElementById('commentta').focus();
		}, 0);
	};
	var socket = new WebSocket((location.protocol == 'http:' ? 'ws://' : 'wss://') + location.hostname + '/dev/' + id);
	document.getElementById('comment').onsubmit = function(e) {
		e.preventDefault();
		if (this.firstElementChild.mdValidate(true)) return;
		socket.send(JSON.stringify({
			event: 'comment',
			body: document.getElementById('commentta').value
		}));
		document.getElementById('commentta').value = '';
		document.getElementById('c-reset').onclick();
	};
	document.getElementById('c-reset').onclick = function() {
		var scrlTop = document.body.scrollTop;
		location.hash = '';
		history.replaceState('', document.title, window.location.pathname);
		document.body.scrollTop = scrlTop;
	};
	document.getElementById('c-edit-reset').onclick = function() {
		editCommentForm.hidden = true;
		document.getElementById('c' + editingComment).classList.remove('editing');
		editingComment = null;
	};
	editCommentForm.onsubmit = function(e) {
		e.preventDefault();
		if (this.firstElementChild.mdValidate(true)) return;
		socket.send(JSON.stringify({
			event: 'comment-edit',
			id: editingComment,
			body: editCommentTA.value
		}));
		editCommentForm.hidden = true;
		document.getElementById('c' + editingComment).classList.remove('editing');
		editingComment = null;
	};
	socket.onmessage = function(e) {
		console.log(e.data);
		try {
			var data = JSON.parse(e.data);
		} catch (err) {
			console.log(err);
			return alert('JSON Error. Response was: ' + e.data);
		}
		if (data.event == 'comment-add') {
			createComment(data);
			div.scrollIntoView(true);
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
		} else if (data.event == 'privitize') {
			isPrivate.classList.toggle('private', data.private);
			title.lastChild[data.private ? 'removeAttribute' : 'setAttribute']('hidden', '');
			isPrivate.firstChild.nodeValue = data.private ? 'private' : 'public';
			if (privitize) privitize.firstChild.nodeValue = 'Make ' + (data.private ? 'public' : 'private');
		} else if (data.event == 'err') {
			alert('Error: ' + data.body);
			if (data.commentUnvote) document.getElementById('c' + data.commentUnvote).getElementsByClassName('up')[0].parentNode.classList.remove('clkd');
		}
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
		var addcomment = document.getElementById('addcomment');
		addcomment.parentNode.insertAfter(warning, addcomment);
		addcomment.hidden = true;
		socket = new WebSocket((location.protocol == 'http:' ? 'ws://' : 'wss://') + location.hostname + '/dev/' + id);
		setInterval(function() {
			if (socket.readyState == 1 && canUnload()) return location.reload();
			socket = new WebSocket((location.protocol == 'http:' ? 'ws://' : 'wss://') + location.hostname + '/dev/' + id);
		}, 200);
	};
	addEventListener('popstate', function(event) {
		if (socket.readyState != 1) location.reload();
	});
	var deletebutton = document.getElementById('delete');
	if (deletebutton) {
		deletebutton.onclick = function() {
			if (confirm('Do you want to delete this program?')) {
				request('/api/program/delete', function(res) {
					if (res.indexOf('Error') == 0) alert(res);
					else if (res == 'Success') location.reload();
					else alert('Unknown error. Response was: ' + res);
				});
			}
		};
	}
	var comments = document.getElementsByClassName('comment');
	for (var i = 0; i < comments.length; i++) {
		var sctrls = comments[i].getElementsByClassName('sctrls')[0];
		sctrls.children[1].onclick = upvoteComment;
		sctrls.children[2].onclick = editComment;
		sctrls.children[3].onclick = deleteComment;
		sctrls.children[4].onclick = undeleteComment;
	}
}