//make a websocket connection and get the livestream video tag
var socket = new WebSocket(`ws://localhost/`);
var livestream = document.getElementById("livestream");

//make a mediasource, sourcebuffer, and set the stream source
var mediaSource = new MediaSource();
var sourceBuffer;
var streamSrc = URL.createObjectURL(mediaSource);
livestream.src = streamSrc;

//a boolean to see if the time has been set on the video
var timeSet = false;

//an interval variable to store the time update interval
var updateInterval;

//execute a function whenever the mediasource is open
mediaSource.addEventListener("sourceopen", opened);

//make a source buffer
function opened() {
	sourceBuffer = mediaSource.addSourceBuffer("video/webm; codecs=\"opus, vp8\"");

	console.log("Source Opened");
}

//set the time of the live stream to the latest seekable time
function setTime() {
	//set the seekable time to the current time for it to be live
	livestream.currentTime = livestream.seekable.end(0);

	//check to see if the interval needs to be changed in order to accomodate for updating
	if (livestream.currentTime > 0 && !livestream.paused && !livestream.ended) { //if the video is playing set a timeout for more than 1 second to prevent choppy video
		setTimeout(setTime, 10000);
	} else if (livestream.paused) { //if the livestream is paused then set a timeout for the function to execute after one second
		setTimeout(setTime, 1000);
	}
}

socket.onopen = (e) => {
	console.log("Connection Established");
};

//handle incoming video data
socket.onmessage = async (event) => {
	//developer info
	console.log("Message from server:");
	console.log(typeof event.data);
	console.log(event.data);

	if (timeSet == false && sourceBuffer.buffered.length != 0) {
		setTime();
		timeSet = true;
	}

	if (typeof event.data == 'object') {
		var data = await event.data.arrayBuffer();

		if (typeof sourceBuffer != 'undefined' && mediaSource.readyState == "open") {
			sourceBuffer.appendBuffer(data);
		}
	} else if (typeof event.data == 'string') {
		if (event.data == "ended") {
			mediaSource.endOfStream();
		}
	}
};
