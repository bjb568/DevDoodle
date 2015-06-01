var https = require('https');
var fs = require('fs');

var options = {
	key: fs.readFileSync('../cert/devdoodle.net.key'),
	cert: fs.readFileSync('../cert/devdoodle.net.crt'),
	ca: fs.readFileSync('../cert/devdoodle.net-geotrust.crt')
};

https.createServer(options, function(req, res) {
	res.writeHead(200);
	res.end("hello world\n");
}).listen(1337);