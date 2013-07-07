// TODO: when two clients are paired, send some instruction to make them both
//       run newGame(), and retrieve information about their starting blocks
// TODO: forward keypress and block information between the two clients

var port = 80;

var app = require('express')(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server);

var UUID = require('node-uuid');

MessageType = {
    ChatMessage : 0,
    ReadyMessage : 1,
    StartMessage : 2,
    GameoverMessage : 3
}

//  Start express server.
server.listen(port);

io.set('log level', 1);

var numberOfClients = 0;
var playerQueue = [];

console.log('Server listening on port ' + port);

// Forward to game.html.
app.get('/', function (req, res) {
    res.sendfile(__dirname + '/game.html');
});

// Serve other files.
app.get('/*', function (req, res, next) {
    res.sendfile(__dirname + '/' + req.params[0]);
});

function findPlayerAndConnect(client) {
    if (numberOfClients >= 2 && playerQueue.length >= 1) {
        var connectClient = playerQueue.shift();

        // Set and emit what player you connected to.
        connectClient.connectedTo = client;
        client.connectedTo = connectClient;

        connectClient.emit('foundPlayer', {id: client.userid});
        client.emit('foundPlayer',{id: connectClient.userid});

        console.log('Current queue size: ' + playerQueue.length);
    } else {
        playerQueue.push(client);
        console.log('Current queue size: ' + playerQueue.length);
    }
}

io.sockets.on('connection', function (client) {
    // Increment and emit number of clients to everyone.
    numberOfClients++;
    io.sockets.emit('playerCountMessage', {clients: numberOfClients});

    // Generate and set ID for new client.
    client.userid = UUID();

    // Emit ID to client.
    client.emit('connected', {id: client.userid});
    console.log('Client connected: ' + client.userid);

    // Find a player to connect to.
    findPlayerAndConnect(client);

    // On client disconnect:
    client.on('disconnect', function () {
        // Update and emit number of clients.
        numberOfClients--;
        io.sockets.emit('playerCountMessage', {clients: numberOfClients});

        console.log('Client disconnected: ' + client.userid);

        // If currently in queue, remove self from queue.
        var i = playerQueue.indexOf(client);
        if (i != -1) {
            playerQueue.splice(i, 1);
            console.log('Current queue size: ' + playerQueue.length);
        }

        // If connected to someone, send playerDisconnect message to connected player.
        if (client.connectedTo != null)
            client.connectedTo.emit('playerDisconnect', {id: client.userid});
    });

    // On client looking for new player:
    client.on('searchingForPlayer', function (data) {
        findPlayerAndConnect(client);
    });

    // On client spawns a new tetromino and wants to reveal information about
    // it to the client's partner in crime.
    client.on('newTetromino', function (data) {
        if (client.connectedTo != null)
            client.connectedTo.emit('newTetromino', data);
    });

    client.on('lockedBlocks', function (data) {
        if (client.connectedTo != null)
            client.connectedTo.emit('lockedBlocks', data);
    });

    // On client recieves lobbymessages.
    client.on('lobbyMessage', function (data) {
        switch(data.type) {
            case MessageType.ChatMessage:
            case MessageType.ReadyMessage:
            case MessageType.GameoverMessage:
                // Resend to connected client.
                if (client.connectedTo != null)
                    client.connectedTo.emit('lobbyMessage', data);
                break;
            case MessageType.StartMessage:
                // Send to both...
                if (client.connectedTo != null) {
                    client.connectedTo.emit('lobbyMessage', data);
                    client.emit('lobbyMessage',data);
                }
                break;    
        }
    });
});
