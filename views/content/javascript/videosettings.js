//a script to handle the changing of video settings such as speed and resolution

//get the video element
var videoToChange = document.getElementById("video");

//get the video source tags
var videosources = document.querySelectorAll("#video source");

//get the speed and resolution setting elements
var speedSettings = document.getElementById("speedSettings");
var resolutionSettings = document.getElementById("resolutionSettings");

/*
SET THE SPEED AND RESOLUTION ACCORDING TO CURRENT VALUES
*/

//check to see that the resolution setting is not undefined in some way
if (resolutionSettings.value != '') {
	//add a resolution query parameter to the source url
	var sourceurl = changeQueryParam(videosources[0].src, "res", resolutionSettings.value);

	//change the source element urls
	for (var source of videosources) {
		source.src = sourceurl;
	}

	//reload the video to implement source changes
	videoToChange.load();
}

//set the video speed based on the current setting
videoToChange.playbackRate = speedSettings.value;


/*
a function to add a query parameter to a url and to
return the modified url
*/
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

/*
LISTEN FOR CHANGES IN THE SPEED AND RESOLUTION SETTINGS
*/

//handle changes to the speed setting on the video
speedSettings.addEventListener("change", (event) => {
	//set the playback rate according to the changed speed
	var newspeed = event.target.value;
	videoToChange.playbackRate = newspeed;
});

//handle changes to the resolution setting on the video
resolutionSettings.addEventListener("change", (event) => {
	//get the new resolution that the user wants
	var newresolution = event.target.value;

	//get a new source url with the modified resolution setting in the url
	var sourceurl = videosources[0].src;
	sourceurl = changeQueryParam(sourceurl, "res", newresolution);

	//change the source element urls
	for (var source of videosources) {
		source.src = sourceurl;
	}

	//get the time at which the resolution was changed
	var prevTime = videoToChange.currentTime;

	//reload the video to implement source changes
	videoToChange.load();

	//set the current time of the video to the time the user was previously
	videoToChange.currentTime = prevTime;

	//try to autoplay the element if it is paused
	if (!videoToChange.paused) {
		videoToChange.play();
	}
});
