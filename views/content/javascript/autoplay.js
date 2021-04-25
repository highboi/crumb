//a short script to automatically play the "next" video once the current video has reached
//the end of it's time

//set the value of the input to mirror the CSS styling of the autoplay switch
document.querySelector(".switchinput").checked = getCookie("autoplay") == "true";

//handle the setting of a cookie value for the autoplay value
document.querySelector(".switchinput").oninput = () => {
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

//set an event handler for a change in the video duration as to know when to request that the server increase the view count
document.querySelector(".video-container #video").addEventListener("timeupdate", (event) => {
	//if the current time of the video is more than or equal to 10 seconds, and if the element does
	//not have the added attribute "viewed", then...
	if (event.srcElement.currentTime >= 10 && typeof event.srcElement.viewed == 'undefined') {
		//call the function to store this element as a reccomendation cookie
		storeViewedVideo(event.srcElement.dataset.videoid);

		//get the AJAX url to increase the view count
		getAjaxData(`/video/incviews/${event.srcElement.dataset.videoid}`, (data) => {});

		//add an attribute signifying that the element was viewed to not continuously increase view count after 10 seconds
		event.srcElement.viewed = true;
	}
});
