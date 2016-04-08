'use strict';
var old = document.getElementById('old'),
	pass = document.getElementById('new'),
	passc = document.getElementById('conf'),
	passBar = document.getElementById('pass-bar'),
	passBarOuter = document.getElementById('pass-bar-outer'),
	passMatch = document.getElementById('pass-match'),
	passBad = document.getElementById('pass-bad'),
	submit = document.getElementById('submit');
(old || {}).oninput = pass.oninput = passc.oninput = function() {
	var fail = false;
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
	if (old && !old.value) fail = true;
	submit.disabled = fail;
};