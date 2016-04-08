'use strict';
document.getElementById('title').onclick = function() {
	this.hidden = true;
	var edit = document.getElementById('edit-title');
	edit.hidden = false;
	edit.focus();
};
document.getElementById('edit-title').onblur = function() {
	request('/api/lesson/edit-title', function(res) {
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