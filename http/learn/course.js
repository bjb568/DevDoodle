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
function serialize(e) {
	if (e.nodeValue) return e.nodeValue;
	var attrs = {};
	for (var i = 0; i < e.attributes.length; i++) attrs[e.attributes[i].name] = e.attributes[i].value;
	var children = [],
		ancestors = [];
	for (var i = 0; i < e.childNodes.length; i++) {
		var child = serialize(e.childNodes[i]);
		children.push(child);
		ancestors.push(child);
		if (child.ancestors) ancestors = ancestors.concat(child.ancestors);
	}
	return {
		id: e.id,
		tagName: e.tagName,
		attributes: attrs,
		childNodes: children,
		ancestors: ancestors
	};
}
document.getElementById('check').onclick = function(e) {
	e.preventDefault();
	var doc = new DOMParser().parseFromString(htmlTA.value, 'application/xhtml+xml'),
		script = doc.createElement('script');
	script.appendChild(document.createTextNode(document.getElementById('validator').value + '\naddEventListener(\'load\', function() { parent.postMessage(validate(' + JSON.stringify(htmlTA.value) + '), \'*\') })'));
	if (!doc.body) doc.documentElement.appendChild(doc.createElement('body'));
	doc.body.appendChild(script);
	var outputBlob = new Blob(['<!DOCTYPE html>' + doc.documentElement.outerHTML], {type: 'application/xhtml+xml'});
	document.getElementById('output').src = URL.createObjectURL(outputBlob);
	onmessage = function(e) {
		console.log(e);
		var success = !e || !e.data || e.data.success;
		var msg = !e || !e.data || typeof(e.data.msg) != 'string' ? 'You did it!' : e.data.msg;
		document.getElementById(success ? 'passed' : 'failed').classList.add('show');
		document.getElementById(success ? 'failed' : 'passed').classList.remove('show');
		document.getElementById(success ? 'passtext' : 'fail').innerHTML = success ? inlineMarkdown(msg) : markdown(msg);
	};
	document.getElementById('text-inner').scrollTop = document.getElementById('text-inner').scrollHeight;
};