// TODO: have a queue with connections from where we can pair two and two as
//       long as numClients >= 2
// TODO: when two clients are paired, send some instruction to make them both
//       run newGame(), and retrieve information about their starting blocks
// TODO: forward keypress and block information between the two clients

var port = 80;

var app = require('express')(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server);

var UUID = require('node-uuid');

// Start express server.
server.listen(port);

var numberOfClients = 0;

console.log('Server listening on port ' + port);

// Forward to game.html.
app.get('/', function(req, res) { 
    res.sendfile(__dirname + '/game.html');
});

// Serve other files.
app.get('/*', function(req, res, next) {
    res.sendfile(__dirname + '/' + req.params[0]);
});

io.sockets.on('connection', function (client) {
    numberOfClients++;

    // Generate ID for new client.
    client.userid = UUID();

    // Emit ID to client.
    client.emit('onconnected', { id: client.userid } );

    console.log('Client connected: ' + client.userid);

    // On client disconnect:
    client.on('disconnect', function () {
        // Update and emit number of clients.
        numberOfClients--;
        io.sockets.emit('message', {clients: numberOfClients});

        console.log('Client disconnected: ' + client.userid );
    });

    // Emit number of clients to everyone.
    io.sockets.emit('message', {clients: numberOfClients});
});