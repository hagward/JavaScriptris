// Create socket.io connection.
var socket = io.connect('/');
var userid = '';

var maxPauses = 2;
var curPauses = 0;

var maxTime = 100;
var curTime = 0;
var timer;

var clearedLines = 0;
var strangerClearedLines = 0;
var maxClearedLines = 10;

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
    BattleMessage : 14
}

GameType = {
	None : 0,
    Endless : 1,
    TimeLimit : 2,
    Battle : 3,
    Coop : 4
}

var readyType = GameType.None;
var strangerReadyType = GameType.None;
var gameType = GameType.None;

// Emit gameover message and reset variables.
function emitGameover() {
    addMessage('STRANGER WON!','System');

    // Reset variables.
    readyType = GameType.None;
    strangerReadyType = GameType.None;

	clearedLines = 0;
	strangerClearedLines = 0;

    // Increase stranger wins reset pauses and timers.
    curPauses = 0;
    document.getElementById('pauseCount').innerHTML = 'p = pause (' + maxPauses + ' left)';

    strangerWins++;
    document.getElementById('scoreCount').innerHTML = wins + ' - ' + strangerWins;

    curTime = 0;
    document.getElementById('timeCount').innerHTML = '';
    clearInterval(timer);

    // Re-enable ready button.
    document.getElementById('readyButton').disabled = false; 

    // Reset update intervals to start value.
    updateInterval = startingUpdateInterval;
    updateIntervalP2 = startingUpdateInterval;

    socket.emit('lobbyMessage', {type: MessageType.GameoverMessage, id: userid});
}

function emitPauseToggle() {
    if (state == GameState.Running) {
        if (curPauses < maxPauses) {
            socket.emit('lobbyMessage', {type: MessageType.PauseMessage, action: 'pause', id: userid});

            // Increase local pauses.
            curPauses++;
            document.getElementById('pauseCount').innerHTML = 'p = pause (' + (maxPauses - curPauses) + ' left)';
        }
    } else if (state == GameState.Paused) {
        socket.emit('lobbyMessage', {type: MessageType.PauseMessage, action: 'unpause', id: userid})
    }
}

function checkGameTypeRules() {
	switch (readyType) {
		case GameType.Endless:
			// No special rules...
			break;

		case GameType.TimeLimit:
			// If time is up...
			if (curTime >= maxTime) {
				clearInterval(timer);

				document.getElementById('timeCount').innerHTML = 'Time up!';
				if (score < scoreP2) {
					// Stranger wins, emit gameover.
					clearInterval(gameLoop);
    				state = GameState.Gameover;

					emitGameover();
				} else if (score == scoreP2) {
					// Same score.
					addMessage('Dead heat!','System');

					// Reset some variables and wait.
				    state = GameState.Waiting;
				    readyType = GameType.None;
				    strangerReadyType = GameType.None;
				    gameType = GameType.None;
				    curPauses = 0;
				    curTime = 0;

                    // Re-enable ready button.
                    document.getElementById('readyButton').disabled = false; 

				    document.getElementById('pauseCount').innerHTML = 'p = pause (' + maxPauses + ' left)';
					document.getElementById('timeCount').innerHTML = '';
				}
			}
			break;

		case GameType.Battle:
			// If stranger wins...
			if (strangerClearedLines >= maxClearedLines) {
				drawBattleMeter();

				// ... emit gameover.
				clearInterval(gameLoop);
    			state = GameState.Gameover;
				emitGameover();
			}

			break;
	}
}

function addClearedLines(ownLines,lines) {
    if (gameType != GameType.Battle) return;

	if (ownLines) {
		clearedLines+=lines;

		// If meters meet from own cleared line, then reduce stranger's meter.
		if (clearedLines + strangerClearedLines > maxClearedLines) {
			strangerClearedLines-=lines;

			// Emit new cleared line number to stranger.
			socket.emit('gameMessage', {type: MessageType.BattleMessage, id: userid, lines:strangerClearedLines});
		}
	} else {
		strangerClearedLines+=lines;

		// If meters meet from stranger cleared line, then reduce own meter.
		if (clearedLines + strangerClearedLines > maxClearedLines) {
			clearedLines-=lines;
		}
	}

    // Updated values => draw new battle meter.
    drawBattleMeter();
}

function drawBattleMeter() {
	// Locate and clear battle meter canvas.
	var canvas = document.getElementById('battleMeter');
	var context = canvas.getContext('2d');

    // Clear and display the canvas.
	canvas.width = canvas.width;
    canvas.style.display = 'block';

	// Draw own cleared lines.
	context.fillStyle = 'rgba(0, 255, 0, 0.3)';
	context.fillRect(0, 0, (canvas.width/maxClearedLines) * clearedLines, canvas.height);

	// Draw stranger cleared lines.
	context.fillStyle = 'rgba(255, 0, 0, 0.3)';
	context.fillRect(canvas.width - ((canvas.width/maxClearedLines) * strangerClearedLines), 0,
	   (canvas.width/maxClearedLines) * strangerClearedLines,canvas.height);
}

// Update ingame timer.
function updateTimer() {
	curTime++;

	// Update time text if in TimeLimit mode.
	if (gameType == GameType.TimeLimit) {
		document.getElementById('timeCount').innerHTML = (maxTime - curTime) + ' sec left!';

		// Set text color.
		if (curTime >= (maxTime - 10))
			document.getElementById('timeCount').style.color = 'red';
		else
			document.getElementById('timeCount').style.color = 'grey';
	}
}

socket.on('connected', function(data) {
    document.getElementById('playerID').innerHTML = 'My ID: <b>' + data.id + '</b>';
    userid = data.id;

    addMessage('You are connected to the server!','System');

    // Draw the waiting screen!
    draw();

    // Disable lobby buttons.
    document.getElementById('sendButton').disabled = true; 
    document.getElementById('readyButton').disabled = true; 
});

socket.on('playerCountMessage', function(data){
    document.getElementById('playerCount').innerHTML = 'Number of connected players: ' + data.clients;
});

socket.on('foundPlayer', function(data) {
    document.getElementById('connectedToPlayer').innerHTML = 'Connected to player ' + data.id;
    addMessage('Found another player!','System');

    // Enable lobby buttons.
    document.getElementById('sendButton').disabled = false; 
    document.getElementById('readyButton').disabled = false; 
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
    curTime = 0;
    clearedLines = 0;
	strangerClearedLines = 0;
	updateInterval = startingUpdateInterval;
	updateIntervalP2 = startingUpdateInterval;

    // Clear stuff.
    newGame();

    // Disable lobby buttons and set texts.
    document.getElementById('sendButton').disabled = true; 
    document.getElementById('readyButton').disabled = true; 

    document.getElementById('scoreCount').innerHTML = '0 - 0';
    document.getElementById('pauseCount').innerHTML = 'p = pause (' + maxPauses + ' left)';
    document.getElementById('timeCount').innerHTML = '';
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

            if (gameType == GameType.Battle) 
            	drawBattleMeter();

            // Increase wins, reset pauses and timers.
            wins++;
            document.getElementById('scoreCount').innerHTML = wins + ' - ' + strangerWins;

            curPauses = 0;
            document.getElementById('pauseCount').innerHTML = 'p = pause (' + maxPauses + ' left)';

        	curTime = 0;
        	document.getElementById('timeCount').innerHTML = '';
        	clearInterval(timer);

        	// Reset variables
        	clearedLines = 0;
    		strangerClearedLines = 0;

            state = GameState.Gamewon;
            gameType = GameType.None;
            readyType = GameType.None;
            strangerReadyType = GameType.None;

            // Re-enable ready button.
            document.getElementById('readyButton').disabled = false; 

            // Reset update intervals to start value.
    	    updateInterval = startingUpdateInterval;
    	    updateIntervalP2 = startingUpdateInterval;
            break;

        case MessageType.StartMessage:
            addMessage('Starting a new ' + getGameTypeString(data.gameType) + ' game...','System');
            
            gameType = data.gameType;

            // Set game type starting conditions.
            switch (gameType) {
                case GameType.Battle:
                    // Draw empty battle meter.
                    drawBattleMeter();
                    break;

                case GameType.TimeLimit:
                case GameType.Endless:
                    // Set the battle meter to hidden.
                    document.getElementById('battleMeter').style.display = 'none';
                    break;
            }

            // Not waiting anymore, start game.
            state = GameState.Running;
            newGame();

            // Disable ready button.
            document.getElementById('readyButton').disabled = true; 

            // Start game timer.
            timer = setInterval(updateTimer,1000);

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
            if (gameType == GameType.Coop) blocks = data.blocks;
            else blocksP2 = data.blocks;
            break;

        case MessageType.DeleteRowMessage:
            if (gameType == GameType.Coop) {
                for (var i = 0; i < data.rows.length; i++) {
                    blocks.splice(data.rows[i], 1);
                    var newLine = [];
                    for (var i = 0; i < width; i++)
                        newLine.push(-1);
                    blocks.unshift(newLine);
                }
            } else {
                for (var i = 0; i < data.rows.length; i++) {
                    blocksP2.splice(data.rows[i], 1);
                    var newLine = [];
                    for (var i = 0; i < width; i++)
                        newLine.push(-1);
                    blocksP2.unshift(newLine);
                }
            }

            // Stranger cleared a line...
            addClearedLines(false, 1);
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
    }
    draw();
});
