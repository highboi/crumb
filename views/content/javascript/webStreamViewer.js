//get a socket connection to the server and the livestream element to handle
var streamSocket = new WebSocket(`wss://astro-tv.space/live/?streamid=${streamid}&isClient=true&isStreamer=false`);
var livestream = document.querySelector(".video-container #video");

//make a mediasource, source buffer, and set the stream source
var mediaSource = new MediaSource();
var sourceBuffer;

//set the livestream source to the media source
livestream.src = URL.createObjectURL(mediaSource);

//a boolean to see if the time has been set on the video
var timeSet = false;

//add a source buffer to the media source once the media source is open
mediaSource.addEventListener("sourceopen", () => {
	//make the media source a webm source buffer
	sourceBuffer = mediaSource.addSourceBuffer("video/webm; codecs=\"opus, vp8\"");
	console.log("Source Opened");
});

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

//alert the developer of an open socket connection
streamSocket.onopen = (e) => {
	console.log("Connection Established");
};

//handle incoming video data
streamSocket.onmessage = async (event) => {
	//execute the setTime function to repeatedly update the current time on the video
	if (timeSet == false && sourceBuffer.buffered.length != 0) {
		setTime();
		timeSet = true;
	}

	//check to see if the data is a video chunk or a message
	if (typeof event.data == 'object') {
		//add this chunk of video data to the source buffer of the video as an array buffer
		var data = await event.data.arrayBuffer();
		if (typeof sourceBuffer != 'undefined' && mediaSource.readyState == "open") {
			sourceBuffer.appendBuffer(data);
		}
	} else if (typeof event.data == 'string') {
		//end the live stream if the server says so and redirect to the recorded stream
		if (event.data == "ended") {
			mediaSource.endOfStream();
			window.location.pathname = `/v/${streamid}`;
		}
	}
};
