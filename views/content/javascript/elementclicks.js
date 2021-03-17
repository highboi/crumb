//this is a javascript file that helps with the management of clicking on site elements

//this does the same as the above function but uses a flex display and a flex-direction of "column" so that the elements
//show vertically stacked, and this function pertains to the extra links on each video specifically
function showelement(elementid) {
	//get the element to toggle
	var element = document.getElementById(elementid);

	//get the computed display property
	var display = window.getComputedStyle(element, null).getPropertyValue("display");

	//toggle the display of the element with the elementid
	if (display == "none") {
		//set the element's display values to be a vertically stacked box
		element.style.display = "flex";
		element.style.flexDirection = "column";
	} else {
		//set the element's display value to "none"
		element.style.display = "none";
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
