'use strict';
module.exports = {
	getByReferer(req, cb) {
		dbcs.chatrooms.findOne({_id: ((url.parse(req.headers.referer || '').pathname || '').match(/^\/chat\/([a-zA-Z\d_!@]+)/) || [])[1]}, cb);
	}
};