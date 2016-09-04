'use strict';
const url = require('url');
module.exports = {
	getByReferer(req, cb) {
		dbcs.programs.findOne({_id: ((url.parse(req.headers.referer || '').pathname || '').match(/^\/dev\/([a-zA-Z\d_!@]+)/) || [])[1]}, cb);
	}
};