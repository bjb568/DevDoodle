var old = document.getElementById('old'),
	pass = document.getElementById('new'),
	passc = document.getElementById('conf'),
	passStrength = document.getElementById('pass-strength'),
	passMatch = document.getElementById('pass-match'),
	submit = document.getElementById('submit');
old.oninput = pass.oninput = passc.oninput = function() {
	var fail = false;
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
	if (!old.value) fail = true;
	submit.disabled = fail;
};