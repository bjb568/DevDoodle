'use strict';
module.exports = o(function*(tws, wss) {
	tws.trysend('Socket connection successful.');
	tws.close();
});