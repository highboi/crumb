var obsSocket = new WebSocket(`ws://localhost/obslive/?streamid=${streamid}`);
var livestream = document.getElementById("livestream");

//start the live stream immediately since this is the user
hlsStart();

function urlExists(url) {
	var http = new XMLHttpRequest();
	http.open('HEAD', url, false);
	http.send();
	return http.status != 404;
}

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
				livestream.muted = true;
				livestream.play();
				livestream.muted = true;
			});
		});
	}
}

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

	switch (event.data) {
		case "ended":
			window.location.href = `/v/${streamid}`;
			break;
	}
};
