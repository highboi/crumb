//this is a js file to store functions to interact with the video player


//make global variables to be accessed in all functions
var video, playBtn, seeker, videotime, volumeslider, fullscreenBtn, muteBtn, videoContainer;
var totalduration, isFullScreen = false;

function initializePlayer() {
	//get elements from the html document
	videoContainer = document.getElementsByClassName("video-container")[0];
	video = document.getElementById("video");
	playBtn = document.getElementById("playBtn");
	seeker = document.getElementById("seeker");
	videotime = document.getElementById("videotime");
	volumeslider = document.getElementById("volumeslider");
	fullscreenBtn = document.getElementById("fullscreenBtn");
	muteBtn = document.getElementById("muteBtn");

	//add event listeners to the elements such that the elements have functionality related to the video
	playBtn.addEventListener("click", playPause, false);
	video.addEventListener("timeupdate", seektimeupdate, false);
	video.addEventListener("click", playPauseSpace, false);
	fullscreenBtn.addEventListener("click", getFullScreen, false);
	muteBtn.addEventListener("click", toggleMute, false);

	//set the default volume as 100 percent
	volumeslider.value = 100;
	video.volume = 1;

	//get the total duration of the video
	totalduration = findTime(video.duration);

	//set the beginning timestamp for the video (00:00 or 00:00:00?)
	var hours = (video.duration / 60) / 60;
	hours = ("0" + parseInt(hours, 10)).slice(-2);
	if (hours > 0) {
		videotime.innerHTML = "00:00:00/" + `${totalduration}`;
	} else if (hours <= 0) {
		videotime.innerHTML = "00:00/" + `${totalduration}`;
	}
}
window.onload = initializePlayer;

//toggle the play and pause function of the video
function playPause() {
	playBtnImg = playBtn.getElementsByTagName("img")[0];
	if (video.paused) {
		video.play();
		playBtnImg.src = "http://localhost:3000/pause.ico";
	} else {
		video.pause();
		playBtnImg.src = "http://localhost:3000/play.ico";
	}
}

//toggle the play and pause but shift focus to the play button to allow for the space bar to pause/play
function playPauseSpace() {
	playPause();
	playBtn.focus();
}

//update the video based on changes in the seeker bar
function vidSeek() {
	var seekto = video.duration * (seeker.value / 100);
	video.currentTime = seekto;
	var time = findTime(video.currentTime);
	videotime.innerHTML = time + `/${totalduration}`;
}

//update the seeker bar based on changes in the video duration
function seektimeupdate() {
	var nt = video.currentTime * (100 / video.duration);
	seeker.value = nt;
	var time = findTime(video.currentTime);
	videotime.innerHTML = time + `/${totalduration}`;
}

//function to change the volume of the video
function changeVolume() {
	var newVol = volumeslider.value / 100;
	video.volume = newVol;
}

//this is a function to make the video go full screen
function getFullScreen() {
	//focus on the play button so that the user can press the space bar to play/pause the video
	playBtn.focus();

	//check to see if the element wants to go into full screen
	if (!isFullScreen) {
		if (videoContainer.requestFullscreen) {
			videoContainer.requestFullscreen(); //default full screen function
		} else if (videoContainer.mozRequestFullScreen) {
			videoContainer.mozRequestFullScreen(); //full screen function for firefox
		} else if (videoContainer.webkitRequestFullscreen) {
			videoContainer.webkitRequestFullscreen(); //full screen function for chrome and safari
		}
		isFullScreen = true;
	} else if (isFullScreen) { //check to see if the element wants to exit the full screen mode
		if (document.exitFullscreen) {
			document.exitFullscreen();
		} else if (document.mozCancelFullScreen) {
			document.mozCancelFullScreen();
		} else if (document.webkitExitFullscreen) {
			document.webkitExitFullscreen();
		}
		isFullScreen = false;
	}
}

//this is a function that toggles the mute button
function toggleMute() {
	var muteImg = muteBtn.getElementsByTagName("img")[0];
	if (muteImg.src == "http://localhost:3000/sound.ico") {
		volumeslider.value = 0;
		video.volume = 0;
		muteImg.src = "http://localhost:3000/mute.ico";
	} else if (muteImg.src == "http://localhost:3000/mute.ico") {
		volumeslider.value = 100;
		video.volume = 1;
		muteImg.src = "http://localhost:3000/sound.ico";
	}
}

//a function to return a time string in readable format (hours:minutes:seconds)
function findTime(time) {
	//get the time as a string
	time = time.toString();
	//get the part of the time left of the "." as this is the number of seconds
	time = time.split(".")[0];

	//get the amount of seconds as an integer
	var timeint = parseInt(time, 10);

	//get the amount of hours
	var hours = (timeint / 60) / 60;

	//get the part of the hours that includes the "." and after, as this is the fraction of an hour that we will use to calculate minutes
	var hourfraction = parseFloat(hours.toString().substring(hours.toString().indexOf(".")), 10);

	//calculate minutes by multiplying the hour fraction by 60 (1/2 * 60 = 30 minutes, 1/2 an hour)
	var minutes = hourfraction*60;

	//get the minute fraction in the same way as the hour fraction
	var minutefraction = parseFloat(minutes.toString().substring(minutes.toString().indexOf(".")), 10);

	//calculate the amount of seconds
	var seconds = minutefraction*60;

	//get the full integers of the hours, minutes, and seconds (we do not need the fractions/decimal point numbers)
	hours = ("0" + parseInt(hours, 10)).slice(-2);
	minutes = ("0" + parseInt(minutes, 10)).slice(-2);
	seconds = ("0" + parseInt(seconds, 10)).slice(-2);

	//put together a clean human-readable time string
	if (hours > 0) {
		var finaltime = hours.toString() + ":" + minutes.toString() + ":" + seconds.toString();
	} else if (hours <= 0) {
		var finaltime = minutes.toString() + ":" + seconds.toString();
	}

	//return the time string
	return finaltime;
}
