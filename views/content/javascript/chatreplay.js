if (typeof chatReplayMessages != 'undefined') {
	videoelement.ontimeupdate = () => {
		if (chatReplayMessages[0].time <= videoelement.currentTime) {
			var newPelement = document.createElement("p");
			newPelement.innerHTML = chatReplayMessages[0].message;
			chatreplayelement.appendChild(newPelement);
			chatReplayMessages.shift();
		}
	};
}
