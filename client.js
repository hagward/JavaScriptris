// Create socket.io connection.
var socket = io.connect('/');
var userid = '';

var ready = false;
var strangerReady = false;

MessageType = {
    ChatMessage : 0,
    ReadyMessage : 1,
    StartMessage : 2,
    GameoverMessage : 3,
    NewTetrominoMessage : 4,
    MoveLeftMessage : 5,
    MoveRightMessage : 6,
    RotateMessage : 7,
    LockBlocksMessage : 8,
    DeleteRowMessage : 9,
    MoveDownMessage : 10
}

// Emit gameover message and reset ready.
function emitGameover() {
    addMessage('STRANGER WON!','System');
    ready = false;
    strangerReady = false;
    socket.emit('lobbyMessage', {type: MessageType.GameoverMessage, id: userid});
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
    strangerReady = false;

    // And disable lobby buttons.
    document.getElementById('sendButton').disabled = true; 
    document.getElementById('readyButton').disabled = true; 
});

// On recieving lobbyMessages
socket.on('lobbyMessage', function (data) {
    switch (data.type) {
    case MessageType.ChatMessage:
        // Recieved chatmessage from other player, add it to the TextArea
        addMessage(data.message,'Stranger');
        break;
    case MessageType.GameoverMessage:
        addMessage('YOU WON!','System');

        state = GameState.Gamewon;

        ready = false;
        strangerReady = false;
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
        strangerReady = true;
        
        if (ready)
            socket.emit('lobbyMessage',{type: MessageType.StartMessage, id: userid});
        break;
    }
});

// TODO: The values received from Player 2 should probably checked in some way.
socket.on('gameMessage', function (data) {
    console.log('RECEIVED gameMessage: ' + data.type);
    switch (data.type) {
    // The other player spawned a new tetromino:
    case MessageType.NewTetrominoMessage:
        curTetP2 = data.current;
        nextTetP2 = data.next;
        rP2 = data.rotation;
        xP2 = data.xPos;
        yP2 = data.yPos;
        break;
    case MessageType.MoveLeftMessage:
        xP2--;
        break;
    case MessageType.MoveRightMessage:
        xP2++;
        break;
    case MessageType.RotateMessage:
        rP2 = data.rotation;
        break;
    case MessageType.LockBlocksMessage:
        blocksP2 = data.blocks;
        break;
    case MessageType.DeleteRowMessage:
        blocksP2.splice(data.row, 1);
        blocksP2.unshift([-1, -1, -1, -1, -1, -1, -1, -1, -1, -1]);
        break;
    case MessageType.MoveDownMessage:
        yP2++;
        break;
    }
    draw();
});
