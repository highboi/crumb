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

//a function to toggle fullscreen functionality for an element
function toggleFullscreen(element) {
	//change the fullscreen mode
	if (document.fullscreenElement) {
		//exit the fullscreen
		if (document.exitFullscreen) {
			document.exitFullscreen();
		} else if (document.webkitExitFullscreen) {
			document.webkitExitFullscreen();
		} else if (document.msExitFullscreen) {
			document.msExitFullscreen();
		}
	} else {
		//make the video fullscreen
		if (element.requestFullscreen) {
			element.requestFullscreen();
		} else if (element.webkitRequestFullscreen) {
			element.webkitRequestFullscreen();
		} else if (element.msRequestFullscreen) {
			element.msRequestFullscreen();
		}
	}
}
