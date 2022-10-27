//get a socket connection to the server and the livestream element to handle
var streamSocket = new WebSocket(`ws://localhost/live/?isClient=false&isStreamer=true&streamid=${streamid}`);
var livestream = document.querySelector(".video-container #video");

//alert the developer of working connection
streamSocket.onopen = (e) => {
	console.log("Stream Socket Connected.");
};

//get the user's webcam video and audio
navigator.mediaDevices.getUserMedia({
	video: true,
	audio: true
}).then((stream) => {
	console.log(stream);

	//add the media stream to the video object
	if ('srcObject' in livestream) {
		livestream.srcObject = stream;
	} else {
		livestream.src = URL.createObjectURL(stream);
	}

	//autoplay the live stream once the data is loaded from the media stream
	livestream.addEventListener("loadeddata", () => {
		video.play();
	});

	//record the live stream
	recordStream(stream);
}).catch((err) => {
	console.log("ERROR: ", err);
});

//set up the media recorder to record data from the stream
function recordStream(stream) {
	var options = { mimeType: "video/webm" };
	var mediaRecorder = new MediaRecorder(stream, options);
	mediaRecorder.ondataavailable = sendVideoChunks;
	mediaRecorder.onstop = stopStream;
	//IMPORTANT: Set the milliseconds to record at a time so that you have
	//data available every X milliseconds
	mediaRecorder.start(500);
}

//send the video chunks to the server
async function sendVideoChunks(event) {
	var chunk = await event.data.arrayBuffer();
	streamSocket.send(chunk);
}

/*
function to tell the server to end the stream on the client side
and redirect to the recorded stream
*/
function stopStream() {
	streamSocket.send("ended");
	window.location.href = `/v/${streamid}`;
}

//if the streamer closes the browser window, then end the stream automatically
window.addEventListener("beforeunload", (event) => {
	stopStream();
});
