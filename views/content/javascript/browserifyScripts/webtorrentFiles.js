//get the webtorrent and util modules
var WebTorrent = require("webtorrent");

//create a new webtorrent client
var client = new WebTorrent();

//the main function for dealing with torrents
async function mainTorrentHandler() {
	console.log("WEBRTC supported, starting torrent process.");

	//get all tags that could have a file url attached
	var sourceTags = Array.from(document.getElementsByTagName("source"));
	var styleTags = Array.from(document.getElementsByTagName("style"));
	var imgTags = Array.from(document.getElementsByTagName("img"));
	var scriptTags = Array.from(document.getElementsByTagName("script"));

	//concatenate all tags to one array
	var finalTags = sourceTags.concat(styleTags).concat(imgTags).concat(scriptTags);

	//extract the source urls from the tags
	var sourceUrls = [];
	for (var tagindex in finalTags) {
		var tag = finalTags[tagindex];

		if (tag.src == "") {
			sourceUrls.push(undefined);
		} else {
			sourceUrls.push(tag.src);
		}
	}

	//get source urls and their associated torrent links from the gun.js database
	var torrentLinks = [];
	for (var sourceindex in sourceUrls) {
		var source = sourceUrls[sourceindex];

		if (typeof source != 'undefined') {
			var sourceTorrent = await getGunData(source);
			torrentLinks.push(sourceTorrent);
		} else {
			torrentLinks.push(undefined);
		}
	}

	//handle torrenting of data
	for (var torrentindex in torrentLinks) {
		var torrentLink = torrentLinks[torrentindex];
		var sourceLink = sourceUrls[torrentindex];
		var tag = finalTags[torrentindex];

		if (typeof torrentLink != 'undefined') {
			//DOWNLOAD THE TORRENT
			var torrent = await webtorrentLibrary.downloadDataAsync(client, torrentLink);
		} else {
			//SEED THE TORRENT

			var urlBuffer = await webtorrentLibrary.getURLBuffer(sourceLink);

			var torrent = await webtorrentLibrary.seedDataAsync(client, urlBuffer);
		}

		//set the torrent as the source of this tag
		var fileURL = await webtorrentLibrary.extractFileURL(torrent);
		tag.src = fileURL;
	}
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
