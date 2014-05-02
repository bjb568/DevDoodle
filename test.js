var WebSocketServer = require('ws').Server
  , wss = new WebSocketServer({host:'localhost', port:8080});

wss.broadcast = function(data) {
  for (var i in this.clients)
    this.clients[i].send(data);
};

// use like this:
wss.on('connection', function(ws) {
  ws.on('message', function(message) {
    wss.broadcast(message);
  });
});