var sendmail = document.getElementById('sendmail'),
	reset = document.getElementById('reset'),
	uname = document.getElementById('uname'),
	mail = document.getElementById('mail'),
	submit1 = document.getElementById('submit1'),
	part2 = document.getElementById('part2'),
	code = document.getElementById('code'),
	pass = document.getElementById('pass'),
	passc = document.getElementById('passc'),
	passBar = document.getElementById('pass-bar'),
	passBarOuter = document.getElementById('pass-bar-outer'),
	passBad = document.getElementById('pass-bad'),
	passMatch = document.getElementById('pass-match'),
	submit2 = document.getElementById('submit2');
reset.onclick = function() {
	if (uname.disabled) location.reload();
	else uname.focus();
};
sendmail.oninput = function() {
	submit1.disabled = !uname.value || !mail.value;
};
sendmail.onsubmit = function(e) {
	e.preventDefault();
	if (!uname.value || !mail.value) return;
	request('/api/login/recover', function(res) {
		uname.disabled = mail.disabled = submit1.disabled = true;
		part2.hidden = false;
		part2.classList.remove('hide');
		code.focus();
	}, 'user=' + encodeURIComponent(uname.value) + '&mail=' + encodeURIComponent(mail.value));
};
code.oninput = pass.oninput = passc.oninput = function() {
	var fail = false;
	var strength = passStrength(pass.value);
	passBad.hidden = !(pass.value && strength < 1/4);
	fail |= strength < 1/4;
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
	if (!code.value) fail = true;
	submit2.disabled = fail;
};