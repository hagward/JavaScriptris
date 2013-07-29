var curHotLines = [];
var strangerHotLines = [];

var maxTime = 100;
var curTime = 0;
var timer;

var clearedLines = 0;
var strangerClearedLines = 0;
var maxClearedLines = 10;

function gameTypeStart(gameType) {
	switch (gameType) {
		case GameType.Battle:
			// Draw empty battle meter.
			gameTypeDraw(gameType);

			// Hide timer.
			document.getElementById('timeCount').innerHTML = '';
			break;

		case GameType.TimeLimit:
            // Start game timer.
            timer = setInterval(updateTimer,1000);

            // Set the battle meter to hidden.
			document.getElementById('battleMeter').style.display = 'none';
			break;

		case GameType.Endless:
			// Set the battle meter to hidden.
			document.getElementById('battleMeter').style.display = 'none';

			// Hide timer.
			document.getElementById('timeCount').innerHTML = '';
			break;

		case GameType.HotLines:
			curHotLines =  [14,13,10,9,7];
			strangerHotLines = [14,13,10,9,7];

			console.log(curHotLines);
                
			// Set the battle meter to hidden.
			document.getElementById('battleMeter').style.display = 'none';

			// Hide timer.
			document.getElementById('timeCount').innerHTML = '';
			break;    
    }
}

function gameTypeReset(gameType) {
	switch(gameType) {
		case GameType.Battle:
			clearedLines = 0;
    		strangerClearedLines = 0;
			break;

		case GameType.TimeLimit:
			curTime = 0;
			document.getElementById('timeCount').innerHTML = '';
			break;

		case GameType.Endless:
			// Nothing special to reset.
			break;

		case GameType.HotLines:
			curHotLines = [];
            strangerHotLines = [];
			break;    
	}
}

function gameTypeResetAll() {
	// Reset all.
	curTime = 0;
    clearedLines = 0;
	strangerClearedLines = 0;
    curHotLines = [];
    strangerHotLines = [];

    // Hide all.
   	document.getElementById('timeCount').innerHTML = '';
    document.getElementById('battleMeter').style.display = 'none';	  
}

function gameTypeUpdate(gameType) {
	switch (gameType) {
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
				// Emit gameover.
				emitGameover();
			}
			break;

        case GameType.HotLines:
        	// If stranger cleared all hot lines...
            if (strangerHotLines.length == 0) {
            	// Emit gameover.
                emitGameover();
            }
            break;    
	}
}

function gameTypeDraw(gameType) {
	switch (gameType) {
        case GameType.Endless:
        	// Nothing special to draw.
            break;
        case GameType.Battle:
        	// Draw battle meter.
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
			break;

        case GameType.TimeLimit:
			// Set text color.
			if (curTime >= (maxTime - 10))
				document.getElementById('timeCount').style.color = 'red';
			else
				document.getElementById('timeCount').style.color = 'grey';

        	// Draw timer.
			document.getElementById('timeCount').innerHTML = (maxTime - curTime) + ' sec left!';
            break;

        case GameType.HotLines:
            // Draw own and stranger hot lines.
            for (var i = 0; i < curHotLines.length; i++) {
                mainContext[P1].fillStyle = 'rgba(100, 100, 100, 0.2)';
                mainContext[P1].fillRect(0, curHotLines[i] * bsize, width*bsize, bsize);
            }
            for (var i = 0; i < strangerHotLines.length; i++) {
                mainContext[P2].fillStyle = 'rgba(100, 100, 100, 0.2)';
                mainContext[P2].fillRect(0, strangerHotLines[i] * bsize, width*bsize, bsize);
            }
            break;  
    }
}

// Update ingame timer.
function updateTimer() {
	// If TimeLimit update timer directly.
	if (gameType == GameType.TimeLimit) {
		curTime++;
		gameTypeDraw(gameType);
	}
}

function addClearedLines(isOwnLines,lines,deletedRows,gameType) {
    if (gameType == GameType.Battle) {

    	if (isOwnLines) {
    		clearedLines+=lines;

    		// If meters meet from own cleared line, then reduce stranger's meter.
    		if (clearedLines + strangerClearedLines > maxClearedLines) {
    			strangerClearedLines-=lines;

    			// Emit new cleared line number to stranger.
    			socket.emit('gameMessage',{type: MessageType.BattleMessage, id: userid, lines:strangerClearedLines});
    		}
    	} else {
    		strangerClearedLines+=lines;

    		// If meters meet from stranger cleared line, then reduce own meter.
    		if (clearedLines + strangerClearedLines > maxClearedLines) {
    			clearedLines-=lines;
    		}
    	}

        // Updated values => draw new battle meter.
        gameTypeDraw(gameType);
    } else if (gameType == GameType.HotLines) {
        if (isOwnLines) {
            for (var i = 0; i < deletedRows.length; i++) {
                var row = deletedRows[i];

                // If cleared a hot line...
                if (curHotLines.indexOf(row) != -1) {
                    // ... remove it from the array.
                    curHotLines.splice(curHotLines.indexOf(row),1);

                    // Emit new hot line numbers to stranger.
                    socket.emit('gameMessage',{type: MessageType.HotLinesMessage, id: userid, hotlines:curHotLines});
                }
            };
        } else {
            for (var i = 0; i < deletedRows.length; i++) {
                var row = deletedRows[i];

                if (strangerHotLines.indexOf(row) != -1) {
                    strangerHotLines.splice(strangerHotLines.indexOf(row),1);
                }
            };
        }
    }
}