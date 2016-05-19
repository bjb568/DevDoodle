'use strict';
var canvasJS = document.getElementById('canvas-js').value;
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
var code = document.getElementById('code'),
	codeDisplay = document.getElementById('code-display'),
	taCont = document.getElementById('ta-cont'),
	output = document.getElementById('output'),
	fullScreen = false,
	savedValue = code.value;
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
	if (save && !save.classList.contains('progress')) {
		save.textContent = 'Save';
		save.classList.toggle('modified', code.value != savedValue);
	}
	var outputBlob = new Blob([
		'<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><head><title>Output frame</title></head><style>*{margin:0;max-width:100%;box-sizing:border-box}body{background:#000;color:#fff}#canvas{border:1px solid #fff;-webkit-user-select:none;-moz-user-select:none;cursor:default}#console{height:100px;background:#111;padding:4px;overflow:auto;margin-top:8px}button,canvas{display:block}button{margin-top:6px}</style><body><canvas id="canvas"></canvas><div id="console"></div><button onclick="location.reload()">Restart</button><script>' + html(canvasJS) + 'try{this.eval(' + html(JSON.stringify(lines.join('\n'))) + ')}catch (e){error(e)}</script></body></html>'
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
});
addEventListener('keypress', function(e) {
	if (e.which == 13 && e.metaKey) {
		e.preventDefault();
		title.dispatchEvent(new MouseEvent('click'));
	} else if (e.which == 115 && e.metaKey) {
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
			save.classList.remove('modified');
			document.getElementById('updated').setAttribute('datetime', new Date().toISOString());
		} else {
			clearTimeout(savingTimeout);
			alert('Unknown error. Response was: ' + res);
		}
		save.classList.remove('progress');
	}, 'code=' + encodeURIComponent(code.value));
};
(document.getElementById('fork') || {}).onclick = function() {
	if (canUnload()) return alert('You have not made modifications to this program.');
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
function canUnload() {
	return code.value == savedValue;
}