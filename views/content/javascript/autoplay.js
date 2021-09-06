//JS to implement video autoplay functionality

//set the value of the autoplay switch according to the autoplay cookie value
document.querySelector("#autoplay .switchinput").checked = getCookie("autoplay") == "true";

//handle the setting of a cookie value for the autoplay value
document.querySelector("#autoplay .switchinput").oninput = () => {
	if (document.querySelector("#autoplay .switchinput").checked) {
		setCookie("autoplay", "true");
	} else {
		setCookie("autoplay", "false");
	}
};

//set an event handler for whenever the video ends and redirect to the next video
document.querySelector(".video-container #video").addEventListener("ended", () => {
	if (typeof nextvideolink != 'undefined' && getCookie("autoplay") == "true") {
		window.location.href = nextvideolink;
	}
});
