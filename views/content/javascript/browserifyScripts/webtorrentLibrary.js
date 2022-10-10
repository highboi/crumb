//this file contains functions which aid in the handling of webtorrents using a webtorrent client given to the functions



//a function to begin seeding data, returning the torrent object to the callback function
function seedData(client, data, callback) {
	//create a buffer object from this data
	data = Buffer.from(data);

	//leave a message to the console
	console.log("SEEDING DATA...");

	//seed this data using the client given
	client.seed(data, (torrent) => {
		//pass the torrent object to the callback
		callback(null, torrent);
	});
}

//a function for downloading data based on a magnet uri
function downloadData(client, uri, callback) {
	//leave a message to the console
	console.log("DOWNLOADING TORRENT...");

	//add this uri to the client, return the torrent to the callback
	client.add(uri, (torrent) => {
		//pass the torrent object to the callback
		callback(null, torrent);
	});
}

//a function for returning an array buffer of a url for torrenting
async function getURLBuffer(url) {
	//request information/data from the url
	var urlRequest = new Request(url);
	var response = await fetch(urlRequest);

	//extract the array buffer from the returned data
	var responseBuffer = await response.arrayBuffer();
	var buffer = new Uint8Array(responseBuffer);

	//return the buffer for processing
	return buffer;
}

//a function to get the file URL from a torrent object
async function extractFileURL(torrent) {
	//get the file object in the torrent file
	var file = torrent.files[0];

	//get the file URL string
	file.getBlobURLAsync = promisify(file.getBlobURL);
	var fileURL = await file.getBlobURLAsync();

	//return the file url for use
	return fileURL;
}

//define each of the above functions in the form of async/await functions
var seedDataAsync = promisify(seedData);
var downloadDataAsync = promisify(downloadData);

//make all of these functions available to the window since browserify will not allow this to be accessed by other scripts
window.webtorrentLibrary = {seedData: seedData, downloadData: downloadData, seedDataAsync: seedDataAsync, downloadDataAsync: downloadDataAsync, getURLBuffer: getURLBuffer, extractFileURL: extractFileURL};
