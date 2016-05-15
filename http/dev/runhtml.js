'use strict';
if (location.href.indexOf('/dev/new/') != -1) document.documentElement.classList.add('new-program');
var mine = document.getElementById('mine').value == '1',
	id = parseInt(document.getElementById('id').value),
	opName = document.getElementById('user').value,
	myRep = parseInt(document.getElementById('rep').value),
	username = document.querySelector('#nav > div:nth-of-type(3) > a:nth-child(2) span').firstChild.nodeValue,
	title = document.getElementById('title'),
	privitize = document.getElementById('privitize'),
	isPrivate = document.getElementById('is-private'),
	edit = document.getElementById('edit-title'),
	htmle = document.getElementById('html'),
	css = document.getElementById('css'),
	js = document.getElementById('js'),
	htmlDisplay = document.getElementById('html-display'),
	cssDisplay = document.getElementById('css-display'),
	jsDisplay = document.getElementById('js-display'),
	htmlCont = document.getElementById('html-cont'),
	cssCont = document.getElementById('css-cont'),
	jsCont = document.getElementById('js-cont'),
	restart = document.getElementById('restart'),
	save = document.getElementById('save'),
	fork = document.getElementById('fork'),
	up = document.getElementById('up'),
	dn = document.getElementById('dn'),
	editCommentForm = document.getElementById('editcomment'),
	editCommentTA = document.getElementById('comment-edit-ta'),
	editingComment,
	savedValue = [htmle.value, css.value, js.value],
	lastValue = savedValue,
	onbeforeunload = function() {
		return JSON.stringify([htmle.value, css.value, js.value]) == JSON.stringify(savedValue) ? null : 'You have unsaved code.';
	},
	blinkTimeout;
function blink() {
	document.getElementById('caret').hidden ^= 1;
	blinkTimeout = setTimeout(blink, 500);
}
function insertNodeAtPosition(node, refNode, pos) {
	if (typeof(refNode.nodeValue) == 'string') refNode.parentNode.insertBefore(node, refNode.nodeValue.length == 1 ? refNode : refNode.splitText(pos));
	else {
		for (var i = 0; i < refNode.childNodes.length; i++) {
			var chNode = refNode.childNodes[i];
			if (chNode.textContent.length <= pos && i != refNode.childNodes.length - 1) pos -= chNode.textContent.length;
			else return insertNodeAtPosition(node, chNode, pos);
		}
	}
}
highlightHTML(htmlDisplay, htmle.value);
htmlCont.dataset.line = htmlDisplay.dataset.line;
htmle.style.height = htmlDisplay.offsetHeight + 'px';
highlightCSS(cssDisplay, css.value);
cssCont.dataset.line = cssDisplay.dataset.line;
css.style.height = cssDisplay.offsetHeight + 'px';
highlightJS(jsDisplay, js.value);
jsCont.dataset.line = jsDisplay.dataset.line;
js.style.height = jsDisplay.offsetHeight + 'px';
var caret = document.createElement('span');
caret.id = 'caret';
caret.appendChild(document.createTextNode('\xA0'));
htmlDisplay.insertAfter(caret, htmlDisplay.firstChild);
if (navigator.userAgent.indexOf('Mobile') == -1) {
	htmle.focus();
	htmlCont.classList.add('focused');
	blinkTimeout = setTimeout(blink, 500);
} else caret.hidden = true;
function run() {
	if (save && !save.classList.contains('progress')) {
		save.textContent = 'Save';
		save.classList.toggle('modified', JSON.stringify([htmle.value, css.value, js.value]) != JSON.stringify(savedValue));
	}
	var outputBlob = new Blob([
		'<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><head><title>Output frame</title></head><body>' + htmle.value + '<style>' + html(css.value) + '</style><script>alert=prompt=confirm=null;' + html(js.value) + '</script></body></html>'
	], {type: 'application/xhtml+xml'});
	document.getElementById('output').src = URL.createObjectURL(outputBlob);
}
restart.onclick = run;
htmle.onkeypress = function(e) {
	var oldSelectionStart = this.selectionStart,
		el = (document.getElementById('caret') || {}).previousElementSibling;
	if (e.which == 13) {
		if (e.metaKey) return document.getElementById('title').dispatchEvent(new MouseEvent('click'));
		var toSelection = this.value.substr(0, oldSelectionStart),
			tabs = toSelection
			.split('\n')[toSelection.split('\n').length - 1]
			.split('\t').length - (el.className == 'xml-tag end-start-tag' ? 0 : 1);
		this.value = this.value.substr(0, this.selectionStart) + '\n' + '\t'.repeat(tabs) + this.value.substr(this.selectionStart);
		this.selectionStart = ++oldSelectionStart + tabs;
		this.selectionEnd = this.selectionStart;
		e.preventDefault();
	} else if (e.which == 62 && el.className == 'xml-tag end-start-tag') {
		this.value = this.value.substr(0, this.selectionStart) + '></' + el.dataset.tagname + '>' + this.value.substr(this.selectionStart);
		this.selectionEnd = this.selectionStart = ++oldSelectionStart;
		e.preventDefault();
	} else if (e.which == 34) {
		if (this.value[this.selectionStart] != '"') this.value = this.value.substr(0, this.selectionStart) + (this.value[this.selectionStart - 1] == '=' ? '""' : '"') + this.value.substr(this.selectionStart);
		this.selectionEnd = this.selectionStart = ++oldSelectionStart;
		e.preventDefault();
	} else if (e.which == 39) {
		if (this.value[this.selectionStart] != "'") this.value = this.value.substr(0, this.selectionStart) + (this.value[this.selectionStart - 1] == '=' ? "''" : "'") + this.value.substr(this.selectionStart);
		this.selectionEnd = this.selectionStart = ++oldSelectionStart;
		e.preventDefault();
	} else if (e.which == 47 && this.value.substr(this.selectionEnd - 2, 2) == '\t<' && (this.value[this.selectionEnd] || '\n') == '\n') {
		var lines = this.value.substr(0, oldSelectionStart).split('\n');
		if (lines[lines.length - 1].indexOf('\t') == -1) return;
		lines[lines.length - 1] = lines[lines.length - 1].replace('\t', '');
		this.value = lines.join('\n') + '/' + this.value.substr(oldSelectionStart);
		this.selectionEnd = this.selectionStart = oldSelectionStart;
		e.preventDefault();
	}
};
htmle.onkeydown = css.onkeydown = js.onkeydown = function(e) {
	if (e.which == 8 && this.selectionStart == this.selectionEnd) {
		if (
			(this.value[this.selectionStart - 1] == '"' && this.value[this.selectionStart] == '"') ||
			(this.value[this.selectionStart - 1] == "'" && this.value[this.selectionStart] == "'") ||
			(this.value[this.selectionStart - 1] == '(' && this.value[this.selectionStart] == ')') ||
			(this.value[this.selectionStart - 1] == '[' && this.value[this.selectionStart] == ']') ||
			(this.value[this.selectionStart - 1] == '{' && this.value[this.selectionStart] == '}')
		) {
			var oldSelectionStart = this.selectionStart;
			this.value = this.value.substr(0, this.selectionStart - 1) + this.value.substr(this.selectionStart + 1);
			this.selectionEnd = --oldSelectionStart;
			e.preventDefault();
		}
	}
};
css.onkeypress = js.onkeypress = jsKeypressHandler;
run();
var runTimeout;
htmlCont.classList.toggle('collapsed', !htmle.value);
cssCont.classList.toggle('collapsed', !css.value);
jsCont.classList.toggle('collapsed', !js.value);
function handleTAInput() {
	var cursorPos, oldCaret;
	if (htmle.value != lastValue[0]) {
		highlightHTML(htmlDisplay, htmle.value);
		htmlCont.dataset.line = htmlDisplay.dataset.line;
		htmle.style.height = htmlDisplay.offsetHeight + 'px';
		htmlCont.classList.toggle('collapsed', !htmle.value);
	}
	if (htmle.selectionStart != htmle.lastSelectionStart) {
		htmle.lastSelectionStart = htmle.selectionStart;
		htmle.whichSelection = false;
	}
	if (htmle.selectionEnd != htmle.lastSelectionEnd) {
		htmle.lastSelectionEnd = htmle.selectionEnd;
		htmle.whichSelection = true;
	}
	cursorPos = htmle.whichSelection ? htmle.selectionEnd : htmle.selectionStart;
	oldCaret = document.getElementById('caret');
	if (navigator.userAgent.indexOf('Mobile') == -1 && htmle == document.activeElement && (cursorPos != htmle.lastCursorPos || !oldCaret)) {
		htmle.lastCursorPos = cursorPos;
		if (oldCaret) oldCaret.parentNode.removeChild(oldCaret);
		var caret = document.createElement('span');
		caret.id = 'caret';
		caret.appendChild(document.createTextNode('\xA0'));
		insertNodeAtPosition(caret, htmlDisplay, cursorPos);
		clearTimeout(blinkTimeout);
		blinkTimeout = setTimeout(blink, 500);
	}
	if (css.value != lastValue[1]) {
		highlightCSS(cssDisplay, css.value);
		cssCont.dataset.line = cssDisplay.dataset.line;
		css.style.height = cssDisplay.offsetHeight + 'px';
		cssCont.classList.toggle('collapsed', !css.value);
	}
	if (css.selectionStart != css.lastSelectionStart) {
		css.lastSelectionStart = css.selectionStart;
		css.whichSelection = false;
	}
	if (css.selectionEnd != css.lastSelectionEnd) {
		css.lastSelectionEnd = css.selectionEnd;
		css.whichSelection = true;
	}
	cursorPos = css.whichSelection ? css.selectionEnd : css.selectionStart;
	oldCaret = document.getElementById('caret');
	if (navigator.userAgent.indexOf('Mobile') == -1 && css == document.activeElement && (cursorPos != css.lastCursorPos || !oldCaret)) {
		css.lastCursorPos = cursorPos;
		if (oldCaret) oldCaret.parentNode.removeChild(oldCaret);
		var caret = document.createElement('span');
		caret.id = 'caret';
		caret.appendChild(document.createTextNode('\xA0'));
		insertNodeAtPosition(caret, cssDisplay, cursorPos);
		clearTimeout(blinkTimeout);
		blinkTimeout = setTimeout(blink, 500);
	}
	if (js.value != lastValue[2]) {
		highlightJS(jsDisplay, js.value);
		jsCont.dataset.line = jsDisplay.dataset.line;
		js.style.height = jsDisplay.offsetHeight + 'px';
		jsCont.classList.toggle('collapsed', !js.value);
	}
	if (js.selectionStart != js.lastSelectionStart) {
		js.lastSelectionStart = js.selectionStart;
		js.whichSelection = false;
	}
	if (js.selectionEnd != js.lastSelectionEnd) {
		js.lastSelectionEnd = js.selectionEnd;
		js.whichSelection = true;
	}
	cursorPos = js.whichSelection ? js.selectionEnd : js.selectionStart;
	oldCaret = document.getElementById('caret');
	if (navigator.userAgent.indexOf('Mobile') == -1 && js == document.activeElement && (cursorPos != js.lastCursorPos || !oldCaret)) {
		js.lastCursorPos = cursorPos;
		if (oldCaret) oldCaret.parentNode.removeChild(oldCaret);
		var caret = document.createElement('span');
		caret.id = 'caret';
		caret.appendChild(document.createTextNode('\xA0'));
		insertNodeAtPosition(caret, jsDisplay, cursorPos);
		clearTimeout(blinkTimeout);
		blinkTimeout = setTimeout(blink, 500);
	}
	var newValue = [htmle.value, css.value, js.value];
	if (document.getElementById('autorun').checked && JSON.stringify(lastValue) != JSON.stringify(newValue)) {
		clearTimeout(runTimeout);
		runTimeout = setTimeout(run, 200);
	}
	lastValue = newValue;
}
addEventListener('keypress', function() {
	setTimeout(handleTAInput, 0);
});
addEventListener('keyup', function() {
	setTimeout(handleTAInput, 0);
});
addEventListener('keydown', function() {
	setTimeout(handleTAInput, 0);
});
addEventListener('mousedown', function() {
	setTimeout(handleTAInput, 0);
});
addEventListener('mousemove', function() {
	setTimeout(handleTAInput, 0);
});
addEventListener('input', handleTAInput);
htmle.onfocus = css.onfocus = js.onfocus = function() {
	this.parentNode.classList.add('focused');
};
htmle.onblur = css.onblur = js.onblur = function() {
	delete this.lastCursorPos;
	this.parentNode.classList.remove('focused');
	(document.getElementById('caret') || {}).hidden = true;
	clearTimeout(blinkTimeout);
};
if (navigator.userAgent.indexOf('Mobile') == -1) {
	addEventListener('focus', function() {
		(document.getElementById('caret') || {}).hidden = false;
		if (!blinkTimeout) blinkTimeout = setTimeout(blink, 500);
	});
}
addEventListener('keypress', function(e) {
	if (e.which == 13 && e.metaKey) {
		e.preventDefault();
		document.getElementById('title').dispatchEvent(new MouseEvent('click'));
	} else if (e.which == 115 && e.metaKey) {
		e.preventDefault();
		var target = e.shiftKey ? fork : save;
		if (target) target.dispatchEvent(new MouseEvent('click'));
	}
});
save.onclick = function() {
	if (save.classList.contains('progress')) return;
	save.classList.add('progress');
	var savingTimeout = setTimeout(function() {
		if (save.textContent == 'Save') save.textContent = 'Saving…';
	}, 200);
	request('/api/program/save?type=2', function(res) {
		if (res.indexOf('Error') == 0) {
			clearTimeout(savingTimeout);
			alert(res);
			save.textContent = 'Save';
		} else if (res.indexOf('Location') == 0) {
			onbeforeunload = null;
			location.href = res.split(' ')[1];
		} else if (res == 'Success') {
			save.textContent = 'Saved';
			save.classList.remove('modified');
			savedValue = [htmle.value, css.value, js.value];
			document.getElementById('updated').setAttribute('datetime', new Date().toISOString());
		} else {
			clearTimeout(savingTimeout);
			alert('Unknown error. Response was: ' + res);
		}
		save.classList.remove('progress');
	}, 'html=' + encodeURIComponent(htmle.value) + '&css=' + encodeURIComponent(css.value) + '&js=' + encodeURIComponent(js.value));
};
(document.getElementById('fork') || {}).onclick = function() {
	var e = this;
	if (e.classList.contains('progress')) return;
	e.classList.add('progress');
	e.textContent = 'Saving…';
	var e = e.previousSibling.previousSibling;
	e.hidden = e.previousSibling.previousSibling.hidden = true;
	request('/api/program/save?type=2&fork=1', function(res) {
		if (res.indexOf('Error') == 0) {
			e.hidden = false;
			e = e.nextSibling.nextSibling;
			e.hidden = false;
			e.nextSibling.nextSibling.textContent = 'Fork';
			alert(res);
		} else if (res.indexOf('Location') == 0) {
			onbeforeunload = null;
			location.href = res.split(' ')[1];
		} else alert('Unknown error. Response was: ' + res);
		e.classList.remove('progress');
	}, 'html=' + encodeURIComponent(htmle.value) + '&css=' + encodeURIComponent(css.value) + '&js=' + encodeURIComponent(js.value));
};
function upvoteComment() {
	this.title = this.classList.toggle('clkd') ? 'Unvote' : 'This comment is useful.';
	socket.send(JSON.stringify({
		event: this.classList.contains('clkd') ? 'comment-vote' : 'comment-unvote',
		id: parseInt(this.parentNode.parentNode.id.substr(1))
	}));
}
function editComment() {
	var s = this.parentNode.parentNode.classList.contains('editing'),
		existing = document.getElementById('c' + editingComment);
	if (existing) existing.classList.remove('editing');
	if (editCommentForm.hidden = s) editingComment = false;
	else {
		this.parentNode.parentNode.classList.add('editing');
		editingComment = parseInt(this.parentNode.parentNode.id.substr(1));
		editCommentTA.value = '';
		editCommentTA.placeholder = 'Loading…';
		request('/api/comment/' + editingComment + '/body', function(res) {
			if (res.indexOf('Error:') == 0) alert(res);
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
	div.insertBefore(document.getElementById('main').nextElementSibling.cloneNode(true), div.firstChild);
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
	var comments = document.getElementById('comments');
	for (var i = 0; i < comments.children.length; i++) {
		if (parseInt(comments.children[i].id.substr(1)) > data.id) return comments.insertBefore(div, comments.children[i]);
	}
	comments.appendChild(div);
}
if (document.getElementById('meta')) {
	addEventListener('DOMContentLoaded', function() {
		document.getElementById('footer').insertBefore(document.getElementById('meta'), document.getElementById('footer').firstChild);
	});
	if (mine) {
		document.getElementById('title').onclick = function() {
			this.hidden = true;
			edit.hidden = false;
			edit.focus();
		};
		edit.onblur = function() {
			request('/api/program/edit-title', function(res) {
				var edit = edit;
				if (res.indexOf('Error') == 0) {
					alert(res);
					edit.value = document.getElementById('title').textContent;
				} else if (res == 'Success') {
					edit.hidden = true;
					document.title = (title.textContent = edit.value.substr(0, 92) || 'Untitled') + ' | Programs | DevDoodle';
					if (!edit.value) edit.value = 'Untitled';
					title.hidden = false;
				} else alert('Unknown error. Response was: ' + res);
			}, 'title=' + encodeURIComponent(this.value));
		};
		edit.onkeypress = function(e) {
			if (e.which == 13) this.onblur.call(this);
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
			if (socket.readyState == 1 && JSON.stringify([htmle.value, css.value, js.value]) == JSON.stringify(savedValue)) return location.reload();
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
		sctrls.firstChild.onclick = upvoteComment;
		sctrls.children[2].onclick = editComment;
		sctrls.children[3].onclick = deleteComment;
		sctrls.children[4].onclick = undeleteComment;
	}
}