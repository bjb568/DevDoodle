'use strict';
var	htmle = document.getElementById('html'),
	css = document.getElementById('css'),
	js = document.getElementById('js'),
	htmlDisplay = document.getElementById('html-display'),
	cssDisplay = document.getElementById('css-display'),
	jsDisplay = document.getElementById('js-display'),
	htmlCont = document.getElementById('html-cont'),
	cssCont = document.getElementById('css-cont'),
	jsCont = document.getElementById('js-cont'),
	restart = document.getElementById('restart'),
	savedValue = [htmle.value, css.value, js.value],
	lastValue = savedValue;
highlightHTML(htmlDisplay, htmle.value);
htmlCont.dataset.line = htmlDisplay.dataset.line;
htmle.style.height = htmlDisplay.offsetHeight + 'px';
highlightCSS(cssDisplay, css.value);
cssCont.dataset.line = cssDisplay.dataset.line;
css.style.height = cssDisplay.offsetHeight + 'px';
highlightJS(jsDisplay, js.value);
jsCont.dataset.line = jsDisplay.dataset.line;
js.style.height = jsDisplay.offsetHeight + 'px';
var caret = document.createElement('span');
caret.id = 'caret';
caret.appendChild(document.createTextNode('\xA0'));
htmlDisplay.insertAfter(caret, htmlDisplay.firstChild);
if (navigator.userAgent.indexOf('Mobile') == -1) {
	htmle.focus();
	htmlCont.classList.add('focused');
	blinkTimeout = setTimeout(blink, 500);
} else caret.hidden = true;
function run() {
	var outputBlob = new Blob([
		'<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><head><title>Output frame</title></head><body>' + htmle.value + '<style>' + html(css.value) + '</style><script>alert=prompt=confirm=null;' + html(js.value) + '</script></body></html>'
	], {type: 'application/xhtml+xml'});
	document.getElementById('output').src = URL.createObjectURL(outputBlob);
}
restart.onclick = run;
htmle.onkeypress = function(e) {
	var oldSelectionStart = this.selectionStart,
		el = (document.getElementById('caret') || {}).previousElementSibling;
	if (e.which == 13) {
		if (e.metaKey) return title.dispatchEvent(new MouseEvent('click'));
		var toSelection = this.value.substr(0, oldSelectionStart),
			tabs = toSelection
			.split('\n')[toSelection.split('\n').length - 1]
			.split('\t').length - (el.className == 'xml-tag end-start-tag' ? 0 : 1);
		this.value = this.value.substr(0, this.selectionStart) + '\n' + '\t'.repeat(tabs) + this.value.substr(this.selectionStart);
		this.selectionStart = ++oldSelectionStart + tabs;
		this.selectionEnd = this.selectionStart;
		e.preventDefault();
	} else if (e.which == 62 && el.className == 'xml-tag end-start-tag') {
		this.value = this.value.substr(0, this.selectionStart) + '></' + el.dataset.tagname + '>' + this.value.substr(this.selectionStart);
		this.selectionEnd = this.selectionStart = ++oldSelectionStart;
		e.preventDefault();
	} else if (e.which == 34) {
		if (this.value[this.selectionStart] != '"') this.value = this.value.substr(0, this.selectionStart) + (this.value[this.selectionStart - 1] == '=' ? '""' : '"') + this.value.substr(this.selectionStart);
		this.selectionEnd = this.selectionStart = ++oldSelectionStart;
		e.preventDefault();
	} else if (e.which == 39) {
		if (this.value[this.selectionStart] != "'") this.value = this.value.substr(0, this.selectionStart) + (this.value[this.selectionStart - 1] == '=' ? "''" : "'") + this.value.substr(this.selectionStart);
		this.selectionEnd = this.selectionStart = ++oldSelectionStart;
		e.preventDefault();
	} else if (e.which == 47 && this.value.substr(this.selectionEnd - 2, 2) == '\t<' && (this.value[this.selectionEnd] || '\n') == '\n') {
		var lines = this.value.substr(0, oldSelectionStart).split('\n');
		if (lines[lines.length - 1].indexOf('\t') == -1) return;
		lines[lines.length - 1] = lines[lines.length - 1].replace('\t', '');
		this.value = lines.join('\n') + '/' + this.value.substr(oldSelectionStart);
		this.selectionEnd = this.selectionStart = oldSelectionStart;
		e.preventDefault();
	}
};
css.onkeypress = js.onkeypress = taKeydownHandler;
run();
var runTimeout;
htmlCont.classList.toggle('collapsed', !htmle.value);
cssCont.classList.toggle('collapsed', !css.value);
jsCont.classList.toggle('collapsed', !js.value);
function handleTAInput() {
	if (save && !save.classList.contains('progress')) save.classList.toggle('modified', !canUnload());
	var cursorPos, oldCaret;
	if (htmle.value != lastValue[0]) {
		highlightHTML(htmlDisplay, htmle.value);
		htmlCont.dataset.line = htmlDisplay.dataset.line;
		htmle.style.height = htmlDisplay.offsetHeight + 'px';
		htmlCont.classList.toggle('collapsed', !htmle.value);
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
	if (css.value != lastValue[1]) {
		highlightCSS(cssDisplay, css.value);
		cssCont.dataset.line = cssDisplay.dataset.line;
		css.style.height = cssDisplay.offsetHeight + 'px';
		cssCont.classList.toggle('collapsed', !css.value);
	}
	if (css.selectionStart != css.lastSelectionStart) {
		css.lastSelectionStart = css.selectionStart;
		css.whichSelection = false;
	}
	if (css.selectionEnd != css.lastSelectionEnd) {
		css.lastSelectionEnd = css.selectionEnd;
		css.whichSelection = true;
	}
	cursorPos = css.whichSelection ? css.selectionEnd : css.selectionStart;
	oldCaret = document.getElementById('caret');
	if (navigator.userAgent.indexOf('Mobile') == -1 && css == document.activeElement && (cursorPos != css.lastCursorPos || !oldCaret)) {
		css.lastCursorPos = cursorPos;
		if (oldCaret) oldCaret.parentNode.removeChild(oldCaret);
		var caret = document.createElement('span');
		caret.id = 'caret';
		caret.appendChild(document.createTextNode('\xA0'));
		insertNodeAtPosition(caret, cssDisplay, cursorPos * 2);
		clearTimeout(blinkTimeout);
		blinkTimeout = setTimeout(blink, 500);
	}
	if (js.value != lastValue[2]) {
		highlightJS(jsDisplay, js.value);
		jsCont.dataset.line = jsDisplay.dataset.line;
		js.style.height = jsDisplay.offsetHeight + 'px';
		jsCont.classList.toggle('collapsed', !js.value);
	}
	if (js.selectionStart != js.lastSelectionStart) {
		js.lastSelectionStart = js.selectionStart;
		js.whichSelection = false;
	}
	if (js.selectionEnd != js.lastSelectionEnd) {
		js.lastSelectionEnd = js.selectionEnd;
		js.whichSelection = true;
	}
	cursorPos = js.whichSelection ? js.selectionEnd : js.selectionStart;
	oldCaret = document.getElementById('caret');
	if (navigator.userAgent.indexOf('Mobile') == -1 && js == document.activeElement && (cursorPos != js.lastCursorPos || !oldCaret)) {
		js.lastCursorPos = cursorPos;
		if (oldCaret) oldCaret.parentNode.removeChild(oldCaret);
		var caret = document.createElement('span');
		caret.id = 'caret';
		caret.appendChild(document.createTextNode('\xA0'));
		insertNodeAtPosition(caret, jsDisplay, cursorPos);
		clearTimeout(blinkTimeout);
		blinkTimeout = setTimeout(blink, 500);
	}
	var newValue = [htmle.value, css.value, js.value];
	if (document.getElementById('autorun').checked && JSON.stringify(lastValue) != JSON.stringify(newValue)) {
		clearTimeout(runTimeout);
		runTimeout = setTimeout(run, 200);
	}
	lastValue = newValue;
}
addEventListener('keypress', function(e) {
	requestAnimationFrame(function() {
		handleTAInput();
		if (e.which == 13) {
			var caret = document.getElementById('caret');
			if (caret) taCont.scrollTop = Math.max(taCont.scrollTop, caret.getBoundingClientRect().top + caret.offsetHeight + 8 - caret.parentNode.getBoundingClientRect().top - taCont.offsetHeight);
		}
	});
});
addEventListener('keyup', soonHandleTAInput);
addEventListener('keydown', soonHandleTAInput);
addEventListener('mousedown', soonHandleTAInput);
addEventListener('mousemove', soonHandleTAInput);
addEventListener('input', handleTAInput);
htmle.addEventListener('focus', taFocusHandler);
css.addEventListener('focus', taFocusHandler);
js.addEventListener('focus', taFocusHandler);
htmle.addEventListener('blur', taBlurHandler);
css.addEventListener('blur', taBlurHandler);
js.addEventListener('blur', taBlurHandler);
if (navigator.userAgent.indexOf('Mobile') == -1) {
	addEventListener('focus', function() {
		(document.getElementById('caret') || {}).hidden = false;
		if (!blinkTimeout) blinkTimeout = setTimeout(blink, 500);
	});
}
function updateSavedValue() {
	savedValue = [htmle.value, css.value, js.value];
}
function saveRequest() {
	request('/api/program/save?type=2', saveHandler, 'html=' + encodeURIComponent(htmle.value) + '&css=' + encodeURIComponent(css.value) + '&js=' + encodeURIComponent(js.value));
}
function forkRequest() {
	request('/api/program/save?type=2&fork=1', forkHandler, 'html=' + encodeURIComponent(htmle.value) + '&css=' + encodeURIComponent(css.value) + '&js=' + encodeURIComponent(js.value));
}
function canUnload() {
	return JSON.stringify([htmle.value, css.value, js.value]) == JSON.stringify(savedValue);
}