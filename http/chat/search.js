var user = document.getElementById('user').value,
	rooms = JSON.parse(document.getElementById('rooms').value),
	form = document.getElementById('form'),
	room = document.getElementById('room'),
	roomlist = document.getElementById('roomlist'),
	results = document.getElementById('results');
room.addEventListener('keyup', function(e) {
	var sel = roomlist.getElementsByClassName('selected');
	if (e.keyCode == 40) {
		if (sel.length) {
			sel = sel[0];
			sel.classList.remove('selected');
			if (sel.nextSibling) sel.nextSibling.classList.add('selected');
			else roomlist.firstChild.classList.add('selected');
		} else roomlist.firstChild.classList.add('selected');
	} else if (e.keyCode == 38) {
		if (sel.length) {
			sel = sel[0];
			sel.classList.remove('selected');
			if (sel.previousSibling) sel.previousSibling.classList.add('selected');
			else roomlist.lastChild.classList.add('selected');
		} else roomlist.lastChild.classList.add('selected');
	} else if (e.keyCode == 13) {
		if (sel.length) sel[0].onmousedown();
	} else {
		if (!(roomlist.hidden = !this.value || !isNaN(this.value))) {
			var firstChild;
			while (firstChild = roomlist.firstChild) roomlist.removeChild(firstChild);
			var i = this.value.length,
				used = [];
			while (used.length < 2) {
				for (var j = 0; j < rooms.length; j++) {
					if (used.indexOf(rooms[j].name) == -1 && rooms[j].name.substr(0, i).toLowerCase() == this.value.substr(0, i).toLowerCase()) {
						used.push(rooms[j].name);
						var span = document.createElement('span');
						span.appendChild(document.createTextNode(rooms[j].name));
						span.dataset.rid = rooms[j].id;
						span.onmousedown = function(e) {
							if (e) e.preventDefault();
							room.value = this.dataset.rid;
							this.parentNode.hidden = true;
						};
						span.onmouseover = function() {
							var sel = roomlist.getElementsByClassName('selected');
							if (sel.length) sel[0].classList.remove('selected');
							this.classList.add('selected');
						}
						roomlist.appendChild(span);
						if (i && span == roomlist.firstChild && !sel.length) span.classList.add('selected');
					}
				}
				if (i == 0) return;
				i--;
			}
		}
	}
});
room.addEventListener('keydown', function(e) {
	if (this.value && e.keyCode == 9) {
		this.value = roomlist.firstChild.textContent;
		form.onsubmit();
	}
});
room.addEventListener('blur', function() {
	roomlist.hidden = true;
});
room.addEventListener('focus', function() {
	roomlist.hidden = !this.value;
});
form.onsubmit = form.onchange = function(e) {
	e.preventDefault();
	document.activeElement.blur();
	request('/api/chat/search', function(res) {
		var fc;
		while (fc = results.firstChild) results.removeChild(fc);
		try {
			res = JSON.parse(res);
		} catch(e) {
			return alert('JSON Error. Response was: ' + res);
		}
		for (var i = 0; i < res.length; i++) {
			var data = res[i],
				div = document.createElement('div');
			div.classList.add('comment');
			if (data.deleted) div.classList.add('deleted');
			div.innerHTML = (user ? markdown(data.body + ' ').replace(new RegExp('@' + user + '(\\W)', 'g'), '<span class="mention">@' + user + '</span>$1') : markdown(data.body)).replaceAll('<a', '<a target="_blank"');
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
			permalink.appendChild(document.createTextNode(' in ' + data.roomName));
			permalink.href = data.room + '#' + (div.id = data.id);
			sig.appendChild(permalink);
			var currentNode = div;
			while (!sig.parentNode) {
				if (!currentNode.lastChild.lastChild || currentNode.lastChild.lastChild.tagName == 'blockquote' || currentNode.lastChild.lastChild.tagName == 'code') currentNode.appendChild(sig);
				else currentNode = currentNode.lastChild;
			}
			results.appendChild(div);
		}
	}, 'search=' + encodeURIComponent(document.getElementById('searchbox').value) + '&sort=' + document.getElementById('sort').value + '&user=' + encodeURIComponent(document.getElementById('user').value) + '&room=' + document.getElementById('room').value);
}