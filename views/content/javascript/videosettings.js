//a script to handle the changing of video settings such as speed and resolution

//get the video element
var videoelement = document.getElementById("video");

//get the source tags inside the video element to add the query parameters for the speed and resolution
var videosources = document.querySelectorAll("#video source");

//get the element for changing the speeds and the element for changing the resolution
var speedSettings = document.getElementById("speedSettings");
var resolutionSettings = document.getElementById("resolutionSettings");

//check to see that the resolution setting is not undefined in some way
if (resolutionSettings.value != '') {
	//set the resolution in the query params of the current video source url
	var sourceurl = changeQueryParam(videosources[0].src, "res", resolutionSettings.value);

	//set the new video source url in the source tags of the video
	videosources.forEach((item) => {
		item.src = sourceurl;
	});

	//reload the video element according to the new parameters
	videoelement.load();
}

//set the video speed based on the current setting
videoelement.playbackRate = speedSettings.value;

//a function to change the value of a query parameter while returning the full source url
function changeQueryParam(url, param, value) {
	//get the query params
	var queryparams = url.split("?")[1];

	//get the first part of the url
	url = url.split("?")[0];

	//check for the existence of the query params string
	if (typeof queryparams == 'undefined') {
		//create a new query params string
		var params = `?${param}=${value}`;

		//add the query params string to the url
		url = url + params;
	} else {
		//get the pre-existing params string and parse it
		var params = new URLSearchParams(queryparams);

		//set a new value inside the query params
		params.set(param, value);

		//add the new query params to the url
		url = url + "?" + params.toString();
	}

	//return the final url with all of the query params in place
	return url;
}

//add an event listener to handle changes to the speed settings for the video
speedSettings.addEventListener("change", (event) => {
	//get the speed value that the user has changed it to
	var newspeed = event.target.value;

	//set the speed to the video element
	videoelement.playbackRate = newspeed;
});

//add an event listener to handle changes to the resolution settings for the video
resolutionSettings.addEventListener("change", (event) => {
	//get the new resolution that the user wants
	var newresolution = event.target.value;

	//get the source url being used by the video
	var sourceurl = videosources[0].src;

	//set the query param for the resolution for the source url
	sourceurl = changeQueryParam(sourceurl, "res", newresolution);

	//set the source url for all the video sources
	videosources.forEach((item) => {
		item.src = sourceurl;
	});

	//get the current time of the video to set it after reloading the video element
	var prevTime = videoelement.currentTime;

	//get the current pause/play state of the video
	var paused = videoelement.paused;

	//reload the video element to make it request the new source url
	videoelement.load();

	//set the current time of the video to the previous time
	videoelement.currentTime = prevTime;

	//try to autoplay the element
	if (!paused) {
		videoelement.play();
	}
});
