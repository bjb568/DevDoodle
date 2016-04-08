'use strict';
document.getElementById('resendform').onsubmit = function(e) {
	e.preventDefault();
	request('/api/login/resend', function(res) {
		document.getElementById('mailinput').disabled = document.getElementById('submit').disabled = true;
		alert(res);
	}, 'name=' + encodeURIComponent(document.getElementById('userinput').value) + '&pass=' + encodeURIComponent(document.getElementById('passinput').value) + '&mail=' + encodeURIComponent(document.getElementById('mailinput').value));
};