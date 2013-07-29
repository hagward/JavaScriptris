// Create socket.io connection.
var socket = io.connect('/');
var userid = '';

var maxPauses = 2;
var curPauses = 0;

var wins = 0;
var strangerWins = 0;

MessageType = {
    ChatMessage : 0,
    ReadyMessage : 1,
    StartMessage : 2,
    GameoverMessage : 3,
    NewTetrominoMessage : 4,
    MoveLeftMessage : 5,
    MoveRightMessage : 6,
    MoveDownMessage : 7,
    RotateMessage : 8,
    LockBlocksMessage : 9,
    DeleteRowMessage : 10,
    ScoreMessage : 11,
    LevelMessage : 12,
    PauseMessage : 13,
    BattleMessage : 14,
    HotLinesMessage : 15
}

GameType = {
	None : 0,
    Endless : 1,
    TimeLimit : 2,
    Battle : 3,
    HotLines : 4
}

var readyType = GameType.None;
var strangerReadyType = GameType.None;
var gameType = GameType.None;

// Emit gameover message and reset variables.
function emitGameover() {
    addMessage('STRANGER WON!','System');

    // Reset update intervals to start value.
    updateInterval = startingUpdateInterval;
    updateIntervalP2 = startingUpdateInterval;

    gameTypeDraw(gameType);
    gameTypeReset(gameType);

    // Increase wins, reset pauses and timers.
    curPauses = 0;
    strangerWins++;
    setLobbyTexts();

    // Enable lobby buttons.
    setLobbyButtonsEnabled(true);

    clearInterval(gameLoop);
    clearInterval(timer);

    state = GameState.Gameover;
    readyType = GameType.None;
    strangerReadyType = GameType.None;

    socket.emit('lobbyMessage', {type: MessageType.GameoverMessage, id: userid});
}

function emitPauseToggle() {
    if (state == GameState.Running) {
        if (curPauses < maxPauses) {
            socket.emit('lobbyMessage', {type: MessageType.PauseMessage, action: 'pause', id: userid});

            // Increase local pauses.
            curPauses++;
            setLobbyTexts();
        }
    } else if (state == GameState.Paused) {
        socket.emit('lobbyMessage', {type: MessageType.PauseMessage, action: 'unpause', id: userid})
    }
}

socket.on('connected', function(data) {
    document.getElementById('playerID').innerHTML = 'My ID: <b>' + data.id + '</b>';
    userid = data.id;

    addMessage('You are connected to the server!','System');

    // Draw the waiting screen!
    draw();

    // Disable lobby buttons.
    setLobbyButtonsEnabled(false);
});

socket.on('playerCountMessage', function(data){
    document.getElementById('playerCount').innerHTML = 'Number of connected players: ' + data.clients;
});

socket.on('foundPlayer', function(data) {
    document.getElementById('connectedToPlayer').innerHTML = 'Connected to player ' + data.id;
    addMessage('Found another player!','System');

    // Enable lobby buttons.
    setLobbyButtonsEnabled(true);
});

socket.on('playerDisconnect', function(data) {
    document.getElementById('connectedToPlayer').innerHTML = 'Not connected to a player.';
    socket.emit('searchingForPlayer', {id: userid});

    addMessage('Other player disconnected!','System');

    // Wait and reset variables.
    state = GameState.Waiting;

    readyType = GameType.None;
    strangerReadyType = GameType.None;
    gameType = GameType.None;

    curPauses = 0;
    wins = 0;
    strangerWins = 0;

    // Reset everything.
    gameTypeResetAll();
    gameTypeDraw(gameType);
    resetLobby();

	updateInterval = startingUpdateInterval;
	updateIntervalP2 = startingUpdateInterval;

    // Clear stuff.
    newGame();
});

// On recieving lobbyMessages
socket.on('lobbyMessage', function(data) {
    switch (data.type) {
        case MessageType.ChatMessage:
            // Recieved chatmessage from other player, add it to the TextArea.
            addMessage(data.message,'Stranger');
            break;

        case MessageType.GameoverMessage:
            addMessage('YOU WON!','System');

            // Reset update intervals to start value.
            updateInterval = startingUpdateInterval;
            updateIntervalP2 = startingUpdateInterval;

            // Reset game type variables.
            gameTypeReset(gameType);

            // Increase wins, reset pauses and timers.
            wins++;
            curPauses = 0;
            clearInterval(timer);
            setLobbyTexts();

            // Enable lobby buttons.
            setLobbyButtonsEnabled(true);

            state = GameState.Gamewon;
            gameType = GameType.None;
            readyType = GameType.None;
            strangerReadyType = GameType.None;
            break;

        case MessageType.StartMessage:
            addMessage('Starting a new ' + getGameTypeString(data.gameType) + ' game...','System');
            
            gameType = data.gameType;

            // Disable ready button.
            document.getElementById('readyButton').disabled = true; 

            // Set game type starting conditions.
            gameTypeStart(gameType);
    
            // Not waiting anymore, start game.
            state = GameState.Running;
            newGame();

            socket.emit('newTetromino', {current: curTet, next: nextTet, rotation: r, x: x, y: y});
            break;

        case MessageType.ReadyMessage:
            strangerReadyType = data.gameType;

            // If same game type selected as stranger start a game.
            if (strangerReadyType == readyType) {
           		addMessage('Stranger is ready!','System');
           		socket.emit('lobbyMessage',{type: MessageType.StartMessage, id: userid, gameType: data.gameType});
        	} else {
        		addMessage('Stranger wants to play a(n) ' + getGameTypeString(data.gameType) + ' game!','System');
        	}
            break;

        case MessageType.PauseMessage:
            // Set or clear update intervals, set states and add a system message. 
            if (data.action == 'pause') {
                clearInterval(gameLoop);
                clearInterval(gameLoopP2);

                clearInterval(timer);

                state = GameState.Paused;

                if (data.id != userid)
                    addMessage('Stranger paused the game!', 'System');
                else
                    addMessage('You paused the game!', 'System');
            } else if (data.action == 'unpause') {
                gameLoop = setInterval(run, updateInterval);
                gameLoopP2 = setInterval(updateP2, updateIntervalP2);

                timer = setInterval(updateTimer, 1000);

                state = GameState.Running;

                if (data.id != userid)
                    addMessage('Stranger unpaused the game!', 'System');
                else
                    addMessage('You unpaused the game!', 'System');
            }

            // Draw new screen.
            draw();
            break;
    }
});

// TODO: The values received from Player 2 should probably checked in some way.
socket.on('gameMessage', function(data) {
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
    case MessageType.MoveDownMessage:
        yP2++;
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

        // Stranger cleared a line...
        addClearedLines(false,1,[data.row],gameType);

        break;
    case MessageType.ScoreMessage:
        scoreP2 = data.score;
        break;
    case MessageType.LevelMessage:
        levelP2 = data.level;
        if (updateIntervalP2 != data.interval) {
            clearInterval(gameLoopP2);
            gameLoopP2 = setInterval(updateP2, data.interval);
            updateIntervalP2 = data.interval;
        }
        break;
    case MessageType.BattleMessage:
    	clearedLines = data.lines;
    	break;
    case MessageType.HotLinesMessage:
        strangerHotLines = data.hotlines;
        break;    
    }
    draw();
});
