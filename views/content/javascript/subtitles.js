//this is a file for handling and displaying subtitles for videos if they are provided

//a global array to store the already shown subtitles
var shownSubtitles = [];

//check for the existence of subtitles for this video
if (typeof subtitles != 'undefined') {
	//get the ending subtitle of the current subtitles array
	var endSubtitle = subtitles[subtitles.length-1];

	//get the start time and end time for a new subtitle we want to create
	var startTime = endSubtitle.endTime;
	var endTime = getTimestampFromSeconds(getSecondsFromTimestamp(endSubtitle.endTime)+1);

	//create a new empty subtitle to add to the subtitles
	var emptySubtitle = {startTime: startTime, endTime: endTime, text: ""};

	//add an empty subtitle to the subtitles array in order to make the subtitles go blank after the last subtitle has been shown
	subtitles.push(emptySubtitle);

	//add a timeupdate event listener in order to ADD subtitles as time increases
	document.getElementById("video").addEventListener("timeupdate", (event) => {
		//check to see if there are any subtitles left to add and if the subtitles are within the current time of the video
		if (subtitles.length && getSecondsFromTimestamp(subtitles[0].startTime) <= event.target.currentTime) {
			//get all of the subtitles that are to be added, and see if they are in the "past" in relation to the video time
			var subtitlesToBeAdded = subtitles.filter((item) => {
				return getSecondsFromTimestamp(item.endTime) <= event.target.currentTime;
			});

			//add all of the subtitles that are in the original subtitles array, but in the past, to the shown subtitles array
			subtitlesToBeAdded.forEach((item) => {
				//add this subtitle to the shown subtitles
				shownSubtitles.push(item);

				//get the index of the subtitle to be removed
				var removeIndex = subtitles.findIndex((object) => {
					return JSON.stringify(object) == JSON.stringify(item);
				});

				//remove this subtitle from the original subtitles array
				subtitles.splice(removeIndex, 1);
			});

			//update the subtitles with this function
			updateSubtitles(subtitles[0], event.target.currentTime);
		}
	});

	//add a timeupdate event listener in order to REMOVE subtitles as time backtracks
	document.getElementById("video").addEventListener("timeupdate", (event) => {
		//check to see if there are "shown" subtitles and if the time in the last shown subtitle is beyond the current time of the video
		if (shownSubtitles.length && getSecondsFromTimestamp(shownSubtitles[shownSubtitles.length-1].startTime) >= event.target.currentTime) {
			//get all of the subtitles with end times that are after the current video time
			var subtitlesAdded = shownSubtitles.filter((item) => {
				return getSecondsFromTimestamp(item.endTime) >= event.target.currentTime;
			});

			//reverse the order of the filtered subtitles array above so that .forEach() does not add things back to the "subtitles" array in reverse order
			subtitlesAdded.reverse();

			//move all of the subtitles that are past the current video time back into the original subtitles array
			subtitlesAdded.forEach((item) => {
				//get the index of the subtitle to be removed
				var removedIndex = subtitles.findIndex((object) => {
					return JSON.stringify(object) == JSON.stringify(item);
				});

				//remove the subtitle from the shown subtitles array
				shownSubtitles.splice(removedIndex, 1);

				//add this subtitle back into the original subtitles array
				subtitles.unshift(item);
			});
		}
	});

	//make sure the subtitles setting switch is turned off by default
	document.querySelector("#captionSettings .switchinput").checked = false;

	//add an event listener to change the status of the captions (on/off) based on the switch
	document.querySelector("#captionSettings .switchinput").addEventListener("input", (event) => {
		//get the subtitles element div
		var subtitlesElement = document.getElementById("subtitles");

		//if the switch is checked, then give the subtitles their original flex display value, if not then obscure them
		if (event.target.checked) {
			subtitlesElement.style.display = "flex";
		} else {
			subtitlesElement.style.display = "none";
		}
	});
}

//a function to parse subtitle timestamps into seconds
function getSecondsFromTimestamp(timestring) {
	//get the hour, minute, and second portions of the timestamp
	var timestamp = timestring.split(",")[0].split(":");

	//calculate the amount of seconds based on the hours, minutes, seconds, and milliseconds
	var hours = parseInt(timestamp[0]) * 60 * 60
	var minutes = parseInt(timestamp[1]) * 60;
	var seconds = parseInt(timestamp[2]);
	var milliseconds = parseInt(timestring.split(",")[1]) / 1000;

	//calculate the total amount of seconds that this timestamp represents
	var totalseconds = hours+minutes+seconds+milliseconds;

	//return the total seconds from this timestamp
	return totalseconds;
}

//a function to create a subtitle timestamp from a given number of seconds
function getTimestampFromSeconds(secondsint) {
	//get the hours, minutes, seconds, and milliseconds
	var hours = Math.floor(secondsint / 60 / 60);
	var minutes = Math.floor(secondsint / 60);
	var seconds = Math.floor(((secondsint / 60)%1)*60);
	var milliseconds = Math.floor((secondsint%1)*1000);

	//make the first timestamp part with the hours, minutes, and seconds
	var timestamp = [("0"+hours).slice(-2), ("0"+minutes).slice(-2), ("0"+seconds).slice(-2)].join(":");

	//add the milliseconds to the timestamp
	timestamp = timestamp + "," + milliseconds;

	//return the total seconds
	return timestamp;
}

//a function to change the subtitles according to the given time
function updateSubtitles(subtitle, time) {
	//if the subtitle is undefined, this means that the array has ended and thus the subtitles should be blank
	if (typeof subtitle == 'undefined') {
		//make the subtitles empty
		document.getElementById("subtitlesbox").innerHTML = "";

		//end the function right here
		return;
	}

	//put the start and end times into an array which can be iterated
	var times = [subtitle.startTime, subtitle.endTime];

	//go through the start and end times and assign them
	times.forEach((item, index) => {
		//set the item being processed from the "times" array to the amount of seconds it represents
		times[index] = getSecondsFromTimestamp(item);
	});

	//check to see if the time provided is within the bounds of the start and end times
	if (times[0] <= time && times[1] >= time) { //if the subtitle should be shown
		//show the subtitle in the element for subtitles underneath the video
		document.getElementById("subtitlesbox").innerHTML = subtitle.text;

		//get the index of the current subtitle in the "subtitles" array
		var index = subtitles.findIndex((item) => {
			return JSON.stringify(item) == JSON.stringify(subtitle);
		});

		//remove the current subtitle from the "subtitles" array
		subtitles.splice(index, 1);

		//add the current subtitle to the "shownSubtitles" array
		shownSubtitles.push(subtitle);
	}
}
