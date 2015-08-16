function blink() {
	document.getElementById('caret').hidden ^= 1;
	blinkTimeout = setTimeout(blink, 500);
}
function insertNodeAtPosition(node, refNode, pos) {
	if (typeof(refNode.nodeValue) == 'string') refNode.parentNode.insertBefore(node, refNode.splitText(pos));
	else {
		for (var i = 0; i < refNode.childNodes.length; i++) {
			var chNode = refNode.childNodes[i];
			if (chNode.textContent.length <= pos && i != refNode.childNodes.length - 1) pos -= chNode.textContent.length;
			else return insertNodeAtPosition(node, chNode, pos);
		}
	}
}
var blinkTimeout;
function upvoteComment() {
	this.classList.toggle('clkd');
	socket.send(JSON.stringify({
		event: this.classList.contains('clkd') ? 'vote' : 'unvote',
		id: parseInt(this.parentNode.parentNode.id.substr(1))
	}));
}
addEventListener('DOMContentLoaded', function() {
	var code = document.getElementById('code'),
		codeDisplay = document.getElementById('code-display'),
		taCont = document.getElementById('ta-cont'),
		output = document.getElementById('output'),
		save = document.getElementById('save'),
		up = document.getElementById('up'),
		dn = document.getElementById('dn');
	code.lastSelectionStart = 0;
	code.lastSelectionEnd = 0;
	code.lastCursorPos = 0;
	code.whichSelection = true;
	highlight(codeDisplay, code.lastValue = code.value);
	taCont.className = codeDisplay.className;
	var caret = document.createElement('span');
	caret.id = 'caret';
	caret.appendChild(document.createTextNode('\xA0'));
	codeDisplay.insertAfter(caret, codeDisplay.firstChild);
	blinkTimeout = setTimeout(blink, 500);
	function handleTAInput() {
		var codeScrollDiff = code.scrollHeight - code.offsetHeight;
		if (code.value != code.lastValue) {
			highlight(codeDisplay, code.lastValue = code.value);
			taCont.className = codeDisplay.className;
		}
		code.style.height = codeDisplay.offsetHeight + 'px';
		taCont.scrollTop += codeScrollDiff;
		if (code.selectionStart != code.lastSelectionStart) {
			code.lastSelectionStart = code.selectionStart;
			code.whichSelection = false;
		}
		if (code.selectionEnd != code.lastSelectionEnd) {
			code.lastSelectionEnd = code.selectionEnd;
			code.whichSelection = true;
		}
		var cursorPos = code.whichSelection ? code.selectionEnd : code.selectionStart;
		if (cursorPos != code.lastCursorPos) {
			code.lastCursorPos = cursorPos;
			var oldCaret = document.getElementById('caret');
			if (oldCaret) oldCaret.parentNode.removeChild(oldCaret);
			var caret = document.createElement('span');
			caret.id = 'caret';
			caret.appendChild(document.createTextNode('\xA0'));
			insertNodeAtPosition(caret, codeDisplay, cursorPos);
			clearTimeout(blinkTimeout);
			blinkTimeout = setTimeout(blink, 500);
		}
	}
	code.addEventListener('keypress', function() {
		setTimeout(handleTAInput, 0);
	});
	code.addEventListener('keyup', function() {
		setTimeout(handleTAInput, 0);
	});
	code.addEventListener('keydown', function() {
		setTimeout(handleTAInput, 0);
	});
	code.addEventListener('mousedown', function() {
		setTimeout(handleTAInput, 0);
	});
	addEventListener('mousemove', function() {
		setTimeout(handleTAInput, 0);
	});
	code.addEventListener('input', handleTAInput);
	code.addEventListener('blur', function() {
		document.getElementById('caret').hidden = true;
		clearTimeout(blinkTimeout);
	});
	code.addEventListener('focus', function() {
		document.getElementById('caret').hidden = false;
		clearTimeout(blinkTimeout);
		blinkTimeout = setTimeout(blink, 500);
	});
	code.addEventListener('keypress', function(e) {
		var oldSelectionStart = this.selectionStart;
		var pairChars = {};
		pairChars[40] = '()';
		pairChars[91] = '[]';
		pairChars[123] = '{}';
		var endChars = {};
		endChars[41] = ')';
		endChars[93] = ']';
		endChars[125] = '}';
		if (e.keyCode == 13) {
			var cut = (this.value.substr(0, oldSelectionStart).match(/(\S([ \t]+)| +)$/) || ['', '', ''])[2].length;
			this.value = this.value.substr(0, oldSelectionStart - cut) + this.value.substr(oldSelectionStart);
			oldSelectionStart = this.selectionStart = this.selectionEnd = oldSelectionStart - cut;
			if (this.value[oldSelectionStart - 1] == ',') this.eIndent = true;
			var tabs = this.value.substr(0, oldSelectionStart)
				.split('\n')[this.value.substr(0, oldSelectionStart).split('\n').length - 1]
				.split('\t').length
				- (
					('{([:'.indexOf(this.value[oldSelectionStart - 1]) + 1)
					? 0
					: (
						this.value[oldSelectionStart - 1] == ';' && this.eIndent
						? (this.eIndent = false || 2)
						: 1
					)
				);
			this.value = this.value.substr(0, this.selectionStart) + '\n' + '\t'.repeat(tabs) + (['{}', '()', '[]'].indexOf(this.value.substr(oldSelectionStart - 1, 2)) == -1 ? '' : '\n' + '\t'.repeat(tabs - 1)) + this.value.substr(this.selectionStart);
			this.selectionEnd = this.selectionStart = ++oldSelectionStart + tabs;
			e.preventDefault();
		} else if (e.charCode == 34) {
			if (this.value[this.selectionStart] != '"') this.value = this.value.substr(0, this.selectionStart) + '""' + this.value.substr(this.selectionStart);
			this.selectionEnd = this.selectionStart = ++oldSelectionStart;
			e.preventDefault();
		} else if (e.charCode == 39) {
			if (this.value[this.selectionStart] != "'") this.value = this.value.substr(0, this.selectionStart) + "''" + this.value.substr(this.selectionStart);
			this.selectionEnd = this.selectionStart = ++oldSelectionStart;
			e.preventDefault();
		} else if (pairChars[e.keyCode]) {
			this.value = this.value.substr(0, this.selectionStart) + pairChars[e.keyCode] + this.value.substr(this.selectionStart);
			this.selectionEnd = ++oldSelectionStart;
			e.preventDefault();
		} else if (endChars[e.keyCode] && this.value[this.selectionStart] == endChars[e.keyCode]) {
			this.selectionStart = ++this.selectionEnd;
			e.preventDefault();
		} else if (e.keyCode == 61 && this.value.substr(0, this.selectionStart).match(/(draw|refresh) $/)) {
			var tabs = this.value.substr(0, oldSelectionStart).split('\n')[this.value.substr(0, oldSelectionStart).split('\n').length - 1].split('\t').length;
			this.value = this.value.substr(0, this.selectionStart) + '= function() {\n' + '\t'.repeat(tabs) + '\n' + '\t'.repeat(tabs - 1) + '};' + this.value.substr(this.selectionStart);
			this.selectionEnd = this.selectionStart = oldSelectionStart + 15 + tabs;
			e.preventDefault();
		} else if (e.keyCode == 44) {
			this.value = this.value.substr(0, this.selectionStart) + ', ' + this.value.substr(this.selectionStart);
			this.selectionEnd = this.selectionStart = oldSelectionStart + 2;
			e.preventDefault();
		} else if (e.keyCode == 58) {
			this.value = this.value.substr(0, this.selectionStart) + ': ' + this.value.substr(this.selectionStart);
			this.selectionEnd = this.selectionStart = oldSelectionStart + 2;
			e.preventDefault();
		}
	});
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
	var fullScreen = false,
		fsBtn = document.getElementById('fullscreen-button'),
		regLayout = document.getElementById('regular-layout');
	function enableFullScreen() {
		document.body.classList.add('fullscreen');
		fsBtn.hidden = false;
		regLayout.hidden = false;
	}
	if (regLayout) regLayout.onclick = function() {
		document.body.classList.remove('fullscreen');
		this.hidden = true;
	};
	function hashChangeFullScreenHandler() {
		if (location.hash == '#fullscreen') {
			output.classList.add('fullscreen');
			document.body.classList.add('noscrl');
			document.getElementById('close-fullscreen').hidden = false;
			output.focus();
		} else {
			output.classList.remove('fullscreen');
			document.body.classList.remove('noscrl');
			document.getElementById('close-fullscreen').hidden = true;
			code.focus();
		}
	}
	if (fsBtn) {
		fsBtn.onclick = function() {
			document.getElementById('close-fullscreen').hidden = false;
			enableFullScreen();
		};
		addEventListener('hashchange', hashChangeFullScreenHandler);
		hashChangeFullScreenHandler();
	}
	var oldValue;
	function handleCode(init) {
		if (code.value != oldValue) {
			oldValue = code.value;
			var lines = code.value.split('\n');
			for (var i = 0; i < lines.length; i++) {
				if (lines[i].indexOf('requestEnableFullScreen;') == 0) {
					lines[i] = 'requestFullLayoutMode();' + lines[i].substr(25);
					if (navigator.userAgent.indexOf('Mobile') == -1 && !fullScreen) enableFullScreen();
				}
			}
			if (save && !save.classList.contains('progress')) save.textContent = 'Save';
			output.srcdoc = '<!DOCTYPE html><html><head><title>Output frame</title></head><style>*{margin:0;max-width:100%;box-sizing:border-box}body{background:#000;color:#fff}#canvas{border:1px solid #fff;-webkit-user-select:none;-moz-user-select:none;cursor:default}#console{height:100px;background:#111;overflow:auto;margin-top:8px}button,canvas{display:block}button{margin-top:6px}</style><body><canvas id="canvas"></canvas><div id="console"></div><button onclick="location.reload()">Restart</button><script src="/dev/canvas.js"></script><script>\'use strict\';window.alert=window.confirm=window.prompt=null;try{this.eval(' + JSON.stringify(lines.join('\n')) + ')}catch(e){error(e)}</script></body></html>';
		}
	}
	var timeout = setTimeout(handleCode, 100);
	code.addEventListener('input', function() {
		clearTimeout(timeout);
		timeout = setTimeout(handleCode, 100);
		onbeforeunload = function() {
			return 'You have unsaved code.';
		};
	});
	handleCode(true);
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
				onbeforeunload = null;
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
	if (document.getElementById('meta')) {
		if (window.mine) {
			document.getElementById('title').onclick = function() {
				this.hidden = true;
				var edit = document.getElementById('edit-title');
				edit.hidden = false;
				edit.focus();
			};
			document.getElementById('edit-title').onblur = function() {
				request('/api/program/edit-title', function(res) {
					var edit = document.getElementById('edit-title');
					if (res.indexOf('Error') == 0) {
						alert(res);
						edit.value = document.getElementById('title').textContent;
					} else if (res == 'Success') {
						edit.hidden = true;
						var title = document.getElementById('title');
						document.title = (title.textContent = edit.value.substr(0, 92) || 'Untitled') + ' | Programs | DevDoodle';
						if (!edit.value) edit.value = 'Untitled';
						title.hidden = false;
					} else alert('Unknown error. Response was: ' + res);
				}, 'title=' + encodeURIComponent(this.value));
			};
			document.getElementById('edit-title').onkeypress = function(e) {
				if (e.keyCode == 13) this.onblur.call(this);
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
		var socket = new WebSocket('wss://' + location.hostname + ':81/dev/' + id);
		document.getElementById('comment').onsubmit = function(e) {
			socket.send(JSON.stringify({
				event: 'post',
				body: document.getElementById('commentta').value
			}));
			document.getElementById('commentta').value = '';
			document.getElementById('reset').onclick();
			e.preventDefault();
		};
		document.getElementById('reset').onclick = function() {
			location.hash = '';
			history.replaceState('', document.title, window.location.pathname);
		};
		socket.onmessage = function(e) {
			console.log(e.data);
			try {
				var data = JSON.parse(e.data);
			} catch(err) {
				console.log(err);
				return alert('JSON Error. Response was: ' + e.data);
			}
			if (data.event == 'add') {
				var div = document.createElement('div');
				div.classList.add('comment');
				div.innerHTML = ' ' + markdown(data.body);
				if (myRep >= 50) {
					div.insertBefore(document.getElementById('meta').nextElementSibling.cloneNode(true), div.firstChild);
					div.firstChild.firstChild.onclick = upvoteComment;
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
				div.appendChild(sig);
				document.getElementById('comments').appendChild(div);
				div.scrollIntoView(true);
			} else if (data.event == 'scorechange') {
				var c = document.getElementById('c' + data.id);
				if (c) c.getElementsByClassName('score')[0].dataset.score = c.getElementsByClassName('score')[0].textContent = data.score;
			} else if (data.event == 'err') {
				alert('Error: ' + data.body);
				if (data.commentUnvote) document.getElementById('c' + data.commentUnvote).getElementsByClassName('up')[0].classList.remove('clkd');
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
				socket = new WebSocket('wss://' + location.hostname + ':81/dev/' + id);
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
			comments[i].getElementsByClassName('sctrls')[0].firstChild.onclick = upvoteComment;
		}
	}
});
function highlight(codeBlock, input) {
	var input = typeof(input) == 'string' ? input : codeBlock.textContent,
		chunk = '',
		warnings = [],
		beforeWord,
		line = 1,
		inVarDec = [],
		d,
		fc;
	while (fc = codeBlock.firstChild) codeBlock.removeChild(fc);
	var linenum = document.createElement('span');
	linenum.className = 'line';
	linenum.dataset.linenum = line;
	codeBlock.appendChild(linenum);
	for (var i = 0; i < input.length; i++) {
		var c = input[i],
			l;
		if (c == '"' || c == "'") {
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = c;
			var string = document.createElement('span');
			string.className = 'string';
			while ((d = input[++i]) && d != c) {
				if (d == '\n') {
					warnings.push([i, 'Unexpected line end with unterminated string literal.']);
					break;
				} else if (d == '\\') {
					string.appendChild(document.createTextNode(chunk));
					chunk = d;
					if (d = input[++i]) chunk += d;
					else warnings.push([i - 1, 'Incomplete escape sequence.']);
					var escape = document.createElement('span');
					escape.className = 'escape';
					if (d == 'u') {
						if (d = input[++i]) chunk += d;
						if (d == '{') {
							while ((d = input[++i]) && d != '}') {
								if (d == '\n' || d == string) {
									warnings.push([i, 'Unclosed bracket escape sequence.']);
									break;
								}
								chunk += d;
							}
							if (d == '}') chunk += '}';
						} else if (input[i + 3]) chunk += input[++i] + input[++i] + input[++i];
						else warnings.push([i, 'Incomplete escape sequence.']);
					} else if (c == 'x') chunk += input[++i] + input[++i];
					escape.appendChild(document.createTextNode(chunk));
					string.appendChild(escape);
					chunk = '';
					if (d == '\n') {
						var linenum = document.createElement('span');
						linenum.className = 'line';
						linenum.dataset.linenum = ++line;
						string.appendChild(linenum);
					}
				} else chunk += d;
			}
			if (d) chunk += d;
			string.appendChild(document.createTextNode(chunk));
			codeBlock.appendChild(string);
			chunk = '';
			if (d == '\n') {
				var linenum = document.createElement('span');
				linenum.className = 'line';
				linenum.dataset.linenum = ++line;
				codeBlock.appendChild(linenum);
			}
		} else if (c == '/' && input[i + 1] == '/') {
			i++;
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = '//';
			var comment = document.createElement('span');
			comment.className = 'inline-comment';
			while ((d = input[++i]) && d != '\n') chunk += d;
			if (d) chunk += '\n';
			comment.appendChild(document.createTextNode(chunk));
			codeBlock.appendChild(comment);
			chunk = '';
			if (d) {
				var linenum = document.createElement('span');
				linenum.className = 'line';
				linenum.dataset.linenum = ++line;
				codeBlock.appendChild(linenum);
			}
		} else if (c == '/' && input[i + 1] == '*') {
			i++;
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = '/*';
			var comment = document.createElement('span');
			comment.className = 'inline-comment';
			while ((d = input[++i]) && (d != '/' || input[i - 1] != '*')) {
				chunk += d;
				if (d == '\n') {
					comment.appendChild(document.createTextNode(chunk));
					chunk = '';
					var linenum = document.createElement('span');
					linenum.className = 'line';
					linenum.dataset.linenum = ++line;
					comment.appendChild(linenum);
				}
			}
			if (d) chunk += d;
			comment.appendChild(document.createTextNode(chunk));
			codeBlock.appendChild(comment);
			chunk = '';
			if (d == '\n') {
				var linenum = document.createElement('span');
				linenum.className = 'line';
				linenum.dataset.linenum = ++line;
				codeBlock.appendChild(linenum);
			}
		} else if (
				c == '/'
				&& (
					(
						['number', 'regex'].indexOf((codeBlock.lastElementChild || {}).className) == -1
						&& input.substr(0, i).match(/(^\s*|[+\-=!~/*%<>&|\^(;])\s*$/)
					) || (
						codeBlock.lastElementChild
						&& codeBlock.lastElementChild.firstChild.nodeValue == 'return'
					)
				)
			) {
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = '';
			var regex = document.createElement('span');
			regex.className = 'regex';
			var regexOpen = document.createElement('span');
			regexOpen.className = 'open';
			regexOpen.appendChild(document.createTextNode('/'));
			regex.appendChild(regexOpen);
			var d,
				charclass = false;
			while ((d = input[++i]) && d != '/') {
				if (d == '\n') {
					warnings.push([i, 'Unexpected line end with unterminated regex literal.']);
					break;
				}
				if (d == '\\') {
					if (charclass) charclass.appendChild(document.createTextNode(chunk));
					else regex.appendChild(document.createTextNode(chunk));
					chunk = d + (d = input[++i]);
					var escape = document.createElement('span');
					escape.className = 'escape';
					if (d == 'c') chunk += d = input[++i];
					else if (d == 'x' || d == '0') chunk += input[++i] + input[++i];
					else if (d == 'u') chunk += input[++i] + input[++i] + input[++i] + input[++i];
					else if (d.match(/\d/)) {
						while (input[++i].match(/\d/)) chunk += input[i];
						i--;
						escape.className = 'backreference';
					}
					escape.appendChild(document.createTextNode(chunk));
					chunk = '';
					if (charclass) charclass.appendChild(escape);
					else regex.appendChild(escape);
					if (d == '\n') {
						warnings.push([i, 'Unexpected line end with unterminated regex literal.']);
						break;
					}
				} else if (charclass) {
					if (d == ']') {
						charclass.appendChild(document.createTextNode(chunk));
						chunk = '';
						var end = document.createElement('span');
						end.className = 'punctuation';
						end.appendChild(document.createTextNode(']'));
						charclass.appendChild(end);
						regex.appendChild(charclass);
						charclass = false;
					} else if (input[i + 1] == '-') {
						charclass.appendChild(document.createTextNode(chunk));
						chunk = '';
						var range = document.createElement('span');
						range.className = 'range';
						range.appendChild(document.createTextNode(d + input[++i] + input[++i]));
						charclass.appendChild(range);
					} else chunk += d;
				} else {
					if (d == '^' || d == '$' || d == '|' || d == '.') {
						regex.appendChild(document.createTextNode(chunk));
						chunk = '';
						var special = document.createElement('span');
						special.className = 'special';
						special.appendChild(document.createTextNode(d));
						regex.appendChild(special);
					} else if (d == '?' || d == '+' || d == '*') {
						regex.appendChild(document.createTextNode(chunk));
						chunk = '';
						var quantifier = document.createElement('span');
						quantifier.className = 'quantifier';
						quantifier.appendChild(document.createTextNode(d));
						regex.appendChild(quantifier);
					} else if (d == '?' || d == '+' || d == '*') {
						regex.appendChild(document.createTextNode(chunk));
						chunk = '';
						var quantifier = document.createElement('span');
						quantifier.className = 'quantifier';
						quantifier.appendChild(document.createTextNode(d));
						regex.appendChild(quantifier);
					} else if (d == '(' || d == ')') {
						regex.appendChild(document.createTextNode(chunk));
						chunk = d;
						if (d == '(' && input[i + 1] == '?' && ':=!'.indexOf(input[i + 2]) != -1) chunk += input[++i] + input[++i];
						var grouper = document.createElement('span');
						grouper.className = 'grouper';
						grouper.appendChild(document.createTextNode(chunk));
						regex.appendChild(grouper);
						chunk = '';
					} else if (d == '{') {
						regex.appendChild(document.createTextNode(chunk));
						chunk = '';
						var quantifier = document.createElement('span');
						quantifier.className = 'quantifier';
						var brace = document.createElement('span');
						brace.className = 'punctuation';
						brace.appendChild(document.createTextNode('{'));
						quantifier.appendChild(brace);
						while ((d = input[++i]) && d != '}') {
							if (d == ',') {
								quantifier.appendChild(document.createTextNode(chunk));
								chunk = '';
								var comma = document.createElement('span');
								comma.className = 'punctuation';
								comma.appendChild(document.createTextNode(','));
								quantifier.appendChild(comma);
							} else chunk += d;
						}
						quantifier.appendChild(document.createTextNode(chunk));
						if (d == '}') {
							var brace = document.createElement('span');
							brace.className = 'punctuation';
							brace.appendChild(document.createTextNode('}'));
							quantifier.appendChild(brace);
						} else warnings.push([i, 'Unclosed regex quantifier.']);
						chunk = '';
						regex.appendChild(quantifier);
					} else if (d == '[') {
						regex.appendChild(document.createTextNode(chunk));
						chunk = '[';
						if (input[++i] == '^') chunk += '^';
						else i--;
						charclass = document.createElement('span');
						charclass.className = 'charclass';
						var start = document.createElement('span');
						start.className = 'punctuation';
						start.appendChild(document.createTextNode(chunk));
						charclass.appendChild(start);
						chunk = '';
					} else chunk += d;
				}
			}
			regex.appendChild(document.createTextNode(chunk));
			chunk = '';
			if (d) {
				var regexClose = document.createElement('span');
				regexClose.className = 'close';
				regexClose.appendChild(document.createTextNode('/'));
				regex.appendChild(regexClose);
			} else warnings.push([i, 'Unterminated regex literal.']);
			var modifiers = input.substr(i + 1).match(/^[igm]+/);
			if (modifiers) {
				var regexModifier = document.createElement('span');
				regexModifier.className = 'modifier';
				regexModifier.appendChild(document.createTextNode(modifiers));
				regex.appendChild(regexModifier);
				i += modifiers.length;
			}
			codeBlock.appendChild(regex);
		} else if ((beforeWord = (input[i - 1] || ' ').match(/[^\w.]/)) && c != c.toLowerCase()) {
		 	codeBlock.appendChild(document.createTextNode(chunk));
			chunk = c;
			var capvar = document.createElement('span');
			capvar.className = 'capvar';
			while ((d = input[++i]) && d.match(/[\w\d]/)) chunk += d;
			i--;
			capvar.appendChild(document.createTextNode(chunk));
			codeBlock.appendChild(capvar);
			chunk = '';
		} else if (input.substr(i, 10) == '.prototype') {
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = '';
			var dot = document.createElement('span');
			dot.className = 'dot';
			dot.appendChild(document.createTextNode('.'));
			codeBlock.appendChild(dot);
			var proto = document.createElement('span');
			proto.className = 'prototype';
			proto.appendChild(document.createTextNode('prototype'));
			codeBlock.appendChild(proto);
			i += 9;
		} else if (beforeWord && (
				('NaN' == input.substr(i, 3) && !(input[i + 3] || '').match(/\w/) && (l = 3)) ||
				('true' == input.substr(i, 4) && !(input[i + 4] || '').match(/\w/) && (l = 4)) ||
				('null' == input.substr(i, 4) && !(input[i + 4] || '').match(/\w/) && (l = 4)) ||
				('false' == input.substr(i, 5) && !(input[i + 5] || '').match(/\w/) && (l = 5)) ||
				('Infinity' == input.substr(i, 8) && !(input[i + 8] || '').match(/\w/) && (l = 8))
			)) {
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = '';
			var keyword = document.createElement('span');
			keyword.className = 'constant';
			keyword.appendChild(document.createTextNode(input.substr(i, l)));
			codeBlock.appendChild(keyword);
			i += l - 1;
		} else if (beforeWord && (
				(['do', 'if', 'in'].indexOf(input.substr(i, 2)) != -1 && !(input[i + 2] || '').match(/\w/) && (l = 2)) ||
				(['for', 'let', 'new', 'try', 'var'].indexOf(input.substr(i, 3)) != -1 && !(input[i + 3] || '').match(/\w/) && (l = 3)) ||
				(['case', 'else', 'this', 'void', 'with'].indexOf(input.substr(i, 4)) != -1 && !(input[i + 4] || '').match(/\w/) && (l = 4)) ||
				(['break', 'class', 'catch', 'const', 'super', 'throw', 'while', 'yield'].indexOf(input.substr(i, 5)) != -1 && !(input[i + 5] || '').match(/\w/) && (l = 5)) ||
				(['delete', 'export', 'import', 'return', 'switch', 'typeof'].indexOf(input.substr(i, 6)) != -1 && !(input[i + 6] || '').match(/\w/) && (l = 6)) ||
				(['default', 'finally'].indexOf(input.substr(i, 7)) != -1 && !(input[i + 7] || '').match(/\w/) && (l = 7)) ||
				(['continue', 'debugger'].indexOf(input.substr(i, 8)) != -1 && !(input[i + 8] || '').match(/\w/) && (l = 8)) ||
				(['instanceof'].indexOf(input.substr(i, 10)) != -1 && !(input[i + 10] || '').match(/\w/) && (l = 10))
			)) {
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = '';
			var keyword = document.createElement('span');
			keyword.className = 'keyword';
			keyword.appendChild(document.createTextNode(input.substr(i, l)));
			codeBlock.appendChild(keyword);
			if (input.substr(i, l) == 'var') inVarDec.unshift({
				parens: 0,
				brackets: 0,
				braces: 0,
				equals: false
			});
			if (input.substr(i, l) == 'in') inVarDec.shift();
			i += l - 1;
		} else if (beforeWord && (
				(['top'].indexOf(input.substr(i, 3)) != -1 && !(input[i + 3] || '').match(/\w/) && (l = 3)) ||
				(['self'].indexOf(input.substr(i, 4)) != -1 && !(input[i + 4] || '').match(/\w/) && (l = 4)) ||
				(['fetch'].indexOf(input.substr(i, 5)) != -1 && !(input[i + 5] || '').match(/\w/) && (l = 5)) ||
				(['window', 'screen', 'crypto', 'status', 'frames', 'opener', 'parent'].indexOf(input.substr(i, 6)) != -1 && !(input[i + 6] || '').match(/\w/) && (l = 6)) ||
				(['console', 'history', 'menubar', 'toolbar'].indexOf(input.substr(i, 7)) != -1 && !(input[i + 7] || '').match(/\w/) && (l = 7)) ||
				(['document'].indexOf(input.substr(i, 8)) != -1 && !(input[i + 8] || '').match(/\w/) && (l = 8)) ||
				(['statusbar', 'navigator', 'indexedDB'].indexOf(input.substr(i, 9)) != -1 && !(input[i + 9] || '').match(/\w/) && (l = 9)) ||
				(['scrollbars', 'styleMedia'].indexOf(input.substr(i, 10)) != -1 && !(input[i + 10] || '').match(/\w/) && (l = 10)) ||
				(['locationbar', 'personalbar', 'performance'].indexOf(input.substr(i, 11)) != -1 && !(input[i + 11] || '').match(/\w/) && (l = 11)) ||
				(['frameElement', 'localStorage'].indexOf(input.substr(i, 12)) != -1 && !(input[i + 12] || '').match(/\w/) && (l = 12)) ||
				(['sessionStorage'].indexOf(input.substr(i, 14)) != -1 && !(input[i + 14] || '').match(/\w/) && (l = 14)) ||
				(['speechSynthesis'].indexOf(input.substr(i, 15)) != -1 && !(input[i + 15] || '').match(/\w/) && (l = 15)) ||
				(['devicePixelRatio', 'applicationCache'].indexOf(input.substr(i, 16)) != -1 && !(input[i + 16] || '').match(/\w/) && (l = 16))
			)) {
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = '';
			var keyword = document.createElement('span');
			keyword.className = 'browser';
			keyword.appendChild(document.createTextNode(input.substr(i, l)));
			codeBlock.appendChild(keyword);
			i += l - 1;
		} else if (input.substr(i, 8) == 'function') {
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = '';
			var node,
				nodeNum = codeBlock.childNodes.length,
				fnameNodes = [],
				foundEquals = false,
				endNode = false;
			prevNodes: while (node = codeBlock.childNodes[--nodeNum]) {
				if (node.className == 'equals') {
					foundEquals = true;
				} else if (foundEquals) {
					if (!endNode) {
						if (node.tagName) {
							endNode = node;
						} else {
							var str = node.nodeValue;
							for (var j = str.length - 1; j >= 0; j--) {
								if (str[j].match(/[\S]/)) {
									endNode = node.splitText(j + 1);
									nodeNum++;
									break;
								}
							}
						}
						continue;
					}
					if (node.tagName) {
						if (node.className == 'inline-comment') continue;
						if (['capvar', 'dot', 'prototype', 'newvar', 'line'].indexOf(node.className) != -1 && node.dataset.linenum != 1) fnameNodes.push(node);
						else {
							var fname = document.createElement('span');
							fname.className = 'function-name';
							for (var j = fnameNodes.length - 1; j >= 0; j--) fname.appendChild(fnameNodes[j]);
							codeBlock.insertBefore(fname, endNode);
							break;
						}
					} else {
						var str = node.nodeValue;
						for (var j = str.length - 1; j >= 0; j--) {
							if (str[j].match(/[\s=(]/)) {
								fnameNodes.push(node.splitText(j + 1));
								var fname = document.createElement('span');
								fname.className = 'function-name';
								for (var j = fnameNodes.length - 1; j >= 0; j--) fname.appendChild(fnameNodes[j]);
								codeBlock.insertBefore(fname, endNode);
								if (endNode.tagName) fname.appendChild(endNode);
								break prevNodes;
							}
						}
						fnameNodes.push(node);
					}
				} else if (node.textContent.match(/\S/)) break;
			}
			var funcKeyword = document.createElement('span');
			funcKeyword.className = 'keyword';
			funcKeyword.appendChild(document.createTextNode('function'));
			codeBlock.appendChild(funcKeyword);
			i += 7;
			var fname = document.createElement('span');
			fname.className = 'function-name';
			while ((c = input[++i]) && c != '(') {
				chunk += c;
				if (c == '\n') {
					fname.appendChild(document.createTextNode(chunk));
					chunk = '';
					var linenum = document.createElement('span');
					linenum.className = 'line';
					linenum.dataset.linenum = ++line;
					fname.appendChild(linenum);
				}
			}
			fname.appendChild(document.createTextNode(chunk));
			codeBlock.appendChild(fname);
			chunk = '';
			if (input[i] != '(') {
				warnings.push([i, 'Arguments not found.']);
				i--;
			} else {
				var paren = document.createElement('span');
				paren.className = 'punctuation';
				paren.appendChild(document.createTextNode('('));
				codeBlock.appendChild(paren);
				while ((c = input[++i]) && c != ')') {
					if (c == ',') {
						var arg = document.createElement('span');
						arg.className = 'argument';
						arg.appendChild(document.createTextNode(chunk));
						codeBlock.appendChild(arg);
						chunk = '';
						var comma = document.createElement('span');
						comma.className = 'punctuation';
						comma.appendChild(document.createTextNode(','));
						codeBlock.appendChild(comma);
					} else chunk += c;
				}
				var arg = document.createElement('span');
				arg.className = 'argument';
				arg.appendChild(document.createTextNode(chunk));
				codeBlock.appendChild(arg);
				chunk = '';
				if (c) {
					var paren = document.createElement('span');
					paren.className = 'punctuation';
					paren.appendChild(document.createTextNode(')'));
					codeBlock.appendChild(paren);
				} else {
					warnings.push([i, 'Unclosed argument list.']);
					i--;
				}
			}
		} else if (c == '(') {
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = '';
			var lastChunk = codeBlock.lastChild.nodeValue;
			if (lastChunk) {
				var call = codeBlock.lastChild.splitText(Math.max(lastChunk.lastIndexOf(' '), lastChunk.lastIndexOf('\t'), lastChunk.lastIndexOf('\n'), 0));
				var callspan = document.createElement('span');
				callspan.className = 'function-call';
				callspan.appendChild(call);
				codeBlock.appendChild(callspan);
			}
			var charspan = document.createElement('span');
			charspan.className = 'punctuation';
			charspan.appendChild(document.createTextNode('('));
			codeBlock.appendChild(charspan);
			if (inVarDec[0]) inVarDec[0].parens++;
		} else if (['++', '--', '*=', '/=', '%=', '+=', '-=', '&=', '|=', '^='].indexOf(input.substr(i, 2)) != -1) {
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = '';
			var operator = document.createElement('span');
			operator.className = 'operator assigns';
			operator.appendChild(document.createTextNode(input.substr(i, 2)));
			codeBlock.appendChild(operator);
			i++;
		} else if (input.substr(i, 3) == '<<=' || input.substr(i, 3) == '>>=') {
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = '';
			var operator = document.createElement('span');
			operator.className = 'operator assigns';
			operator.appendChild(document.createTextNode(input.substr(i, 3)));
			codeBlock.appendChild(operator);
			i += 2;
		} else if (input.substr(i, 3) == '>>>=') {
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = '';
			var operator = document.createElement('span');
			operator.className = 'operator assigns';
			operator.appendChild(document.createTextNode(input.substr(i, 3)));
			codeBlock.appendChild(operator);
			i += 3;
		} else if ('?:+-*/%&|^'.indexOf(c) != -1) {
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = '';
			var operator = document.createElement('span');
			operator.className = 'operator';
			operator.appendChild(document.createTextNode(c));
			codeBlock.appendChild(operator);
		} else if (['<=', '>=', '==', '!=', '<<', '>>', '&&', '||'].indexOf(input.substr(i, 2)) != -1) {
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = '';
			var operator = document.createElement('span');
			operator.className = 'operator';
			operator.appendChild(document.createTextNode(input.substr(i, 2)));
			codeBlock.appendChild(operator);
			i++;
		} else if (input.substr(i, 3) == '===' || input.substr(i, 3) == '!==' || input.substr(i, 3) == '>>>') {
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = '';
			var operator = document.createElement('span');
			operator.className = 'operator';
			operator.appendChild(document.createTextNode(input.substr(i, 3)));
			codeBlock.appendChild(operator);
			i += 2;
		} else if (beforeWord && c.match(/\d/)) {
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = '';
			var start = i;
			if (c == '0' && (c = input[++i])) {
				if (c.toLowerCase() == 'b') {
					while ('01'.indexOf(input[++i]) != -1);
				} else if (c.toLowerCase() == 'o') {
					while ('01234567'.indexOf(input[++i]) != -1);
				} else if (c.toLowerCase() == 'x') {
					while ('0123456789abcdefABCDEF'.indexOf(input[++i]) != -1);
				} else if (c.match(/[\d\w]/)) warnings.push([i, 'Bad number literal.']);
				var num = document.createElement('span');
				num.className = 'number';
				num.appendChild(document.createTextNode(input.substring(start, i--)));
				codeBlock.appendChild(num);
			} else {
				while ('0123456789.'.indexOf(input[i]) != -1) i++;
				if ((input[i] || '').toLowerCase() == 'e') {
					if ('+-'.indexOf(input[i])) i++;
					if ('0123456789'.indexOf(input[i]) == -1) warnings.push([i, 'No exponent found after "e".']);
					else i++;
					while ('0123456789.'.indexOf(input[i]) != -1) i++;
				}
				var num = document.createElement('span');
				num.className = 'number';
				num.appendChild(document.createTextNode(input.substring(start, i)));
				codeBlock.appendChild(num);
				i--;
			}
		} else if ('=.,;)[]{}'.indexOf(c) != -1) {
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = '';
			var charspan = document.createElement('span');
			charspan.className = ({'=': 'equals', '.': 'dot'})[c] || 'punctuation';
			charspan.appendChild(document.createTextNode(c));
			codeBlock.appendChild(charspan);
			if (inVarDec[0]) {
				if (Math.max(inVarDec[0].parens, inVarDec[0].brackets, inVarDec[0].braces) == 0) {
					if (c == '=') inVarDec[0].equals = true;
					if (c == ',') inVarDec[0].equals = false;
				}
				if (c == ')') {
					inVarDec[0].parens--;
					if (inVarDec[0].parens < 0) {
						warnings.push([i, 'Unexpected close paren, make sure you use a semicolon after a variable declaration.']);
						inVarDec.shift();
					}
				}
				if (c == '[') inVarDec[0].brackets++;
				if (c == ']') {
					inVarDec[0].brackets--;
					if (inVarDec[0].brackets < 0) {
						warnings.push([i, 'Unexpected close bracket, make sure you use a semicolon after a variable declaration.']);
						inVarDec.shift();
					}
				}
				if (c == '{') inVarDec[0].braces++;
				if (c == '}') {
					inVarDec[0].braces--;
					if (inVarDec[0].braces < 0) {
						warnings.push([i, 'Unexpected close brace, make sure you use a semicolon after a variable declaration.']);
						inVarDec.shift();
					}
				}
				if (c == ';') inVarDec.shift();
			}
		} else if (c == '\n') {
			codeBlock.appendChild(document.createTextNode(chunk + '\n'));
			chunk = '';
			var linenum = document.createElement('span');
			linenum.className = 'line';
			linenum.dataset.linenum = ++line;
			codeBlock.appendChild(linenum);
		} else if (c.match(/\S/) && inVarDec[0] && !inVarDec[0].equals && Math.max(inVarDec[0].parens, inVarDec[0].brackets, inVarDec[0].braces) == 0) {
			var newvar;
			codeBlock.appendChild(document.createTextNode(chunk));
			chunk = '';
			if (codeBlock.lastChild.className == 'newvar') newvar = codeBlock.lastChild;
			else {
				newvar = document.createElement('span');
				newvar.className = 'newvar';
			}
			newvar.appendChild(document.createTextNode(c));
			codeBlock.appendChild(newvar);
		} else chunk += c;
	}
	codeBlock.appendChild(document.createTextNode(chunk));
	codeBlock.className = 'line-dig' + Math.floor(Math.log10(line));
	var lines = input.split('\n');
	for (var i = 0; i < warnings.length; i++) {
		var line = input.substr(0, warnings[i][0]).split('\n').length - 1,
			lineEl = codeBlock.getElementsByClassName('line')[line];
		lineEl.classList.add('warning');
		if (lineEl.title) lineEl.title += '\n';
		lineEl.title += 'Column ' + (warnings[i][0] - lines.slice(0, line).join('\n').length) + ': ' + warnings[i][1];
	}
}