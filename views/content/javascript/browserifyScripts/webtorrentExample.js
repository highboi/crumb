//request the webtorrent library
var WebTorrent = require("webtorrent");

//create a new webtorrent client
var client = new WebTorrent();

//an example magnet uri which contains a movie for testing
var exampleURI = 'magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fsintel.torrent';
//var exampleURI = 'magnet:?xt=urn:btih:98a5b9cd7d8eb04662de9ff540de53a10008c017&dn=Unnamed+Torrent+1625302285635&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com';

//get the UI elements to display the status and output relating to connections
var status = document.getElementById("status");
var output = document.getElementById("output");

//set the text content of the output tag to be empty
output.textContent = "";

//a function to log information in the output tag
function log(txt) {
	//print an informational message to the console
	console.info(txt);

	//add this information to the output tag's text content
	output.textContent += `${txt.trim()}\n`;
}


//a function to begin seeding data, returning the torrent object to the callback function
function seedData(client, data, callback) {
	//create a buffer object from this data
	data = Buffer.from(data);

	//seed this data using the client given
	client.seed(data, (torrent) => {
		//pass the torrent object to the callback
		callback(null, torrent);
	});
}

//a function for downloading data based on a magnet uri
function downloadData(client, uri, callback) {
	//add this uri to the client, return the torrent to the callback
	client.add(uri, (torrent) => {
		//pass the torrent object to the callback
		callback(null, torrent);
	});
}

//create the main torrent function
async function mainTorrentFunction() {
	status.innerText = "WebTorrenting started!";
	log("WEBRTC supported, starting torrent process.");

	//promisify the downloadData function to see if it works
	var downloadDataAsync = promisify(downloadData);

	//download some torrent data using the async function
	var torrent = await downloadDataAsync(client, exampleURI);

	//make the torrent a window object to experiment with
	window.torrent = torrent

	log("TORRENT INFO:");
	log("NAME: " + torrent.name);
	log("MAGNET URI: " + decodeURIComponent(torrent.magnetURI));

	//show the torrent in the console
	console.log(torrent);

	//log the amount of peers and seeders (using webtorrent, bittorrent peers/seeders aren't detectable by webtorrent)
	log("SEED RATIO: " + torrent.ratio);
	log("PEERS: " + torrent.numPeers);
	log("SEEDERS: " + torrent.numPeers*torrent.ratio);

	//get the file which contains the data of the torrent
	var file = torrent.files.find((file) => {
		return file.name.endsWith(".mp4");
	});

	log("VIDEO FILE RETRIEVED.");

	//log the file in the console
	console.log(file);

	//render the example mp4 file to the video element in the document
	file.renderTo("#video");

	log("FILE RENDERED TO VIDEO ELEMENT.");
}

//check for webrtc support
if (WebTorrent.WEBRTC_SUPPORT) {
	//call the main torrenting function
	mainTorrentFunction();
} else {
	status.innerText = "WebTorrents/WEBRTC is unsupported, sorry.";
	log("WebTorrent will not work because of no WEBRTC support.");
}
