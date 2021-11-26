/*
VIDEO AND VIDEO CONTROLLER SETUP
*/

//get all of the videos in the document
var videos = Array.from(document.querySelectorAll(".video-container #video"));

//loop through the videos to add video controls
for (var video of videos) {
	//wait for the video metadata to load before setting up the video player
	video.addEventListener("loadedmetadata", setupPlayer(video));
}

//a function to set up the video player
function setupPlayer(video) {
	//player object to contain all relevant elements
	var player = {};

	//define global variables for stuff
	player.videoelement = video;
	player.container = video.parentElement;
	player.controls = player.container.querySelector(".video-player");
	player.progress = player.controls.querySelector("#progress");
	player.volume = player.controls.querySelector("#volume");
	player.soundicon = player.controls.querySelector("#soundicon");
	player.playbtn = player.controls.querySelector("#playbtn");
	player.fullscreenbtn = player.controls.querySelector("#fullscreen");
	player.timedisplay = player.controls.querySelector("#timedisplay");

	//set the progress of the video to 0
	player.progress.value = "0";

	//set the volume of the video to be 100
	player.volume.value = "100";

	//display the time information of the video
	var videotime = new Date(player.videoelement.duration*1000);
	var videoSeconds = ("0" + videotime.getSeconds()).slice(-2);
	var videoMinutes = ("0" + videotime.getMinutes()).slice(-2);
	player.timedisplay.innerText = `00:00/${videoMinutes}:${videoSeconds}`;

	//set the background color of the sound icon/bulb according to the volume
	var colorval = player.volume.valueAsNumber*(255/100);
	player.soundicon.style.backgroundColor = `rgb(${colorval}, 0, 130)`;

	//add the functionality to the video controls
	addFunctionality(player);
}

/*
EVENT LISTENERS FOR VIDEO CONTROLLER INTERACTION
*/

function addFunctionality(player) {
	//implement pausing and playing by clicking on the video
	player.videoelement.addEventListener("click", (event) => {
		if (player.videoelement.paused) {
			player.videoelement.play();
			player.playbtn.src = "/content/icons/pause.png";
		} else {
			player.videoelement.pause();
			player.playbtn.src = "/content/icons/play.png";
		}
	});

	//implement functionality for the play button
	player.playbtn.addEventListener("click", (event) => {
		if (player.videoelement.paused) {
			player.videoelement.play();
			event.target.src = "/content/icons/pause.png";
		} else {
			player.videoelement.pause();
			event.target.src = "/content/icons/play.png";
		}
	});

	//implement telescoping button effect with images
	player.playbtn.addEventListener("mousedown", (event) => {
		if (player.videoelement.paused) {
			player.playbtn.src = "/content/icons/play_pressed.png";
		} else {
			player.playbtn.src = "/content/icons/pause_pressed.png";
		}
	});

	//update the progress bar for the video time
	player.videoelement.addEventListener("timeupdate", (event) => {
		//get the fraction which represents the portion of the video completed
		var percent = player.videoelement.currentTime / player.videoelement.duration;

		//set the value of the progress bar to the correct percentage
		player.progress.value = percent*100;
	});

	//update the time display of the video
	player.videoelement.addEventListener("timeupdate", (event) => {
		var completed = new Date(player.videoelement.currentTime*1000);
		var total = new Date(player.videoelement.duration*1000);

		var completedSeconds = ("0" + completed.getSeconds()).slice(-2);
		var completedMinutes = ("0" + completed.getMinutes()).slice(-2);

		var totalSeconds = ("0" + total.getSeconds()).slice(-2);
		var totalMinutes = ("0" + total.getMinutes()).slice(-2);

		var completedString = `${completedMinutes}:${completedSeconds}`;
		var totalString  = `${totalMinutes}:${totalSeconds}`;

		player.timedisplay.innerText = `${completedString}/${totalString}`;
	});

	//check the progress bar
	player.progress.addEventListener("input", (event) => {
		//get the position of the mouse on the progress bar
		var position = event.target.value;

		//set the current time and progress bar position
		player.videoelement.currentTime = (position/100) * player.videoelement.duration;
	});

	//check the volume bar
	player.volume.addEventListener("input", (event) => {
		//change the volume according to the volume input
		player.videoelement.volume = player.volume.value/100;

		//calculate the background color of the sound icon using the volume
		var colorval = player.volume.value*(255/100);
		player.soundicon.style.backgroundColor = `rgb(${colorval}, 0, 130)`;
	});

	//handle fullscreen changes
	player.fullscreenbtn.addEventListener("click", (event) => {
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

			player.fullscreenbtn.src = "/content/icons/fullscreen.png";

			player.container.style.width = "";
			player.videoelement.style.width = "";
			player.videoelement.style.height = "";
			player.progress.style.width = "";
			player.controls.style.height = "";
		} else {
			//make the video fullscreen
			if (player.container.requestFullscreen) {
				player.container.requestFullscreen();
			} else if (player.container.webkitRequestFullscreen) {
				player.container.webkitRequestFullscreen();
			} else if (player.container.msRequestFullscreen) {
				player.container.msRequestFullscreen();
			}

			player.fullscreenbtn.src = "/content/icons/fullscreen_exit.png";

			player.container.style.width = "100%";
			player.videoelement.style.width = "100%";
			player.videoelement.style.height = "90%";
			player.progress.style.width = "70%";
			player.controls.style.height = "10%";
		}
	});
}
