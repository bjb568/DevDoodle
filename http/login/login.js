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
	passStrength = document.getElementById('pass-strength'),
	passc = document.getElementById('passc'),
	passMatch = document.getElementById('pass-match'),
	create = document.getElementById('create'),
	namef = document.getElementById('name'),
	nameError = document.getElementById('name-error'),
	submit = document.getElementById('submit');
create.onchange = namef.onkeypress = namef.onkeydown = namef.onkeyup = pass.onkeypress = pass.onkeydown = pass.onkeyup = passc.onkeypress = passc.onkeydown = passc.onkeyup = function() {
	if (!create.checked) {
		submit.disabled = false;
		return;
	}
	setTimeout(function() {
		var fail;
		if (namef.value.length < 3) {
			fail = true;
			if (document.activeElement != namef && namef.value) nameError.textContent = 'Name must be at least 3 characters long.';
		} else nameError.textContent = '';
		var uniqueChars = [];
		for (var i = 0; i < pass.value.length; i++) {
			if (uniqueChars.indexOf(pass.value[i]) == -1) uniqueChars.push(pass.value[i]);
		}
		var matches = pass.value.match(/\d+|[a-z]{5,}|[A-z]{6,}/g) || [],
			penalty = 0;
		for (var i = 0; i < matches.length; i++) {
			penalty += matches[i].length;
		}
		var strength = uniqueChars.length - Math.sqrt(penalty) / 3 + pass.value.length / 10;
		if (!pass.value) {
			passStrength.textContent = '';
			fail = true;
		} else if (strength < 8) {
			passStrength.style.color = '#f00';
			passStrength.textContent = 'Weak password';
			fail = true;
		} else if (strength < 16) {
			passStrength.style.color = '#940';
			passStrength.textContent = 'Ok password, could be better';
		} else {
			passStrength.style.color = '#00f';
			passStrength.textContent = 'Strong password';
		}
		if (!passc.value) {
			fail = true;
			passMatch.hidden = true;
		} else if (passc.value != pass.value) {
			fail = true;
			passMatch.hidden = false;
		} else passMatch.hidden = true;
		submit.disabled = fail;
	}, 0);
};