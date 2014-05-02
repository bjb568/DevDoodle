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
	'.svg': 'image/svg+xml'
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
			res.write('<div id="chat" class="scrly hglt pad" style="max-height: 60vh"></div>');
			res.write('<textarea id="ta" class="umar"></textarea><button class="blk" onclick="socket.send(document.getElementById(\'ta\').value); document.getElementById(\'ta\').value = \'\';">Post</button>');
			res.write('<script>');
			res.write('var socket = new WebSocket(\'ws://localhost:8125/chat\');');
			res.write('socket.onmessage = function(e) { var div = document.createElement(\'div\'); div.textContent = e.data; document.getElementById(\'chat\').appendChild(div); }');
			res.write('</script>');
		});
	} else {
		fs.exists('.' + req.url, function(exists) {
			if (exists) {
				res.writeHead(200, {'Content-Type': mime[path.extname(req.url)] || 'text/plain'});
				fs.createReadStream('.' + req.url).pipe(res);
			} else errors[404](res);
		});
	}
}).listen(8124);
console.log('Server running at http://localhost:8124/');

var chat = {};
chat.ws = new ws.Server({host: 'localhost', port:8125});
chat.messages = [];

chat.ws.on('connection', function(tws) {
	for (var i = 0; i < chat.messages.length; i++)
		tws.send(chat.messages[i]);
	tws.on('message', function(message) {
		chat.messages.push(message);
		for (var i in chat.ws.clients)
			chat.ws.clients[i].send(message);
	});
});