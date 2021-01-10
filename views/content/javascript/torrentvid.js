//a function to tell the server to set a magnet link for a video if one is not set
function setmagnet(videoid, magnet) {
	var link = `/setmagnet/${videoid}/?magnet=${magnet}`;

	getAjaxData(link, (response) => {
		if (response == true) {
			console.log("Magnet link set.");
		} else if (response == false) {
			console.log("Error setting magnet link");
		}
	});
}

function seedfile(file) {
	//create a new webtorrent client
	var client = new WebTorrent();

	//seed the file given in the parameters
	client.seed(file, (torrent) => {
		console.log("Seeding -->", torrent.magnetURI);
	});
}

function getVideoFile(buffer) {
	//convert the array buffer into a blob
	var blob = new Blob([buffer]);

	//convert the blob into a file object
	var file = new File([blob], "name");

	//create a url out of the file object
	var url = URL.createObjectURL(file);
	document.getElementById("videotag").src = url;
}

//fetch the video url, convert it into an array buffer, then call the getVideoFile function to convert the array buffer
fetch(videourl).then(response => response.arrayBuffer()).then(getVideoFile);
