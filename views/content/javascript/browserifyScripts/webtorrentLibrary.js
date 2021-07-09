//this file contains functions which aid in the handling of webtorrents using a webtorrent client given to the functions

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

//define each of the above functions in the form of async/await functions
var seedDataAsync = promisify(seedData);
var downloadDataAsync = promisify(downloadData);
