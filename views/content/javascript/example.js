//get the video element for use
var video = document.getElementById("video");

//a function to set up the video player
function setupPlayer() {
	//set the progress of the video to 0
	document.getElementById("progress").value = "0";

	//set the volume of the video to be 100
	document.getElementById("volume").value = "100";

	//display the time information of the video
	var videotime = new Date(video.duration*1000);
	var videoSeconds = ("0" + videotime.getSeconds()).slice(-2);
	var videoMinutes = ("0" + videotime.getMinutes()).slice(-2);
	document.getElementById("timedisplay").innerText = `00:00 / ${videoMinutes}:${videoSeconds}`;

	//set the background color of the sound icon/bulb according to the volume
	var soundicon = document.getElementById("soundicon");
	var colorval = document.getElementById("volume").valueAsNumber*(255/100);
	soundicon.style.backgroundColor = `rgb(${colorval}, 0, 130)`;
}

//wait for the video metadata to load before setting up the video player
video.addEventListener("loadedmetadata", setupPlayer);

//implement pausing and playing by clicking on the video
video.addEventListener("click", (event) => {
	if (video.paused) {
		video.play();
		document.getElementById("playbtn").src = "/content/icons/pause.png";
	} else {
		video.pause();
		document.getElementById("playbtn").src = "/content/icons/play.png";
	}
});

//implement functionality for the play button
document.getElementById("playbtn").addEventListener("click", (event) => {
	if (video.paused) {
		video.play();
		event.target.src = "/content/icons/pause.png";
	} else {
		video.pause();
		event.target.src = "/content/icons/play.png";
	}
});

//implement telescoping button effect with images
document.getElementById("playbtn").addEventListener("mousedown", (event) => {
	if (video.paused) {
		event.target.src = "/content/icons/play_pressed.png";
	} else {
		event.target.src = "/content/icons/pause_pressed.png";
	}
});

//update the progress bar for the video time
video.addEventListener("timeupdate", (event) => {
	//get the fraction which represents the portion of the video completed
	var percent = video.currentTime / video.duration;

	//set the value of the progress bar to the correct percentage
	document.getElementById("progress").value = percent*100;
});

//update the time display of the video
video.addEventListener("timeupdate", (event) => {
	var completed = new Date(video.currentTime*1000);
	var total = new Date(video.duration*1000);

	var completedSeconds = ("0" + completed.getSeconds()).slice(-2);
	var completedMinutes = ("0" + completed.getMinutes()).slice(-2);

	var totalSeconds = ("0" + total.getSeconds()).slice(-2);
	var totalMinutes = ("0" + total.getMinutes()).slice(-2);

	var completedString = `${completedMinutes}:${completedSeconds}`;
	var totalString  = `${totalMinutes}:${totalSeconds}`;

	document.getElementById("timedisplay").innerText = `${completedString} / ${totalString}`;
});

//check the progress bar
document.getElementById("progress").addEventListener("input", (event) => {
	//get the position of the mouse on the progress bar
	var position = event.target.value;

	//set the current time and progress bar position
	video.currentTime = (position/100) * video.duration;
});

//check the volume bar
document.getElementById("volume").addEventListener("input", (event) => {
	//get and change the volume according to the volume input
	var volume = event.target.value;
	video.volume = volume/100;

	var soundicon = document.getElementById("soundicon");

	//calculate the background color of the sound icon using the volume
	var colorval = volume*(255/100);
	soundicon.style.backgroundColor = `rgb(${colorval}, 0, 130)`;
});

//handle fullscreen changes
document.getElementById("fullscreen").addEventListener("click", (event) => {
	var container = document.getElementById("video-container");

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

		document.getElementById("fullscreen").src = "/content/icons/fullscreen.png";

		container.style.width = "";
		video.style.width = "";
		video.style.height = "";
		document.getElementById("progress").style.width = "";
	} else {
		//make the video fullscreen
		if (container.requestFullscreen) {
			container.requestFullscreen();
		} else if (container.webkitRequestFullscreen) {
			container.webkitRequestFullscreen();
		} else if (container.msRequestFullscreen) {
			container.msRequestFullscreen();
		}

		document.getElementById("fullscreen").src = "/content/icons/fullscreen_exit.png";

		container.style.width = "100%";
		video.style.width = "100%";
		video.style.height = "90%";
		document.getElementById("progress").style.width = "70%";
	}
});
