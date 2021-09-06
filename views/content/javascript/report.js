//file for storing functions relating to the reporting of videos on the site

//this is a function to insert the timestamp values of a video into the report form
function insertReportTimestamp(elementid) {
	//get the form element inside the element with the given id
	var element = document.getElementById(elementid);
	var form = element.querySelector("form");

	//get the current time of the video to be reported
	var videotime = document.getElementById("video").currentTime;

	//get the individual time elements of the video timestamp
	var hours = videotime / 60 / 60;
	var minutes = (hours%1)*60;
	var seconds = (minutes%1)*60;

	//change the values of the form to match the time information on the video
	form.querySelector("#hours").value = ('0' + Math.trunc(hours)).slice(-3);
	form.querySelector("#minutes").value = ('0' + Math.trunc(minutes)).slice(-2);
	form.querySelector("#seconds").value = ('0' + Math.round(seconds)).slice(-2);
}
