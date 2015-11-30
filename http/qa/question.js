var rep = parseInt(document.getElementById('rep').value),
	id = parseInt(location.href.match(/\d+/)[0]),
	langs = JSON.parse(document.getElementById('langs').value),
	langsug = document.getElementById('langsug'),
	lang = document.getElementById('lang-edit');
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
	} else {
		if (!document.getElementById('q-edit').hidden) document.getElementById('cancel-edit').onclick();
	}
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
document.getElementById('addcomment').onclick = function() {
	setTimeout(function() {
		document.getElementById('commentta').focus();
	}, 0);
};
var waiting = false;
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
	if (this.value && e.keyCode == 9) this.value = langsug.firstChild.textContent;
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
document.getElementById('edit-tags').onchange = function() {
	setTimeout(function() {
		var arr = [],
			els = document.getElementById('edit-tags').querySelectorAll(':checked');
		for (var i = 0; i < els.length; i++) {
			arr.push(els[i].id.substr(3));
		}
		document.getElementById('edit-tags-input').value = arr.join();
	}, 0);
};
document.getElementById('answerform').addEventListener('submit', function(e) {
	e.preventDefault();
	var answerBody = document.getElementById('answerta').value,
		err = document.getElementById('answer-error');
	if (err.firstChild) err.removeChild(err.firstChild);
	if (answerBody.length < 144) return err.appendChild(document.createTextNode('Answer body must be at least 144 characters long.'));
	request('/api/answer/add', function(res) {
		if (res.indexOf('Location:') == 0) {
			location.href = '#' + res.substr(12);
			location.reload();
		} else if (res.indexOf('Error:') == 0) alert(res);
		else alert('Unknown error. Response was: ' + res);
	}, 'body=' + encodeURIComponent(answerBody));
});
var socket = new WebSocket('wss://' + location.hostname + ':81/q/' + id);
document.getElementById('comment').onsubmit = function(e) {
	socket.send(JSON.stringify({
		event: 'comment',
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
	} else if (data.event == 'add') {
		var div = document.createElement('div');
		div.classList.add('comment');
		div.innerHTML = ' ' + markdown(data.body);
		if (rep >= 50) {
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
			if (!currentNode.lastChild.lastChild || currentNode.lastChild.lastChild.tagName == 'blockquote' || currentNode.lastChild.lastChild.tagName == 'code') currentNode.appendChild(sig);
			else currentNode = currentNode.lastChild;
		}
		document.getElementById('comments').appendChild(div);
	} else if (data.event == 'comment-scorechange') {
		var c = document.getElementById('c' + data.id);
		if (c) c.getElementsByClassName('score')[0].dataset.score = c.getElementsByClassName('score')[0].textContent = data.score;
	} else if (data.event == 'err') {
		alert('Error: ' + data.body);
		if (data.commentUnvote) document.getElementById('c' + data.commentUnvote).getElementsByClassName('up')[0].classList.remove('clkd');
	} else alert(e.data);
};
function upvoteComment() {
	this.classList.toggle('clkd');
	socket.send(JSON.stringify({
		event: this.classList.contains('clkd') ? 'c-vote' : 'c-unvote',
		id: parseInt(this.parentNode.parentNode.id.substr(1))
	}));
}
var comments = document.getElementsByClassName('comment');
for (var i = 0; i < comments.length; i++) {
	comments[i].getElementsByClassName('sctrls')[0].firstChild.onclick = upvoteComment;
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