// Add text to the TextArea
function addMessage(message, sender) {
	var textarea = document.getElementById('messageArea'); 
	var text = textarea.innerHTML;
	textarea.innerHTML = text + '\n'+ sender + ': ' + message; 

	// Scroll to top.
	textarea.scrollTop = textarea.scrollHeight - textarea.clientHeight;
}

// Emit a chat message.
function sendChatMessage(message) {
 	socket.emit('lobbyMessage',{type: MessageType.ChatMessage, message: message});
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

// If stranger is ready send a start message, otherwise send a ready message.
function sendReady() {
 	addMessage('You are ready!','System');
 	ready = true;

 	if (strangerready) {
 		socket.emit('lobbyMessage',{type: MessageType.StartMessage, id: userid});
 	} else {
 		socket.emit('lobbyMessage',{type: MessageType.ReadyMessage, id: userid});
 	}
}