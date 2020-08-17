//make a new xhttp object for making requests to the server
var xhttp = new XMLHttpRequest();

//get the text that shows the user if they have subscribed/unsubscribed
var subscribebutton = document.getElementById("subscribebutton");

//get the join button for sections if it exists
var joinbutton = document.getElementById("joinbutton");

//a function that gets the subscribe path
function subscribe(channelid) {
	xhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			//get the data from the response
			try {
				var data = JSON.parse(this.responseText);
			} catch(e) {
				console.log("Error JSON Parse:");
				console.log(e);
			}

			//check to see what to do with the inner html according to the data
			if (data == true) {
				subscribebutton.innerHTML = "Subscribed";
			} else if (data == false) {
				subscribebutton.innerHTML = "Subscribe";
			} else {
				window.location.href = "/login";
			}
		}
	};

	var path = `/subscribe/${channelid}`;

	console.log(path);

	xhttp.open("GET", path, true);
	xhttp.send();
}

//this is a function to help with the joining of sections on the site
function join(topic) {
	xhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			//get the data from the response
			try {
				var data = JSON.parse(this.responseText);
			} catch(e) {
				console.log("Error JSON Parse:");
				console.log(e);
			}

			//check to see what to do with the inner html based on the data
			if (data == true) {
				joinbutton.innerHTML = "Joined";
			} else if (data == false) {
				joinbutton.innerHTML = "Join";
			} else {
				window.location.href = "/login";
			}
		}
	};

	var path = `/s/subscribe/${topic}`;

	console.log(path);

	xhttp.open("GET", path, true);
	xhttp.send();
}
