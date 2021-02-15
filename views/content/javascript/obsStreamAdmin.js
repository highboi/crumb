var obsSocket = new WebSocket("ws://localhost/obslive");
var livestream = document.getElementById("livestream");

function urlExists(url) {
	var http = new XMLHttpRequest();
	http.open('HEAD', url, false);
	http.send();
	return http.status != 404;
}

function hlsStart() {
	if (Hls.isSupported()) {
		var hls = new Hls();
		hls.attachMedia(video);
		hls.on(Hls.Events.MEDIA_ATTACHED, () => {
			console.log("Media Attached!");
			console.log("Loading Source: ", streamURL);
			hlsLoad(hls, streamURL);
			hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
				console.log("Manifest Parsed!");
				video.muted = true;
				video.play();
				video.muted = false;
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
		case "started":
			hlsStart();
			break;
		case "ended":
			window.location.href = `/v/${streamid}`;
			break;
	}
};
