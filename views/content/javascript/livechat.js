//make a new websocket for sending the message to the server
var chatSocket = new WebSocket(`ws://localhost/chat/?isStreamer=${isStreamer}&streamid=${streamid}`);

//get the chat box
var chatbox = document.getElementById("chatBox");

//a boolean variable to check if the initialization segment has been sent
var initSent = false;

chatSocket.onopen = (e) => {
	console.log("Chat Socket Connected.");
};

//a function to create a chat message element
function createMessage(msg) {
	//create all of the necessary elements
	var divElement = document.createElement("div");
	var iconLinkElement = document.createElement("a");
	var nameLinkElement = document.createElement("a");
	var iconElement = document.createElement("img");
	var nameElement = document.createElement("h4");
	var msgElement = document.createElement("p");

	//set the attributes of the elements to the necessary values
	iconElement.src = msg[0];
	nameElement.innerHTML = msg[1];
	msgElement.innerHTML = msg[2];
	iconLinkElement.href = `/u/${user_id}`;
	iconLinkElement.target = "_blank";
	nameLinkElement.href = `/u/${user_id}`;
	nameLinkElement.target = "_blank";

	//add the icon and name elements to the inside of the two anchor tags to allow the user 
	//to access a channel based on a chat message
	iconLinkElement.appendChild(iconElement);
	nameLinkElement.appendChild(nameElement);

	//add the elements to the div element
	divElement.appendChild(iconLinkElement);
	divElement.appendChild(nameLinkElement);
	divElement.appendChild(msgElement);

	//add a class name to the div for CSS
	divElement.className = "chatMessage";

	//return the completed div element
	return divElement;
}

function sendMessage() {
	//get the message text
	var message = document.querySelector("#message").value;

	//create the array with values for the live chat message
	var msg = [channelicon, username, message]

	//create the message div element
	var divElement = createMessage(msg, user_id);

	//add the message to the chat box
	chatbox.appendChild(divElement);

	//create the websocket payload
	var payload = "msg," + message.toString() + "," + document.getElementById("livestream").duration.toString();

	//send the message through a socket to the websocket server
	chatSocket.send(payload);
}

//if we recieve a message, then add the message to the chat
chatSocket.onmessage = (event) => {
	//get the components of the message
	var msg = event.data.split(",");

	//create a div element for the live chat
	var divElement = createMessage(msg);

	//add the live chat message to the chat box
	chatbox.appendChild(divElement);
}


//if the user presses enter while they have their keyboard focused on the chat form,
//then click the submit button
document.querySelector("#chatForm #message").addEventListener("keyup", (event) => {
	if (event.keyCode == 13) {
		event.preventDefault();
		document.querySelector("#submitBtnChat").click();
	}
});






