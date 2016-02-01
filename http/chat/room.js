var audio = new Audio('/a/beep.mp3'),
	hash = parseInt(location.hash.substr(1)),
	roomID = location.pathname.match(/\d+/)[0],
	socket = new WebSocket((location.protocol == 'http:' ? 'ws://': 'wss://') + location.hostname + '/chat/' + roomID + (!isNaN(hash) ? '/' + hash : '')),
	username = document.querySelector('#nav > div:nth-of-type(2) > a:nth-child(2) span').firstChild.nodeValue,
	rawdesc = document.getElementById('descedit').value,
	onBottom = true,
	state = 1,
	skipped,
	ta = document.getElementById('ta'),
	btn = document.getElementById('btn'),
	cont = document.getElementById('chat'),
	starwall = document.getElementById('stars'),
	ctrls = document.createElement('div'),
	ctrlsStar = document.createElement('a'),
	ctrlsLink = document.createElement('a'),
	ctrlsEdit = document.createElement('a'),
	ctrlsDelete = document.createElement('a'),
	ctrlsUndelete = document.createElement('a'),
	ctrlsFlag = document.createElement('a'),
	lock = true,
	source = {},
	editing = false,
	users = [],
	title = document.title,
	unread = 0,
	tsMode = false,
	e;
if (username == 'Log\xa0in') username = false;
ctrls.classList.add('ctrls');
ctrlsStar.textContent = '★';
ctrlsStar.onclick = function() {
	socket.send(JSON.stringify({event: this.classList.contains('clkd') ? 'unstar' : 'star', id: parseInt(this.parentNode.parentNode.id)}));
	this.classList.toggle('clkd');
};
ctrlsLink.textContent = '#';
ctrlsLink.onclick = function() {
	open('message/' + this.parentNode.parentNode.id);
};
ctrlsEdit.textContent = '✎';
ctrlsEdit.onclick = function() {
	ta.hists = ta.hists || {};
	ta.hists[editing] = ta.hist;
	ta.hist = ta.hists[false] || [{
		body: ta.value,
		start: 0,
		end: 0
	}];
	ta.hIndex = ta.hist.length - 1;
	ta.value = ta.hist[ta.hIndex].body;
	e = document.getElementsByClassName('editing')[0];
	if (e) e.classList.remove('editing');
	editing = true;
	var msg = this.parentNode.parentNode;
	msg.classList.add('editing');
	msg.scrollIntoView(true);
	ta.focus();
	ta.value = source[msg.id];
	ta.selectionStart = ta.selectionEnd = ta.value.length;
	ta.hists = ta.hists || {};
	ta.hists[editing] = ta.hist;
	ta.hist = ta.hists[msg.id] || [{
		body: ta.value,
		start: 0,
		end: 0
	}];
	ta.hIndex = ta.hist.length - 1;
	editing = msg.id;
	btn.onclick = edit;
	btn.textContent = 'Edit';
};
ctrlsDelete.textContent = '✕';
ctrlsDelete.onclick = function() {
	socket.send(JSON.stringify({event: 'delete', id: parseInt(this.parentNode.parentNode.id)}));
};
ctrlsUndelete.textContent = '↑';
ctrlsUndelete.onclick = function() {
	socket.send(JSON.stringify({event: 'undelete', id: parseInt(this.parentNode.parentNode.id)}));
};
ctrlsFlag.textContent = '⚑';
ctrlsFlag.onclick = function() {
	var body = prompt('Describe what exactly is wrong');
	if (!body) return;
	socket.send(JSON.stringify({
		event: 'flag',
		id: parseInt(this.parentNode.parentNode.id),
		body: body
	}));
};
ctrls.appendChild(ctrlsStar);
ctrls.appendChild(ctrlsLink);
ctrls.appendChild(ctrlsEdit);
ctrls.appendChild(ctrlsDelete);
ctrls.appendChild(ctrlsUndelete);
ctrls.appendChild(ctrlsFlag);
cont.onscroll = function() {
	onBottom = cont.scrollTop + cont.offsetHeight >= cont.scrollHeight - 2;
};
addEventListener('resize', function() {
	if (onBottom) cont.scrollTop = cont.scrollHeight;
});
function statechange(nstate) {
	if (nstate == 1 && ta && ta.value) nstate = 2;
	if (state != nstate) {
		state = nstate;
		socket.send(JSON.stringify({event: 'statechange', state: state}));
	}
}
function inactive() {
	statechange(0);
}
function active() {
	clearTimeout(timeout);
	timeout = setTimeout(inactive, 10000);
	statechange(1);
}
var timeout = setTimeout(inactive, 10000);
addEventListener('keyup', active);
addEventListener('keydown', active);
addEventListener('click', active);
addEventListener('mousemove', active);
addEventListener('touchstart', active);
addEventListener('scroll', active);
addEventListener('resize', active);
function resetEditForm() {
	document.getElementById('nameedit').value = document.getElementById('name').textContent;
	document.getElementById('descedit').value = rawdesc;
	document.getElementById('roominfo').hidden = false;
	document.getElementById('editform').hidden = true;
}
document.getElementById('reset-edit-form').addEventListener('click', resetEditForm);
socket.onmessage = function(e) {
	console.log(e.data);
	var data;
	try {
		data = JSON.parse(e.data);
	} catch(err) {
		console.log(err);
		return alert('JSON Error. Response was: ' + e.data);
	}
	if (tsMode && ['star', 'unstar'].indexOf(data.event) == -1) return;
	if (data.event == 'init' || data.event == 'add') {
		source[data.id] = data.body;
		if (document.getElementById(data.id)) return;
		if (users.indexOf(data.user) != -1) users.splice(users.indexOf(data.user), 1);
		if (data.name != username) users.push(data.user);
		var div = document.createElement('div');
		div.classList.add('comment');
		if (data.deleted) div.classList.add('deleted');
		div.innerHTML = (username ? markdown(data.body + ' ').replace(new RegExp('@' + username + '(\\W)', 'g'), '<span class="mention">@' + username + '</span>$1') : markdown(data.body)).replaceAll('<a', '<a target="_blank"');
		if ((lock && data.event == 'init' && document.getElementById('ts').hidden) || (onBottom && data.event == 'add')) {
			var imgs = div.getElementsByTagName('img'),
				i = imgs.length;
			while (i--) imgs[i].onload = function() {
				if (onBottom) cont.scrollTop = cont.scrollHeight;
			};
		}
		var sig = document.createElement('span');
		sig.classList.add('c-sig');
		var starcount = document.createElement('span');
		starcount.classList.add('starcount');
		starcount.appendChild(document.createTextNode((starcount.dataset.count = data.stars || 0) + '★'));
		sig.appendChild(starcount);
		sig.appendChild(document.createTextNode(' -'));
		var user = document.createElement('a');
		user.href = '/user/' + data.user;
		user.appendChild(document.createTextNode(data.user));
		sig.appendChild(user);
		sig.appendChild(document.createTextNode(', '));
		var permalink = document.createElement('a');
		permalink.title = 'Permalink';
		if (!data.time) data.time = new Date().getTime();
		permalink.appendChild(agot(data.time));
		permalink.href = '#' + (div.id = data.id);
		sig.appendChild(permalink);
		var currentNode = div;
		while (!sig.parentNode) {
			if (!currentNode.lastElementChild || ['blockquote', 'code', 'a', 'img'].indexOf(currentNode.lastElementChild.tagName) != -1) currentNode.appendChild(sig);
			else currentNode = currentNode.lastElementChild;
		}
		var tCtrls = ctrls.cloneNode(true);
		tCtrls.children[0].onclick = ctrlsStar.onclick;
		tCtrls.children[1].onclick = ctrlsLink.onclick;
		tCtrls.children[2].onclick = ctrlsEdit.onclick;
		tCtrls.children[3].onclick = ctrlsDelete.onclick;
		tCtrls.children[4].onclick = ctrlsUndelete.onclick;
		tCtrls.children[5].onclick = ctrlsFlag.onclick;
		if (username != data.user) {
			tCtrls.removeChild(tCtrls.children[2]);
			tCtrls.removeChild(tCtrls.children[2]);
			tCtrls.removeChild(tCtrls.children[2]);
		} else tCtrls.children[data.deleted ? 3 : 4].hidden = true;
		if (data.deleted) tCtrls.children[0].hidden = true;
		if (username) div.appendChild(tCtrls);
		if (data.event == 'init') {
			var after = 0;
			while (e = cont.children[after] && e.id < data.id) after++;
			cont.insertBefore(div, cont.children[after]);
			cont.scrollTop += div.offsetHeight + 3;
		} else cont.appendChild(div);
		if (data.event == 'add') {
			if (username != data.user) audio.play();
			if (onBottom) cont.scrollTop = cont.scrollHeight;
		}
		cont.onscroll();
		if (data.event == 'add' && document.hidden) document.title = '(' + ++unread + ') ' + title;
	} else if (data.event == 'edit') {
		source[data.id] = data.body;
		var msg = document.getElementById(data.id);
		if (!msg) return;
		var sig = msg.getElementsByClassName('c-sig')[0],
			msgCtrls = msg.getElementsByClassName('ctrls')[0];
		sig.parentNode.removeChild(sig);
		msg.innerHTML = (username ? markdown(data.body + ' ').replace(new RegExp('@' + username + '(\\W)', 'g'), '<span class="mention">@' + username + '</span>$1') : markdown(data.body)).replaceAll('<a', '<a target="_blank"');
		var currentNode = msg;
		while (!sig.parentNode) {
			if (!currentNode.lastElementChild || ['blockquote', 'code', 'a', 'img'].indexOf(currentNode.lastElementChild.tagName) != -1) currentNode.appendChild(sig);
			else currentNode = currentNode.lastElementChild;
		}
		msg.appendChild(msgCtrls);
		if (onBottom) {
			cont.scrollTop = cont.scrollHeight;
			var imgs = msg.getElementsByTagName('img'),
				i = imgs.length;
			while (i--) imgs[i].onload = function() {
				cont.scrollTop = cont.scrollHeight;
			};
		}
	} else if (data.event == 'delete') {
		var msg = document.getElementById(data.id);
		if (!msg) return;
		if (msg.getElementsByClassName('c-sig')[0].getElementsByTagName('a')[0].textContent == username) {
			msg.classList.add('deleted');
			var msgCtrls = msg.getElementsByClassName('ctrls')[0];
			if (!msgCtrls) return;
			msgCtrls = msgCtrls.children;
			msgCtrls[0].hidden = true;
			if (msgCtrls[3]) msgCtrls[3].hidden = true;
			if (msgCtrls[3]) msgCtrls[4].hidden = false;
		} else msg.parentNode.removeChild(msg);
	} else if (data.event == 'undelete') {
		var msg = document.getElementById(data.id);
		if (msg) {
			msg.classList.remove('deleted');
			var msgCtrls = msg.getElementsByClassName('ctrls')[0];
			if (!msgCtrls) return;
			msgCtrls = msgCtrls.children;
			msgCtrls[0].hidden = false;
			if (msgCtrls[3]) msgCtrls[3].hidden = false;
			if (msgCtrls[3]) msgCtrls[4].hidden = true;
		} else if (data.id > cont.firstChild.id) {
			source[data.id] = data.body;
			if (users.indexOf(data.user) != -1) users.splice(users.indexOf(data.user), 1);
			if (data.name != username) users.push(data.user);
			var div = document.createElement('div');
			div.classList.add('comment');
			if (data.deleted) div.classList.add('deleted');
			div.innerHTML = (username ? markdown(data.body + ' ').replace(new RegExp('@' + username + '(\\W)', 'g'), '<span class="mention">@' + username + '</span>$1') : markdown(data.body)).replaceAll('<a', '<a target="_blank"');
			var sig = document.createElement('span');
			sig.classList.add('c-sig');
			var starcount = document.createElement('span');
			starcount.classList.add('starcount');
			starcount.appendChild(document.createTextNode((starcount.dataset.count = data.stars || 0) + '★'));
			sig.appendChild(starcount);
			sig.appendChild(document.createTextNode(' -'));
			var user = document.createElement('a');
			user.href = '/user/' + data.user;
			user.appendChild(document.createTextNode(data.user));
			sig.appendChild(user);
			sig.appendChild(document.createTextNode(', '));
			var permalink = document.createElement('a');
			permalink.title = 'Permalink';
			if (!data.time) data.time = new Date().getTime();
			permalink.appendChild(agot(data.time));
			permalink.href = '#' + (div.id = data.id);
			sig.appendChild(permalink);
			var currentNode = msg;
			while (!sig.parentNode) {
				if (!currentNode.lastElementChild || ['blockquote', 'code', 'a', 'img'].indexOf(currentNode.lastElementChild.tagName) != -1) currentNode.appendChild(sig);
				else currentNode = currentNode.lastElementChild;
			}
			var tCtrls = ctrls.cloneNode(true);
			tCtrls.children[0].onclick = ctrlsStar.onclick;
			tCtrls.children[1].onclick = ctrlsLink.onclick;
			tCtrls.children[2].onclick = ctrlsEdit.onclick;
			tCtrls.children[3].onclick = ctrlsDelete.onclick;
			tCtrls.children[4].onclick = ctrlsUndelete.onclick;
			tCtrls.children[5].onclick = ctrlsFlag.onclick;
			if (username != data.user) {
				tCtrls.removeChild(tCtrls.children[2]);
				tCtrls.removeChild(tCtrls.children[2]);
				tCtrls.removeChild(tCtrls.children[2]);
			} else tCtrls.children[data.deleted ? 3 : 4].hidden = true;
			if (data.deleted) tCtrls.children[0].hidden = true;
			if (username) div.appendChild(tCtrls);
			cont.insertBefore(div, cont.firstChild);
			cont.scrollTop += div.offsetHeight + 3;
			if (onBottom) cont.scrollTop = cont.scrollHeight;
			if (data.event == 'add' && document.hidden) document.title = '(' + ++unread + ') ' + title;
		}
	} else if (data.event == 'selfstar') {
		if (e = document.getElementById(data.id)) e.getElementsByClassName('ctrls')[0].firstChild.classList.add('clkd');
	} else if (data.event == 'star') {
		var f;
		if ((e = document.getElementById(data.id)) && (f = document.getElementById(data.id + 's'))) {
			e = e.getElementsByClassName('starcount')[0];
			e.removeChild(e.firstChild);
			e.appendChild(document.createTextNode(++e.dataset.count + '★'));
			f = f.getElementsByClassName('starcount')[0];
			var g;
			while (g = f.firstChild) f.removeChild(g);
			f.appendChild(document.createTextNode(++f.dataset.count + '★ '));
		} else {
			var li = document.createElement('li'),
				div = document.createElement('div');
				e = document.getElementById(data.id);
			if (e && !data.board) {
				e = e.getElementsByClassName('starcount')[0];
				e.removeChild(e.firstChild);
				e.appendChild(document.createTextNode(++e.dataset.count + '★'));
			}
			if (data.stars == 1) return;
			div.id = data.id + 's';
			div.classList.add('comment');
			div.innerHTML = (username ? markdown(data.body + ' ').replace(new RegExp('@' + username + '(\\W)', 'g'), '<span class="mention">@' + username + '</span>$1') : markdown(data.body)).replaceAll('<a', '<a target="_blank"');
			var sig = document.createElement('span');
			sig.classList.add('c-sig');
			var starcount = document.createElement('span');
			starcount.classList.add('starcount');
			starcount.appendChild(document.createTextNode((starcount.dataset.count = data.stars) + '★'));
			sig.appendChild(starcount);
			sig.appendChild(document.createTextNode(' -'));
			var user = document.createElement('a');
			user.href = '/user/' + data.user;
			user.appendChild(document.createTextNode(data.user));
			sig.appendChild(user);
			sig.appendChild(document.createTextNode(', '));
			var permalink = document.createElement('a');
			permalink.title = 'Permalink';
			if (!data.time) data.time = new Date().getTime();
			permalink.appendChild(agot(data.time));
			permalink.href = '#' + data.id;
			sig.appendChild(permalink);
			var currentNode = div;
			while (!sig.parentNode) {
				if (!currentNode.lastElementChild || ['blockquote', 'code', 'a', 'img'].indexOf(currentNode.lastElementChild.tagName) != -1) currentNode.appendChild(sig);
				else currentNode = currentNode.lastElementChild;
			}
			li.appendChild(div);
			if (starwall.firstChild) starwall.insertBefore(li, starwall.firstChild);
			else starwall.appendChild(li);
		}
	} else if (data.event == 'unstar') {
		if (e = document.getElementById(data.id)) {
			e = e.getElementsByClassName('starcount')[0];
			e.removeChild(e.firstChild);
			var count = --e.dataset.count;
			e.appendChild(document.createTextNode(count + '★'));
		}
		if (e = document.getElementById(data.id + 's')) {
			if (count < 2) return e.parentNode.parentNode.removeChild(e.parentNode);
			e = e.getElementsByClassName('starcount')[0];
			e.dataset.count--;
			var f;
			while (f = e.firstChild) e.removeChild(f);
			e.appendChild(document.createTextNode(count + '★ '));
		}
	} else if (data.event == 'adduser') {
		if (users.indexOf(data.name) != -1) users.splice(users.indexOf(data.name), 1);
		if (data.name != username) users.push(data.name);
		var li = document.createElement('li');
		if (data.state == 0) li.classList.add('inactive');
		if (data.state == 2) li.classList.add('writing');
		li.id = 'user-' + data.name;
		var a = document.createElement('a');
		a.appendChild(document.createTextNode(data.name));
		a.href = '/user/' + data.name;
		a.target = '_blank';
		li.appendChild(a);
		document.getElementById('users').appendChild(li);
	} else if (data.event == 'deluser') {
		var li = document.getElementById('user-' + data.name);
		if (li) li.parentNode.removeChild(li);
	} else if (data.event == 'statechange') {
		var li = document.getElementById('user-' + data.name);
		if (!li) {
			if (users.indexOf(data.name) != -1) users.splice(users.indexOf(data.name), 1);
			if (data.name != username) users.push(data.name);
			li = document.createElement('li');
			if (data.state == 0) li.classList.add('inactive');
			if (data.state == 2) li.classList.add('writing');
			li.id = 'user-' + data.name;
			var a = document.createElement('a');
			a.appendChild(document.createTextNode(data.name));
			a.href = '/user/' + data.name;
			a.target = '_blank';
			li.appendChild(a);
			document.getElementById('users').appendChild(li);
		}
		if (data.state == 0) li.classList.add('inactive');
		else li.classList.remove('inactive');
		if (data.state == 2) li.classList.add('writing');
		else li.classList.remove('writing');
	} else if (data.event == 'info-skipped') {
		skipped = data.body;
		if (data.ts) {
			ta.hidden = document.getElementById('subta').hidden = true;
			document.getElementById('ts').hidden = false;
		} else {
			setInterval(function() {
				if (cont.children.length >= 92 && skipped && cont.scrollTop < 72) {
					skipped = Math.max(0, skipped - 1);
					socket.send(JSON.stringify({event: 'req', skip: skipped}));
				}
			}, 10);
			setInterval(function() {
				if (cont.children.length >= 92 && skipped && cont.scrollTop < 720) {
					skipped = Math.max(0, skipped - 1);
					socket.send(JSON.stringify({event: 'req', skip: skipped}));
				}
			}, 200);
			setInterval(function() {
				if (cont.children.length >= 92 && skipped && cont.scrollTop < cont.scrollHeight / 2) {
					skipped = Math.max(0, skipped - 1);
					socket.send(JSON.stringify({event: 'req', skip: skipped}));
				}
			}, 400);
		}
	} else if (data.event == 'info-complete') {
		lock = false;
		if (!isNaN(hash)) {
			location.hash = '';
			location.hash = '#' + hash;
			document.body.scrollTop = 0;
		}
		if (!document.getElementById('ts').hidden) tsMode = true;
		if (navigator.userAgent.indexOf('Mobile') == -1 && ta) ta.focus();
	} else if (data.event == 'info-update') {
		document.title = (document.getElementById('name').textContent = document.getElementById('nameedit').value = data.name) + ' | Chat | DevDoodle';
		document.getElementById('desc').innerHTML = markdown(document.getElementById('descedit').value = rawdesc = data.desc);
	} else if (data.event == 'notice') {
		alert(data.body || 'Error: No notice body specified.');
	} else if (data.event == 'err') {
		alert('Error: ' + data.body);
		if (data.revertInfo) resetEditForm();
		if (e = document.getElementById(data.revertStar)) e.getElementsByClassName('ctrls')[0].firstChild.classList.remove('clkd');
	}
};
socket.onclose = function() {
	if (ta.disabled) return;
	ta.blur();
	btn.blur();
	ta.disabled = btn.disabled = true;
	var warning = document.createElement('div');
	warning.className = 'connection-error';
	warning.appendChild(document.createTextNode('Connection error. '));
	var link = document.createElement('a');
	link.appendChild(document.createTextNode('Reload?'));
	link.href = '';
	warning.appendChild(link);
	ta.parentNode.insertBefore(warning, ta);
	setInterval(function() {
		socket = new WebSocket((location.protocol == 'http:' ? 'ws://': 'wss://') + location.hostname + '/chat/' + roomID + (!isNaN(hash) ? '/' + hash : ''));
		socket.onopen = function() {
			location.reload();
		};
	}, 200);
};
if (ta) {
	ta.addEventListener('input', function() {
		var before = ta.value.substr(0, ta.selectionStart),
			str = before.substr(-(before.match(/[\w-@]+$/) || [{length: 1}])[0].length),
			list = document.getElementById('pingsug'),
			c;
		while (c = list.firstChild) list.removeChild(c);
		if (str[0] == '@') {
			for (var i = users.length - 1; i >= 0; i--) {
				if (users[i].substr(0, str.length - 1) == str.substr(1)) {
					var span = document.createElement('span');
					span.appendChild(document.createTextNode(users[i]));
					span.onclick = function() {
						var before = ta.value.substr(0, ta.selectionStart).lastIndexOf('@') + 1;
						ta.value = ta.value.substr(0, before) + this.textContent + ta.value.substr(ta.selectionStart);
						ta.focus();
						ta.selectionEnd = ta.selectionStart = before + this.textContent.length;
					};
					list.appendChild(span);
				}
			}
		}
	});
	ta.onkeypress = ta.onkeydown = function(e) {
		if (e.keyCode == 13 && !e.shiftKey && !e.metaKey) {
			e.preventDefault();
			if (editing) edit();
			else send();
		} else if (editing && e.keyCode == 27 && !e.metaKey) {
			e.preventDefault();
			document.getElementsByClassName('editing')[0].classList.remove('editing');
			ta.hists = ta.hists || {};
			ta.hists[editing] = ta.hist;
			ta.hist = ta.hists[false] || [{
				body: ta.value,
				start: 0,
				end: 0
			}];
			ta.hIndex = ta.hist.length - 1;
			ta.value = ta.hist[ta.hIndex].body;
			editing = false;
			btn.onclick = send;
			btn.textContent = 'Send';
			this.value = '';
			cont.scrollTop = cont.scrollHeight;
		} else if (e.keyCode == 38 && !this.value && !e.shiftKey && !e.metaKey) {
			e.preventDefault();
			var i = cont.children.length;
			while (i--) {
				if (cont.children[i].getElementsByClassName('c-sig')[0].getElementsByTagName('a')[0].textContent == username && !cont.children[i].classList.contains('deleted')) {
					e = cont.children[i].getElementsByClassName('ctrls')[0].children[2];
					return e.onclick.apply(e);
				}
			}
		} else if (e.keyCode == 38 && editing && this.value == source[editing] && !e.shiftKey && !e.metaKey) {
			e.preventDefault();
			var i = cont.children.indexOf(document.getElementById(editing));
			while (i--) {
				if (cont.children[i].getElementsByClassName('c-sig')[0].getElementsByTagName('a')[0].textContent == username && !cont.children[i].classList.contains('deleted')) {
					ta.hists = ta.hists || {};
					ta.hists[editing] = ta.hist;
					ta.hist = ta.hists[false] || [{
						body: ta.value,
						start: 0,
						end: 0
					}];
					ta.hIndex = ta.hist.length - 1;
					ta.value = ta.hist[ta.hIndex].body;
					editing = false;
					btn.onclick = send;
					btn.textContent = 'Send';
					document.getElementsByClassName('editing')[0].classList.remove('editing');
					e = cont.children[i].getElementsByClassName('ctrls')[0].children[2];
					return e.onclick.apply(e);
				}
			}
		} else if (e.keyCode == 40 && editing && this.value == source[editing] && !e.shiftKey && !e.metaKey) {
			e.preventDefault();
			var i = cont.children.indexOf(document.getElementById(editing));
			while (++i < cont.children.length) {
				if (cont.children[i].getElementsByClassName('c-sig')[0].getElementsByTagName('a')[0].textContent == username && !cont.children[i].classList.contains('deleted')) {
					ta.hists = ta.hists || {};
					ta.hists[editing] = ta.hist;
					ta.hist = ta.hists[false] || [{
						body: ta.value,
						start: 0,
						end: 0
					}];
					ta.hIndex = ta.hist.length - 1;
					ta.value = ta.hist[ta.hIndex].body;
					ta.hists = ta.hists || {};
					ta.hists[editing] = ta.hist;
					ta.hist = ta.hists[false] || [{
						body: ta.value,
						start: 0,
						end: 0
					}];
					ta.hIndex = ta.hist.length - 1;
					ta.value = ta.hist[ta.hIndex].body;
					editing = false;
					btn.onclick = send;
					btn.textContent = 'Send';
					document.getElementsByClassName('editing')[0].classList.remove('editing');
					e = cont.children[i].getElementsByClassName('ctrls')[0].children[2];
					return e.onclick.apply(e);
				}
			}
			document.getElementsByClassName('editing')[0].classList.remove('editing');
			ta.hists = ta.hists || {};
			ta.hists[editing] = ta.hist;
			ta.hist = ta.hists[false] || [{
				body: ta.value,
				start: 0,
				end: 0
			}];
			ta.hIndex = ta.hist.length - 1;
			ta.value = ta.hist[ta.hIndex].body;
			editing = false;
			btn.onclick = send;
			btn.textContent = 'Send';
			this.value = '';
			cont.scrollTop = cont.scrollHeight;
		} else if (e.keyCode == 9) {
			e.preventDefault();
			this.noHandle = true;
			var before = this.value.substr(0, this.selectionStart),
				str = before.substr(-(before.match(/[\w-@]+$/) || [{length: 1}])[0].length),
				list = document.getElementById('pingsug');
			if (!list.firstChild) return;
			var before = this.value.substr(0, this.selectionStart).lastIndexOf('@') + 1;
			this.value = this.value.substr(0, before) + list.firstChild.textContent + ' ' + this.value.substr(this.selectionStart);
			this.selectionEnd = this.selectionStart = before + list.firstChild.textContent.length + 1;
		}
	};
}
function send() {
	if (!ta.value || ta.mdValidate(true)) return;
	socket.send(JSON.stringify({event: 'post', body: ta.value}));
	location.hash = '';
	ta.value = '';
	cont.scrollTop = cont.scrollHeight;
	ta.focus();
}
function edit() {
	if (!ta.value || ta.mdValidate(true)) return;
	socket.send(JSON.stringify({event: 'edit', body: ta.value, id: parseInt(editing)}));
	document.getElementsByClassName('editing')[0].classList.remove('editing');
	ta.hists = ta.hists || {};
	ta.hists[editing] = ta.hist;
	ta.hist = ta.hists[false] || [{
		body: ta.value,
		start: 0,
		end: 0
	}];
	ta.hIndex = ta.hist.length - 1;
	ta.value = ta.hist[ta.hIndex].body;
	editing = false;
	btn.onclick = send;
	btn.textContent = 'Send';
	ta.value = '';
	cont.scrollTop = cont.scrollHeight;
}
btn.addEventListener('click', function() {
	if (editing) edit();
	else send();
});
var editbtn = document.getElementById('edit');
if (editbtn) {
	editbtn.onclick = function() {
		document.getElementById('roominfo').hidden = true;
		document.getElementById('editform').hidden = false;
	};
}
document.getElementById('editform').onsubmit = function() {
	document.getElementById('roominfo').hidden = false;
	document.getElementById('editform').hidden = true;
	socket.send(JSON.stringify({event: 'info-update', name: document.getElementById('nameedit').value, desc: document.getElementById('descedit').value}));
	return false;
};
var hashchangeready = !hash;
addEventListener('hashchange', function(e) {
	if (navigator.userAgent.indexOf('Mobile') == -1 && ta) ta.focus();
	if (hashchangeready) {
		var hash = parseInt(e.newURL.split('#', 2)[1]);
		if (hash && !document.getElementById(hash)) {
			request('/api/chat/msg/' + hash, function(res) {
				try {
					res = JSON.parse(res);
					if (res.room == roomID) location.reload();
				} catch(e) {}
			});
		}
	} else hashchangeready = true;
});
document.addEventListener('visibilitychange', function() {
	if (!document.hidden) {
		document.title = title;
		unread = 0;
	}
});
if (navigator.userAgent.indexOf('Mobile') != -1) document.body.classList.add('mobile');