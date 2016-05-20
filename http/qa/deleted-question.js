'use strict';
addEventListener('DOMContentLoaded', function() {
	var undel = document.getElementById('undelete');
	if (undel) undel.onclick = function() {
		if (confirm('Do you want to undelete this question?')) request('/api/question/undelete', function(res) {
			if (res.indexOf('Error') == 0) alert(res);
			else if (res == 'Success') location.reload();
			else alert('Unknown error. Response was: ' + res);
		});
	};
});