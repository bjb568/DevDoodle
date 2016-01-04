var namef = document.getElementById('name'),
	mailf = document.getElementById('mail');
namef.oninput = mailf.oninput = function() {
	var err = '';
	if (namef.value.match(/[^a-zA-Z0-9-]/)) err = 'Name may only contain alphanumeric characters and dashes.';
	else if (namef.value.indexOf(/---/) != -1) err = 'Name may not contain a sequence of 3 dashes.';
	else if (namef.value && namef.value.length < 3) err = 'Name must be at least 3 characters long.';
	document.getElementById('nameerr').textContent = err;
	document.getElementById('submit').disabled = err || !namef.value || !mailf.value;
};
mailf.oninput();