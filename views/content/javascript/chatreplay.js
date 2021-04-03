//get the chat box where the chat replay will be happening
var chatreplayelement = document.querySelector(".live-chat #chatBox");

//get the video element
var videoelement = document.querySelector(".video-container #video");

//a function to create a chat message element
function createMessage(msg, user_id) {
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


if (typeof chatReplayMessages != 'undefined') {
	videoelement.ontimeupdate = () => {
		if (chatReplayMessages.length > 0) {
			if (chatReplayMessages[0].time <= videoelement.currentTime) {
				var replayMessage = chatReplayMessages[0];
				var newElement = createMessage([replayMessage.channelicon, replayMessage.username, replayMessage.message], replayMessage.user_id);
				chatreplayelement.appendChild(newElement);
				chatReplayMessages.shift();
			}
		}
	};
}
