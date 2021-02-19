//make a new websocket for sending the message to the server
var chatSocket = new WebSocket("ws://localhost/chat");

//get the chat box
var chatbox = document.getElementById("chatBox");

//a boolean variable to check if the initialization segment has been sent
var initSent = false;

chatSocket.onopen = (e) => {
	console.log("Chat Socket Connected.");

	var payload = "init," + streamid.toString() + ",";

	if (typeof isStreamer == 'undefined') {
		chatSocket.send(payload + "client");
	} else {
		chatSocket.send(payload + "streamer");
	}
	initSent = true;
};

function sendMessage() {
	//get the message text
	var message = document.querySelector("#message").value;

	//create a p tag to add inside the element
	var msg = document.createElement("p");
	msg.innerHTML = message;

	//add the message to the chat box
	chatbox.appendChild(msg);

	//create the websocket payload
	var payload = "msg," + streamid.toString() + "," + message.toString() + "," + document.getElementById("livestream").currentTime.toString();

	//send the message through a socket to the websocket server
	chatSocket.send(payload);
}

//if we recieve a message, then add the message to the chat
chatSocket.onmessage = (event) => {
	if (true && initSent) {
		var msg = document.createElement("p");
		msg.innerHTML = event.data;
		chatbox.appendChild(msg);
	} else {
		chatSocket.onmessage = null;
	}
}
