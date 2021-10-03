//function to subscribe to a channel
async function subscribe(channelid, subscribebtn) {
	//check to see if we should redirect to a login
	if (typeof getCookie("hasSession") == 'undefined' || getCookie("hasSession") == "false") {
		window.location.href = "/login";
	} else {
		//subscribe to a channel
		var response = await fetch(`/subscribe/${channelid}`);
		var subscribed = await response.json();
		subscribed = subscribed.subscribed;

		//get the amount of subscribers
		var subscribercount = document.getElementById(`${channelid}subscribercount`);
		var subscriberint = parseInt(subscribercount.innerHTML, 10);

		//set the styling of the subscribe button and subscriber count based on the server response
		if (subscribed) {
			subscribebtn.innerHTML = "Subscribed";
			subscribercount.innerHTML = subscriberint+1;
		} else {
			subscribebtn.innerHTML = "Subscribe";
			subscribercount.innerHTML = subscriberint-1;
		}
	}
}

//function to join a "topic" on the site
async function join(topic, joinbtn) {
	//check for the need to redirect to a login
	if (typeof getCookie("hasSession") == 'undefined' || getCookie("hasSession") == "false") {
		window.location.href = "/login";
	} else {
		//join this topic
		var response = await fetch(`/s/subscribe/${topic}`);
		var joined = await response.json();
		joined = joined.joined;

		//set the styling of the join button based on the server response
		if (joined) {
			joinbtn.innerHTML = "Joined";
		} else {
			joinbtn.innerHTML = "Join";
		}
	}
}
