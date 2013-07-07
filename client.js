// Create socket.io connection.
var socket = io.connect('/');
var userid = '';

var ready = false;
var strangerready = false;

MessageType = {
    ChatMessage : 0,
    ReadyMessage : 1,
    StartMessage : 2,
    GameoverMessage : 3
}


socket.on('connected', function (data) {
    document.getElementById("playerID").innerHTML = "My ID: <b>" + data.id + "</b>";
    addMessage('You are connected to the server!','System');

    // Draw the waiting screen!
    draw();

    // disable lobby buttons
    document.getElementById('sendButton').disabled = true; 
    document.getElementById('readyButton').disabled = true; 
});

socket.on('playerCountMessage', function (data){
    document.getElementById("playerCount").innerHTML = "Number of connected players: " + data.clients;
});

socket.on('foundPlayer', function (data) {
    document.getElementById("connectedToPlayer").innerHTML = "Connected to player " + data.id;
    addMessage('Found another player!','System');

    userid = data.id;

    //enable lobby buttons
    document.getElementById('sendButton').disabled = false; 
    document.getElementById('readyButton').disabled = false; 
});

socket.on('playerDisconnect', function (data) {
    document.getElementById("connectedToPlayer").innerHTML = "Not connected to a player.";
    socket.emit("searchingForPlayer", {id: userid});

    addMessage('Other player disconnected!','System');

    // Clear stuff.
    newGame();

    // And wait...
    state = GameState.Waiting;

    // Reset ready...
    ready = false;
    strangerready = false;

    // And disable lobby buttons.
    document.getElementById('sendButton').disabled = true; 
    document.getElementById('readyButton').disabled = true; 
});

// On recieving lobbyMessages
socket.on('lobbyMessage', function (data) {
    switch(data.type) {
        case MessageType.ChatMessage:
            // Recieved chatmessage from other player, add it to the TextArea
            addMessage(data.message,'Stranger');
            break;
        case MessageType.GameoverMessage:
            addMessage('YOU WON!','System');

            state = GameState.Gamewon;

            ready = false;
            strangerready = false;
            break;
        case MessageType.StartMessage:
            addMessage('Starting new game...','System');

            // Not waiting anymore, start game.
            state = GameState.Running;
            newGame();

            socket.emit('newTetromino', {current: curTet, next: nextTet, rotation: r, x: x, y: y});
            break;
        case MessageType.ReadyMessage:
            addMessage('Stranger is ready!','System');
            strangerready = true;
            
            if (ready)
                socket.emit('lobbyMessage',{type: MessageType.StartMessage, id: userid});
            break;
    }
});

// Emit gameover message and reset ready.
function emitGameover() {
    addMessage('STRANGER WON!','System');
    ready = false;
    strangerready = false;
    socket.emit('lobbyMessage', {type: MessageType.GameoverMessage, id: userid});
}


// TODO: update the game to show the other player's tetromino(s).
socket.on('newTetromino', function (data) {
	multiplayer = true;
	console.log('The other guy spawned a new thing! ');

    
});

// Set recieved blocks as the second players locked blocks.
socket.on('lockedBlocks', function (data) {
    blocksP2 = data.blocks;
});

