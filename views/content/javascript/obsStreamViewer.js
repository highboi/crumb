var obsSocket = new WebSocket(`ws://localhost/obslive/?streamid=${streamid}&isClient=true&isStreamer=false`);
var livestream = document.querySelector(".video-container #video");

//start the live stream immediately since this is the user
hlsStart();

//function for checking the existence of a working URL
function urlExists(url) {
	var http = new XMLHttpRequest();
	http.open('HEAD', url, false);
	http.send();
	return http.status != 404;
}

//function to start the HLS stream
function hlsStart() {
	//check for HLS support
	if (Hls.isSupported()) {
		//attach the HLS instance to the video element
		var hls = new Hls();
		hls.attachMedia(livestream);

		//check for the finishing of the media attachment
		hls.on(Hls.Events.MEDIA_ATTACHED, () => {
			//attach the source url to the HLS instance
			console.log("Media Attached!");
			console.log("Loading Source: ", streamURL);
			hlsLoad(hls, streamURL);

			//check for the parsing of the HLS manifest
			hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
				//autoplay the live stream
				console.log("Manifest Parsed!");
				livestream.muted = true;
				livestream.play();
			});
		});
	} else {
		//alert the user of the lack of support for HLS by their browser
		alert("HLS is not supported by your browser, you cannot view this live stream.");
		window.location.href = "/";
	}
}

/*
recursively check for the existence of a URL
to attach to the HLS instance
*/
function hlsLoad(hls, url) {
	if (urlExists(url)) {
		hls.loadSource(url);
	} else {
		hlsLoad(hls, url);
	}
}

obsSocket.onopen = (e) => {
	console.log("OBS Socket Connection.");
};

obsSocket.onmessage = (event) => {
	console.log("Message to OBS socket.");

	//end the live stream and redirect to the recorded video once finished
	switch (event.data) {
		case "ended":
			window.location.href = `/v/${streamid}`;
			break;
	}
};
