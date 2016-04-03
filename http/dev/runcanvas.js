if (location.href.indexOf('/dev/new/') != -1) document.documentElement.classList.add('new-program');
var mine = (document.getElementById('mine') || {}).value == '1',
	id = parseInt((document.getElementById('id') || {}).value),
	opName = (document.getElementById('user') || {}).value,
	myRep = parseInt((document.getElementById('rep') || {}).value),
	username = document.querySelector('#nav > div:nth-of-type(2) > a:nth-child(2) span').firstChild.nodeValue,
	editCommentForm = document.getElementById('editcomment'),
	editCommentTA = document.getElementById('comment-edit-ta'),
	editingComment,
 	canvasJS = document.getElementById('canvas-js').value;
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
var blinkTimeout;
var code = document.getElementById('code'),
	codeDisplay = document.getElementById('code-display'),
	taCont = document.getElementById('ta-cont'),
	output = document.getElementById('output'),
	save = document.getElementById('save'),
	fork = document.getElementById('fork'),
	up = document.getElementById('up'),
	dn = document.getElementById('dn'),
	fullScreen = false,
	savedValue = code.value,
	onbeforeunload = function() {
		return code.value == savedValue ? null : 'You have unsaved code.';
	};
code.lastSelectionStart = 0;
code.lastSelectionEnd = 0;
code.lastCursorPos = 0;
code.whichSelection = true;
highlightJS(codeDisplay, code.lastValue = code.value);
taCont.dataset.line = codeDisplay.dataset.line;
codeDisplay.classList.add('code-display');
taCont.classList.add('ta-cont');
var caret = document.createElement('span');
caret.id = 'caret';
caret.appendChild(document.createTextNode('\xA0'));
codeDisplay.insertAfter(caret, codeDisplay.firstChild);
if (navigator.userAgent.indexOf('Mobile') == -1) {
	code.focus();
	taCont.classList.add('focused');
	blinkTimeout = setTimeout(blink, 500);
} else caret.hidden = true;
var oldValue,
	runTimeout;
function run() {
	if (oldValue == code.value) return;
	oldValue = code.value;
	var lines = code.value.split('\n');
	for (var i = 0; i < lines.length; i++) {
		if (navigator.userAgent.indexOf('Mobile') == -1 && lines[i].indexOf('requestEnableFullScreen;') == 0) {
			lines[i] = 'requestFullLayoutMode();' + lines[i].substr(25);
			if (navigator.userAgent.indexOf('Mobile') == -1 && !fullScreen) document.body.classList.add('fullscreen');
		}
	}
	if (save && !save.classList.contains('progress') && code.value != savedValue) save.textContent = 'Save';
	var outputBlob = new Blob([
		'<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><head><title>Output frame</title></head><style>*{margin:0;max-width:100%;box-sizing:border-box}body{background:#000;color:#fff}#canvas{border:1px solid #fff;-webkit-user-select:none;-moz-user-select:none;cursor:default}#console{height:100px;background:#111;padding:4px;overflow:auto;margin-top:8px}button,canvas{display:block}button{margin-top:6px}</style><body><canvas id="canvas"></canvas><div id="console"></div><button onclick="location.reload()">Restart</button><script>\'use strict\';' + html(canvasJS) + 'try{this.eval(\'\\\'use strict\\\';\' + ' + html(JSON.stringify(lines.join('\n'))) + ')}catch(e){error(e)}</script></body></html>'
	], {type: 'application/xhtml+xml'});
	output.src = URL.createObjectURL(outputBlob);
}
function handleTAInput() {
	if (code.value != code.lastValue) {
		highlightJS(codeDisplay, code.lastValue = code.value);
		taCont.dataset.line = codeDisplay.dataset.line;
	}
	code.style.height = codeDisplay.offsetHeight + 'px';
	if (code.selectionStart != code.lastSelectionStart) {
		code.lastSelectionStart = code.selectionStart;
		code.whichSelection = false;
	}
	if (code.selectionEnd != code.lastSelectionEnd) {
		code.lastSelectionEnd = code.selectionEnd;
		code.whichSelection = true;
	}
	var cursorPos = code.whichSelection ? code.selectionEnd : code.selectionStart;
	var oldCaret = document.getElementById('caret');
	if (navigator.userAgent.indexOf('Mobile') == -1 && code == document.activeElement && (cursorPos != code.lastCursorPos || !oldCaret)) {
		code.lastCursorPos = cursorPos;
		if (oldCaret) oldCaret.parentNode.removeChild(oldCaret);
		var caret = document.createElement('span');
		caret.id = 'caret';
		caret.appendChild(document.createTextNode('\xA0'));
		insertNodeAtPosition(caret, codeDisplay, cursorPos);
		clearTimeout(blinkTimeout);
		blinkTimeout = setTimeout(blink, 500);
	}
	clearTimeout(runTimeout);
	runTimeout = setTimeout(run, 200);
}
handleTAInput();
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
code.addEventListener('input', handleTAInput);
code.addEventListener('focus', function() {
	this.parentNode.classList.add('focused');
});
code.addEventListener('blur', function() {
	delete this.lastCursorPos;
	this.parentNode.classList.remove('focused');
	document.getElementById('caret').hidden = true;
	clearTimeout(blinkTimeout);
});
if (navigator.userAgent.indexOf('Mobile') == -1) {
	code.addEventListener('focus', function() {
		(document.getElementById('caret') || {}).hidden = false;
		if (!blinkTimeout) blinkTimeout = setTimeout(blink, 500);
	});
}
code.addEventListener('keypress', jsKeypressHandler);
code.addEventListener('keydown', function(e) {
	if (e.keyCode == 8 && this.selectionStart == this.selectionEnd) {
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
});
addEventListener('keypress', function(e) {
	if (e.keyCode == 13 && e.metaKey) {
		e.preventDefault();
		title.dispatchEvent(new MouseEvent('click'));
	} else if (e.keyCode == 115 && e.metaKey) {
		e.preventDefault();
		var target = e.shiftKey ? fork : save;
		if (target) target.dispatchEvent(new MouseEvent('click'));
	}
});
if (save) save.onclick = function() {
	if (save.classList.contains('progress')) return;
	save.classList.add('progress');
	var savingTimeout = setTimeout(function() {
		if (save.textContent == 'Save') save.textContent = 'Saving…';
	}, 200);
	request('/api/program/save?type=1', function(res) {
		if (res.indexOf('Error') == 0) {
			clearTimeout(savingTimeout);
			alert(res);
			save.textContent = 'Save';
		} else if (res.indexOf('Location') == 0) {
			onbeforeunload = null;
			location.href = res.split(' ')[1];
		} else if (res == 'Success') {
			savedValue = code.value;
			save.textContent = 'Saved';
			document.getElementById('updated').setAttribute('datetime', new Date().toISOString());
		} else {
			clearTimeout(savingTimeout);
			alert('Unknown error. Response was: ' + res);
		}
		save.classList.remove('progress');
	}, 'code=' + encodeURIComponent(code.value));
};
(document.getElementById('fork') || {}).onclick = function() {
	if (code.value == savedValue) return alert('You have not made modifications to this program.');
	var e = this;
	if (e.classList.contains('progress')) return;
	e.classList.add('progress');
	e.textContent = 'Saving…';
	var e = e.previousSibling.previousSibling;
	e.hidden = e.previousSibling.previousSibling.hidden = true;
	request('/api/program/save?type=1&fork=1', function(res) {
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
	}, 'code=' + encodeURIComponent(code.value));
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
if (document.getElementById('meta')) {
	addEventListener('DOMContentLoaded', function() {
		document.getElementById('footer').insertBefore(document.getElementById('meta'), document.getElementById('footer').firstChild);
	});
	if (mine) {
		var title = document.getElementById('title'),
			edit = document.getElementById('edit-title');
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
			if (e.keyCode == 13) this.onblur.call(this);
			else if (e.keyCode == 27) {
				this.value = title.textContent;
				title.hidden = false;
				this.hidden = true;
				code.focus();
			}
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
	var socket = new WebSocket((location.protocol == 'http:' ? 'ws://': 'wss://') + location.hostname + '/dev/' + id);
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
		location.hash = '';
		history.replaceState('', document.title, window.location.pathname);
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
		} catch(err) {
			console.log(err);
			return alert('JSON Error. Response was: ' + e.data);
		}
		if (data.event == 'comment-add') {
			var div = document.createElement('div');
			div.className = 'comment';
			div.innerHTML = (username ? markdown(data.body + ' ').replace(new RegExp('@' + username + '(\\W)', 'g'), '<span class="mention">@' + username + '</span>$1') : markdown(data.body));
			if (myRep >= 50) {
				div.insertBefore(document.getElementById('main').nextElementSibling.cloneNode(true), div.firstChild);
				div.firstChild.firstChild.onclick = upvoteComment;
				if (username == data.user) div.firstChild.children[2].onclick = editComment;
				else div.firstChild.removeChild(div.firstChild.lastChild);
				var score = document.createElement('span');
				score.classList.add('score');
				score.appendChild(document.createTextNode(score.dataset.score = 0));
				div.insertBefore(score, div.firstChild);
			}
			var sig = document.createElement('span');
			sig.classList.add('c-sig');
			sig.appendChild(document.createTextNode('-'));
			var a = document.createElement('a');
			a.href = '/user/' + data.user;
			a.appendChild(document.createTextNode(data.user));
			sig.appendChild(a);
			sig.appendChild(document.createTextNode(', '));
			var permalink = document.createElement('a');
			if (!data.time) data.time = new Date().getTime();
			permalink.appendChild(agot(data.time));
			permalink.href = '#' + (div.id = 'c' + data.id);
			sig.appendChild(permalink);
			var currentNode = div;
			while (!sig.parentNode) {
				if (!currentNode.lastElementChild || ['blockquote', 'code', 'a', 'img', 'div'].indexOf(currentNode.lastElementChild.tagName) != -1) currentNode.appendChild(sig);
				else currentNode = currentNode.lastElementChild;
			}
			document.getElementById('comments').appendChild(div);
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
		setInterval(function() {
			if (socket.readyState == 1) return location.reload(true);
			socket = new WebSocket((location.protocol == 'http:' ? 'ws://': 'wss://') + location.hostname + '/dev/' + id);
		}, 5000);
	};
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
		if (sctrls.children.length == 4) sctrls.children[2].onclick = editComment;
	}
}