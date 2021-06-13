//a short script to automatically play the "next" video once the current video has reached
//the end of it's time

//set the value of the input to mirror the CSS styling of the autoplay switch
document.querySelector("#autoplay .switchinput").checked = getCookie("autoplay") == "true";

//handle the setting of a cookie value for the autoplay value
document.querySelector("#autoplay .switchinput").oninput = () => {
	if (document.querySelector(".switchinput").checked) {
		setCookie("autoplay", "true");
	} else {
		setCookie("autoplay", "false");
	}
};

//set an event handler for whenever the video ends and redirect to the next video
document.querySelector(".video-container #video").addEventListener("ended", () => {
	//if the next video link is a defined variable
	if (typeof nextvideolink != 'undefined' && getCookie("autoplay") == "true") {
		window.location.href = nextvideolink;
	}
});
