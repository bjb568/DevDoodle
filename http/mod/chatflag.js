'use strict';
var posts = document.getElementById('posts');
function submitEdit(id, form, e) {
	e.preventDefault();
	request('/api/chat/msg/' + id + '/edit', function(res) {
		if (res == 'Success') posts.removeChild(document.getElementById(id));
		else alert(res);
	}, 'body=' + encodeURIComponent(form.firstChild.value));
}
function cancelEdit(btn) {
	btn.parentNode.parentNode.hidden = true;
	btn.parentNode.parentNode.previousSibling.previousSibling.hidden = false;
}
function del(id) {
	request('/api/chat/msg/' + id + '/delv', function(res) {
		if (res == 'Success') posts.removeChild(document.getElementById(id));
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
		if (res == 'Success') posts.removeChild(document.getElementById(id));
		else alert(res);
	});
}
function skip(id) {
	request('/api/chat/msg/' + id + '/rskip');
	posts.removeChild(document.getElementById(id));
}
var e = document.getElementsByClassName('submit-edit'),
	i = e.length;
while (i--) e[i].addEventListener('submit', function(e) {
	submitEdit(parseInt(this.dataset.id), this, e);
});
e = document.getElementsByClassName('cancel-edit');
i = e.length;
while (i--) e[i].addEventListener('click', function() {
	cancelEdit(this);
});
e = document.getElementsByClassName('edit-btn');
i = e.length;
while (i--) e[i].addEventListener('click', function() {
	edit(parseInt(this.dataset.id));
});
e = document.getElementsByClassName('delete-btn');
i = e.length;
while (i--) e[i].addEventListener('click', function() {
	del(parseInt(this.dataset.id));
});
e = document.getElementsByClassName('mod-btn');
i = e.length;
while (i--) e[i].addEventListener('click', function() {
	comment(parseInt(this.dataset.id), true);
});
e = document.getElementsByClassName('dispute-btn');
i = e.length;
while (i--) e[i].addEventListener('click', function() {
	dispute(parseInt(this.dataset.id));
});
e = document.getElementsByClassName('comment-btn');
i = e.length;
while (i--) e[i].addEventListener('click', function() {
	comment(parseInt(this.dataset.id));
});
e = document.getElementsByClassName('skip-btn');
i = e.length;
while (i--) e[i].addEventListener('click', function() {
	skip(parseInt(this.dataset.id));
});