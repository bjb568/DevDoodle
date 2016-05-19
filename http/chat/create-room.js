'use strict';
var descf = document.getElementById('desc'),
	namef = document.getElementById('name');
namef.oninput = descf.oninput = function() {
	var err = '';
	if (namef.value && namef.value.length < 4) err = 'Name must be at least 4 characters long.';
	else if (descf.value && descf.value.length < 16) err = 'Description must be at least 16 characters long.';
	document.getElementById('err').textContent = err;
	document.getElementById('submit').disabled = err || !namef.value || !descf.value;
};
namef.oninput();
document.getElementById('form').onsubmit = function(e) {
	e.preventDefault();
	request('/api/chat/newroom', function(res) {
		if (res.substr(0, 7) == 'Error: ') alert(res);
		else if (res.substr(0, 10) == 'Location: ') location.href = res.substr(10);
		else alert('Unknown error. Response was: ' + res);
	},
		'name=' + encodeURIComponent(namef.value) +
		'&desc=' + encodeURIComponent(descf.value) +
		'&type=' + encodeURIComponent(document.getElementById('type').value)
	);
};