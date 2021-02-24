//get a connection with the obs websocket server
var obsSocket = new WebSocket(`ws://localhost/obslive/?streamid=${streamid}`);

//get the livestream video element
var livestream = document.getElementById("livestream");

//check to see if a url exists or not
function urlExists(url) {
	var http = new XMLHttpRequest();
	http.open('HEAD', url, false);
	http.send();
	return http.status != 404;
}

//start the HLS live stream in order to load the source of the HLS media to the video element
function hlsStart() {
	if (Hls.isSupported()) {
		var hls = new Hls();
		hls.attachMedia(livestream);
		hls.on(Hls.Events.MEDIA_ATTACHED, () => {
			console.log("Media Attached!");
			console.log("Loading Source: ", streamURL);
			hlsLoad(hls, streamURL);
			hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
				console.log("Manifest Parsed!");
			});
		});
	} else {
		alert("HLS is not supported in your browser, you cannot live stream.");
		window.location.href = "/";
	}
}

//a recursive function that will load the source url if it exists
//and calls the same function over and over if the url does not exist
//so that it loads the source url whenever it is deemed to exist
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

	//start the hls stream OR stop the stream and redirect to the video url
	//depending on the socket data sent
	switch (event.data) {
		case "started":
			hlsStart();
			break;
		case "ended":
			window.location.href = `/v/${streamid}`;
			break;
	}
};
