/*
NOTE: NEEDS 'videoid' VARIABLE DEFINED, A WORKING /setmagnet/ URL, AND THE WEBTORRENT FUNCTION LIBRARY TO TEST PROPERLY
*/

//get the webtorrent and util modules
var WebTorrent = require("webtorrent");

//create a new webtorrent client
var client = new WebTorrent();

//the main function for dealing with torrents
async function mainTorrentHandler() {
	//log a message to confirm the starting of the torrenting process in the browser
	console.log("WEBRTC supported, starting torrent process.");

	//promisify the ajax function for getting data
	var getAjaxAsync = promisify(getAjaxData);

	//get the magnet link status for this video
	var magnetStatus = await getAjaxAsync(`/magnet/${videoid}`);

	//do something according to the status of the magnet of this video
	if (typeof magnetStatus == 'undefined') { //if there is no magnet for this video
		//create a request object for the url of this video
		var videoRequest = new Request(`/video/${videoid}`);

		//fetch the data/response from this url
		var response = fetch(videoRequest);

		//convert the array buffer in the response to a uint8array
		var buffer = Uint8Array(response.arrayBuffer());

		//seed the data in the buffer (node Buffers and Uint8Arrays are the same)
		var torrent = await seedData(buffer);

		//show the torrent in the console
		console.log("TORRENT:", torrent);

		//get the magnet URI and send it to the server for storage in redis
		await getAjaxAsync(`/setmagnet/${encodeURIComponent(torrent.magnetURI)}`);
	} else { //if there is a magnet for this video
		//download data from the magnet link in "magnetStatus"
		var torrent = await downloadData(magnetStatus);

		//show the torrent in the console
		console.log("TORRENT:", torrent);
	}

	//find the file in the torrent containing video data
	var file = torrent.files.find((file) => {
		//return the file that ends with either an mp4, webm, or ogg extention
		return file.name.endsWith(".mp4") || file.name.endsWith(".webm") || file.name.endsWith(".ogg");
	});

	//render the file to the video object
	file.renderTo("#video");

}

//check for webrtc support
if (WebTorrent.WEBRTC_SUPPORT) {
	console.log("WEBRTC is supported, using webtorrents to stream video.");
	mainTorrentHandler();
} else {
	console.log("WEBRTC not supported, using regular video requests.");
}
