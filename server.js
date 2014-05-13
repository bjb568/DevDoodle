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
errors[404] = function(req, res) {
	respondPage('404 | DevDoodle', req, res, function() {
		res.write('<h1>404</h1>');
		respondPageFooter(res);
	}, {}, 404)
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

function respondPage(title, req, res, callback, header, status) {
	var query = url.parse(req.url, true).query, cookies = cookie.parse(req.headers.cookie || '');
	if (!header) header = {};
	if (!header['Content-Type']) header['Content-Type'] = 'application/xhtml+xml';
	res.writeHead(status || 200, header);
	fs.readFile('a/head.html', function(err, data) {
		if (err) throw err;
		collections.users.findOne({cookie: cookies.id}, function(err, user) {
			data = data.toString();
			if (user = user || header.user) {
				data = data.replace('<a href="/login/">Login</a>', linkUser(user.name));
			}
			res.write(data.replace('$title', title).replace('$search', query.q || ''));
			delete header.user;
			callback();
		});
	});
};
function respondPageFooter(res) {
	fs.readFile('a/foot.html', function(err, data) {
		if (err) throw err;
		res.end(data);
	});
};

http.createServer(function(req, res) {
	console.log('Req '+req.url);
	if (req.url == '/') {
		respondPage('DevDoodle', req, res, function() {
			res.write('Lorem ipsum. <a>this is a link</a>');
			respondPageFooter(res);
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
					respondPage('In dev', req, res, function() {
						res.write('In dev');
						respondPageFooter(res);
					});
				} else {
					var pass = new Buffer(crypto.pbkdf2Sync(post.pass, 'KJ:C5A;_\?F!00S\(4S[T-3X!#NCZI;A', 1e5, 128)).toString('base64'); // (!!p) Increase to 1e6
					collections.users.findOne({name: post.name, pass: pass}, function(err, user) {
						if (err) throw err;
						if (user) {
							var rstr = crypto.randomBytes(48).toString('base64');
							respondPage('Login Success | DevDoodle', req, res, function() {
								res.write('Welcome back, '+user.name+'. You have '+user.rep+' repuatation.');
								respondPageFooter(res);
							}, {
								'Set-Cookie': cookie.serialize('id', rstr, {
									path: '/',
									expires: new Date(new Date().setDate(new Date().getDate() + 30))
								}),
								user: user
							});
							collections.users.update({name: user.name}, {$set: {cookie: rstr}});
						} else {
							respondPage('Login | DevDoodle', req, res, function() {
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
								respondPageFooter(res);
							});
						}
					});
				}
			});
		} else {
			respondPage('Login | DevDoodle', req, res, function() {
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
				respondPageFooter(res);
			});
		}
	} else if (req.url == '/user/') {
		respondPage('Users | DevDoodle', req, res, function() {
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
				respondPageFooter(res);
			});
		});
	} else if (req.url == '/chat/') {
		respondPage('Chat | DevDoodle', req, res, function() {
			fs.readFile('chat/room.html', function(err, data) {
				if (err) throw err;
				res.write(data);
				respondPageFooter(res);
			});
		});
	} else if (req.url == '/dev/') {
		respondPage('Create | DevDoodle', req, res, function() {
			fs.readFile('dev/create.html', function(err, data) {
				if (err) throw err;
				res.write(data);
				respondPageFooter(res);
			});
		});
	} else if (req.url == '/learn/') {
		respondPage('Learn | DevDoodle', req, res, function() {
			fs.readFile('learn/learn.html', function(err, data) {
				if (err) throw err;
				res.write(data);
				respondPageFooter(res);
			});
		});
	} else if (req.url == '/learn/web/'){
		respondPage('Web Courses | Learn | DevDoodle', req, res, function() {
			fs.readFile('learn/web/web.html', function(err, data) {
				if (err) throw err;
				res.write(data);
				respondPageFooter(res)
			});
		});
	} else if (req.url == '/learn/web/intro/'){
		respondPage('Intro to HTML | Learn | DevDoodle', req, res, function() {
			fs.readFile('learn/web/intro/web-intro.html', function(err, data) {
				if (err) throw err;
				res.write(data);
				respondPageFooter(res)
			});
		});
	} else if (req.url == '/learn/web/intro/1/'){
		respondPage('Intro to HTML | Learn | DevDoodle', req, res, function() {
			fs.readFile('learn/web/intro/1/index.html', function(err, data) {
				if (err) throw err;
				res.write(data);
				respondPageFooter(res)
			});
		});
	} else if (req.url == '/learn/web/intro/2/'){
		respondPage('Intro to HTML | Learn | DevDoodle', req, res, function() {
			fs.readFile('learn/web/intro/2/index.html', function(err, data) {
				if (err) throw err;
				res.write(data);
				respondPageFooter(res)
			});
		});
	} else if (req.url == '/learn/web/intro/3/'){
		respondPage('Intro to HTML | Learn | DevDoodle', req, res, function() {
			fs.readFile('learn/web/intro/3/index.html', function(err, data) {
				if (err) throw err;
				res.write(data);
				respondPageFooter(res)
			});
		});
	} else if (req.url == '/learn/web/intro/4/'){
		respondPage('Intro to HTML | Learn | DevDoodle', req, res, function() {
			fs.readFile('learn/web/intro/4/index.html', function(err, data) {
				if (err) throw err;
				res.write(data);
				respondPageFooter(res)
			});
		});
	} else if (req.url == '/learn/web/basic-tags/'){
		respondPage('Basic Tags | Learn | DevDoodle', req, res, function() {
			fs.readFile('learn/web/basic-tags/web-basic-tags.html', function(err, data) {
				if (err) throw err;
				res.write(data);
				respondPageFooter(res)
			});
		});
	} else if (req.url == '/learn/web/basic-tags/1/'){
		respondPage('Basic Tags | Learn | DevDoodle', req, res, function() {
			fs.readFile('learn/web/basic-tags/1/index.html', function(err, data) {
				if (err) throw err;
				res.write(data);
				respondPageFooter(res)
			});
		});
	} else {
		fs.stat('.' + req.url, function(err, stats) {
			if (err) { errors[404](req,res) } else {
				res.writeHead(200, {'Content-Type': mime[path.extname(req.url)] || 'text/plain', 'Cache-Control': 'max-age=604800, public', 'Content-Length': stats.size});
				fs.readFile('.' + req.url, function(err, data) {
					if (err) { errors[404](req,res) } else {
						res.end(data);
					}
				});
			}
		});
	}
}).listen(8124);
console.log('Server running at http://localhost:8124/');

var chatWS = new ws.Server({host: 'localhost', port:8125});

chatWS.on('connection', function(tws) {
	collections.chat.find().toArray(function(err, docs) {
		docs.forEach(function(doc) {
			tws.send('{"event":"init","body":'+JSON.stringify(doc.body)+'}');
		});
	});
	tws.on('message', function(message) {
		collections.chat.insert({body: message});
		for (var i in chatWS.clients)
			chatWS.clients[i].send('{"event":"add","body":'+JSON.stringify(message)+'}');
	});
});