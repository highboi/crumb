var socket = new WebSocket(`ws://localhost/`);
var livestream = document.getElementById("livestream");

socket.onopen = (e) => {
	console.log("Connected");
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

	socket.send(chunk);
}

//function to tell the server to end the stream on the client side
function stopStream() {
	socket.send("ended");
}

//add a video stream to the html document
function addVideoStream(video, stream) {
	video.srcObject = stream;

	video.addEventListener("loadeddata", () => {
		video.play();
	});
}
