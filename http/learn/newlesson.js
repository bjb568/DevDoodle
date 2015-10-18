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
highlight(codeDisplay, code.lastValue = code.value);
taCont.className = codeDisplay.className;
var caret = document.createElement('span');
caret.id = 'caret';
caret.appendChild(document.createTextNode('\xA0'));
codeDisplay.insertAfter(caret, codeDisplay.firstChild);
caret.hidden = true;
function handleTAInput() {
	var codeScrollDiff = code.scrollHeight - code.offsetHeight;
	if (code.value != code.lastValue) {
		highlight(codeDisplay, code.lastValue = code.value);
		taCont.className = codeDisplay.className;
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
	setTimeout(handleTAInput, 0);
});
code.addEventListener('keyup', function() {
	setTimeout(handleTAInput, 0);
});
code.addEventListener('keydown', function() {
	setTimeout(handleTAInput, 0);
});
code.addEventListener('mousedown', function() {
	setTimeout(handleTAInput, 0);
});
addEventListener('mousemove', function() {
	setTimeout(handleTAInput, 0);
});
code.addEventListener('input', handleTAInput);
code.addEventListener('blur', function() {
	document.getElementById('caret').hidden = true;
	clearTimeout(blinkTimeout);
});
code.addEventListener('focus', function() {
	document.getElementById('caret').hidden = false;
	clearTimeout(blinkTimeout);
	blinkTimeout = setTimeout(blink, 500);
});
code.addEventListener('keypress', function(e) {
	var oldSelectionStart = this.selectionStart;
	var pairChars = {};
	pairChars[40] = '()';
	pairChars[91] = '[]';
	pairChars[123] = '{}';
	var endChars = {};
	endChars[41] = ')';
	endChars[93] = ']';
	endChars[125] = '}';
	if (e.keyCode == 13) {
		var cut = (this.value.substr(0, oldSelectionStart).match(/(\S([ \t]+)| +)$/) || ['', '', ''])[2].length;
		this.value = this.value.substr(0, oldSelectionStart - cut) + this.value.substr(oldSelectionStart);
		oldSelectionStart = this.selectionStart = this.selectionEnd = oldSelectionStart - cut;
		if (this.value[oldSelectionStart - 1] == ',') this.eIndent = true;
		var tabs = this.value.substr(0, oldSelectionStart)
			.split('\n')[this.value.substr(0, oldSelectionStart).split('\n').length - 1]
			.split('\t').length
			- (
				('{([:'.indexOf(this.value[oldSelectionStart - 1]) + 1)
				? 0
				: (
					this.value[oldSelectionStart - 1] == ';' && this.eIndent
					? (this.eIndent = false || 2)
					: 1
				)
			);
		this.value = this.value.substr(0, this.selectionStart) + '\n' + '\t'.repeat(tabs) + (['{}', '()', '[]'].indexOf(this.value.substr(oldSelectionStart - 1, 2)) == -1 ? '' : '\n' + '\t'.repeat(tabs - 1)) + this.value.substr(this.selectionStart);
		this.selectionEnd = this.selectionStart = ++oldSelectionStart + tabs;
		e.preventDefault();
	} else if (e.charCode == 34) {
		if (this.value[this.selectionStart] != '"') this.value = this.value.substr(0, this.selectionStart) + '""' + this.value.substr(this.selectionStart);
		this.selectionEnd = this.selectionStart = ++oldSelectionStart;
		e.preventDefault();
	} else if (e.charCode == 39) {
		if (this.value[this.selectionStart] != "'") this.value = this.value.substr(0, this.selectionStart) + "''" + this.value.substr(this.selectionStart);
		this.selectionEnd = this.selectionStart = ++oldSelectionStart;
		e.preventDefault();
	} else if (pairChars[e.keyCode]) {
		this.value = this.value.substr(0, this.selectionStart) + pairChars[e.keyCode] + this.value.substr(this.selectionStart);
		this.selectionEnd = ++oldSelectionStart;
		e.preventDefault();
	} else if (endChars[e.keyCode] && this.value[this.selectionStart] == endChars[e.keyCode]) {
		this.selectionStart = ++this.selectionEnd;
		e.preventDefault();
	} else if (e.keyCode == 61 && this.value.substr(0, this.selectionStart).match(/(draw|refresh) $/)) {
		var tabs = this.value.substr(0, oldSelectionStart).split('\n')[this.value.substr(0, oldSelectionStart).split('\n').length - 1].split('\t').length;
		this.value = this.value.substr(0, this.selectionStart) + '= function() {\n' + '\t'.repeat(tabs) + '\n' + '\t'.repeat(tabs - 1) + '};' + this.value.substr(this.selectionStart);
		this.selectionEnd = this.selectionStart = oldSelectionStart + 15 + tabs;
		e.preventDefault();
	} else if (e.keyCode == 44) {
		this.value = this.value.substr(0, this.selectionStart) + ', ' + this.value.substr(this.selectionStart);
		this.selectionEnd = this.selectionStart = oldSelectionStart + 2;
		e.preventDefault();
	} else if (e.keyCode == 58) {
		this.value = this.value.substr(0, this.selectionStart) + ': ' + this.value.substr(this.selectionStart);
		this.selectionEnd = this.selectionStart = oldSelectionStart + 2;
		e.preventDefault();
	} else if (e.keyCode == 125 && this.value[this.selectionStart - 1] == '\t') {
		this.value = this.value.substr(0, this.selectionStart - 1) + '}' + this.value.substr(this.selectionStart);
		this.selectionEnd = this.selectionStart = oldSelectionStart;
		e.preventDefault();
	}
});
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