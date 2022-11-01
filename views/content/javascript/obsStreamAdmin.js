//get a connection with the obs websocket server
var obsSocket = new WebSocket(`ws://localhost/obslive/?streamid=${streamid}&isClient=false&isStreamer=true`);

//get the livestream video element
var livestream = document.querySelector(".video-container #video");

//check to see if a url exists or not
function urlExists(url) {
	var http = new XMLHttpRequest();
	http.open('HEAD', url, false);
	http.send();
	return http.status != 404;
}


/*
a function for starting the HLS live stream and load the
source of the HLS media to the video element
*/
function hlsStart() {
	console.log("STARTING HLS");

	//check for hls support
	if (Hls.isSupported()) {
		//attach a new HLS instance to the video element
		var hls = new Hls();
		hls.attachMedia(livestream);

		//do something once the HLS instance is attached
		hls.on(Hls.Events.MEDIA_ATTACHED, () => {
			//load the source URL for the hls media
			console.log("Media Attached!");
			console.log("Loading Source: ", streamURL);
			hlsLoad(hls, streamURL);

			//do something once the HLS manifest is parsed
			hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
				//play the live stream automatically
				console.log("Manifest Parsed!");
				livestream.muted = true;
				livestream.play();
			});
		});
	} else {
		//alert the user of the lack of HLS support
		alert("HLS is not supported in your browser, you cannot live stream.");
		window.location.href = "/";
	}
}

/*
a recursive function that takes an HLS instance and a URL,
checking if the URL is functioning before loading it as
a source for the live stream
*/
function hlsLoad(hls, url) {
	if (urlExists(url)) {
		hls.loadSource(url);
	} else {
		hlsLoad(hls, url);
	}
}

//alert for whenever a socket connection has been made
obsSocket.onopen = (e) => {
	console.log("OBS Socket Connection.");
};

//alert for whenever a socket message has been sent and other things
obsSocket.onmessage = (event) => {
	console.log("Message to OBS socket.");
	console.log(event.data);

	//check for the data sent over the socket
	switch (event.data) {
		case "started": //start the live stream if ready
			hlsStart();
			break;
		case "ended": //redirect to the finished stream if ready
			window.location.href = `/v/${streamid}`;
			break;
	}
};
