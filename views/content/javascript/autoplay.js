//a short script to automatically play the "next" video once the current video has reached
//the end of it's time

//set an event handler for whenever the video ends and redirect to the next video
document.querySelector(".video-container #video").onended = () => {
	if (typeof nextvideolink != 'undefined') {
		window.location.href = nextvideolink;
	}
};
