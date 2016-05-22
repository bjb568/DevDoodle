'use strict';
var canvasJS = document.getElementById('canvas-js').value;
var code = document.getElementById('code'),
	codeDisplay = document.getElementById('code-display'),
	taCont = document.getElementById('ta-cont'),
	output = document.getElementById('output'),
	fullScreen = false,
	savedValue = code.value;
highlightJS(codeDisplay, code.lastValue = code.value);
taCont.dataset.line = codeDisplay.dataset.line;
codeDisplay.classList.add('code-display');
taCont.classList.add('ta-cont');
var caret = document.createElement('span');
caret.id = 'caret';
caret.appendChild(document.createTextNode('\xA0'));
codeDisplay.insertAfter(caret, codeDisplay.firstChild);
if (navigator.userAgent.indexOf('Mobile') == -1) {
	code.focus();
	taCont.classList.add('focused');
	blinkTimeout = setTimeout(blink, 500);
} else caret.hidden = true;
var oldValue,
	runTimeout;
function run() {
	if (oldValue == code.value) return;
	oldValue = code.value;
	var lines = code.value.split('\n');
	for (var i = 0; i < lines.length; i++) {
		if (navigator.userAgent.indexOf('Mobile') == -1 && lines[i].indexOf('requestEnableFullScreen;') == 0) {
			lines[i] = 'requestFullLayoutMode();' + lines[i].substr(25);
			if (navigator.userAgent.indexOf('Mobile') == -1 && !fullScreen) document.body.classList.add('fullscreen');
		}
	}
	if (save && !save.classList.contains('progress')) save.classList.toggle('modified', code.value != savedValue);
	var outputBlob = new Blob([
		'<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><head><title>Output frame</title></head><style>*{margin:0;max-width:100%;box-sizing:border-box}body{background:#000;color:#fff}#canvas{border:1px solid #fff;-webkit-user-select:none;-moz-user-select:none;cursor:default}#console{height:100px;background:#111;padding:4px;overflow:auto;margin-top:8px}button,canvas{display:block}button{margin-top:6px}</style><body><canvas id="canvas"></canvas><div id="console"></div><button onclick="location.reload()">Restart</button><script>' + html(canvasJS) + 'try{this.eval(' + html(JSON.stringify(lines.join('\n'))) + ')}catch (e){error(e)}</script></body></html>'
	], {type: 'application/xhtml+xml'});
	output.src = URL.createObjectURL(outputBlob);
}
function handleTAInput() {
	if (code.value != code.lastValue) {
		highlightJS(codeDisplay, code.lastValue = code.value);
		taCont.dataset.line = codeDisplay.dataset.line;
	}
	code.style.height = codeDisplay.offsetHeight + 'px';
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
	if (navigator.userAgent.indexOf('Mobile') == -1 && code == document.activeElement && (cursorPos != code.lastCursorPos || !oldCaret)) {
		code.lastCursorPos = cursorPos;
		if (oldCaret) oldCaret.parentNode.removeChild(oldCaret);
		var caret = document.createElement('span');
		caret.id = 'caret';
		caret.appendChild(document.createTextNode('\xA0'));
		insertNodeAtPosition(caret, codeDisplay, cursorPos * 2);
		clearTimeout(blinkTimeout);
		blinkTimeout = setTimeout(blink, 500);
	}
	clearTimeout(runTimeout);
	runTimeout = setTimeout(run, 200);
}
handleTAInput();
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
code.addEventListener('input', handleTAInput);
code.addEventListener('focus', taFocusHandler);
code.addEventListener('blur', taBlurHandler);
if (navigator.userAgent.indexOf('Mobile') == -1) {
	addEventListener('focus', function() {
		(document.getElementById('caret') || {}).hidden = false;
		if (!blinkTimeout) blinkTimeout = setTimeout(blink, 500);
	});
}
code.addEventListener('keypress', jsKeypressHandler);
code.addEventListener('keydown', taKeydownHandler);
function updateSavedValue() {
	savedValue = code.value;
}
function saveRequest() {
	request('/api/program/save?type=1', saveHandler, 'code=' + encodeURIComponent(code.value));
}
function forkRequest() {
	request('/api/program/save?type=1&fork=1', forkHandler, 'code=' + encodeURIComponent(code.value));
}
function canUnload() {
	return code.value == savedValue;
}