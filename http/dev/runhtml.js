var mine = document.getElementById('mine').value == '1',
	id = parseInt(document.getElementById('id').value),
	opName = document.getElementById('user').value,
	myRep = parseInt(document.getElementById('rep').value),
	footerOff = true,
	noPageOverflow = 800,
	pageOverflowMobile = 700,
	mainBottomPad = location.href.indexOf('/dev/new/') == -1 ? 60 : 0,
	mainContentEl = document.getElementById('main'),
	htmle = document.getElementById('html'),
	css = document.getElementById('css'),
	js = document.getElementById('js'),
	save = document.getElementById('save'),
	fork = document.getElementById('fork'),
	up = document.getElementById('up'),
	dn = document.getElementById('dn'),
	savedValue = [htmle.value, css.value, js.value],
	onbeforeunload = function() {
		return ([htmle.value, css.value, js.value]).toString() == savedValue.toString() ? null : 'You have unsaved code.';
	};
var p = '';
function run(f) {
	if (document.getElementById('autorun').checked) {
		if (!save.classList.contains('progress')) save.textContent = 'Save';
		var outputBlob = new Blob([
			p = '<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><body>' + htmle.value + '<style>' + css.value + '</style><script>alert=prompt=confirm=null;' + js.value + '</script></body></html>'
		], {type: 'application/xhtml+xml'});
		document.getElementById('output').src = URL.createObjectURL(outputBlob);
	}
}
htmle.onkeypress = function(e) {
	var oldSelectionStart = this.selectionStart;
	if (e.keyCode == 13) {
		if (e.metaKey) return document.getElementById('title').dispatchEvent(new MouseEvent('click'));
		var tabs = this.value.substr(0, oldSelectionStart)
			.split('\n')[this.value.substr(0, oldSelectionStart).split('\n').length - 1]
			.split('\t').length
			- (
				(false/* Parse? */)
				? 0
				: 1
			);
		this.value = this.value.substr(0, this.selectionStart) + '\n' + '\t'.repeat(tabs) + this.value.substr(this.selectionStart);
		this.selectionStart = ++oldSelectionStart + tabs;
		this.selectionEnd = this.selectionStart;
		e.preventDefault();
	} else if (e.keyCode == 34) {
		if (this.value[this.selectionStart] != '"') this.value = this.value.substr(0, this.selectionStart) + '""' + this.value.substr(this.selectionStart);
		this.selectionEnd = this.selectionStart = ++oldSelectionStart;
		e.preventDefault();
	} else if (e.keyCode == 39) {
		if (this.value[this.selectionStart] != "'") this.value = this.value.substr(0, this.selectionStart) + "''" + this.value.substr(this.selectionStart);
		this.selectionEnd = this.selectionStart = ++oldSelectionStart;
		e.preventDefault();
	}
};
htmle.onkeydown = css.onkeydown = js.onkeydown = function(e) {
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
};
css.onkeypress = js.onkeypress = function(e) {
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
		if (e.metaKey) return document.getElementById('title').dispatchEvent(new MouseEvent('click'));
		var cut = (this.value.substr(0, oldSelectionStart).match(/\s+$/) || '').length;
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
		this.value = this.value.substr(0, this.selectionStart) + '\n' + '\t'.repeat(tabs) + ('{([:,'.indexOf(this.value[oldSelectionStart - 1]) == -1 ? '' : '\n' + '\t'.repeat(tabs - 1)) + this.value.substr(this.selectionStart);
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
	} else if (e.keyCode == 44) {
		this.value = this.value.substr(0, this.selectionStart) + ', ' + this.value.substr(this.selectionStart);
		this.selectionEnd = this.selectionStart = oldSelectionStart + 2;
		e.preventDefault();
	}
};
htmle.oninput = css.oninput = js.oninput = run;
run();
addEventListener('keypress', function(e) {
	if (e.keyCode == 13 && e.metaKey) {
		e.preventDefault();
		document.getElementById('title').dispatchEvent(new MouseEvent('click'));
	} else if (e.keyCode == 115 && e.metaKey) {
		e.preventDefault();
		var target = e.shiftKey ? fork : save;
		if (target) target.dispatchEvent(new MouseEvent('click'));
	}
});
save.onclick = function() {
	var e = this;
	if (e.classList.contains('progress')) return;
	e.classList.add('progress');
	var savingTimeout = setTimeout(function() {
		if (e.textContent == 'Save') e.textContent = 'Saving…';
	}, 200);
	request('/api/program/save?type=2', function(res) {
		if (res.indexOf('Error') == 0) {
			clearTimeout(savingTimeout);
			alert(res);
			e.textContent = 'Save';
		} else if (res.indexOf('Location') == 0) {
			onbeforeunload = null;
			location.href = res.split(' ')[1];
		} else if (res == 'Success') {
			e.textContent = 'Saved';
			savedValue = [htmle.value, css.value, js.value];
			document.getElementById('updated').setAttribute('datetime', new Date().toISOString());
		} else {
			clearTimeout(savingTimeout);
			alert('Unknown error. Response was: ' + res);
		}
		e.classList.remove('progress');
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
if (document.getElementById('meta')) {
	if (mine) {
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
				document.getElementsByClassName('user-' + opName)[0].getElementsByClassName('rep')[0].textContent -= (up.classList.contains('clkd') ? 1 : 0) - (dn.classList.contains('clkd') ? 1 : -1);
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
			a.appendChild(document.createTextNode(data.user))
			sig.appendChild(a);
			sig.appendChild(document.createTextNode(', '));
			var permalink = document.createElement('a');
			if (!data.time) data.time = new Date().getTime();
			permalink.appendChild(agot(data.time));
			permalink.href = '#' + (div.id = 'c' + data.id);
			sig.appendChild(permalink);
			var currentNode = div;
			while (!sig.parentNode) {
				if (!currentNode.lastChild.lastChild || currentNode.lastChild.lastChild.tagName == 'blockquote' || currentNode.lastChild.lastChild.tagName == 'code') currentNode.appendChild(sig);
				else currentNode = currentNode.lastChild;
			}
			document.getElementById('comments').appendChild(div);
			div.scrollIntoView(true);
		} else if (data.event == 'scorechange') {
			var c = document.getElementById('c' + data.id);
			if (c) c.getElementsByClassName('score')[0].dataset.score = c.getElementsByClassName('score')[0].textContent = data.score;
		} else if (data.event == 'err') alert('Error: ' + data.body);
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
			socket = new WebSocket('wss://' + location.hostname + ':81/dev/') + id;
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