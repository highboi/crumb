//this is a js file to store functions to interact with the video player

//make a global variable to contain and manage all video objects
var videos = {};

function initializePlayer(id) {
	//add an empty entry inside the videos object
	videos[id] = {};

	videos[id].isFullScreen = false;

	//get elements from the html document
	videos[id].videoContainer = document.querySelector(`.video-container[data-video=\'${id}\']`);
	videos[id].video = document.querySelector(`.video-container[data-video=\'${id}\'] #video`);
	videos[id].playBtn = document.querySelector(`.video-container[data-video=\'${id}\'] .video-controls #playBtn`);
	videos[id].seeker = document.querySelector(`.video-container[data-video=\'${id}\'] .video-controls #seeker`);
	videos[id].videotime = document.querySelector(`.video-container[data-video=\'${id}\'] .video-controls #videotime`);
	videos[id].volumeslider = document.querySelector(`.video-container[data-video=\'${id}\'] .video-controls #volumeslider`);
	videos[id].fullscreenBtn = document.querySelector(`.video-container[data-video=\'${id}\'] .video-controls #fullscreenBtn`);
	videos[id].muteBtn = document.querySelector(`.video-container[data-video=\'${id}\'] .video-controls #muteBtn`);
	videos[id].loading = document.querySelector(`.video-container[data-video=\'${id}\'] #loading`);

	//add event listeners to the elements such that the elements have functionality related to the video
	videos[id].playBtn.addEventListener("click", () => { playPause(id) }, false);
	videos[id].video.addEventListener("timeupdate", () => {seektimeupdate(id)}, false);
	videos[id].video.addEventListener("click", () => {playPauseSpace(id)}, false);
	videos[id].video.addEventListener("waiting", () => {loadingWheel(id)}, false);
	videos[id].video.addEventListener("canplay", () => {stopLoading(id)}, false);
	videos[id].video.addEventListener("ended", nextVideo, false);
	videos[id].fullscreenBtn.addEventListener("click", () => {getFullScreen(id)}, false);
	videos[id].muteBtn.addEventListener("click", () => {toggleMute(id)}, false);

	//set the default volume as 100 percent
	videos[id].volumeslider.value = 100;
	videos[id].video.volume = 1;

	console.log(videos[id].video.duration);

	//get the total duration of the video
	videos[id].totalduration = findTime(videos[id].video.duration);

	//set the beginning timestamp for the video (00:00 or 00:00:00?)
	var hours = (videos[id].video.duration / 60) / 60;
	hours = ("0" + parseInt(hours, 10)).slice(-2);
	if (hours > 0) {
		videotime.innerHTML = "00:00:00/" + `${videos[id].totalduration}`;
	} else if (hours <= 0) {
		videotime.innerHTML = "00:00/" + `${videos[id].totalduration}`;
	}

	//update the duration if the duration changes for some odd reason
	videos[id].video.ondurationchange = () => {
		videos[id].totalduration = findTime(videos[id].video.duration);
	};
}

//toggle the play and pause function of the video
function playPause(id) {
	playBtnImg = videos[id].playBtn.getElementsByTagName("img")[0];
	if (videos[id].video.paused) {
		videos[id].video.play();
		playBtnImg.src = "http://localhost/content/icons/pause.ico";
	} else {
		videos[id].video.pause();
		playBtnImg.src = "http://localhost/content/icons/play.ico";
	}

	console.log(videos[id].video.duration);
}

//toggle the play and pause but shift focus to the play button to allow for the space bar to pause/play
function playPauseSpace(id) {
	playPause(videos[id]);
	videos[id].playBtn.focus();
}

//update the video based on changes in the seeker bar
function vidSeek(id) {
	var seekto = videos[id].video.duration * (videos[id].seeker.value / 100);
	videos[id].video.currentTime = seekto;
	var time = findTime(videos[id].video.currentTime);
	videos[id].videotime.innerHTML = time + `/${videos[id].totalduration}`;
}

//update the seeker bar based on changes in the video duration
function seektimeupdate(id) {
	var nt = videos[id].video.currentTime * (100 / videos[id].video.duration);
	videos[id].seeker.value = nt;
	var time = findTime(videos[id].video.currentTime);
	videos[id].videotime.innerHTML = time + `/${videos[id].totalduration}`;
}

//function to change the volume of the video
function changeVolume(id) {
	//change the video volume
	var newVol = videos[id].volumeslider.value / 100;
	videos[id].video.volume = newVol;

	//get the image of the mute button
	var muteImg = videos[id].muteBtn.getElementsByTagName("img")[0];

	//check to see if the user used the seeker bar to mute the video and change the image
	if (videos[id].video.volume == 0) {
		muteImg.src = "http://localhost/content/icons/mute.ico";
	} else if (videos[id].video.volume > 0) {
		muteImg.src = "http://localhost/content/icons/sound.ico";
	}
}

//this is a function to make the video go full screen
function getFullScreen(id) {
	//focus on the play button so that the user can press the space bar to play/pause the video
	videos[id].playBtn.focus();

	//check to see if the element wants to go into full screen
	if (!videos[id].isFullScreen) {
		if (videos[id].videoContainer.requestFullscreen) {
			videos[id].videoContainer.requestFullscreen(); //default full screen function
		} else if (videos[id].videoContainer.mozRequestFullScreen) {
			videos[id].videoContainer.mozRequestFullScreen(); //full screen function for firefox
		} else if (videos[id].videoContainer.webkitRequestFullscreen) {
			videos[id].videoContainer.webkitRequestFullscreen(); //full screen function for chrome and safari
		}
		videos[id].isFullScreen = true;
	} else if (videos[id].isFullScreen) { //check to see if the element wants to exit the full screen mode
		if (document.exitFullscreen) {
			document.exitFullscreen();
		} else if (document.mozCancelFullScreen) {
			document.mozCancelFullScreen();
		} else if (document.webkitExitFullscreen) {
			document.webkitExitFullscreen();
		}
		videos[id].isFullScreen = false;
	}
}

//this is a function that toggles the mute button
function toggleMute(id) {
	var muteImg = videos[id].muteBtn.getElementsByTagName("img")[0];
	if (muteImg.src == "http://localhost/content/icons/sound.ico") {
		videos[id].volumeslider.value = 0;
		videos[id].video.volume = 0;
		muteImg.src = "http://localhost/content/icons/mute.ico";
	} else if (muteImg.src == "http://localhost/content/icons/mute.ico") {
		videos[id].volumeslider.value = 100;
		videos[id].video.volume = 1;
		muteImg.src = "http://localhost/content/icons/sound.ico";
	}
}

//a function to return a time string in readable format (hours:minutes:seconds)
function findTime(time) {
	if (time == null || typeof time == undefined) {
		return "00:00";
	}

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

//this is a function to show a loading wheel in the video whenever it is buffering
function loadingWheel(id) {
	//the gif source
	var loadinggif = "https://media.giphy.com/media/131tNuGktpXGhy/giphy.gif"
	//show the gif
	videos[id].loading.innerHTML = `<img src=${loadinggif}>`;
	//store the image element
	var imgElement = videos[id].loading.getElementsByTagName("img")[0];
	//set the width and height appropriately
	imgElement.style.width = (video.offsetWidth/2).toString() + "px";
	imgElement.style.height = (video.offsetHeight/2).toString() + "px";
	//position the div on top of the video (overlay)
	videos[id].loading.style.display = "flex";
	videos[id].loading.style.position = "absolute";
	videos[id].loading.style.alignItems = "center";
	//center the loading gif
	videos[id].loading.style.paddingTop = ((videos[id].video.offsetHeight/2)-(imgElement.offsetHeight/2)).toString() + "px";
	videos[id].loading.style.paddingLeft = ((videos[id].video.offsetWidth/2)-(imgElement.offsetWidth/2)).toString() + "px";
}

//stops the loading wheel whenever the video can finally play
function stopLoading(id) {
	videos[id].loading.innerHTML = "";
}

//this is a function to sleep for a number of milliseconds
function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

//this is a function to go to the next video
async function nextVideo() {
	await sleep(5000);
	loadingWheel();
	window.location.href = `/v/${nextvideo.id}`;
}
