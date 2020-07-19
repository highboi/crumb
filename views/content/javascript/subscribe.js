//make a new xhttp object for making requests to the server
var xhttp = new XMLHttpRequest();

//get the text that shows the user if they have subscribed/unsubscribed
var subscribebutton = document.getElementById("subscribebutton");

//a function that gets the subscribe path
function subscribe() {
	xhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			//get the data from the response
			try {
				var data = JSON.parse(this.responseText);
			} catch(e) {
				console.log("Error JSON Parse.");
			}

			//check to see what to do with the inner html according to the data
			if (data == true) {
				subscribebutton.innerHTML = "Subscribed";
			} else {
				subscribebutton.innerHTML = "Subscribe";
			}
		}
	};

	if (typeof videovar != 'undefined') {
		var path = `/subscribe/${videovar.id}`;
	} else if (typeof channelvar != 'undefined') {
		var path = `/subscribe/${channelvar.id}`;
	}

	xhttp.open("GET", path, true);
	xhttp.send();
}
