/*
this is a JS file that will handle cookies which are stored to give the user a more tailored
experience when looking at videos and other things
*/


//a function to generate a unique id for this reccomendation cookie
function getRecCookieId() {
	//get the ids of the cookies that already exist
	var cookies = document.cookie.split(";");
	var cookieids = [];
	for (var cookie of cookies) {
		var cookiename = cookie.split("=")[0].trim();
		cookieids.push(cookiename);
	}

	//generate an alphanumeric id that is 8 characters long
	var chars = "QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm1234567890";
	var resultid = "";
	for (var i=0; i < 8; i++) {
		resultid += chars.charAt(Math.floor(Math.random() * chars.length));
	}

	//check to see if this id exists in the cookie ids array
	if (cookieids.includes(resultid)) {
		return getRecCookieId();
	} else {
		return resultid;
	}
}

//check for duplicate cookies with a certain prefix (CR, VR, and SR for channel, video, and search reccomendations) and value
function checkCookieRecDuplicates(prefix, value) {
	//get the cookies as an array of strings, with no spaces
	var cookies = document.cookie.replaceAll(" ", "").split(";");

	//filter the cookies by the prefix of the cookie name and the value of the cookie
	cookies = cookies.filter((item) => {
		var regex = new RegExp(`^${prefix}`);
		return item.split("=")[0].match(regex) && item.split("=")[1] == value;
	});

	//return the cookies length, as this will indicate if something is a duplicate or not
	return cookies.length;
}

//store a search term that the user looked up as a cookie
function storeSearchTerm(searchterm) {
	if (!checkCookieRecDuplicates("SR-", searchterm)) {
		setCookie("SR-" + getRecCookieId(), searchterm);
	}
}

//store the title of a video and the user id that created the video
function storeViewedVideo(dataset) {
	if (!checkCookieRecDuplicates("VR-", dataset.videotitle + "+" + dataset.videouserid)) {
		setCookie("VR-" + getRecCookieId(), dataset.videotitle + "+" + dataset.videouserid);
	}
}

//store the id of a visited channel
function storeViewedChannel(channelid) {
	if (!checkCookieRecDuplicates("CR-", channelid)) {
		setCookie("CR-" + getRecCookieId(), channelid);
	}
}

//store this video as a cookie if the video element exists
if (document.querySelector(".video-container #video")) {
	storeViewedVideo(document.querySelector(".video-container #video").dataset);
}

//store search terms if the user clicks on the search button
document.querySelector("#searchbtn button").addEventListener("click", (event) => {
	storeSearchTerm(document.getElementById("searchquery").value);
});

//check for a channel url and store the channel id as a cookie
if (!window.location.href.includes("?") && window.location.pathname.match("^/u")) {
	var channelid = document.querySelector(".channel").dataset.channelid;
	storeViewedChannel(channelid);
}
