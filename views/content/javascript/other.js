/*
A FILE CONTAINING MISCELLANEOUS FUNCTIONS THAT ARE UNIVERSALLY USED
*/

//function for confirming a redirect before redirecting a user
function redirectConfirm(confirmPrompt, link) {
	if (confirm(confirmPrompt)) {
		window.location.href = link;
	}
}

//a function for sending a "not interested" request to the server
function notInterested(videoid) {
	//get the display value of the video in question and toggle it
	var thumbnail = document.getElementById(`${videoid}thumbnail`);

	var thumbdisplay = window.getComputedStyle(thumbnail, null).getPropertyValue("display");

	if (thumbdisplay == "none") {
		thumbnail.style.display = "";
	} else {
		thumbnail.style.display = "none";
	}

	//get the display value of the undo button for this video and toggle this as well
	var undobtn = document.getElementById(`${videoid}undo`);

	var undodisplay = window.getComputedStyle(undobtn, null).getPropertyValue("display");

	if (undodisplay == "none") {
		undobtn.style.display = "block";
	} else {
		undobtn.style.display = "none";
	}
}

//this is a function to insert the timestamp values of a video into the report form
function insertReportTimestamp(elementid) {
	//get the element
	var element = document.getElementById(elementid);

	//get the form inside the report form
	var form = element.querySelector("form");

	//get the current time of the video
	var videotime = document.getElementById("video").currentTime;

	//get the individual time elements of the video time
	var hours = videotime / 60 / 60;
	var minutes = (hours%1)*60;
	var seconds = (minutes%1)*60;

	//change the values inside the form to match the hours, minutes, and seconds of the video in question
	form.querySelector("#hours").value = ('0' + Math.trunc(hours)).slice(-3);
	form.querySelector("#minutes").value = ('0' + Math.trunc(minutes)).slice(-2);
	form.querySelector("#seconds").value = ('0' + Math.round(seconds)).slice(-2);
}
