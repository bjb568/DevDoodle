addEventListener('DOMContentLoaded', function() {
	var code = document.getElementById('code'),
		output = document.getElementById('output'),
		save = document.getElementById('save'),
		up = document.getElementById('up'),
		dn = document.getElementById('dn');
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
			console.log(this.value.substr(0, oldSelectionStart).match(/(\S([ \t]+)| +)$/));
			this.value = this.value.substr(0, oldSelectionStart - cut) + this.value.substr(oldSelectionStart);
			oldSelectionStart = this.selectionStart = this.selectionEnd = oldSelectionStart - cut;
			if (this.value[oldSelectionStart - 1] == ',') this.eIndent = true;
			var tabs = this.value.substr(0, oldSelectionStart)
				.split('\n')[this.value.substr(0, oldSelectionStart).split('\n').length - 1]
				.split('\t').length
				- (
					('{([:,'.indexOf(this.value[oldSelectionStart - 1]) + 1)
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
		} else if (e.keyCode == 34) {
			if (this.value[this.selectionStart] != '"') this.value = this.value.substr(0, this.selectionStart) + '""' + this.value.substr(this.selectionStart);
			this.selectionEnd = this.selectionStart = ++oldSelectionStart;
			e.preventDefault();
		} else if (e.keyCode == 39) {
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
		} else if (e.keyCode == 61 && this.value.substr(0, this.selectionStart).match('(draw|refresh) ')) {
			var tabs = this.value.substr(0, oldSelectionStart).split('\n')[this.value.substr(0, oldSelectionStart).split('\n').length - 1].split('\t').length;
			this.value = this.value.substr(0, this.selectionStart) + '= function() {\n' + '\t'.repeat(tabs) + '\n' + '\t'.repeat(tabs - 1) + '}' + this.value.substr(this.selectionStart);
			this.selectionEnd = this.selectionStart = oldSelectionStart + 15 + tabs;
			e.preventDefault();
		} else if (e.keyCode == 44) {
			this.value = this.value.substr(0, this.selectionStart) + ', ' + this.value.substr(this.selectionStart);
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
						title.textContent = edit.value.substr(0, 92) || 'Untitled';
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
					document.getElementsByClassName('user-$op-name')[0].getElementsByClassName('rep')[0].textContent -= (dn.classList.contains('clkd') ? -1 : 0) - (up.classList.contains('clkd') ? -1 : 1);
					up.classList.toggle('clkd');
					dn.classList.remove('clkd');
				} else alert('Unknown error. Response was: ' + res);
			}, 'val=' + (this.classList.contains('clkd') ? 0 : 1));
		};
		dn.onclick = function() {
			request('/api/program/vote', function(res) {
				if (res.indexOf('Error') == 0) alert(res);
				else if (res == 'Success') {
					document.getElementsByClassName('user-$op-name')[0].getElementsByClassName('rep')[0].textContent -= (up.classList.contains('clkd') ? 1 : 0) - (dn.classList.contains('clkd') ? 1 : -1);
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
			document.body.scrollTop = innerHeight;
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
				if ($rep >= 50) {
					div.insertBefore(document.getElementById('content').children[2].cloneNode(true), div.firstChild);
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
				a.appendChild(document.createTextNode(data.user))
				sig.appendChild(a);
				sig.appendChild(document.createTextNode(', '));
				var permalink = document.createElement('a');
				if (!data.time) data.time = new Date().getTime();
				permalink.appendChild(agot(data.time));
				permalink.href = '#' + (div.id = 'c' + data.id);
				sig.appendChild(permalink);
				div.appendChild(sig);
				document.getElementById('comments').appendChild(div);
			} else if (data.event == 'scorechange') {
				var c = document.getElementById('c' + data.id);
				if (c) c.getElementsByClassName('score')[0].dataset.score = c.getElementsByClassName('score')[0].textContent = data.score;
			} else if (data.event == 'err') {
				alert('Error: ' + data.body);
				if (data.commentUnvote) document.getElementById('c' + data.commentUnvote).getElementsByClassName('up')[0].classList.remove('clkd');
			}
		};
		socket.onclose = function() {
			if (confirm('Connection error. Reload?')) location.reload();
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
		function upvoteComment() {
			this.classList.toggle('clkd');
			socket.send(JSON.stringify({
				event: this.classList.contains('clkd') ? 'vote' : 'unvote',
				id: parseInt(this.parentNode.parentNode.id.substr(1))
			}));
		}
		var comments = document.getElementsByClassName('comment');
		for (var i = 0; i < comments.length; i++) {
			comments[i].getElementsByClassName('sctrls')[0].firstChild.onclick = upvoteComment;
		}
	}
});