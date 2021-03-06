'use strict';
document.getElementById('mailform').onsubmit = function(e) {
	e.preventDefault();
	request('/api/me/changemail', function(res) {
		if (res.indexOf('Error') == 0) return alert(res);
		var mail = document.getElementById('mail');
		mail.hidden = document.getElementById('mailedit').hidden = false;
		document.getElementById('mailinput').hidden = document.getElementById('mailsave').hidden = document.getElementById('mailcancel').hidden = true;
		mail.removeChild(mail.firstChild);
		mail.appendChild(document.createTextNode('Mail: ' + document.getElementById('mailinput').value));
	}, 'newmail=' + encodeURIComponent(document.getElementById('mailinput').value));
};
document.getElementById('mailcancel').onclick = function() {
	document.getElementById('mail').hidden = document.getElementById('mailedit').hidden = false;
	document.getElementById('mailinput').hidden = document.getElementById('mailsave').hidden = document.getElementById('mailcancel').hidden = true;
};
document.getElementById('mailedit').onclick = function() {
	document.getElementById('mail').hidden = this.hidden = true;
	document.getElementById('mailinput').hidden = document.getElementById('mailsave').hidden = document.getElementById('mailcancel').hidden = false;
	document.getElementById('mailinput').focus();
};
document.getElementById('logout').onclick = function() {
	request('/api/logout', function() {
		location.href = '/';
	});
};