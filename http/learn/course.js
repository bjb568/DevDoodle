var footerOff = true,
	noPageOverflow = 520,
	htmlTA = document.getElementById('html'),
	runTimeout;
function run() {
	var outputBlob = new Blob([htmlTA.value], {type: 'application/xhtml+xml'});
	document.getElementById('output').src = URL.createObjectURL(outputBlob);
}
run();
function beforeRun() {
	clearTimeout(runTimeout);
	runTimeout = setTimeout(run, 100);
}
htmlTA.addEventListener('keyup', beforeRun);
htmlTA.addEventListener('keydown', beforeRun);
htmlTA.addEventListener('keypress', beforeRun);
document.getElementById('check').onclick = function() {
	var doc = new DOMParser().parseFromString(document.getElementById('html').value, 'application/xhtml+xml');
	if (doc.body && doc.body.getElementsByTagName('p').length) {
		document.getElementById('passed').classList.add('show');
		document.getElementById('failed').classList.remove('show');
	} else {
		document.getElementById('failed').classList.add('show');
		document.getElementById('passed').classList.remove('show');
	}
	document.getElementById('text-inner').scrollTop = document.getElementById('text-inner').scrollHeight;
};