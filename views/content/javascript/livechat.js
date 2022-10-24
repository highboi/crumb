//make a new websocket for sending the message to the server
var chatSocket = new WebSocket(`wss://astro-tv.space/chat/?isStreamer=${isStreamer}&streamid=${streamid}`);

//get the chat box
var chatbox = document.getElementById("chatBox");

//send a message to the console about a good connection
chatSocket.onopen = (e) => {
	console.log("Chat Socket Connected.");
};

//a function to create a chat message element
function createLiveMessage(msg) {
	//create all of the necessary elements
	var divElement = document.createElement("div");
	var iconLinkElement = document.createElement("a");
	var nameLinkElement = document.createElement("a");
	var iconElement = document.createElement("img");
	var nameElement = document.createElement("h4");
	var msgElement = document.createElement("p");

	//set the attributes of the elements to the necessary values
	nameElement.innerHTML = msg.username;
	iconElement.src = msg.channelicon;
	msgElement.innerHTML = msg.message;
	iconLinkElement.href = `/u/${msg.userid}`;
	iconLinkElement.target = "_blank";
	nameLinkElement.href = `/u/${msg.userid}`;
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

//send a message typed by a user to the server
function sendMessage() {
	//create the message object used to create the div
	var message = document.querySelector("#chatForm #message").value;
	var msg = {userid: user_id, username: username, channelicon: channelicon, message: message};

	//create the message div element and add it to the live chat
	var divElement = createLiveMessage(msg);
	chatbox.appendChild(divElement);

	//create the websocket payload to send to other clients viewing the live chat
	var payload = {message: message, time: document.getElementById("video").currentTime};
	chatSocket.send(JSON.stringify(payload));
}

//if we recieve a message, then add the message to the chat
chatSocket.onmessage = (event) => {
	//get the message as an object
	var msg = JSON.parse(event.data);

	//add the message data to the html
	var divElement = createLiveMessage(msg);
	chatbox.appendChild(divElement);
}

//check for the pressing of the enter button while the user is focused on the chat form
document.querySelector("#chatForm #message").addEventListener("keyup", (event) => {
	if (event.keyCode == 13) {
		event.preventDefault();
		document.querySelector("#submitBtnChat").click();
		document.querySelector("#chatForm #message").value = "";
	}
});






