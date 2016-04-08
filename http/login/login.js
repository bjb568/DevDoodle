'use strict';
var jsFormConfirm;
addEventListener('click', function() {
	if (!jsFormConfirm) {
		jsFormConfirm = true;
		var i = document.createElement('input');
		i.type = 'hidden';
		i.name = 'check';
		i.value = 'JS-confirm';
		document.getElementById('ccreate').appendChild(i);
	}
});

var pass = document.getElementById('pass'),
	passc = document.getElementById('passc'),
	passBar = document.getElementById('pass-bar'),
	passBarOuter = document.getElementById('pass-bar-outer'),
	passMatch = document.getElementById('pass-match'),
	passBad = document.getElementById('pass-bad'),
	create = document.getElementById('create'),
	namef = document.getElementById('name'),
	nameError = document.getElementById('name-error'),
	mail = document.getElementById('mail'),
	submit = document.getElementById('submit'),
	sec = document.getElementById('sec');

create.onchange = namef.oninput = pass.oninput = pass.onfocus = passc.oninput = mail.oninput = function() {
	submit.firstChild.nodeValue = create.checked ? 'Create Account' : 'Submit';
	if (!create.checked) {
		submit.disabled = false;
		return;
	}
	var fail;
	if (namef.value.match(/[^a-zA-Z0-9-]/)) {
		fail = true;
		nameError.firstChild.nodeValue = 'Name may only contain alphanumeric characters and dashes.';
	} else if (namef.value.indexOf(/---/) != -1) {
		fail = true;
		nameError.firstChild.nodeValue = 'Name may not contain a sequence of 3 dashes.';
	} else if (namef.value.length < 3) {
		fail = true;
		if (document.activeElement != namef && namef.value) nameError.firstChild.nodeValue = 'Name must be at least 3 characters long.';
		else nameError.firstChild.nodeValue = '';
	} else nameError.firstChild.nodeValue = '';
	var strength = passStrength(pass.value);
	passBad.hidden = !(pass.value && strength < 0.25);
	fail |= strength < 0.25;
	passBarOuter.style.opacity = pass.value ? '1' : '';
	passBar.style.width = strength * 100 + '%';
	passBar.style.background = 'hsl(' + strength * 130 + ', 100%, 50%)';
	if (!passc.value) {
		fail = true;
		passMatch.hidden = true;
	} else if (passc.value != pass.value) {
		fail = true;
		passMatch.hidden = false;
	} else passMatch.hidden = true;
	console.log(fail);
	fail |= !mail.value;
	console.log(fail);
	submit.disabled = fail;
};
var num = sec.dataset.num;
sec.firstChild.nodeValue = 'Expand (x ' + (num < 0 ? '- ' + Math.abs(num) : '+ ' + num) + ')² to the form ax² + bx + c: ';