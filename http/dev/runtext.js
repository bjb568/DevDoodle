'use strict';
var text = document.getElementById('text'),
	savedValue = text.value;
function handleTAInput() {
	if (save && !save.classList.contains('progress')) save.classList.toggle('modified', !canUnload());
}
text.addEventListener('keypress', soonHandleTAInput);
text.addEventListener('keyup', soonHandleTAInput);
text.addEventListener('keydown', soonHandleTAInput);
text.addEventListener('input', handleTAInput);
function updateSavedValue() {
	savedValue = text.value;
}
function saveRequest() {
	request('/api/program/save?type=0', saveHandler, 'code=' + encodeURIComponent(text.value));
}
function forkRequest() {
	request('/api/program/save?type=0&fork=1', forkHandler, 'code=' + encodeURIComponent(text.value));
}
function canUnload() {
	return text.value == savedValue;
}