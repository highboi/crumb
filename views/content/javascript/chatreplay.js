//get the chat box where the chat replay will be happening
var chatreplayelement = document.querySelector(".live-chat #chatBox");

//get the video element
var videoelement = document.querySelector(".video-container #video");

//a global array to store the already added chat messages
var addedChatMessages = [];

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
	iconElement.src = msg.channelicon;
	nameElement.innerHTML = msg.username;
	msgElement.innerHTML = msg.message;
	iconLinkElement.href = `/u/${msg.user_id}`;
	iconLinkElement.target = "_blank";
	nameLinkElement.href = `/u/${msg.user_id}`;
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

	//add a dataset attribute to store the time of the chat message
	divElement.dataset.time = msg.time;

	//return the completed div element
	return divElement;
}


//check for the existence of chat replay messages
if (typeof chatReplayMessages != 'undefined') {
	//add a unique index to each object to see which objects are added or deleted
	chatReplayMessages = chatReplayMessages.map((item, index) => {
		return Object.assign({}, item, {index: index});
	});

	//event listener for ADDING new chat messages as time increases
	videoelement.addEventListener("timeupdate", () => {
		//if the chat message in the front of the array has a timestamp less than the current time, add the message to the HTML
		if (chatReplayMessages.length && chatReplayMessages[0].time <= videoelement.currentTime) {
			console.log("adding chat elements");
			//get all of the messages that need to be added
			var messageDataAdded = chatReplayMessages.filter((item) => {
				return (item.time <= videoelement.currentTime);
			});

			//loop through the message data to add and do it all at once
			messageDataAdded.forEach((item) => {
				//create the new HTML element
				var newElement = createMessage(item);

				//add the HTML element to the chat replay element box
				chatreplayelement.appendChild(newElement);

				//add the chat messages to the "addedChatMessages" array
				addedChatMessages.push(item);

				//remove this message data from the data to be added, it has been added
				var addedIndex = chatReplayMessages.indexOf(item);
				chatReplayMessages.splice(addedIndex, 1);
			});
		}
	});

	//event listener for REMOVING new chat messages as time decreases/user backtracks
	videoelement.addEventListener("timeupdate", () => {
		//if the last element in the added chat messages array has a timestamp that is more than the current time, remove the message from the HTML
		if (addedChatMessages.length && addedChatMessages[addedChatMessages.length-1].time >= videoelement.currentTime) {
			console.log("removing chat elements");

			//filter for the chat message data that will be removed
			var messageDataRemoved = addedChatMessages.filter((item) => {
				return (item.time >= videoelement.currentTime)
			});

			//get all of the chat HTML elements
			var messageElements = Array.from(document.querySelectorAll(".chatMessage")).filter((item) => {
				return (parseInt(item.dataset.time) >= videoelement.currentTime);
			});

			//loop through the message data of the removed messages and unshift them to the chatReplayMessages array
			messageDataRemoved.forEach((item) => {
				//remove this data from the "addedChatMessages" array
				var removedIndex = addedChatMessages.indexOf(item);
				addedChatMessages.splice(removedIndex, 1);

				//append the message data to the beginning of the chatReplayMessages array
				chatReplayMessages.unshift(item);
			});

			//loop through all of the HTML elements to be removed and remove them from the document
			messageElements.forEach((item) => {
				//remove this item using the .remove() function
				item.remove();
			});
		}
	});
}
