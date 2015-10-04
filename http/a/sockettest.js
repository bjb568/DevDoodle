var socketTest = document.getElementById('socket-test'),
	socket = new WebSocket('wss://' + location.hostname + ':81/test');
socket.onmessage = function(e) {
	socketTest.appendChild(document.createTextNode('\nMessage: ' + e.data))
};
socket.onclose = function(e) {
	socketTest.appendChild(document.createTextNode(
		e.wasClean ?
			'\nSocket closed cleanly.' :
			'\nSocket cleaned uncleanly, error code ' + e.code
		)
	);
	if (!e.wasClean) socketTest.classList.add('red');
};