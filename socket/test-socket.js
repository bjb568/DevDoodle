'use strict';
module.exports = function(tws, wss) {
	tws.trysend('Socket connection successful.');
	tws.close();
};