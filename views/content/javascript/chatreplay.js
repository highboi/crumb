//javascript to replay a live chat as a live stream plays

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
	//get the chat box where the chat replay will be happening
	var chatreplayelement = document.querySelector(".live-chat-replay #chatBox");

	//a global array to store the already added chat messages
	var addedChatMessages = [];

	//get the video element
	var videoChatReplayElement = document.querySelector(".video-container #video");

	//event listener for ADDING new chat messages as time increases
	videoChatReplayElement.addEventListener("timeupdate", () => {
		//check the first element of the chatReplayMessages to see if we need to add chat messages
		if (chatReplayMessages.length && chatReplayMessages[0].time <= videoChatReplayElement.currentTime) {
			//get all of the messages that need to be added
			var messageDataAdded = chatReplayMessages.filter((item) => {
				return (item.time <= videoChatReplayElement.currentTime);
			});

			//add all chat messages that were typed at this time of the video
			for (var message of messageDataAdded) {
				//create and add the chat element to the chat replay element
				var newElement = createMessage(message);
				chatreplayelement.appendChild(newElement);

				//remove this message from the chatReplayMessages
				var addedIndex = chatReplayMessages.findIndex((object) => {
					return JSON.stringify(object) == JSON.stringify(message);
				});
				chatReplayMessages.splice(addedIndex, 1);

				//add this message to the already-added messages
				addedChatMessages.push(message);
			}
		}
	});

	//event listener for REMOVING new chat messages as time decreases/user backtracks
	videoChatReplayElement.addEventListener("timeupdate", () => {
		//check the timestamps of the last element in the addedChatMessages to see if we need to remove chat messages that have been added
		if (addedChatMessages.length && addedChatMessages[addedChatMessages.length-1].time >= videoChatReplayElement.currentTime) {
			/*
			get the chat messages to be removed from the addedChatMessages array,
			reversing the order to make sure that we add the elements back into
			the chatReplayMessages in the correct time order
			*/
			var messageDataRemoved = addedChatMessages.filter((item) => {
				return (item.time >= videoChatReplayElement.currentTime);
			});
			messageDataRemoved.reverse();

			/*
			add the elements back to the chatReplayMessages array and remove them
			from the addedChatMessages array
			*/
			for (var message of messageDataRemoved) {
				//remove the message data from the "addedChatMessages" array
				var removedIndex = addedChatMessages.findIndex((object) => {
					return JSON.stringify(object) == JSON.stringify(message);
				});
				addedChatMessages.splice(removedIndex, 1);

				//add the message to the beginning of the chat replay messages
				chatReplayMessages.unshift(message);
			}

			/*
			Remove the actual HTML elements from the document
			*/
			var messageElements = Array.from(document.querySelectorAll(".chatMessage")).filter((item) => {
				return (parseInt(item.dataset.time) >= videoChatReplayElement.currentTime);
			});
			for (element of messageElements) {
				element.remove();
			}
		}
	});
}
