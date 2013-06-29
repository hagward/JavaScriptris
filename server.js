var io = require('socket.io');
var express = require('express');
var UUID = require('node-uuid');

var port = 1427;

//Start express server
var server = express.createServer();
server.listen(port);

var numberOfClients = 0;

console.log('Server listening on port ' + port);

//Forward to game.html
server.get('/', function(req, res) { 
    res.sendfile( __dirname + '/game.html');
});

//Serve other files
server.get('/*', function(req, res, next) {
    res.sendfile( __dirname + '/' + req.params[0]);
}); 


//Start socket.io server
var sio = io.listen(server);

sio.sockets.on('connection', function (client) {
    numberOfClients++;

    //Generate ID for new client
    client.userid = UUID();

    //emit ID to client
    client.emit('onconnected', { id: client.userid } );

    console.log('Client connected ' + client.userid);

    //On client disconnect:
    client.on('disconnect', function () {
        //update and emit number of clients
        numberOfClients--;
        sio.sockets.emit('message', {clients: numberOfClients});

        console.log('Client disconnected ' + client.userid );
    }); 

    //Emit number of clients to everyone
    sio.sockets.emit('message', {clients: numberOfClients});
});