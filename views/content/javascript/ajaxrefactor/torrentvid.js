/*
FUNCTIONS FOR SETTING/CREATING A TORRENT/MAGNET
*/

//a function to tell the server to set a magnet link for a video if one is not set
function setmagnet(videoid, magnet) {
	var link = `/setmagnet/${videoid}`;

	//escape ampersands in the magnet link in order to avoid separation of the magnet link string
	magnet = encodeURIComponent(magnet);

	//post the data to the server to change the magnet link
	postAjaxData(link, {"magnet" : magnet}, (response) => {
		if (response == true) {
			console.log("Magnet link set.");
		} else if (response == false) {
			console.log("Error setting magnet link");
		}
	});
}

//a function to begin seeding a video source
function seedfile(file) {
	//create a new webtorrent client
	var client = new WebTorrent();

	//seed the file given in the parameters
	client.seed(file, (torrent) => {
		console.log("Seeding -->", torrent.magnetURI);
		console.log("MAGNET URI:", typeof torrent.magnetURI);
		setmagnet(videovar.id, torrent.magnetURI);
	});
}

//a function to convert an array buffer to a file object for torrenting/seeding
function seedVideo(videourl) {
	fetch(videourl).then(response => response.arrayBuffer()).then((buffer) => {
		//convert the array buffer into a blob
		var blob = new Blob([buffer]);

		//convert the blob into a file object
		var file = new File([blob], "name");

		//seed the video
		seedfile(file);
	});
}

//fetch the video url, convert it into an array buffer, then call the getVideoFile function to convert the array buffer

/*
FUNCTIONS FOR DOWNLOADING A VIDEO TORRENT AND PLAYING IT
*/

//a function for downloading a magnet uri
function downloadMagnet(magnet) {
	//create a webtorrent client
	var client = new WebTorrent();

	console.log("INIT CLIENT");

	//add the client to the peers and get the file
	client.add(magnet, (torrent) => {
		console.log("CLIENT ADD");
		var file = torrent.files.find((file) => {
			return file.name.endsWith(".mp4");
		});
		console.log("FILE TYPE:", typeof file);
		console.log("FILE:", file);
	});
}


/*
USES OF THE FUNCTIONS ABOVE
*/


if (typeof videovar.magnetlink != 'undefined' && videovar.magnetlink != undefined) {
	console.log("DOWNLOADING MAGNET");
	downloadMagnet(videovar.magnetlink);
} else {
	console.log("SEEDING VIDEO");
	seedVideo(videovar.video);
}
