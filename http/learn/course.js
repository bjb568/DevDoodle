var htmle = document.getElementById('html-ta'),
	htmlDisplay = document.getElementById('html-display'),
	htmlCont = document.getElementById('html'),
	origValue = htmle.value,
	lastValue = origValue,
	onbeforeunload = function() {
		return htmle.value == origValue ? null : 'You have unsaved code.';
	},
	blinkTimeout;
function blink() {
	document.getElementById('caret').hidden ^= 1;
	blinkTimeout = setTimeout(blink, 500);
}
function insertNodeAtPosition(node, refNode, pos) {
	if (typeof(refNode.nodeValue) == 'string') refNode.parentNode.insertBefore(node, refNode.nodeValue.length == 1 ? refNode : refNode.splitText(pos));
	else {
		for (var i = 0; i < refNode.childNodes.length; i++) {
			var chNode = refNode.childNodes[i];
			if (chNode.textContent.length <= pos && i != refNode.childNodes.length - 1) pos -= chNode.textContent.length;
			else return insertNodeAtPosition(node, chNode, pos);
		}
	}
}
highlightHTML(htmlDisplay, htmle.value, true);
htmlCont.dataset.line = htmlDisplay.dataset.line;
htmle.style.height = htmlDisplay.offsetHeight + 'px';
function run() {
	var outputBlob = new Blob([htmle.value], {type: 'application/xhtml+xml'});
	document.getElementById('output').src = URL.createObjectURL(outputBlob);
}
htmle.onkeypress = function(e) {
	var oldSelectionStart = this.selectionStart,
		el = (document.getElementById('caret') || {}).previousElementSibling;
	if (e.keyCode == 13) {
		if (e.metaKey) return document.getElementById('title').dispatchEvent(new MouseEvent('click'));
		var toSelection = this.value.substr(0, oldSelectionStart),
			tabs = toSelection
			.split('\n')[toSelection.split('\n').length - 1]
			.split('\t').length
			- (
				el.className == 'xml-tag end-start-tag'
				? 0
				: 1
			);
		this.value = this.value.substr(0, this.selectionStart) + '\n' + '\t'.repeat(tabs) + this.value.substr(this.selectionStart);
		this.selectionStart = ++oldSelectionStart + tabs;
		this.selectionEnd = this.selectionStart;
		e.preventDefault();
	} else if (e.keyCode == 62 && el.className == 'xml-tag end-start-tag') {
		this.value = this.value.substr(0, this.selectionStart) + '></' + el.dataset.tagname + '>' + this.value.substr(this.selectionStart);
		this.selectionEnd = this.selectionStart = ++oldSelectionStart;
		e.preventDefault();
	} else if (e.keyCode == 34) {
		if (this.value[this.selectionStart] != '"') this.value = this.value.substr(0, this.selectionStart) + (this.value[this.selectionStart - 1] == '=' ? '""' : '"') + this.value.substr(this.selectionStart);
		this.selectionEnd = this.selectionStart = ++oldSelectionStart;
		e.preventDefault();
	} else if (e.keyCode == 39) {
		if (this.value[this.selectionStart] != "'") this.value = this.value.substr(0, this.selectionStart) + (this.value[this.selectionStart - 1] == '=' ? "''" : "'") + this.value.substr(this.selectionStart);
		this.selectionEnd = this.selectionStart = ++oldSelectionStart;
		e.preventDefault();
	} else if (e.keyCode == 47 && this.value.substr(this.selectionEnd - 2, 2) == '\t<' && (this.value[this.selectionEnd] || '\n') == '\n') {
		var lines = this.value.substr(0, oldSelectionStart).split('\n');
		if (lines[lines.length - 1].indexOf('\t') == -1) return;
		lines[lines.length - 1] = lines[lines.length - 1].replace('\t', '');
		this.value = lines.join('\n') + '/' + this.value.substr(oldSelectionStart);
		this.selectionEnd = this.selectionStart = oldSelectionStart;
		e.preventDefault();
	}
};
htmle.onkeydown = function(e) {
	if (e.keyCode == 8 && this.selectionStart == this.selectionEnd) {
		if (
			(this.value[this.selectionStart - 1] == '"' && this.value[this.selectionStart] == '"') ||
			(this.value[this.selectionStart - 1] == "'" && this.value[this.selectionStart] == "'") ||
			(this.value[this.selectionStart - 1] == '(' && this.value[this.selectionStart] == ')') ||
			(this.value[this.selectionStart - 1] == '[' && this.value[this.selectionStart] == ']') ||
			(this.value[this.selectionStart - 1] == '{' && this.value[this.selectionStart] == '}')
		) {
			var oldSelectionStart = this.selectionStart;
			this.value = this.value.substr(0, this.selectionStart - 1) + this.value.substr(this.selectionStart + 1);
			this.selectionEnd = --oldSelectionStart;
			e.preventDefault();
		}
	}
};
run();
var runTimeout;
function handleTAInput() {
	var cursorPos, oldCaret;
	if (htmle.value != lastValue) {
		highlightHTML(htmlDisplay, htmle.value, true);
		htmlCont.dataset.line = htmlDisplay.dataset.line;
		htmle.style.height = htmlDisplay.offsetHeight + 'px';
	}
	if (htmle.selectionStart != htmle.lastSelectionStart) {
		htmle.lastSelectionStart = htmle.selectionStart;
		htmle.whichSelection = false;
	}
	if (htmle.selectionEnd != htmle.lastSelectionEnd) {
		htmle.lastSelectionEnd = htmle.selectionEnd;
		htmle.whichSelection = true;
	}
	cursorPos = htmle.whichSelection ? htmle.selectionEnd : htmle.selectionStart;
	oldCaret = document.getElementById('caret');
	if (navigator.userAgent.indexOf('Mobile') == -1 && htmle == document.activeElement && (cursorPos != htmle.lastCursorPos || !oldCaret)) {
		htmle.lastCursorPos = cursorPos;
		if (oldCaret) oldCaret.parentNode.removeChild(oldCaret);
		var caret = document.createElement('span');
		caret.id = 'caret';
		caret.appendChild(document.createTextNode('\xA0'));
		insertNodeAtPosition(caret, htmlDisplay, cursorPos);
		clearTimeout(blinkTimeout);
		blinkTimeout = setTimeout(blink, 500);
	}
	if (lastValue != htmle.value) {
		clearTimeout(runTimeout);
		runTimeout = setTimeout(run, 150);
	}
	lastValue = htmle.value;
}
addEventListener('keypress', function() {
	setTimeout(handleTAInput, 0);
});
addEventListener('keyup', function() {
	setTimeout(handleTAInput, 0);
});
addEventListener('keydown', function() {
	setTimeout(handleTAInput, 0);
});
addEventListener('mousedown', function() {
	setTimeout(handleTAInput, 0);
});
addEventListener('mousemove', function() {
	setTimeout(handleTAInput, 0);
});
addEventListener('input', handleTAInput);
htmle.onfocus = function() {
	this.parentNode.classList.add('focused');
};
htmle.onblur = function() {
	delete this.lastCursorPos;
	this.parentNode.classList.remove('focused');
	(document.getElementById('caret') || {}).hidden = true;
	clearTimeout(blinkTimeout);
};
if (navigator.userAgent.indexOf('Mobile') == -1) {
	addEventListener('focus', function() {
		(document.getElementById('caret') || {}).hidden = false;
		if (!blinkTimeout) blinkTimeout = setTimeout(blink, 500);
	});
}
document.getElementById('check').onclick = function(e) {
	e.preventDefault();
	var doc = new DOMParser().parseFromString(htmle.value, 'application/xhtml+xml'),
		script = doc.createElement('script');
	script.appendChild(document.createTextNode(document.getElementById('validator').value + '\naddEventListener(\'load\', function() { parent.postMessage(validate(' + JSON.stringify(htmle.value) + '), \'*\') })'));
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