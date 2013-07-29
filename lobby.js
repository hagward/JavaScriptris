// Add text to the TextArea.
function addMessage(message, sender) {
	var textarea = document.getElementById('messageArea'); 
	var text = textarea.innerHTML;
	textarea.innerHTML = text + '\n'+ sender + ': ' + message; 

	// Scroll to bottom.
	textarea.scrollTop = textarea.scrollHeight - textarea.clientHeight;
}

// Emit a chat message.
function sendChatMessage(message) {
 	socket.emit('lobbyMessage', {type: MessageType.ChatMessage, message: message});
}

// Send a message to the other player.
function sendMessage() {
 	var message = document.getElementById('message').value;

 	document.getElementById('message').value = '';

 	if (message != '') {
	 	addMessage(message,'Me');
	 	sendChatMessage(message);
 	}
}

function keyPress(e) {
	if (e.keyCode == 13) // ENTER
		document.getElementById('sendButton').click();
}

// Disable lobby buttons and set texts.
function resetLobby() {
	setLobbyButtonsEnabled(false);
    setLobbyTexts();
}

// Set all lobby texts.
function setLobbyTexts() {
	document.getElementById('scoreCount').innerHTML = wins + ' - ' + strangerWins;
	document.getElementById('pauseCount').innerHTML = 'p = pause (' + (maxPauses - curPauses) + ' left)';

	if (curTime == 0)
    	document.getElementById('timeCount').innerHTML = '';
    else 
    	document.getElementById('timeCount').innerHTML = (maxTime - curTime) + ' sec left!';
}

function setLobbyButtonsEnabled(enabled) {
	document.getElementById('sendButton').disabled = !enabled; 
    document.getElementById('readyButton').disabled = !enabled; 
}

// Get index of selected item of the modeSelection dropdown box.
function getSelectedGameType() {
 	var dropdown = document.getElementById("modeSelection");
	return dropdown.selectedIndex;
}

// Get name of GameType.
function getGameTypeString(gt) {
	var dropdown = document.getElementById("modeSelection");
	return dropdown.options[gt].text;
}

// If stranger is ready and has same GameType; send a start message, otherwise send a ready message.
function sendReady() {
	if (getSelectedGameType() == GameType.None) {
		addMessage('Please select a game mode!','System');
	} else {
	 	addMessage('You are ready for a(n) ' + getGameTypeString(getSelectedGameType()) + ' game!','System');
	 	readyType = getSelectedGameType();

		// Send Start- or ReadyMessage.
	 	if (readyType == strangerReadyType) {
	 		socket.emit('lobbyMessage', {type: MessageType.StartMessage, id: userid, gameType: readyType});
	 	} else {
	 		socket.emit('lobbyMessage', {type: MessageType.ReadyMessage, id: userid, gameType: readyType});
	 	}
	}
}
