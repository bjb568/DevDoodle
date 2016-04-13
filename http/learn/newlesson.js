'use strict';
var code = document.getElementById('validator'),
	codeDisplay = document.getElementById('validator-display'),
	taCont = document.getElementById('ta-cont');
var blinkTimeout;
function blink() {
	document.getElementById('caret').hidden ^= 1;
	blinkTimeout = setTimeout(blink, 500);
}
function insertNodeAtPosition(node, refNode, pos) {
	if (typeof(refNode.nodeValue) == 'string') refNode.parentNode.insertBefore(node, refNode.splitText(pos));
	else {
		for (var i = 0; i < refNode.childNodes.length; i++) {
			var chNode = refNode.childNodes[i];
			if (chNode.textContent.length <= pos && i != refNode.childNodes.length - 1) pos -= chNode.textContent.length;
			else return insertNodeAtPosition(node, chNode, pos);
		}
	}
}
code.lastSelectionStart = 0;
code.lastSelectionEnd = 0;
code.lastCursorPos = 0;
code.whichSelection = true;
highlightJS(codeDisplay, code.lastValue = code.value);
taCont.dataset.line = codeDisplay.dataset.line;
codeDisplay.classList.add('code-display');
taCont.classList.add('ta-cont');
var caret = document.createElement('span');
caret.id = 'caret';
caret.appendChild(document.createTextNode('\xA0'));
codeDisplay.insertAfter(caret, codeDisplay.firstChild);
caret.hidden = true;
function handleCodeTAInput() {
	var codeScrollDiff = code.scrollHeight - code.offsetHeight;
	if (code.value != code.lastValue) {
		highlightJS(codeDisplay, code.lastValue = code.value);
		taCont.dataset.line = codeDisplay.dataset.line;
		codeDisplay.classList.add('code-display');
		taCont.classList.add('ta-cont');
	}
	code.style.height = codeDisplay.offsetHeight + 'px';
	taCont.scrollTop += codeScrollDiff;
	if (code.selectionStart != code.lastSelectionStart) {
		code.lastSelectionStart = code.selectionStart;
		code.whichSelection = false;
	}
	if (code.selectionEnd != code.lastSelectionEnd) {
		code.lastSelectionEnd = code.selectionEnd;
		code.whichSelection = true;
	}
	var cursorPos = code.whichSelection ? code.selectionEnd : code.selectionStart;
	var oldCaret = document.getElementById('caret');
	if (cursorPos != code.lastCursorPos || !oldCaret) {
		code.lastCursorPos = cursorPos;
		if (oldCaret) oldCaret.parentNode.removeChild(oldCaret);
		var caret = document.createElement('span');
		caret.id = 'caret';
		caret.appendChild(document.createTextNode('\xA0'));
		insertNodeAtPosition(caret, codeDisplay, cursorPos);
		clearTimeout(blinkTimeout);
		blinkTimeout = setTimeout(blink, 500);
	}
}
code.addEventListener('keypress', function() {
	setTimeout(handleCodeTAInput, 0);
});
code.addEventListener('keyup', function() {
	setTimeout(handleCodeTAInput, 0);
});
code.addEventListener('keydown', function() {
	setTimeout(handleCodeTAInput, 0);
});
code.addEventListener('mousedown', function() {
	setTimeout(handleCodeTAInput, 0);
});
addEventListener('mousemove', function() {
	setTimeout(handleCodeTAInput, 0);
});
code.addEventListener('input', handleCodeTAInput);
code.addEventListener('focus', function() {
	this.parentNode.classList.add('focused');
	document.getElementById('caret').hidden = false;
	clearTimeout(blinkTimeout);
	blinkTimeout = setTimeout(blink, 500);
});
code.addEventListener('blur', function() {
	delete this.lastCursorPos;
	this.parentNode.classList.remove('focused');
	document.getElementById('caret').hidden = true;
	clearTimeout(blinkTimeout);
});
code.addEventListener('keypress', jsKeypressHandler);
code.addEventListener('keydown', function(e) {
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
});