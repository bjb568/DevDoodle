'use strict';
var socketTest = document.getElementById('socket-test'),
	socket = new WebSocket((location.protocol == 'http:' ? 'ws://' : 'wss://') + location.hostname + '/test');
socket.onmessage = function(e) {
	socketTest.appendChild(document.createTextNode('\nMessage: ' + e.data));
};
socket.onclose = function(e) {
	socketTest.appendChild(document.createTextNode(
		e.wasClean ?
			'\nSocket closed cleanly.'
			: '\nSocket closed uncleanly, error code ' + e.code
	));
	if (!e.wasClean) socketTest.classList.add('red');
};