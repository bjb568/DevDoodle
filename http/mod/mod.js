function submitEdit(id, form, e) {
	e.preventDefault();
	request('/api/chat/msg/' + id + '/edit', function(res) {
		if (res == 'Success') document.getElementById(id).hidden = true;
		else alert(res);
	}, 'body=' + encodeURIComponent(form.firstChild.value));
}
function cancelEdit(btn) {
	btn.parentNode.parentNode.hidden = true;
	btn.parentNode.parentNode.previousSibling.previousSibling.hidden = false;
}
function del(id) {
	request('/api/chat/msg/' + id + '/delv', function(res) {
		if (res == 'Success') document.getElementById(id).hidden = true;
		else alert(res);
	});
}
function edit(id) {
	var e = document.getElementById(id).getElementsByTagName('form')[0];
	e.hidden = false;
	e.previousSibling.previousSibling.hidden = true;
}
function comment(id, mod) {
	var body = prompt('Enter your comment' + (mod ? ' to show to moderators.' : '.'));
	if (body) request('/api/chat/msg/' + id + '/rcomment', function(res) {
		if (res.substr(0, 4) == 'Ok: ') {
			var comment = document.createElement('div'),
				cont = document.getElementById(id).children[1];
			comment.innerHTML = res.substr(4);
			cont.insertBefore(comment, cont.lastChild);
		} else alert(res);
	}, (mod ? 'mod=1&' : '') + 'body=' + encodeURIComponent(body));
}
function dispute(id) {
	request('/api/chat/msg/' + id + '/nanv', function(res) {
		if (res == 'Success') document.getElementById(id).hidden = true;
		else alert(res);
	});
}
function skip(id) {
	request('/api/chat/msg/' + id + '/rskip');
	document.getElementById(id).hidden = true;
}