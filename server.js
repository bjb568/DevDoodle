var http = require('http');
var ws = require('ws');
var fs = require('fs');
var path = require('path');
var url = require('url');
var querystring = require('querystring');
var cookie = require('cookie');
var crypto = require('crypto');

var mongo = require('mongodb');
var db = new mongo.Db('DevDoodle', new mongo.Server("localhost", 27017, {auto_reconnect: false, poolSize: 4}), {w:0, native_parser: false});

var content = '';

var collections = {};
db.open(function(err, db) {
	if (err) throw err;
	db.authenticate('DevDoodle', 'KnT$6D6hF35^75tNyu6t', function(err, result) {
		if (err) throw err;
		db.collection('users', function(err, collection) {
			if (err) throw err;
			collections.users = collection;
		});
		db.collection('chat', function(err, collection) {
			if (err) throw err;
			collections.chat = collection;
		});
	});
});

var errors = [];
errors[404] = function(res) {
	console.log(404);
	res.writeHead(404, {'Content-Type': 'text/html'});
	res.end('404');
};

var mime = {
	'.html': 'text/html',
	'.css': 'text/css',
	'.js': 'text/javascript',
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.mp3': 'audio/mpeg'
};

function linkUser(name) {
	return '<a href="/user/'+name+'">'+name+'</a>';
};

function respondPage(req, res, callback, header) {
	var query = url.parse(req.url, true).query, cookies = cookie.parse(req.headers.cookie || '');
	if (!header) header = {};
	if (!header['Content-Type']) header['Content-Type'] = 'application/xhtml+xml';
	res.writeHead(200, header);
	fs.readFile('a/head.html', function(err, data) {
		if (err) throw err;
		collections.users.findOne({cookie: cookies.id}, function(err, user) {
			if (user = user || header.user) {
				res.write(data.toString().replace('$search', query.q || '').replace('<a href="/login/">Login</a>', linkUser(user.name)));
				delete header.user;
			} else {
				res.write(data.toString().replace('$search', query.q || ''));
			}
			delete header.user;
			callback();
			fs.readFile('a/foot.html', function(err, data) {
				if (err) throw err;
				res.end(data);
			});
		});
	});
};

http.createServer(function(req, res) {
	console.log('Req '+req.url);
	if (req.url == '/') {
		respondPage(req, res, function() {
			res.write('Lorem ipsum. <a>this is a link</a>');
		});
	} else if (req.url == '/login/') {
		if (req.method == 'POST') {
			var post = '';
			req.on('data', function(data) {
				post += data;
			});
			req.on('end', function() {
				post = querystring.parse(post);
				if (post.create) {
					respondPage(req, res, function() {
						res.write('In dev');
					});
				} else {
					var pass = new Buffer(crypto.pbkdf2Sync(post.pass, 'KJ:C5A;_\?F!00S\(4S[T-3X!#NCZI;A', 1e5, 128)).toString('base64'); // (!!p) Increase to 1e6
					collections.users.findOne({name: post.name, pass: pass}, function(err, user) {
						if (err) throw err;
						if (user) {
							var rstr = crypto.randomBytes(48).toString('base64');
							respondPage(req, res, function() {
								res.write('Welcome back, '+user.name+'. You have '+user.rep+' repuatation.');
							}, {
								'Set-Cookie': cookie.serialize('id', rstr, {
									path: '/',
									expires: new Date(new Date().setDate(new Date().getDate() + 30))
								}),
								user: user
							});
							collections.users.update({name: user.name}, {$set: {cookie: rstr}});
						} else {
							respondPage(req, res, function() {
								res.write('<style>');
								res.write('#content input[type=text], button { display: block }');
								res.write('</style>');
								res.write('<div class="error">Invalid credentials.</div>');
								res.write('<form method="post">');
								res.write('<input type="checkbox" name="create" id="create" onchange="document.getElementById(\'ccreate\').hidden ^= 1"' + (post.create?'checked ':'') + ' /><label for="create">Create an account</label>');
								res.write('<input type="text" name="name" placeholder="Name" required="" />');
								res.write('<input type="password" name="pass" placeholder="Password" required="" />');
								res.write('<div id="ccreate" ' + (post.create?'':'hidden="" ') + '>');
								res.write('<input type="password" name="passc" placeholder="Confirm Password" />');
								res.write('<input type="text" name="email" placeholder="Email" />');
								res.write('</div>');
								res.write('<button type="submit">Submit</button>');
								res.write('</form>');
							});
						}
					});
				}
			});
		} else {
			respondPage(req, res, function() {
				res.write('<style>');
				res.write('#content input[type=text], button { display: block }');
				res.write('</style>');
				res.write('<form method="post">');
				res.write('<input type="checkbox" name="create" id="create" onchange="document.getElementById(\'ccreate\').hidden ^= 1" /><label for="create">Create an account</label>');
				res.write('<input type="text" name="name" placeholder="Name" required="" />');
				res.write('<input type="password" name="pass" placeholder="Password" required="" />');
				res.write('<div id="ccreate" hidden="">');
				res.write('<input type="password" name="passc" placeholder="Confirm Password" />');
				res.write('<input type="text" name="email" placeholder="Email" />');
				res.write('</div>');
				res.write('<button type="submit">Submit</button>');
				res.write('</form>');
			});
		}
	} else if (req.url == '/user/') {
		respondPage(req, res, function() {
			collections.users.find().toArray(function(err, docs) {
				if (err) throw err;
				res.write('<table><tbody>');
				docs.forEach(function(doc) {
					res.write('<tr>');
					res.write('<td>' + doc.name + '</td>');
					res.write('<td>' + doc.rep + '</td>');
					res.write('</tr>');
				});
				res.write('</tbody></table>');
			});
		});
	} else if (req.url == '/chat/') {
		respondPage(req, res, function() {
			res.write('<div id="chat" class="scrly hglt pad pre" style="max-height: 80vh"></div>');
			res.write('<textarea id="ta" class="umar" style="width: 100%; height: 5vh; min-height: 18px;" onkeypress="if (arguments[0].keyCode == 13 &amp;&amp; !arguments[0].shiftKey) { send(); arguments[0].preventDefault(); }"></textarea><button class="blk" onclick="send()">Post</button>');
			res.write('<script>');
			res.write('var socket = new WebSocket(\'ws://localhost:8125/chat\'), loaded = false, onBottom = true, onscroll = function() { onBottom = document.getElementById(\'chat\').scrollTop + document.getElementById(\'chat\').offsetHeight >= document.getElementById(\'chat\').scrollHeight - 2 }; setTimeout(function() { loaded = true }, 3000);');
			res.write('function send() { socket.send(document.getElementById(\'ta\').value); document.getElementById(\'ta\').value = \'\'; document.getElementById(\'chat\').scrollTop = document.getElementById(\'chat\').scrollHeight }; socket.onmessage = function(e) { var div = document.createElement(\'div\'); div.classList.add(\'hglt\'); div.classList.add(\'umar\'); div.classList.add(\'spad\'); div.textContent = e.data; document.getElementById(\'chat\').appendChild(div); if (loaded) { new Audio(\'/a/beep.mp3\').play(); } if (onBottom) document.getElementById(\'chat\').scrollTop = document.getElementById(\'chat\').scrollHeight }');
			res.write('</script>');
		});
	} else {
		res.writeHead(200, {'Content-Type': mime[path.extname(req.url)] || 'text/plain', 'Cache-Control': 'max-age=604800, public'});
		var stream = fs.createReadStream('.' + req.url);
		stream.on('error', function(error) {
			errors[404](res);
		});
		stream.on('readable', function() {
			stream.pipe(res);
		});
	}
}).listen(8124);
console.log('Server running at http://localhost:8124/');

var chatWS = new ws.Server({host: 'localhost', port:8125});

chatWS.on('connection', function(tws) {
	collections.chat.find().toArray(function(err, docs) {
		docs.forEach(function(doc) {
			tws.send(doc.body);
		});
	});
	tws.on('message', function(message) {
		collections.chat.insert({body: message});
		for (var i in chatWS.clients)
			chatWS.clients[i].send(message);
	});
});