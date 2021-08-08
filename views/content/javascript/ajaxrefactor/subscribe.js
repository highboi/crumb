function subscribe(channelid, subscribebtn) {
	//check to see if we should redirect to a login
	if (typeof getCookie("hasSession") == 'undefined' || getCookie("hasSession") == false) {
		window.location.href = "/login";
	} else {
		//subscribe to a channel
		getAjaxData(`/subscribe/${channelid}`, (response) => {
			if (response == true) {
				subscribebtn.innerHTML = "Subscribed";
			} else if (response == false) {
				subscribebtn.innerHTML = "Subscribe";
			}
		});
	}
}

function join(topic, joinbtn) {
	if (typeof getCookie("hasSession") == 'undefined' || getCookie("hasSession") == false) {
		window.location.href = "/login";
	} else {
		getAjaxData(`/s/subscribe/${topic}`, (response) => {
			if (response == true) {
				joinbtn.innerHTML = "Joined"
			} else if (response == false) {
				joinbtn.innerHTML = "Join";
			}
		});
	}
}
