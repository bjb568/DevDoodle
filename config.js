'use strict';
module.exports = {
	normal: {
		HTTP2: true,
		port80redirect: true,
		secureCookies: true,
		port: 443,
		sockets: true
	},
	test: {
		HTTP2: false,
		port80redirect: false,
		secureCookies: false,
		port: 8080,
		sockets: true
	}
};