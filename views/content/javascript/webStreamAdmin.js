var streamSocket = new WebSocket(`ws://localhost/live/?isClient=false&isStreamer=true&streamid=${streamid}`);
var livestream = document.querySelector(".video-container #video");

streamSocket.onopen = (e) => {
	console.log("Stream Socket Connected.");
};

//get the user's webcam video and audio
navigator.mediaDevices.getUserMedia({
	video: true,
	audio: true
}).then((stream) => {
	addVideoStream(livestream, stream);
	recordStream(stream);
}).catch((err) => {
	console.log("ERROR: ", err);
});

//set up the media recorder
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
	console.log("Sending Chunk...");

	var chunk = await event.data.arrayBuffer();

	console.log(event.data.type);

	streamSocket.send(chunk);
}

//function to tell the server to end the stream on the client side
function stopStream() {
	streamSocket.send("ended");
	window.location.href = `/v/${streamid}`;
}

//if the streamer closes the browser window, then end the stream automatically
window.addEventListener("beforeunload", (event) => {
	//stop the stream
	stopStream();
});

//add a video stream to the html document
function addVideoStream(video, stream) {
	video.srcObject = stream;

	video.addEventListener("loadeddata", () => {
		video.play();
	});
}
