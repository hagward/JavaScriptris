var io = require('socket.io');
var express = require('express');
var UUID = require('node-uuid');

var server = express.createServer();
io.listen(server);

server.use(express.logger());

server.get('/', function(req, res){
    res.send('Hello World!');
});

server.listen();
console.log('Express server started on port %s', server.address().port);