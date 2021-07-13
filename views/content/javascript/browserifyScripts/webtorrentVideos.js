//get the webtorrent and util modules
var WebTorrent = require("webtorrent");

//create a new webtorrent client
var client = new WebTorrent();

//the main function for dealing with torrents
async function mainTorrentHandler() {
	//log a message to confirm the starting of the torrenting process in the browser
	console.log("WEBRTC supported, starting torrent process.");

	//promisify the ajax function for getting data
	var getAjaxAsync = promisify(getAjaxData, true);

	//get the video id from the video element's dataset
	var videoid = document.querySelector(".video-contents .video-container #video").dataset.videoid;

	//get the magnet link status for this video
	var magnetStatus = await getAjaxAsync(`/getmagnet/${videoid}`);

	//log the magnet status
	console.log(`MAGNET STATUS FOR ${videoid}:`, typeof magnetStatus, magnetStatus);

	//do something according to the status of the magnet of this video
	if (!magnetStatus) { //if there is no magnet for this video
		//create a request object for the url of this video
		var videoRequest = new Request(`/video/${videoid}`);

		//fetch the data/response from this url
		var response = await fetch(videoRequest);

		//get the array buffer from this response
		var responseBuffer = await response.arrayBuffer();

		//convert the array buffer in the response to a uint8array
		var buffer = new Uint8Array(responseBuffer);

		//seed the data in the buffer (node Buffers and Uint8Arrays are the same)
		var torrent = await webtorrentLibrary.seedDataAsync(client, buffer);

		//show the torrent in the console
		console.log("TORRENT:", torrent);

		//get the magnet URI and send it to the server for storage in redis
		await getAjaxAsync(`/setmagnet/${videoid}/?magnetlink=${encodeURIComponent(torrent.magnetURI)}`);
	} else { //if there is a magnet for this video
		//download data from the magnet link in "magnetStatus"
		var torrent = await webtorrentLibrary.downloadDataAsync(client, magnetStatus);

		//show the torrent in the console
		console.log("TORRENT:", torrent);
	}

	//get the torrent file
	var file = torrent.files[0];

	//make an async version of the blob URL function
	file.getBlobURLAsync = promisify(file.getBlobURL);

	//get the blob url for this video
	var fileURL = await file.getBlobURLAsync();

	console.log("TORRENT FILE URL:", fileURL);

	//create a video source with the blob URL in use
	var sourceElementBlob = document.createElement("source");

	//set the source of this source element to the file url from the torrent
	sourceElementBlob.setAttribute("src", fileURL);

	//set the source element inside the video to be the blob source
	document.querySelector(".video-contents .video-container #video").innerHTML = sourceElementBlob.outerHTML;

}

//check for webrtc support
if (WebTorrent.WEBRTC_SUPPORT) {
	console.log("WEBRTC is supported, using webtorrents to stream video.");
	mainTorrentHandler();
} else {
	console.log("WEBRTC not supported, using regular video requests.");
}

//set an event handler to close the webtorrent client before the window closes
document.addEventListener("beforeunload", () => {
	//destroy the client and catch errors
	client.destroy((err) => {
		if (err) {
			console.error(err);
		}
	});

	//return a custom message before the user exits
	return "Webtorrent client for this page has been destroyed, exiting now.";
});
