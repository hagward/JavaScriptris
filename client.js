// Create socket.io connection.
var socket = io.connect('/');
var userid = '';


socket.on('connected', function (data) {
    document.getElementById("playerID").innerHTML = "My ID: <b>" + data.id + "</b>";

    // Draw the waiting screen!
    draw();
});

socket.on('playerCountMessage', function (data){
    document.getElementById("playerCount").innerHTML = "Number of connected players: " + data.clients;
});

socket.on('foundPlayer', function (data) {
    document.getElementById("connectedToPlayer").innerHTML = "Connected to player " + data.id;
    
    userid = data.id;

    // Not waiting anymore, start game.
    waiting = false;
    newGame();

    socket.emit('newTetromino', {current: curTet, next: nextTet, rotation: r, x: x, y: y});
});

socket.on('playerDisconnect', function (data) {
    document.getElementById("connectedToPlayer").innerHTML = "Not connected to a player.";
    socket.emit("searchingForPlayer", {id: userid});

    // Clear stuff.
    newGame();

    // And wait...
    running = false;
    waiting = true;
});

// TODO: update the game to show the other player's tetromino(s).
socket.on('newTetromino', function (data) {
	multiplayer = true;
	console.log('The other guy spawned a new thing! ');
});


socket.on('lockedBlocks', function (data) {
    // Set recieved blocks as the second players locked blocks.
    blocksP2 = data.blocks;
});

