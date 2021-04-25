/*
this is a JS file that will handle cookies which are stored to give the user a more tailored
experience when looking at videos and other things
*/


/*
one of the key components to make the reccomendation system work is to generate unique cookie IDS with
a similar naming scheme to be regex'd by the server
*/
function getRecCookieId() {
	//the first thing we do is get all of the names of the cookies that exist currently
	var cookies = document.cookie.split(";");

	//the array to store the cookie names
	var cookienames = [];

	//go through all of the cookies and store the name of the cookies in an array
	cookies.forEach((item, index) => {
		var cookiename = item.split("=")[0].trim();
		cookienames.push(cookiename);
	});

	//make a complete string of alphanumeric chars to make IDS out of
	var chars = "QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm1234567890";

	//a variable for the resulting id
	var resultid = "";

	//generate a random string for the random id
	for (var i=0; i < 8; i++) {
		resultid += chars.charAt(Math.floor(Math.random() * chars.length));
	}

	//check to see if this id is in the cookie names
	if (cookienames.includes(resultid)) {
		return getRecCookieId();
	} else {
		return resultid;
	}
}

/*
this is a function that checks for cookie duplicates which have a certain prefix attached to their name.
it returns a boolean value indicating the actual existence of a duplicate
*/
function checkDuplicates(prefix, value) {
	//get the cookies as an array of strings, with no spaces
	var cookies = document.cookie.replaceAll(" ", "").split(";");

	//filter the cookies by the prefix of the name and the value of the cookie
	cookies = cookies.filter((item) => {
		var regex = new RegExp(`^${prefix}`);
		return item.split("=")[0].match(regex) && item.split("=")[1] == value;
	});

	//return the cookies length, as this will indicate if something is a duplicate or not
	return cookies.length;
}

/*
the first main thing to do is to store the search terms that the user uses to search for videos they want.
the function below executes whenever the search button is clicked
*/
function storeSearchTerm(searchterm) {
	if (!checkDuplicates("SR-", searchterm)) {
		setCookie("SR-" + getRecCookieId(), searchterm);
	}
}

/*
the second main thing to do is to store the ids of the videos that the user has watched in order
to get more of the types of videos that the user wants. the function below is executed when any video
reaches past the 10 second mark and is considered "viewed" by the server
*/
function storeViewedVideo(videoid) {
	if (!checkDuplicates("VR-", videoid)) {
		setCookie("VR-" + getRecCookieId(), videoid);
	}
}

/*
a third useful feature is to store cookies for visited channels, as this could give some indication of 
the user's channel preferences
*/
function storeViewedChannel(channelid) {
	if (!checkDuplicates("CR-", channelid)) {
		setCookie("CR-" + getRecCookieId(), channelid);
	}
}
